import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import type {
  AccomplishmentDecisionRequestDto,
  AccomplishmentDetailDto,
  AccomplishmentListRowDto,
  ReportIndicatorActualsRequestDto,
} from '@pms/shared-types';
import { AuditEvent } from '../../../common/entities/audit-event.entity.js';
import { User } from '../../auth/entities/user.entity.js';
import { EmployeeDomain } from '../../employees/entities/employee-domain.entity.js';
import { CompanyResolver } from '../../kpi-goals/services/company-resolver.service.js';
import { KpiIndicatorMatrixCell } from '../../kpi-goals/entities/kpi-indicator-matrix-cell.entity.js';
import { KpiIndicatorMatrixColumn } from '../../kpi-goals/entities/kpi-indicator-matrix-column.entity.js';
import { KpiIndicatorMatrixRow } from '../../kpi-goals/entities/kpi-indicator-matrix-row.entity.js';
import { KpiIndicatorScale } from '../../kpi-goals/entities/kpi-indicator-scale.entity.js';
import { KpiIndicator } from '../../kpi-goals/entities/kpi-indicator.entity.js';
import { KpiGoalTemplate } from '../../kpi-goals/entities/kpi-goal-template.entity.js';
import { KpiTemplateVersion } from '../../kpi-goals/entities/kpi-template-version.entity.js';
import { AccomplishmentActual } from '../entities/accomplishment-actual.entity.js';
import { AccomplishmentVersion, type ActualsSnapshot } from '../entities/accomplishment-version.entity.js';
import { Accomplishment } from '../entities/accomplishment.entity.js';
import { CycleParticipant } from '../entities/cycle-participant.entity.js';
import { Cycle } from '../entities/cycle.entity.js';
import { ManagerAssignment } from '../entities/manager-assignment.entity.js';
import { DEADLINE_PASSED, hasPeriodEnded, isWindowOpen, isFirstSubmissionClosed, SUBMISSION_PASSED, permissionsOf, readSnapshot, type Relation } from './accomplishment-rules.js';
import { currentTeamOf, dayOf } from './cycle-facts.js';
import { PARTICIPANT_CYCLE_STATES, viewerOf, type Viewer } from './viewer.js';

const NOT_FOUND = 'Accomplishment not found';
const UNKNOWN_PERSON = 'Unknown employee';
const NOT_ACTIVE = 'The cycle is not active. This record cannot be changed.';
const PERIOD_RUNNING = 'You can submit after the evaluation period ends.';
const LOCK_FOR_READ = { mode: 'pessimistic_read' } as const;
const LOCK_FOR_WRITE = { mode: 'pessimistic_write' } as const;

type Report = ReportIndicatorActualsRequestDto;
type Values = { indicatorId: string; actualValue: number | null; remarks: string | null }[];
type WorkFacts = Pick<AccomplishmentListRowDto, 'position' | 'kpiTemplateName' | 'kpiTemplateVersion'>;

const NO_FACTS: WorkFacts = { position: null, kpiTemplateName: null, kpiTemplateVersion: null };

