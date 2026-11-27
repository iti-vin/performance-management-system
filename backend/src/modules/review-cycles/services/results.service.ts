import { randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { resultDetailSchema, type ResultDetailDto, type ResultRowDto, type ReleaseResultsRequestDto } from '@pms/shared-types';
import { AuditEvent } from '../../../common/entities/audit-event.entity.js';
import { User } from '../../auth/entities/user.entity.js';
import { EmployeeDomain } from '../../employees/entities/employee-domain.entity.js';
import { CompanyResolver } from '../../kpi-goals/services/company-resolver.service.js';
import { CycleParticipant } from '../entities/cycle-participant.entity.js';
import { Cycle } from '../entities/cycle.entity.js';
import { CycleResultVisibility } from '../entities/cycle-result-visibility.entity.js';
import { readersOf, readsAfterRelease, UNCHOSEN, type Readers } from './result-readers.js';
import { EvaluationSnapshot } from '../entities/evaluation-snapshot.entity.js';
import { ManagerAssignment } from '../entities/manager-assignment.entity.js';
import { Assignment } from '../entities/assignment.entity.js';
import { currentTeamOf, dayOf } from './cycle-facts.js';
import { snapshotsOf } from './result-snapshots.js';
import { viewerOf, type Viewer } from './viewer.js';

const NOT_FOUND = 'Result not found';
const CYCLE_NOT_FOUND = 'Review cycle not found';
const LOCK_FOR_WRITE = { mode: 'pessimistic_write' } as const;

/** One saved result with the cycle and the employee that it belongs to. */
interface Found {
  snapshot: EvaluationSnapshot;
  cycle: Cycle;
  employeeId: string;
}

function rowOf({ snapshot, cycle }: Found): ResultRowDto {
  const { employeeName, position, department } = snapshot.evidenceJson;
  return {
    participantId: snapshot.participantId,
    cycleId: cycle.cycleId,
    cycleName: cycle.name,
    employeeName,
    position,
    department,
    goalsScore: snapshot.goalsComponentScore,
    behavioralScore: snapshot.behavioralComponentScore,
    overallScore: snapshot.overallScore,
    finalizedAt: (snapshot.finalizedAt as Date).toISOString(),
    releasedAt: snapshot.releasedAt?.toISOString() ?? null,
  };
}

const byName = (a: ResultRowDto, b: ResultRowDto) =>
  a.employeeName.localeCompare(b.employeeName) || a.cycleName.localeCompare(b.cycleName);

/**
 * Who may read a result (PRD Res-003): the employee and the current manager once it is
 * released, an HR administrator of the company from finalization on. Nobody reads their own
 * result before its release, an administrator included.
 */
function canRead(viewer: Viewer, { snapshot, employeeId }: Found, team: ReadonlySet<string>, readers: Readers = UNCHOSEN): boolean {
  const isOpened = snapshot.releasedAt !== null && readsAfterRelease({ actorId: viewer.actorId, employeeId, team, readers });
  return isOpened || (viewer.isAdmin && employeeId !== viewer.actorId);
}

/** Finalization and release change a cycle, so they are for an HR administrator with an employee record. */
function assertAdmin(viewer: Viewer): asserts viewer is Viewer & { actorId: string } {
  if (!viewer.isAdmin || !viewer.actorId) {
    throw new ForbiddenException('Only an HR administrator with an employee record can do this.');
  }
}

/** The cycle of the company, locked: writers of reviews and accomplishments wait for it. */
async function lockCycle(manager: EntityManager, company: string, cycleId: string): Promise<Cycle> {
  const cycle = await manager.getRepository(Cycle).findOne({ where: { cycleId, company }, lock: LOCK_FOR_WRITE });
  if (!cycle) throw new NotFoundException(CYCLE_NOT_FOUND);
  return cycle;
}

async function recordAudit(
  manager: EntityManager,
  entry: Pick<AuditEvent, 'entityId' | 'action' | 'actorId' | 'beforeJson' | 'afterJson'>,
): Promise<void> {
  const audit = manager.getRepository(AuditEvent);
  await audit.save(audit.create({ eventId: randomUUID(), entityType: 'cycle', reason: null, idempotencyKey: null, ...entry }));
}

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(Cycle) private readonly cycles: Repository<Cycle>,
    @InjectRepository(CycleParticipant) private readonly participants: Repository<CycleParticipant>,
    @InjectRepository(EvaluationSnapshot) private readonly snapshots: Repository<EvaluationSnapshot>,
    @InjectRepository(ManagerAssignment) private readonly managers: Repository<ManagerAssignment>,
    @InjectRepository(EmployeeDomain) private readonly employees: Repository<EmployeeDomain>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(CycleResultVisibility) private readonly visibility: Repository<CycleResultVisibility>,
    private readonly companies: CompanyResolver,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Scores every participant from the frozen evidence and locks the cycle, in one
   * transaction: the cycle is completed, and no review or report changes after it
   * (Res-001, Res-002). It releases nothing.
   */
  async finalize(userId: string, cycleId: string): Promise<ResultRowDto[]> {
    const viewer = await viewerOf(this.users, this.companies, userId);
    assertAdmin(viewer);

    await this.dataSource.transaction(async (manager) => {
      const cycle = await lockCycle(manager, viewer.company, cycleId);
      if (cycle.state !== 'active' || cycle.finalizedAt) throw new ConflictException('Only an active cycle can be finalized.');

      const finalized = { finalizedBy: viewer.actorId, finalizedAt: new Date() };
      const { snapshots, assignments } = await snapshotsOf(manager, viewer.company, cycle);
      const saved = manager.getRepository(EvaluationSnapshot);
      await saved.save(snapshots.map((snapshot) => saved.create({ ...snapshot, ...finalized, releasedAt: null })));
      await manager.getRepository(Assignment).save(assignments.map((row) => ({ ...row, state: 'completed' as const })));
      await manager.getRepository(Cycle).save({ ...cycle, state: 'completed', finalizedAt: finalized.finalizedAt });
      await recordAudit(manager, {
        entityId: cycleId,
        action: 'finalized',
        actorId: viewer.actorId,
        beforeJson: { state: cycle.state },
        afterJson: { state: 'completed', resultCount: snapshots.length },
      });
    });

    return this.listOfCycle(userId, cycleId);
  }

  /** Makes the results of a finalized cycle visible, as its own action (Res-003). It cannot be undone. */
  async release(userId: string, cycleId: string, chosen: ReleaseResultsRequestDto = {}): Promise<ResultRowDto[]> {
    const viewer = await viewerOf(this.users, this.companies, userId);
    assertAdmin(viewer);

    await this.dataSource.transaction(async (manager) => {
      const cycle = await lockCycle(manager, viewer.company, cycleId);
      if (!cycle.finalizedAt) throw new ConflictException('Finalize the cycle before you release its results.');
      if (cycle.releasedAt) throw new ConflictException('The results of this cycle are already released.');

      const releasedAt = new Date();
      const repo = manager.getRepository(EvaluationSnapshot);
      const snapshots = await repo.find({ where: { cycleId } });
      await repo.save(snapshots.map((snapshot) => ({ ...snapshot, releasedAt })));
      await manager.getRepository(Cycle).save({ ...cycle, releasedAt });
      const visibility = manager.getRepository(CycleResultVisibility);
      // A release chooses who reads the results. What later reviewers read stays as the cycle holds it.
      const { employeeVisible, managerVisible } = chosen;
      const readers = readersOf({ employeeVisible, managerVisible }, await visibility.findOne({ where: { cycleId } }));
      await visibility.save({ cycleId, ...readers });
      await recordAudit(manager, {
        entityId: cycleId,
        action: 'released',
        actorId: viewer.actorId,
        beforeJson: { releasedAt: null },
        afterJson: { releasedAt: releasedAt.toISOString(), resultCount: snapshots.length, ...readers },
      });
    });

    return this.listOfCycle(userId, cycleId);
  }

  /** The results of one cycle, for an HR administrator of its company. */
  async listOfCycle(userId: string, cycleId: string): Promise<ResultRowDto[]> {
    const viewer = await viewerOf(this.users, this.companies, userId);
    if (!viewer.isAdmin) throw new ForbiddenException('Only an HR administrator can read the results of a cycle.');
    const cycle = await this.cycles.findOne({ where: { cycleId, company: viewer.company } });
    if (!cycle) throw new NotFoundException(CYCLE_NOT_FOUND);
    return this.readable(viewer, [cycle]);
  }

  /** Every result that the caller may read. */
  async list(userId: string): Promise<ResultRowDto[]> {
    const viewer = await viewerOf(this.users, this.companies, userId);
    return this.readable(viewer, await this.cycles.find({ where: { company: viewer.company } }));
  }

  /** One result with its evidence. A result that the caller may not read answers like one that does not exist. */
  async get(userId: string, participantId: string): Promise<ResultDetailDto> {
    const viewer = await viewerOf(this.users, this.companies, userId);
    const snapshot = await this.snapshots.findOne({ where: { participantId } });
    const cycle = snapshot && (await this.cycles.findOne({ where: { cycleId: snapshot.cycleId, company: viewer.company } }));
    const participant = cycle && (await this.participants.findOne({ where: { participantId } }));
    if (!snapshot || !cycle || !participant) throw new NotFoundException(NOT_FOUND);

    const found = { snapshot, cycle, employeeId: participant.employeeId };
    const visibility = await this.visibilityOf([snapshot]);
    if (!canRead(viewer, found, await this.teamOf(viewer), visibility.get(cycle.cycleId))) throw new NotFoundException(NOT_FOUND);
    // The contract names what leaves the server: anything else in the stored evidence is dropped.
    return resultDetailSchema.parse({
      ...snapshot.evidenceJson,
      ...rowOf(found),
      evaluationStart: cycle.evaluationStart,
      evaluationEnd: cycle.evaluationEnd,
    });
  }

  private async readable(viewer: Viewer, cycles: Cycle[]): Promise<ResultRowDto[]> {
    if (cycles.length === 0) return [];
    const cycleById = new Map(cycles.map((cycle) => [cycle.cycleId, cycle]));
    const snapshots = await this.snapshots.find({ where: { cycleId: In([...cycleById.keys()]) } });
    if (snapshots.length === 0) return [];
    const [participants, team, visibility] = await Promise.all([
      this.participants.find({ where: { participantId: In(snapshots.map((snapshot) => snapshot.participantId)) } }),
      this.teamOf(viewer),
      this.visibilityOf(snapshots),
    ]);
    const employeeOf = new Map(participants.map((participant) => [participant.participantId, participant.employeeId]));

    return snapshots
      .flatMap((snapshot) => {
        const cycle = cycleById.get(snapshot.cycleId);
        const employeeId = employeeOf.get(snapshot.participantId);
        if (!cycle || !employeeId) return [];
        const found = { snapshot, cycle, employeeId };
        return canRead(viewer, found, team, visibility.get(cycle.cycleId)) ? [rowOf(found)] : [];
      })
      .sort(byName);
  }

  /** The stored choice of each released cycle. Nothing is read before a release. */
  private async visibilityOf(snapshots: EvaluationSnapshot[]): Promise<Map<string, CycleResultVisibility>> {
    const released = [...new Set(snapshots.filter((row) => row.releasedAt !== null).map((row) => row.cycleId))];
    if (released.length === 0) return new Map();
    const rows = await this.visibility.find({ where: { cycleId: In(released) } });
    return new Map(rows.map((row) => [row.cycleId, row]));
  }

  private async teamOf({ company, actorId }: Viewer): Promise<Set<string>> {
    if (!actorId) return new Set();
    return currentTeamOf({ employees: this.employees, managers: this.managers }, company, actorId, dayOf(new Date()));
  }
}
