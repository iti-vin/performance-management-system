import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { CycleHistoryEntryDto } from '@pms/shared-types';
import { AuditEvent } from '../../../common/entities/audit-event.entity.js';
import { User } from '../../auth/entities/user.entity.js';
import { EmployeeDomain } from '../../employees/entities/employee-domain.entity.js';
import { CompanyResolver } from '../../kpi-goals/services/company-resolver.service.js';
import { Accomplishment } from '../entities/accomplishment.entity.js';
import { Assignment } from '../entities/assignment.entity.js';
import { CycleParticipant } from '../entities/cycle-participant.entity.js';
import { CycleStage } from '../entities/cycle-stage.entity.js';
import { Cycle } from '../entities/cycle.entity.js';
import { evaluatorNameFor, isAnonymous } from './anonymity.js';
import { nameOf, peopleOf } from './reviews.service.js';
import { viewerOf } from './viewer.js';

/** Evidence stays in its own screen, behind its own access rule. */
const HIDDEN_KEYS = new Set(['answers', 'actuals', 'remarks', 'answeredCount']);
type Change = NonNullable<CycleHistoryEntryDto['after']>;
const isPlain = (value: unknown): value is Change[string] => value === null || ['string', 'number', 'boolean'].includes(typeof value);

/** The plain values of a stored change. Nested content and record ids are left out. */
function plainOf(stored: Record<string, unknown> | null): Change | null {
  const kept = Object.entries(stored ?? {}).flatMap(([key, value]) =>
    !HIDDEN_KEYS.has(key) && !key.endsWith('Id') && isPlain(value) ? [[key, value] as const] : [],
  );
  return kept.length > 0 ? Object.fromEntries(kept) : null;
}

@Injectable()
export class CycleHistoryService {
  constructor(
    @InjectRepository(Cycle) private readonly cycles: Repository<Cycle>,
    @InjectRepository(CycleParticipant) private readonly participants: Repository<CycleParticipant>,
    @InjectRepository(CycleStage) private readonly stages: Repository<CycleStage>,
    @InjectRepository(Assignment) private readonly assignments: Repository<Assignment>,
    @InjectRepository(Accomplishment) private readonly accomplishments: Repository<Accomplishment>,
    @InjectRepository(AuditEvent) private readonly events: Repository<AuditEvent>,
    @InjectRepository(EmployeeDomain) private readonly employees: Repository<EmployeeDomain>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly companies: CompanyResolver,
  ) {}

  /**
   * The history of one cycle for an HR administrator: the actor, the action, the time, the
   * reason, and the state before and after. A peer or a direct report stays unnamed (Res-008),
   * also on a stage that their submission opened.
   */
  async list(userId: string, cycleId: string): Promise<CycleHistoryEntryDto[]> {
    const { company, isAdmin } = await viewerOf(this.users, this.companies, userId);
    if (!isAdmin) throw new ForbiddenException('Only an HR administrator can read the history of a cycle.');
    if (!(await this.cycles.findOne({ where: { cycleId, company } }))) throw new NotFoundException('Review cycle not found');

    const [participants, stages, assignments, records] = await Promise.all([
      this.participants.find({ where: { cycleId } }),
      this.stages.find({ where: { cycleId } }),
      this.assignments.find({ where: { cycleId } }),
      this.accomplishments.find({ where: { cycleId } }),
    ]);
    const eventsOf = (entityType: string, ids: string[]) =>
      ids.length ? this.events.find({ where: { entityType, entityId: In(ids) } }) : Promise.resolve([]);
    const events = (
      await Promise.all([
        eventsOf('cycle', [cycleId]),
        eventsOf('assignment', assignments.map((row) => row.assignmentId)),
        eventsOf('accomplishment', records.map((row) => row.accomplishmentId)),
      ])
    ).flat();
    const people = await peopleOf(this.employees, company, [
      ...participants.map((row) => row.employeeId),
      ...events.flatMap((row) => row.actorId ?? []),
    ]);

    const employeeOf = new Map(participants.map((row) => [row.participantId, row.employeeId]));
    const perspectiveOf = new Map(stages.map((row) => [row.stageId, row.perspective]));
    const assignmentOf = new Map(assignments.map((row) => [row.assignmentId, row]));
    const recordOf = new Map(records.map((row) => [row.accomplishmentId, row]));

    /**
     * The anonymous perspective that the actor acted in. A row that another review caused, an
     * opened stage, is an act in that review: its perspective counts, not that of the row.
     */
    const hiddenAs = (event: AuditEvent) => {
      const acted = assignmentOf.get(String(event.afterJson?.afterAssignmentId ?? event.entityId));
      const perspective = acted && acted.evaluatorId === event.actorId ? perspectiveOf.get(acted.stageId) : undefined;
      return perspective && isAnonymous(perspective) ? perspective : undefined;
    };

    return events
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .map((event) => {
        const assignment = assignmentOf.get(event.entityId);
        const participantId = assignment?.participantId ?? recordOf.get(event.entityId)?.participantId;
        const employeeId = participantId ? employeeOf.get(participantId) : undefined;
        const hidden = hiddenAs(event);
        const actor = event.actorId ? nameOf(people.get(event.actorId)) : 'System';
        return {
            eventId: event.eventId,
            occurredAt: event.occurredAt.toISOString(),
            area: assignment ? ('review' as const) : participantId ? ('report' as const) : ('cycle' as const),
            employeeName: employeeId ? nameOf(people.get(employeeId)) : null,
            perspective: assignment ? (perspectiveOf.get(assignment.stageId) ?? null) : null,
            action: event.action,
            actorName: hidden ? evaluatorNameFor(hidden, actor, false) : actor,
            reason: event.reason,
            before: plainOf(event.beforeJson),
            after: plainOf(event.afterJson),
        };
      });
  }
}