@Injectable()
export class AccomplishmentsService {
  constructor(
    @InjectRepository(Cycle) private readonly cycles: Repository<Cycle>,
    @InjectRepository(CycleParticipant) private readonly participants: Repository<CycleParticipant>,
    @InjectRepository(Accomplishment) private readonly accomplishments: Repository<Accomplishment>,
    @InjectRepository(AccomplishmentActual) private readonly actuals: Repository<AccomplishmentActual>,
    @InjectRepository(AccomplishmentVersion) private readonly versions: Repository<AccomplishmentVersion>,
    @InjectRepository(ManagerAssignment) private readonly managers: Repository<ManagerAssignment>,
    @InjectRepository(EmployeeDomain) private readonly employees: Repository<EmployeeDomain>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(KpiIndicator) private readonly indicators: Repository<KpiIndicator>,
    @InjectRepository(KpiIndicatorScale) private readonly scales: Repository<KpiIndicatorScale>,
    @InjectRepository(KpiIndicatorMatrixRow) private readonly matrixRows: Repository<KpiIndicatorMatrixRow>,
    @InjectRepository(KpiIndicatorMatrixColumn) private readonly matrixColumns: Repository<KpiIndicatorMatrixColumn>,
    @InjectRepository(KpiIndicatorMatrixCell) private readonly matrixCells: Repository<KpiIndicatorMatrixCell>,
    @InjectRepository(KpiTemplateVersion) private readonly templateVersions: Repository<KpiTemplateVersion>,
    @InjectRepository(KpiGoalTemplate) private readonly templates: Repository<KpiGoalTemplate>,
    private readonly companies: CompanyResolver,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * The records that the caller may see: their own and those of their current team in active
   * and completed cycles; every record of the company for an HR administrator (PRD 7.2).
   */
  async list(userId: string): Promise<AccomplishmentListRowDto[]> {
    const viewer = await viewerOf(this.users, this.companies, userId);
    if (!viewer.isAdmin && !viewer.actorId) return [];
    const { company, isAdmin } = viewer;
    const cycles = await this.cycles.find({ where: isAdmin ? { company } : { company, state: In([...PARTICIPANT_CYCLE_STATES]) } });
    if (cycles.length === 0) return [];

    const [records, team] = await Promise.all([
      this.accomplishments.find({ where: { cycleId: In(cycles.map((cycle) => cycle.cycleId)) } }),
      this.teamOf(viewer),
    ]);
    const visible = records.filter(
      (record) => isAdmin || record.employeeId === viewer.actorId || team.has(record.employeeId),
    );
    const [names, participants] = await Promise.all([
      this.namesOf(company, visible.map((record) => record.employeeId)),
      this.participants.find({ where: { participantId: In(visible.map((record) => record.participantId)) } }),
    ]);
    const facts = await this.workFactsOf(participants);
    const cycleById = new Map(cycles.map((cycle) => [cycle.cycleId, cycle]));
    const now = new Date();

    return visible
      .flatMap((record) => {
        const cycle = cycleById.get(record.cycleId);
        if (!cycle) return [];
        const relation = relationOf(viewer, record, team);
        return [
          {
            ...describe(record, cycle, names),
            ...(facts.get(record.participantId) ?? NO_FACTS),
            isOwn: relation.isOwn,
            canDecide: permissionsOf(record, cycle, relation, now).canDecide,
          },
        ];
      })
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName) || a.cycleName.localeCompare(b.cycleName));
  }

  /**
   * One record with the indicators of the frozen KPI version (Acc-001). Anyone who may not
   * see it gets the same 404 as for a record that does not exist. Values that the employee
   * has not submitted are shown to the employee only.
   */
  async get(userId: string, accomplishmentId: string): Promise<AccomplishmentDetailDto> {
    const viewer = await viewerOf(this.users, this.companies, userId);
    const { record, cycle, relation } = await this.findVisible(viewer, accomplishmentId);

    const participant = await this.participants.findOne({ where: { participantId: record.participantId } });
    if (!participant) throw new NotFoundException(NOT_FOUND);
    const [facts, kpi, actuals, history] = await Promise.all([
      this.workFactsOf([participant]),
      this.kpiOfVersion(participant.kpiVersionId),
      this.actuals.find({ where: { accomplishmentId } }),
      this.versions.find({ where: { accomplishmentId }, order: { version: 'ASC' } }),
    ]);
    const names = await this.namesOf(viewer.company, [
      record.employeeId,
      ...history.flatMap((version) => (version.actorId ? [version.actorId] : [])),
    ]);
    const showsValues = relation.isOwn || record.status === 'submitted' || record.status === 'verified';

    return {
      ...describe(record, cycle, names),
      ...(facts.get(record.participantId) ?? NO_FACTS),
      ...permissionsOf(record, cycle, relation, new Date()),
      participantId: record.participantId,
      evaluationStart: cycle.evaluationStart,
      remarks: showsValues ? (record.remarks ?? null) : null,
      returnReason: record.returnReason ?? null,
      submittedAt: record.submittedAt?.toISOString() ?? null,
      verifiedAt: record.verifiedAt?.toISOString() ?? null,
      kpi,
      actuals: showsValues
        ? actuals.map(({ indicatorId, actualValue, remarks }) => ({ indicatorId, actualValue, remarks: remarks ?? null }))
        : [],
      versions: history.map((version) => ({
        version: version.version,
        actedAt: version.actedAt?.toISOString() ?? null,
        actorName: names.get(version.actorId ?? '') ?? UNKNOWN_PERSON,
        remarks: version.remarks,
        correctionReason: version.correctionReason,
        actuals: readSnapshot(version.actualsJson),
      })),
    };
  }

  /**
   * Saves the report as it stands, which may be incomplete: one value or none for each
   * frozen indicator. Only the employee, while the record is open (Acc-002, Acc-007).
   */
  async saveActuals(userId: string, accomplishmentId: string, report: Report): Promise<AccomplishmentDetailDto> {
    const viewer = await viewerOf(this.users, this.companies, userId);
    const indicatorIds = await this.indicatorIdsOf(accomplishmentId);

    await this.dataSource.transaction(async (manager) => {
      const { record, actorId } = await lockOwnOpenRecord(manager, viewer, accomplishmentId);
      const values = valuesFor(indicatorIds, report);
      await writeActuals(manager, accomplishmentId, values);
      await manager.getRepository(Accomplishment).save({ ...record, remarks: report.remarks || null });
      await recordAudit(manager, {
        accomplishmentId,
        action: 'actuals_saved',
        actorId,
        beforeJson: { status: record.status },
        afterJson: { status: record.status, actuals: toSnapshot(values).actuals },
      });
    });

    return this.get(userId, accomplishmentId);
  }

  /**
   * Submits the report after the evaluation period, with a value for every indicator. It
   * keeps the submission as a version and locks the values until the manager decides
   * (Acc-002, Acc-003, Acc-008).
   */
  async submit(userId: string, accomplishmentId: string, report: Report): Promise<AccomplishmentDetailDto> {
    const viewer = await viewerOf(this.users, this.companies, userId);
    const indicatorIds = await this.indicatorIdsOf(accomplishmentId);

    await this.dataSource.transaction(async (manager) => {
      const { record, cycle, actorId } = await lockOwnOpenRecord(manager, viewer, accomplishmentId);
      const values = valuesFor(indicatorIds, report);
      assertComplete(cycle, record, values, report);

      const submitted = { submittedBy: actorId, submittedAt: new Date() };
      const remarks = report.remarks || null;
      await writeActuals(manager, accomplishmentId, values);
      await manager
        .getRepository(Accomplishment)
        .save({ ...record, ...submitted, remarks, status: 'submitted', returnReason: null });
      await addVersion(manager, {
        accomplishmentId,
        actualsJson: toSnapshot(values),
        remarks,
        actorId,
        actedAt: submitted.submittedAt,
        correctionReason: record.status === 'returned' ? report.correctionReason : null,
      });
      await recordAudit(manager, {
        accomplishmentId,
        action: 'submitted',
        actorId,
        beforeJson: { status: record.status },
        afterJson: { status: 'submitted', actuals: toSnapshot(values).actuals, remarks },
      });
    });

    return this.get(userId, accomplishmentId);
  }

  /**
   * Verifies a submitted record, or returns it with a reason. Only the manager of the
   * employee today, within the verification window. Verification accepts the report as
   * evidence: it compares nothing with a target (Acc-004, Acc-005, AUTH-004).
   */
  async decide(userId: string, accomplishmentId: string, decision: AccomplishmentDecisionRequestDto): Promise<AccomplishmentDetailDto> {
    const viewer = await viewerOf(this.users, this.companies, userId);

    await this.dataSource.transaction(async (manager) => {
      const { record, actorId } = await lockRecordToDecide(manager, viewer, accomplishmentId);
      const { outcome, reason } = decision;
      const verified = outcome === 'verified';
      await manager.getRepository(Accomplishment).save({
        ...record,
        status: outcome,
        verifiedBy: verified ? actorId : null,
        verifiedAt: verified ? new Date() : null,
        returnReason: verified ? null : reason,
      });
      await recordAudit(manager, {
        accomplishmentId,
        action: outcome,
        actorId,
        ...(verified ? {} : { reason }),
        beforeJson: { status: record.status },
        afterJson: { status: outcome },
      });
    });

    return this.get(userId, accomplishmentId);
  }

  /**
   * The ids of the frozen indicators of a record. They never change, so a write reads them
   * before its transaction. An unknown record has none, and the transaction answers 404.
   */
  private async indicatorIdsOf(accomplishmentId: string): Promise<string[]> {
    const record = await this.accomplishments.findOne({ where: { accomplishmentId } });
    const participant = record && (await this.participants.findOne({ where: { participantId: record.participantId } }));
    if (!participant?.kpiVersionId) return [];
    const indicators = await this.indicators.find({ where: { versionId: participant.kpiVersionId } });
    return indicators.map((indicator) => indicator.indicatorId);
  }

  /** The company scope comes from the cycle: a record has no company of its own. */
  private async findVisible(viewer: Viewer, accomplishmentId: string) {
    const record = await this.accomplishments.findOne({ where: { accomplishmentId } });
    const cycle = record && (await this.cycles.findOne({ where: { cycleId: record.cycleId, company: viewer.company } }));
    if (!record || !cycle) throw new NotFoundException(NOT_FOUND);

    const relation = relationOf(viewer, record, await this.teamOf(viewer));
    const takesPart = (relation.isOwn || relation.isCurrentManager) && PARTICIPANT_CYCLE_STATES.includes(cycle.state);
    if (!viewer.isAdmin && !takesPart) throw new NotFoundException(NOT_FOUND);
    return { record, cycle, relation };
  }

  private async teamOf({ company, actorId }: Viewer): Promise<Set<string>> {
    if (!actorId) return new Set();
    return currentTeamOf({ employees: this.employees, managers: this.managers }, company, actorId, dayOf(new Date()));
  }

  private async namesOf(company: string, guids: string[]): Promise<Map<string, string>> {
    if (guids.length === 0) return new Map();
    const people = await this.employees.find({ where: { guid: In([...new Set(guids)]), company } });
    return new Map(people.flatMap((person) => (person.guid ? [[person.guid, `${person.firstName} ${person.lastName}`] as const] : [])));
  }

  /**
   * The position and the KPI template of each participant: one query for each table. The
   * position and the version are the frozen ones. The name is that of the template today.
   */
  private async workFactsOf(participants: CycleParticipant[]): Promise<Map<string, WorkFacts>> {
    const versionIds = [...new Set(participants.flatMap((participant) => participant.kpiVersionId ?? []))];
    const versions = versionIds.length ? await this.templateVersions.find({ where: { versionId: In(versionIds) } }) : [];
    const templateIds = [...new Set(versions.map((version) => version.templateId))];
    const templates = templateIds.length ? await this.templates.find({ where: { templateId: In(templateIds) } }) : [];
    const versionById = new Map(versions.map((version) => [version.versionId, version]));
    const nameById = new Map(templates.map((template) => [template.templateId, template.name]));

    return new Map(
      participants.map((participant) => {
        const version = versionById.get(participant.kpiVersionId ?? '');
        return [
          participant.participantId,
          {
            position: participant.frozenPosition ?? null,
            kpiTemplateName: nameById.get(version?.templateId ?? '') ?? null,
            kpiTemplateVersion: version?.version ?? null,
          },
        ] as const;
      }),
    );
  }

  /** The indicators of one frozen version, with their scales and tables: one query for each kind. */
  private async kpiOfVersion(versionId: string | null) {
    const indicators = versionId ? await this.indicators.find({ where: { versionId } }) : [];
    const ofThese = { indicatorId: In(indicators.map((indicator) => indicator.indicatorId)) };
    const [scales, matrixRows, matrixColumns] = indicators.length
      ? await Promise.all([
          // The threshold order of the KPI details page: the unbounded final row comes last.
          this.scales.find({ where: ofThese, order: { lowerBound: 'ASC', upperBound: { direction: 'ASC', nulls: 'LAST' } } }),
          this.matrixRows.find({ where: ofThese, order: { position: 'ASC' } }),
          this.matrixColumns.find({ where: ofThese, order: { position: 'ASC' } }),
        ])
      : [[], [], []];
    const matrixCells = matrixRows.length
      ? await this.matrixCells.find({ where: { rowId: In(matrixRows.map((row) => row.rowId)) } })
      : [];
    return { indicators, scales, matrixRows, matrixColumns, matrixCells };
  }
}

