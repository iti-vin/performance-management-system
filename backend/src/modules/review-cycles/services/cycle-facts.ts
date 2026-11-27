import { In, LessThanOrEqual, type Repository } from 'typeorm';
import { ADMIN_ROLE_ID } from '../../auth/entities/user-role.entity.js';
import { User } from '../../auth/entities/user.entity.js';
import { BehavioralTemplateVersion } from '../../behavioral-assessment/entities/behavioral-template-version.entity.js';
import { BehavioralTemplate } from '../../behavioral-assessment/entities/behavioral-template.entity.js';
import { EmployeeDomain } from '../../employees/entities/employee-domain.entity.js';
import { EmployeeStatus } from '../../employees/types/employee-status.enum.js';
import { KpiGoalTemplate } from '../../kpi-goals/entities/kpi-goal-template.entity.js';
import { KpiTemplateVersion } from '../../kpi-goals/entities/kpi-template-version.entity.js';
import type { CyclePeerEvaluator } from '../entities/cycle-peer-evaluator.entity.js';
import type { CycleParticipant } from '../entities/cycle-participant.entity.js';
import type { CycleStage } from '../entities/cycle-stage.entity.js';
import type { Cycle } from '../entities/cycle.entity.js';
import { ManagerAssignment } from '../entities/manager-assignment.entity.js';
import type { ReadinessInput } from './cycle-readiness.js';

/**
 * The repositories that the facts of a cycle are read through. `GET readiness` passes the injected
 * ones, and launch passes those of its transaction, so both read the same facts the same way.
 */
export interface FactRepos {
  employees: Repository<EmployeeDomain>;
  managers: Repository<ManagerAssignment>;
  users: Repository<User>;
  peers: Repository<CyclePeerEvaluator>;
  kpiVersions: Repository<KpiTemplateVersion>;
  kpiTemplates: Repository<KpiGoalTemplate>;
  behavioralVersions: Repository<BehavioralTemplateVersion>;
  behavioralTemplates: Repository<BehavioralTemplate>;
}

/** The company works in Asia/Manila (PRD 2.6). `en-CA` writes a day as YYYY-MM-DD, as a date column stores it. */
const COMPANY_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' });

/** The calendar day of an instant in the time zone of the company. */
export const dayOf = (instant: Date) => COMPANY_DAY.format(instant);

const isActive = (person: { status: string }) => person.status === EmployeeStatus.ACTIVE;

/**
 * The ids of those frozen versions whose template is still published, in the company. A cycle
 * keeps its frozen version for ever, but it cannot launch on a template that was archived.
 */
async function publishedVersionIds(
  versions: Repository<{ versionId: string; templateId: string }>,
  templates: Repository<{ templateId: string; status: string; company: string }>,
  versionIds: string[],
  company: string,
): Promise<Set<string>> {
  if (versionIds.length === 0) return new Set();
  const found = await versions.find({ where: { versionId: In(versionIds) } });
  const published = await templates.find({ where: { templateId: In([...new Set(found.map((version) => version.templateId))]), company } });
  const live = new Set(published.filter((template) => template.status === 'published').map((template) => template.templateId));
  return new Set(found.filter((version) => live.has(version.templateId)).map((version) => version.versionId));
}

/** Employees of the company that have an admin login and are active: the only people who may evaluate an HR stage. */
export async function eligibleHrEvaluatorIds(repos: Pick<FactRepos, 'employees' | 'users'>, company: string): Promise<Set<string>> {
  const admins = await repos.users.find({ where: { userRoleId: ADMIN_ROLE_ID } });
  if (admins.length === 0) return new Set();
  const people = await repos.employees.find({ where: { id: In(admins.map((admin) => admin.employeeId)), company } });
  return new Set(people.flatMap((person) => (person.guid && isActive(person) ? [person.guid] : [])));
}

/**
 * The manager of each employee: the applied assignment with the latest effective date, up to
 * today, and only when that manager is still an active employee. Readiness asks whether an
 * employee is in the map, and launch asks who the manager is, so the two cannot disagree.
 */
export async function appliedManagersOf(
  repos: Pick<FactRepos, 'employees' | 'managers'>,
  company: string,
  employeeIds: string[],
  today: string,
): Promise<Map<string, string>> {
  if (employeeIds.length === 0) return new Map();
  const rows = await repos.managers.find({
    where: { employeeId: In(employeeIds), company, status: 'applied', effectiveDate: LessThanOrEqual(today) },
    order: { effectiveDate: 'DESC' },
  });
  const latest = new Map<string, string>();
  for (const row of [...rows].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))) {
    if (!latest.has(row.employeeId)) latest.set(row.employeeId, row.managerId);
  }
  if (latest.size === 0) return latest;

  const people = await repos.employees.find({ where: { guid: In([...new Set(latest.values())]), company } });
  const active = new Set(people.flatMap((person) => (person.guid && isActive(person) ? [person.guid] : [])));
  return new Map([...latest].filter(([, managerId]) => active.has(managerId)));
}

/**
 * The employees whom a person manages today: the reverse of `appliedManagersOf`. Someone who
 * moved to another manager since is not in the set.
 */
export async function currentTeamOf(
  repos: Pick<FactRepos, 'employees' | 'managers'>,
  company: string,
  managerId: string,
  today: string,
): Promise<Set<string>> {
  const links = await repos.managers.find({
    where: { managerId, company, status: 'applied', effectiveDate: LessThanOrEqual(today) },
  });
  const current = await appliedManagersOf(repos, company, [...new Set(links.map((link) => link.employeeId))], today);
  return new Set([...current].filter(([, manager]) => manager === managerId).map(([employee]) => employee));
}

