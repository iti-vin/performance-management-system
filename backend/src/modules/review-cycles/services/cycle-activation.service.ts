import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuditEvent } from '../../../common/entities/audit-event.entity.js';
import { CompanyResolver } from '../../kpi-goals/services/company-resolver.service.js';
import { Accomplishment } from '../entities/accomplishment.entity.js';
import { Assignment } from '../entities/assignment.entity.js';
import { CycleParticipant } from '../entities/cycle-participant.entity.js';
import { CycleStage } from '../entities/cycle-stage.entity.js';
import { Cycle } from '../entities/cycle.entity.js';
import { dayOf, gatherReadiness } from './cycle-facts.js';
import { checkReadiness } from './cycle-readiness.js';
import { buildAssignments, notReady, openWorkRecords, refreezeParticipants, txFactRepos, txLookups } from './cycle-work.js';

/** How often the server looks for a scheduled cycle whose day has come. */
const CHECK_EVERY_MS = 60_000;
const LOCK_FOR_WRITE = { mode: 'pessimistic_write' } as const;
const BLOCKED = 'activation_blocked';

type AuditEntry = Pick<AuditEvent, 'entityId' | 'action' | 'actorId' | 'beforeJson' | 'afterJson'>;

async function recordAudit(manager: EntityManager, entry: AuditEntry): Promise<void> {
  const audit = manager.getRepository(AuditEvent);
  await audit.save(audit.create({ eventId: randomUUID(), entityType: 'cycle', reason: null, idempotencyKey: null, ...entry }));
}

/** The cycle of the company, locked, with its stages and participants and the facts that readiness reads. */
async function readCycle(manager: EntityManager, cycle: Cycle) {
  const { cycleId } = cycle;
  const stages = await manager.getRepository(CycleStage).find({ where: { cycleId }, order: { sortOrder: 'ASC' } });
  const rows = await manager.getRepository(CycleParticipant).find({ where: { cycleId } });
  const now = new Date();
  const { input, evaluators } = await gatherReadiness(txFactRepos(manager), cycle.company, cycle, stages, rows, now);
  return { stages, rows, evaluators, issues: checkReadiness(input) };
}

/** Writes why a due cycle cannot activate, unless its latest audit row already says the same. */
async function recordBlocked(manager: EntityManager, cycleId: string, problems: string[]): Promise<void> {
  const latest = await manager.getRepository(AuditEvent).findOne({ where: { entityId: cycleId }, order: { occurredAt: 'DESC' } });
  const isKnown = latest?.action === BLOCKED && JSON.stringify(latest.afterJson?.problems) === JSON.stringify(problems);
  if (isKnown) return;
  await recordAudit(manager, {
    entityId: cycleId,
    action: BLOCKED,
    actorId: null,
    beforeJson: { state: 'scheduled' },
    afterJson: { state: 'scheduled', problems },
  });
}

/**
 * Activates one due cycle with the versions that scheduling froze. A cycle that is not ready,
 * for example with an archived template or a window that passed, stays scheduled with the
 * reason, and nothing is created (PRD Cyc-008). The lock makes a second run find it active.
 */
async function activate(manager: EntityManager, cycleId: string): Promise<void> {
  const cycles = manager.getRepository(Cycle);
  const cycle = await cycles.findOne({ where: { cycleId }, lock: LOCK_FOR_WRITE });
  if (!cycle || cycle.state !== 'scheduled' || !cycle.activationDate || cycle.activationDate > dayOf(new Date())) return;

  const { stages, rows, evaluators, issues } = await readCycle(manager, cycle);
  if (issues.length > 0) {
    await recordBlocked(manager, cycleId, issues.map((issue) => issue.message));
    return;
  }
  const assignments = buildAssignments(manager.getRepository(Assignment), { cycleId, stages, rows, evaluators });
  await manager.getRepository(Assignment).save(assignments);
  await openWorkRecords(manager.getRepository(Accomplishment), cycle, rows);
  await cycles.save({ ...cycle, state: 'active' });
  await recordAudit(manager, {
    entityId: cycleId,
    action: 'activated',
    actorId: null,
    beforeJson: { state: 'scheduled' },
    afterJson: { state: 'active', participantCount: rows.length, assignmentCount: assignments.length },
  });
}