/**
 * The record that the viewer may change now, locked until the transaction ends. The cycle is
 * locked first, in the order of a launch and a cancellation.
 */
async function lockOwnOpenRecord(manager: EntityManager, viewer: Viewer, accomplishmentId: string) {
  const records = manager.getRepository(Accomplishment);
  const found = await records.findOne({ where: { accomplishmentId } });
  const { actorId, company } = viewer;
  // Only the employee reports. Anyone else learns nothing about the record.
  if (!found || !actorId || found.employeeId !== actorId) throw new NotFoundException(NOT_FOUND);
  const cycle = await manager.getRepository(Cycle).findOne({ where: { cycleId: found.cycleId, company }, lock: LOCK_FOR_READ });
  const record = await records.findOne({ where: { accomplishmentId }, lock: LOCK_FOR_WRITE });
  if (!cycle || !record) throw new NotFoundException(NOT_FOUND);

  if (cycle.state !== 'active') throw new ConflictException(NOT_ACTIVE);
  if (record.status === 'submitted' || record.status === 'verified') {
    throw new ConflictException(`This record is ${record.status}. It cannot be changed.`);
  }
  if (!isWindowOpen(cycle, new Date())) throw new ConflictException(DEADLINE_PASSED);
  if (isFirstSubmissionClosed(record, cycle, new Date())) throw new ConflictException(SUBMISSION_PASSED);
  return { record, cycle, actorId };
}

