import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { ReviewListQueryDto, ReviewListResponseDto, ReviewListRowDto } from '@pms/shared-types';
import { User } from '../../auth/entities/user.entity.js';
import { EmployeeDomain } from '../../employees/entities/employee-domain.entity.js';
import { CompanyResolver } from '../../kpi-goals/services/company-resolver.service.js';
import { Assignment } from '../entities/assignment.entity.js';
import { CycleParticipant } from '../entities/cycle-participant.entity.js';
import { CycleStage } from '../entities/cycle-stage.entity.js';
import { ManagerAssignment } from '../entities/manager-assignment.entity.js';
import { Cycle } from '../entities/cycle.entity.js';
import { evaluatorNameFor } from './anonymity.js';
import { currentTeamOf, dayOf } from './cycle-facts.js';
import { departmentFor, isListed, PARTICIPANT_CYCLE_STATES, viewerOf } from './viewer.js';

const UNKNOWN_PERSON = 'Unknown employee';

/** A row with what the list sorts and filters by beyond its own fields. */
interface SortableRow extends ReviewListRowDto {
  stageOrder: number;
  /** The subject is in the team of the caller today. */
  isTeam: boolean;
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Cycle) private readonly cycles: Repository<Cycle>,
    @InjectRepository(CycleParticipant) private readonly participants: Repository<CycleParticipant>,
    @InjectRepository(CycleStage) private readonly stages: Repository<CycleStage>,
    @InjectRepository(Assignment) private readonly assignments: Repository<Assignment>,
    @InjectRepository(EmployeeDomain) private readonly employees: Repository<EmployeeDomain>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(ManagerAssignment) private readonly managers: Repository<ManagerAssignment>,
    private readonly companies: CompanyResolver,
  ) {}

  /**
   * The assignments that the caller may see (PRD Rev-001), then the filters, the search, the
   * order, and the page, all applied to that same set, so none of them can widen it (PRD 2.4).
   * An HR administrator sees every assignment of the company. Anyone else sees, in active and
   * completed cycles, the ones they answer, the ones about them, and the ones about their team
   * (decisions D3 and D5). An anonymous row never names its evaluator.
   */
  async list(userId: string, query: ReviewListQueryDto): Promise<ReviewListResponseDto> {
    const rows = await this.visibleRows(userId);
    const matching = rows.filter((row) => matchesQuery(row, query)).sort(byDeadlineThenSubject);
    const first = (query.page - 1) * query.pageSize;

    return {
      items: matching.slice(first, first + query.pageSize).map(({ stageOrder: _stageOrder, isTeam: _isTeam, ...row }) => row),
      page: query.page,
      pageSize: query.pageSize,
      totalItems: matching.length,
      ...filterOptionsOf(rows),
    };
  }

  /** Every assignment in the scope of the caller, as list rows. The company scope comes from the cycles. */
  private async visibleRows(userId: string): Promise<SortableRow[]> {
    const { company, actorId, isAdmin } = await viewerOf(this.users, this.companies, userId);
    // Without an employee GUID nobody has a review. Never fall back to the company list.
    if (!isAdmin && !actorId) return [];

    const cycles = await this.cycles.find({ where: isAdmin ? { company } : { company, state: In([...PARTICIPANT_CYCLE_STATES]) } });
    if (cycles.length === 0) return [];
    const cycleIds = In(cycles.map((cycle) => cycle.cycleId));
    const [participants, stages, team] = await Promise.all([
      this.participants.find({ where: { cycleId: cycleIds } }),
      this.stages.find({ where: { cycleId: cycleIds } }),
      actorId ? currentTeamOf({ employees: this.employees, managers: this.managers }, company, actorId, dayOf(new Date())) : new Set<string>(),
    ]);
    const participantById = new Map(participants.map((participant) => [participant.participantId, participant]));
    const assignments = await this.assignments.find({ where: { cycleId: cycleIds } });
    if (assignments.length === 0) return [];

    const people = await peopleOf(this.employees, company, [
      ...participants.map((participant) => participant.employeeId),
      ...assignments.map((row) => row.evaluatorId),
    ]);
    const cycleById = new Map(cycles.map((cycle) => [cycle.cycleId, cycle]));
    const stageById = new Map(stages.map((stage) => [stage.stageId, stage]));
    const now = new Date();

    return assignments.flatMap((assignment) => {
      const cycle = cycleById.get(assignment.cycleId);
      const stage = stageById.get(assignment.stageId);
      const participant = participantById.get(assignment.participantId);
      if (!cycle || !stage) return [];
      const subjectOf = { cycleState: cycle.state, subjectId: participant?.employeeId, team };
      if (!isAdmin && !isListed(actorId, { ...subjectOf, evaluatorId: assignment.evaluatorId })) return [];
      const subject = subjectFields(participant, people.get(participant?.employeeId ?? ''));
      return [
        toRow({
          assignment,
          cycle,
          stage,
          subject: {
            ...subject,
            subjectDepartment: departmentFor({ isAdmin, actorId }, { ...subjectOf, department: subject.subjectDepartment }),
          },
          isTeam: participant !== undefined && team.has(participant.employeeId),
          evaluatorName: evaluatorNameFor(stage.perspective, nameOf(people.get(assignment.evaluatorId)), assignment.evaluatorId === actorId),
          isAssignedToCaller: assignment.evaluatorId === actorId,
          now,
        }),
      ];
    });
  }
}

