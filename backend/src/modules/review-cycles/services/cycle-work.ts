/**
 * The steps that a launch, a schedule, and a scheduled activation share: the facts that they
 * read inside their transaction, the frozen templates, and the work that an active cycle opens.
 */
import { randomUUID } from 'node:crypto';
import { UnprocessableEntityException } from '@nestjs/common';
import { EntityManager, In, Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';
import { BehavioralTemplateVersion } from '../../behavioral-assessment/entities/behavioral-template-version.entity.js';
import { BehavioralTemplate } from '../../behavioral-assessment/entities/behavioral-template.entity.js';
import { EmployeeDomain } from '../../employees/entities/employee-domain.entity.js';
import { KpiGoalTemplate } from '../../kpi-goals/entities/kpi-goal-template.entity.js';
import { KpiTemplateVersion } from '../../kpi-goals/entities/kpi-template-version.entity.js';
import { Accomplishment } from '../entities/accomplishment.entity.js';
import { Assignment } from '../entities/assignment.entity.js';
import { CycleParticipant } from '../entities/cycle-participant.entity.js';
import { CyclePeerEvaluator } from '../entities/cycle-peer-evaluator.entity.js';
import type { CycleStage } from '../entities/cycle-stage.entity.js';
import type { Cycle } from '../entities/cycle.entity.js';
import { ManagerAssignment } from '../entities/manager-assignment.entity.js';
import type { Evaluators, FactRepos } from './cycle-facts.js';
import type { ReadinessIssue } from './cycle-readiness.js';
import { resolveParticipants, type Lookups } from './participant-resolver.js';

/** The template of each frozen version, by version id: one query for all of them. */
export async function templateIdsOf(
  versions: Repository<{ versionId: string; templateId: string }>,
  versionIds: (string | null)[],
): Promise<Map<string, string>> {
  const ids = [...new Set(versionIds.flatMap((id) => (id ? [id] : [])))];
  if (ids.length === 0) return new Map();
  const rows = await versions.find({ where: { versionId: In(ids) } });
  return new Map(rows.map((row) => [row.versionId, row.templateId]));
}

/** The repositories that the facts of a cycle are read through, taken from the transaction of a launch. */
export function txFactRepos(manager: EntityManager): FactRepos {
  return {
    employees: manager.getRepository(EmployeeDomain),
    managers: manager.getRepository(ManagerAssignment),
    users: manager.getRepository(User),
    peers: manager.getRepository(CyclePeerEvaluator),
    kpiVersions: manager.getRepository(KpiTemplateVersion),
    kpiTemplates: manager.getRepository(KpiGoalTemplate),
    behavioralVersions: manager.getRepository(BehavioralTemplateVersion),
    behavioralTemplates: manager.getRepository(BehavioralTemplate),
  };
}

export function txLookups(manager: EntityManager): Lookups {
  return {
    employees: manager.getRepository(EmployeeDomain),
    kpiTemplates: manager.getRepository(KpiGoalTemplate),
    kpiVersions: manager.getRepository(KpiTemplateVersion),
    behavioralTemplates: manager.getRepository(BehavioralTemplate),
    behavioralVersions: manager.getRepository(BehavioralTemplateVersion),
  };
}

/** A 422 that carries every readiness problem as a detail, so the page can list them. */
export function notReady(issues: ReadinessIssue[]): UnprocessableEntityException {
  return new UnprocessableEntityException({
    message: 'The cycle is not ready to launch.',
    details: issues.map((issue) => ({ field: issue.field, code: issue.step.toUpperCase(), message: issue.message })),
  });
}

/**
 * Points each participant at the current published version of the templates they hold. A
 * template that was published again since the last save moves the cycle onto its new version,
 * and only a launch freezes it (PRD Cyc-006). Returns how many participants moved.
 */
export async function refreezeParticipants(
  manager: EntityManager,
  lookups: Lookups,
  company: string,
  rows: CycleParticipant[],
): Promise<number> {
  const [kpiTemplateIds, behavioralTemplateIds] = await Promise.all([
    templateIdsOf(lookups.kpiVersions, rows.map((row) => row.kpiVersionId)),
    templateIdsOf(lookups.behavioralVersions, rows.map((row) => row.behavioralVersionId)),
  ]);
  const resolved = await resolveParticipants(
    lookups,
    company,
    rows.map((row) => ({
      employeeId: row.employeeId,
      ...(row.kpiVersionId ? { kpiTemplateId: kpiTemplateIds.get(row.kpiVersionId) } : {}),
      ...(row.behavioralVersionId ? { behavioralTemplateId: behavioralTemplateIds.get(row.behavioralVersionId) } : {}),
    })),
  );

  const moved = rows.flatMap((row) => {
    const now = resolved.find((candidate) => candidate.employeeId === row.employeeId);
    if (!now || (now.kpiVersionId === row.kpiVersionId && now.behavioralVersionId === row.behavioralVersionId)) return [];
    return [{ ...row, kpiVersionId: now.kpiVersionId, behavioralVersionId: now.behavioralVersionId }];
  });
  if (moved.length > 0) await manager.getRepository(CycleParticipant).save(moved);
  return moved.length;
}

/**
 * One draft accomplishment for each participant, so each can report actual results (PRD
 * Cyc-006). A cycle where goals do not count has nothing to report.
 */
export async function openWorkRecords(repo: Repository<Accomplishment>, cycle: Cycle, rows: CycleParticipant[]): Promise<void> {
  if (cycle.goalsWeight <= 0) return;
  await repo.save(
    rows.map((row) =>
      repo.create({
        accomplishmentId: randomUUID(),
        participantId: row.participantId,
        cycleId: cycle.cycleId,
        employeeId: row.employeeId,
        status: 'draft',
      }),
    ),
  );
}

/**
 * Who answers one stage for one participant: the participant, their manager, their named
 * peers, their direct reports, or the person that the stage names. A peer or upward stage may
 * have nobody for a participant. A missing manager or named person is a bug, because
 * readiness ran first: it stops the launch.
 */
function evaluatorsOf(stage: CycleStage, row: CycleParticipant, { managerOf, peersOf, reportsOf }: Evaluators): string[] {
  if (stage.perspective === 'peer') return (peersOf.get(row.participantId) ?? []).filter((peer) => peer !== row.employeeId);
  if (stage.perspective === 'upward') return reportsOf.get(row.employeeId) ?? [];
  const named =
    stage.perspective === 'self' ? row.employeeId : stage.perspective === 'manager' ? managerOf.get(row.employeeId) : stage.evaluatorId;
  if (!named) throw new Error(`No evaluator for stage ${stage.stageId} of participant ${row.participantId}`);
  return [named];
}

/**
 * One assignment for each participant, stage, and evaluator. For each participant the first
 * stage with an evaluator opens: the others stay locked until the stage before is done.
 */
export function buildAssignments(
  repo: Repository<Assignment>,
  { cycleId, stages, rows, evaluators }: { cycleId: string; stages: CycleStage[]; rows: CycleParticipant[]; evaluators: Evaluators },
): Assignment[] {
  const ordered = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
  return rows.flatMap((row) =>
    ordered
      .map((stage) => ({ stage, answering: evaluatorsOf(stage, row, evaluators) }))
      .filter(({ answering }) => answering.length > 0)
      .flatMap(({ stage, answering }, index) =>
        answering.map((evaluatorId) =>
          repo.create({
            assignmentId: randomUUID(),
            cycleId,
            participantId: row.participantId,
            evaluatorId,
            stageId: stage.stageId,
            state: index === 0 ? 'not_started' : 'locked',
            deadline: stage.deadline,
          }),
        ),
      ),
  );
}