/**
 * The record that the viewer decides on, locked until the transaction ends. The manager of
 * the day is read inside the transaction, so a manager change that committed first counts.
 */
async function lockRecordToDecide(manager: EntityManager, viewer: Viewer, accomplishmentId: string) {
  const records = manager.getRepository(Accomplishment);
  const found = await records.findOne({ where: { accomplishmentId } });
  const { actorId, company } = viewer;
  if (!found || !actorId || found.employeeId === actorId) throw new NotFoundException(NOT_FOUND);
  const repos = { employees: manager.getRepository(EmployeeDomain), managers: manager.getRepository(ManagerAssignment) };
  const team = await currentTeamOf(repos, company, actorId, dayOf(new Date()));
  if (!team.has(found.employeeId)) throw new NotFoundException(NOT_FOUND);
  const cycle = await manager.getRepository(Cycle).findOne({ where: { cycleId: found.cycleId, company }, lock: LOCK_FOR_READ });
  const record = await records.findOne({ where: { accomplishmentId }, lock: LOCK_FOR_WRITE });
  if (!cycle || !record) throw new NotFoundException(NOT_FOUND);

  if (cycle.state !== 'active') throw new ConflictException(NOT_ACTIVE);
  if (record.status !== 'submitted') throw new ConflictException('This record is not waiting for a decision.');
  if (!isWindowOpen(cycle, new Date())) throw new ConflictException(DEADLINE_PASSED);
  return { record, actorId };
}