/** Employees by GUID, inside the company: one query for every name and department of a page. */
export async function peopleOf(employees: Repository<EmployeeDomain>, company: string, guids: string[]): Promise<Map<string, EmployeeDomain>> {
  const people = await employees.find({ where: { guid: In([...new Set(guids)]), company } });
  return new Map(people.flatMap((person) => (person.guid ? [[person.guid, person] as const] : [])));
}

export function nameOf(person: EmployeeDomain | undefined): string {
  return person ? `${person.firstName} ${person.lastName}` : UNKNOWN_PERSON;
}

/** What a row says about its subject: the position of the cycle, the name and the department of today. */
export function subjectFields(participant: CycleParticipant | undefined, person: EmployeeDomain | undefined) {
  return {
    subjectName: nameOf(person),
    subjectPosition: participant?.frozenPosition ?? null,
    subjectDepartment: person?.department ?? null,
  };
}

interface RowSource {
  assignment: Assignment;
  cycle: Cycle;
  stage: CycleStage;
  subject: ReturnType<typeof subjectFields>;
  evaluatorName: string;
  isAssignedToCaller: boolean;
  isTeam: boolean;
  now: Date;
}

/** Work that is still expected: an active cycle, a deadline behind us, and nothing submitted. A display only (Rev-004). */
export function isOverdue(assignment: Assignment, cycle: Cycle, now: Date): boolean {
  const isOpen = assignment.state !== 'submitted' && assignment.state !== 'completed';
  return cycle.state === 'active' && isOpen && assignment.deadline !== null && assignment.deadline < now;
}

function toRow({ assignment, cycle, stage, subject, evaluatorName, isAssignedToCaller, isTeam, now }: RowSource): SortableRow {
  return {
    assignmentId: assignment.assignmentId,
    cycleId: cycle.cycleId,
    cycleName: cycle.name,
    cycleState: cycle.state,
    ...subject,
    evaluatorName,
    isAssignedToCaller,
    perspective: stage.perspective,
    state: assignment.state,
    deadline: assignment.deadline?.toISOString() ?? null,
    isOverdue: isOverdue(assignment, cycle, now),
    stageOrder: stage.sortOrder,
    isTeam,
  };
}

function matchesQuery(row: SortableRow, query: ReviewListQueryDto): boolean {
  const filters: [string | undefined, string | null][] = [
    [query.cycleId, row.cycleId],
    [query.cycleState, row.cycleState],
    [query.perspective, row.perspective],
    [query.department, row.subjectDepartment],
  ];
  if (filters.some(([wanted, actual]) => wanted !== undefined && wanted !== actual)) return false;
  if (query.state && !(query.state === 'overdue' ? row.isOverdue : row.state === query.state)) return false;
  if (query.view && !isInView(row, query.view)) return false;
  if (!query.q) return true;
  return [row.subjectName, row.evaluatorName, row.cycleName].join(' ').toLowerCase().includes(query.q.toLowerCase());
}

function isInView(row: SortableRow, view: NonNullable<ReviewListQueryDto['view']>): boolean {
  if (view === 'mine') return row.isAssignedToCaller;
  if (view === 'team') return row.isTeam;
  return row.state === 'submitted' || row.state === 'completed';
}

/** What the filters can offer: only what the rows in scope hold, so an option reveals nothing more. */
function filterOptionsOf(rows: readonly ReviewListRowDto[]): Pick<ReviewListResponseDto, 'cycles' | 'departments'> {
  const cycles = new Map(rows.map((row) => [row.cycleId, row.cycleName]));
  return {
    cycles: [...cycles].map(([cycleId, name]) => ({ cycleId, name })).sort((a, b) => a.name.localeCompare(b.name)),
    departments: [...new Set(rows.flatMap((row) => row.subjectDepartment ?? []))].sort(),
  };
}

/** The earliest deadline first, rows with none last; then by subject, cycle, and stage, so the order never changes by itself. */
function byDeadlineThenSubject(a: SortableRow, b: SortableRow): number {
  const left = a.deadline ?? '9999';
  const right = b.deadline ?? '9999';
  return (
    left.localeCompare(right) ||
    a.subjectName.localeCompare(b.subjectName) ||
    a.cycleName.localeCompare(b.cycleName) ||
    a.stageOrder - b.stageOrder
  );
}