/** Who answers the stages that derive their evaluator. */
export interface Evaluators {
  /** The manager of each participant today, by employee. */
  managerOf: ReadonlyMap<string, string>;
  /** The named peers of each participant, by participant. */
  peersOf: ReadonlyMap<string, string[]>;
  /** The direct reports who assess an employee upward: only for those with the anonymity minimum of them. */
  reportsOf: ReadonlyMap<string, string[]>;
}

function grouped(pairs: [string, string][]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const [key, value] of pairs) groups.set(key, [...(groups.get(key) ?? []), value]);
  return groups;
}

/** The named peers who are still active employees of the company. Read for a cycle with a peer stage only. */
async function activePeersOf(repos: FactRepos, company: string, stages: CycleStage[], rows: CycleParticipant[]) {
  if (rows.length === 0 || !stages.some((stage) => stage.perspective === 'peer')) return new Map<string, string[]>();
  const named = await repos.peers.find({ where: { participantId: In(rows.map((row) => row.participantId)) } });
  if (named.length === 0) return new Map<string, string[]>();
  const people = await repos.employees.find({ where: { guid: In([...new Set(named.map((row) => row.evaluatorId))]), company } });
  const active = new Set(people.flatMap((person) => (person.guid && isActive(person) ? [person.guid] : [])));
  return grouped(
    named.filter((row) => active.has(row.evaluatorId)).map((row): [string, string] => [row.participantId, row.evaluatorId]),
  );
}

/** The direct reports of today of each named manager. Read for a cycle with an upward stage only. */
async function reportsByManager(repos: FactRepos, company: string, stages: CycleStage[], managerIds: string[], today: string) {
  if (managerIds.length === 0 || !stages.some((stage) => stage.perspective === 'upward')) return new Map<string, string[]>();
  const links = await repos.managers.find({
    where: { managerId: In(managerIds), company, status: 'applied', effectiveDate: LessThanOrEqual(today) },
  });
  const current = await appliedManagersOf(repos, company, [...new Set(links.map((link) => link.employeeId))], today);
  if (current.size === 0) return new Map<string, string[]>();
  const people = await repos.employees.find({ where: { guid: In([...current.keys()]), company } });
  const active = new Set(people.flatMap((person) => (person.guid && isActive(person) ? [person.guid] : [])));
  return grouped(
    [...current].filter(([employee]) => active.has(employee)).map(([employee, manager]): [string, string] => [manager, employee]),
  );
}

/** Reads the facts of a cycle and builds the input of `checkReadiness`, with who answers each derived stage. */
export async function gatherReadiness(
  repos: FactRepos,
  company: string,
  cycle: Cycle,
  stages: CycleStage[],
  rows: CycleParticipant[],
  now: Date,
): Promise<{ input: ReadinessInput; evaluators: Evaluators }> {
  const ids = rows.map((row) => row.employeeId);
  const versionIdsOf = (pick: (row: CycleParticipant) => string | null) => rows.flatMap((row) => pick(row) ?? []);
  const [peersOf, reports] = await Promise.all([
    activePeersOf(repos, company, stages, rows),
    reportsByManager(repos, company, stages, ids, dayOf(now)),
  ]);
  // The participants and their peers: a problem with a peer names them.
  const named = [...new Set([...ids, ...[...peersOf.values()].flat()])];
  const [people, managerOf, hrIds, publishedKpi, publishedBehavioral] = await Promise.all([
    named.length ? repos.employees.find({ where: { guid: In(named), company } }) : [],
    appliedManagersOf(repos, company, ids, dayOf(now)),
    eligibleHrEvaluatorIds(repos, company),
    publishedVersionIds(repos.kpiVersions, repos.kpiTemplates, versionIdsOf((row) => row.kpiVersionId), company),
    publishedVersionIds(repos.behavioralVersions, repos.behavioralTemplates, versionIdsOf((row) => row.behavioralVersionId), company),
  ]);

  const personOf = (guid: string) => people.find((candidate) => candidate.guid === guid);
  const nameOf = (guid: string) => {
    const person = personOf(guid);
    return person ? `${person.firstName} ${person.lastName}` : guid;
  };
  const input: ReadinessInput = {
    now,
    cycle,
    stages,
    eligibleHrEvaluatorIds: hrIds,
    participants: rows.map((row) => {
      const person = personOf(row.employeeId);
      return {
        employeeId: row.employeeId,
        name: nameOf(row.employeeId),
        isActive: person !== undefined && isActive(person),
        position: row.frozenPosition,
        kpiVersionId: row.kpiVersionId,
        isKpiTemplatePublished: row.kpiVersionId !== null && publishedKpi.has(row.kpiVersionId),
        behavioralVersionId: row.behavioralVersionId,
        isBehavioralTemplatePublished: row.behavioralVersionId !== null && publishedBehavioral.has(row.behavioralVersionId),
        managerId: managerOf.get(row.employeeId) ?? null,
        peers: (peersOf.get(row.participantId) ?? [])
          .filter((peer) => peer !== row.employeeId)
          .map((peer) => ({ employeeId: peer, name: nameOf(peer) })),
        reportCount: reports.get(row.employeeId)?.length ?? 0,
      };
    }),
  };
  const minimum = cycle.anonymityThreshold;
  const reportsOf = new Map([...reports].filter(([, own]) => minimum !== null && own.length >= minimum));
  return { input, evaluators: { managerOf, peersOf, reportsOf } };
}