/** One value or none for each frozen indicator, from the report. A value for another indicator is refused. */
function valuesFor(indicatorIds: string[], report: Report): Values {
  const unknown = report.actuals.filter((actual) => !indicatorIds.includes(actual.indicatorId));
  if (unknown.length > 0) {
    throw new BadRequestException({
      message: 'Some values belong to no indicator of this record.',
      details: unknown.map(({ indicatorId }) => ({
        field: `actuals.${indicatorId}`,
        code: 'UNKNOWN_INDICATOR',
        message: 'This indicator is not part of the record.',
      })),
    });
  }
  return indicatorIds.map((indicatorId) => {
    const sent = report.actuals.find((actual) => actual.indicatorId === indicatorId);
    return { indicatorId, actualValue: sent?.actualValue ?? null, remarks: sent?.remarks || null };
  });
}

/** What a submission needs beyond a draft: the period has ended, every value, and the correction after a return. */
function assertComplete(cycle: Cycle, record: Accomplishment, values: Values, report: Report): void {
  if (!hasPeriodEnded(cycle, new Date())) throw new UnprocessableEntityException(PERIOD_RUNNING);
  const missing = values
    .filter((value) => value.actualValue === null)
    .map(({ indicatorId }) => ({ field: `actuals.${indicatorId}`, code: 'REQUIRED', message: 'Report a value.' }));
  if (record.status === 'returned' && !report.correctionReason) {
    missing.push({ field: 'correctionReason', code: 'REQUIRED', message: 'Say what you corrected.' });
  }
  if (missing.length > 0) {
    throw new UnprocessableEntityException({ message: 'Complete the report before you submit.', details: missing });
  }
}