/**
 * Scheduling and activation of a review cycle (PRD Cyc-006, Cyc-008). The server looks for
 * due cycles with its own timer, so no browser has to be open.
 */
@Injectable()
export class CycleActivationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CycleActivationService.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    @InjectRepository(Cycle) private readonly cycles: Repository<Cycle>,
    private readonly companies: CompanyResolver,
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.activateDue(), CHECK_EVERY_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Freezes a ready draft and sets it to activate on the day the assessment starts. It
   * creates no assignment yet.
   */
  async schedule(userId: string, cycleId: string): Promise<void> {
    await this.change(userId, cycleId, async (manager, cycle, actorId) => {
      if (cycle.state !== 'draft') throw new ConflictException('Only a draft cycle can be scheduled.');
      const { rows, issues } = await readCycle(manager, cycle);
      if (issues.length > 0) throw notReady(issues);
      const activationDate = dayOf(cycle.assessmentStart as Date);
      if (activationDate <= dayOf(new Date())) {
        throw new UnprocessableEntityException('The assessment starts today or earlier. Launch the cycle instead.');
      }

      const refrozenCount = await refreezeParticipants(manager, txLookups(manager), cycle.company, rows);
      await manager.getRepository(Cycle).save({ ...cycle, state: 'scheduled', activationDate });
      await recordAudit(manager, {
        entityId: cycleId,
        action: 'scheduled',
        actorId,
        beforeJson: { state: 'draft' },
        afterJson: { state: 'scheduled', activationDate, refrozenCount },
      });
    });
  }

  /** Returns a scheduled cycle to draft, so HR can change or repair it. */
  async unschedule(userId: string, cycleId: string): Promise<void> {
    await this.change(userId, cycleId, async (manager, cycle, actorId) => {
      if (cycle.state !== 'scheduled') throw new ConflictException('Only a scheduled cycle can return to draft.');
      const { activationDate } = cycle;
      await manager.getRepository(Cycle).save({ ...cycle, state: 'draft', activationDate: null });
      await recordAudit(manager, {
        entityId: cycleId,
        action: 'unscheduled',
        actorId,
        beforeJson: { state: 'scheduled', activationDate },
        afterJson: { state: 'draft', activationDate: null },
      });
    });
  }

  /** Activates every scheduled cycle whose day has come. One failure does not stop the others. */
  async activateDue(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const today = dayOf(new Date());
      const waiting = await this.cycles.find({ where: { state: 'scheduled' } });
      for (const { cycleId, activationDate } of waiting) {
        if (!activationDate || activationDate > today) continue;
        await this.dataSource
          .transaction((manager) => activate(manager, cycleId))
          .catch((error: unknown) => this.logger.error(`Cycle ${cycleId} did not activate`, error instanceof Error ? error.stack : error));
      }
    } catch (error) {
      this.logger.error('The scheduled cycles could not be read', error instanceof Error ? error.stack : error);
    } finally {
      this.isRunning = false;
    }
  }

  /** One change of a cycle of the caller company, under its lock, by an account with an employee record. */
  private async change(
    userId: string,
    cycleId: string,
    run: (manager: EntityManager, cycle: Cycle, actorId: string) => Promise<void>,
  ): Promise<void> {
    const { company, actorId } = await this.companies.resolveAccount(userId);
    if (!actorId) throw new ForbiddenException('Your account has no employee record, so it cannot change a cycle.');
    await this.dataSource.transaction(async (manager) => {
      const cycle = await manager.getRepository(Cycle).findOne({ where: { cycleId, company }, lock: LOCK_FOR_WRITE });
      if (!cycle) throw new NotFoundException('Review cycle not found');
      await run(manager, cycle, actorId);
    });
  }
}