function toSnapshot(values: Values): ActualsSnapshot {
  return {
    actuals: values.map(({ indicatorId, actualValue, remarks }) => ({ indicator_id: indicatorId, actual_value: actualValue, remarks })),
  };
}

/** One row for each indicator: a row that exists keeps its id. */
async function writeActuals(manager: EntityManager, accomplishmentId: string, values: Values): Promise<void> {
  const repo = manager.getRepository(AccomplishmentActual);
  const existing = await repo.find({ where: { accomplishmentId } });
  await repo.save(
    values.map((value) => {
      const row = existing.find((candidate) => candidate.indicatorId === value.indicatorId);
      return row ? { ...row, ...value } : repo.create({ actualId: randomUUID(), accomplishmentId, ...value });
    }),
  );
}

/** Appends the next version. The lock on the record keeps two submissions from taking one number. */
async function addVersion(manager: EntityManager, version: Omit<AccomplishmentVersion, 'versionId' | 'version'>): Promise<void> {
  const repo = manager.getRepository(AccomplishmentVersion);
  const latest = await repo.findOne({ where: { accomplishmentId: version.accomplishmentId }, order: { version: 'DESC' } });
  await repo.save(repo.create({ versionId: randomUUID(), version: (latest?.version ?? 0) + 1, ...version }));
}

interface AuditEntry {
  accomplishmentId: string;
  action: string;
  actorId: string;
  reason?: string;
  beforeJson: Record<string, unknown>;
  afterJson: Record<string, unknown>;
}

/** Appends one audit row. It runs in the transaction of the change, so both stand or fall together. */
async function recordAudit(manager: EntityManager, { accomplishmentId, reason, ...entry }: AuditEntry): Promise<void> {
  const audit = manager.getRepository(AuditEvent);
  await audit.save(
    audit.create({
      eventId: randomUUID(),
      entityType: 'accomplishment',
      entityId: accomplishmentId,
      ...entry,
      reason: reason ?? null,
      idempotencyKey: null,
    }),
  );
}

function relationOf(viewer: Viewer, record: Accomplishment, team: ReadonlySet<string>): Relation {
  return {
    isOwn: viewer.actorId !== null && record.employeeId === viewer.actorId,
    isCurrentManager: team.has(record.employeeId),
  };
}

/** The fields that the list and the detail share. */
function describe(record: Accomplishment, cycle: Cycle, names: ReadonlyMap<string, string>) {
  return {
    accomplishmentId: record.accomplishmentId,
    cycleId: cycle.cycleId,
    cycleName: cycle.name,
    cycleState: cycle.state,
    employeeName: names.get(record.employeeId) ?? UNKNOWN_PERSON,
    status: record.status,
    evaluationEnd: cycle.evaluationEnd,
    verificationDeadline: cycle.verificationDeadline?.toISOString() ?? null,
    accomplishmentDeadline: cycle.accomplishmentDeadline?.toISOString() ?? null,
  };
}
