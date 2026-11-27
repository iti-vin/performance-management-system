import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { accomplishmentDeadlineProblem, type ReviewCycleListRowDto, type ReviewCycleParticipantDto } from '@pms/shared-types';
import { AuditEvent } from '../../../common/entities/audit-event.entity.js';
import { CompanyResolver } from '../../kpi-goals/services/company-resolver.service.js';
import { BehavioralTemplateVersion } from '../../behavioral-assessment/entities/behavioral-template-version.entity.js';
import { BehavioralTemplate } from '../../behavioral-assessment/entities/behavioral-template.entity.js';
import { EmployeeDomain } from '../../employees/entities/employee-domain.entity.js';
import { EmployeeStatus } from '../../employees/types/employee-status.enum.js';
import { KpiGoalTemplate } from '../../kpi-goals/entities/kpi-goal-template.entity.js';
import { KpiTemplateVersion } from '../../kpi-goals/entities/kpi-template-version.entity.js';
import { dayOf, eligibleHrEvaluatorIds, gatherReadiness, type FactRepos, appliedManagersOf } from './cycle-facts.js';
import { isOverdue, nameOf, peopleOf, subjectFields } from './reviews.service.js';
import { checkReadiness, type ReadinessIssue } from './cycle-readiness.js';
import { User } from '../../auth/entities/user.entity.js';
import { ManagerAssignment } from '../entities/manager-assignment.entity.js';
import { resolveParticipants, type Lookups, type ResolvedParticipant } from './participant-resolver.js';
import { evaluatorNameFor } from './anonymity.js';
import { assertOpenCycle } from './assert-open-cycle.js';
import { buildAssignments, notReady, openWorkRecords, refreezeParticipants, templateIdsOf, txFactRepos, txLookups } from './cycle-work.js';
import { planExtension, type ExtensionPlan } from './cycle-extension.js';
import type { ExtendReviewCycleDto } from '../dtos/extend-review-cycle.dto.js';
import { CreateReviewCycleDto } from '../dtos/create-review-cycle.dto.js';
import { Accomplishment } from '../entities/accomplishment.entity.js';
import { Assignment } from '../entities/assignment.entity.js';
import { CycleParticipant } from '../entities/cycle-participant.entity.js';
import { CyclePeerEvaluator } from '../entities/cycle-peer-evaluator.entity.js';
import { CycleResultVisibility } from '../entities/cycle-result-visibility.entity.js';
import { readersOf, type Readers } from './result-readers.js';
import { CycleStage } from '../entities/cycle-stage.entity.js';
import { Cycle } from '../entities/cycle.entity.js';

const NO_ACTOR = 'Your account has no employee ID to record this change under. Ask your administrator to link it.';

interface WorkContext {
  cycle: Cycle;
  stages: ReadonlyMap<string, CycleStage>;
  people: ReadonlyMap<string, EmployeeDomain>;
  now: Date;
}

/** The assignments of one participant, in stage order. One whose stage is gone is left out. */
function workOf(assignments: Assignment[], { cycle, stages, people, now }: WorkContext): ReviewCycleParticipantDto['assignments'] {
  return assignments
    .flatMap((assignment) => {
      const stage = stages.get(assignment.stageId);
      return stage ? [{ assignment, stage }] : [];
    })
    .sort((a, b) => a.stage.sortOrder - b.stage.sortOrder)
    .map(({ assignment, stage }) => ({
      assignmentId: assignment.assignmentId,
      perspective: stage.perspective,
      // Nobody reads the evaluator of an anonymous stage here, the administrator included (Res-008).
      evaluatorName: evaluatorNameFor(stage.perspective, nameOf(people.get(assignment.evaluatorId)), false),
      state: assignment.state,
      isOverdue: isOverdue(assignment, cycle, now),
      deadline: assignment.deadline?.toISOString() ?? null,
    }));
}

@Injectable()
export class ReviewCyclesService {
  constructor(
    @InjectRepository(Cycle) private readonly cycles: Repository<Cycle>,
    @InjectRepository(CycleParticipant) private readonly participants: Repository<CycleParticipant>,
    @InjectRepository(CycleStage) private readonly stages: Repository<CycleStage>,
    @InjectRepository(Assignment) private readonly assignments: Repository<Assignment>,
    // Read-only lookups of the other modules, used to resolve the participants of a cycle.
    @InjectRepository(EmployeeDomain) private readonly employees: Repository<EmployeeDomain>,
    @InjectRepository(KpiGoalTemplate) private readonly kpiTemplates: Repository<KpiGoalTemplate>,
    @InjectRepository(KpiTemplateVersion) private readonly kpiVersions: Repository<KpiTemplateVersion>,
    @InjectRepository(BehavioralTemplate) private readonly behavioralTemplates: Repository<BehavioralTemplate>,
    @InjectRepository(BehavioralTemplateVersion) private readonly behavioralVersions: Repository<BehavioralTemplateVersion>,
    @InjectRepository(ManagerAssignment) private readonly managers: Repository<ManagerAssignment>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(CyclePeerEvaluator) private readonly peers: Repository<CyclePeerEvaluator>,
    @InjectRepository(CycleResultVisibility) private readonly visibility: Repository<CycleResultVisibility>,
    private readonly companies: CompanyResolver,
    private readonly dataSource: DataSource,
  ) {}

  private get factRepos(): FactRepos {
    return {
      employees: this.employees,
      managers: this.managers,
      users: this.users,
      peers: this.peers,
      kpiVersions: this.kpiVersions,
      kpiTemplates: this.kpiTemplates,
      behavioralVersions: this.behavioralVersions,
      behavioralTemplates: this.behavioralTemplates,
    };
  }

  private get lookups(): Lookups {
    return {
      employees: this.employees,
      kpiTemplates: this.kpiTemplates,
      kpiVersions: this.kpiVersions,
      behavioralTemplates: this.behavioralTemplates,
      behavioralVersions: this.behavioralVersions,
    };
  }

  /**
   * Saves a draft: the cycle, its stages, and one audit row, in one transaction. The
   * company and the actor come from the signed-in account, never from the body.
   */
  async create(dto: CreateReviewCycleDto, userId: string): Promise<ReviewCycleDetail> {
    assertValidCycle(dto);
    const { company, actorId } = await this.resolveActor(userId);
    await this.assertStageEvaluators(company, dto);
    const resolved = await resolveParticipants(this.lookups, company, dto.participants ?? []);
    await this.assertPeers(company, dto);
    const cycleId = randomUUID();
    const name = dto.name.trim();

    await this.inTransaction(async (stores) => {
      await stores.cycles.save(
        stores.cycles.create({
          cycleId,
          company,
          name,
          reviewType: dto.reviewType,
          state: 'draft',
          evaluationStart: dto.evaluationStart,
          evaluationEnd: dto.evaluationEnd,
          assessmentStart: new Date(dto.assessmentStart),
          verificationDeadline: new Date(dto.verificationDeadline),
          ...optionalDetails(dto),
          activationDate: null,
          goalsWeight: dto.goalsWeight,
          behavioralWeight: dto.behavioralWeight,
          anonymityThreshold: dto.anonymityThreshold ?? null,
          cancelledReason: null,
          finalizedAt: null,
          releasedAt: null,
          idempotencyKey: null,
        }),
      );
      const stages = buildStages(stores, cycleId, dto);
      await stores.stages.save(stages);
      await saveParticipants(stores, cycleId, resolved, dto);
      // A new cycle lets later reviewers read earlier answers, unless HR turns it off (D5).
      const readers = readersOf({ ...dto, earlierAnswersVisible: dto.earlierAnswersVisible ?? true }, null);
      await stores.visibility.save({ cycleId, ...readers });
      await recordAudit(stores, {
        cycleId,
        action: 'created',
        actorId,
        beforeJson: null,
        afterJson: { name, state: 'draft', ...readers, ...describeContent(stages, resolved) },
      });
    });

    return this.getById(userId, cycleId);
  }

  /**
   * Replaces the details and the stages of a draft. The row is locked, so two
   * edits at once go in turn; any other state answers 409.
   */
  async update(userId: string, cycleId: string, dto: CreateReviewCycleDto): Promise<ReviewCycleDetail> {
    assertValidCycle(dto);
    const { company, actorId } = await this.resolveActor(userId);
    await this.assertStageEvaluators(company, dto);
    const resolved = await resolveParticipants(this.lookups, company, dto.participants ?? []);
    await this.assertPeers(company, dto);

    await this.inTransaction(async (stores) => {
      const cycle = await lockCycle(stores, company, cycleId);
      if (cycle.state !== 'draft') {
        throw new ConflictException('Only a draft cycle can be updated.');
      }
      // Read under the lock, before the delete: the audit row names what the change replaces.
      const [oldStages, oldPeople] = await Promise.all([
        stores.stages.find({ where: { cycleId }, order: { sortOrder: 'ASC' } }),
        stores.participants.find({ where: { cycleId } }),
      ]);
      const oldReaders = readersOf({}, await stores.visibility.findOne({ where: { cycleId } }));
      const readers = readersOf(dto, oldReaders);
      const before = { ...describeCycle(cycle), ...oldReaders, ...describeContent(oldStages, oldPeople) };

      Object.assign(cycle, {
        name: dto.name.trim(),
        reviewType: dto.reviewType,
        evaluationStart: dto.evaluationStart,
        evaluationEnd: dto.evaluationEnd,
        assessmentStart: new Date(dto.assessmentStart),
        verificationDeadline: new Date(dto.verificationDeadline),
        ...optionalDetails(dto),
        goalsWeight: dto.goalsWeight,
        behavioralWeight: dto.behavioralWeight,
        anonymityThreshold: dto.anonymityThreshold ?? null,
      });
      await stores.cycles.save(cycle);
      const stages = buildStages(stores, cycleId, dto);
      await stores.stages.delete({ cycleId });
      await stores.stages.save(stages);
      await stores.participants.delete({ cycleId });
      await saveParticipants(stores, cycleId, resolved, dto);
      await stores.visibility.save({ cycleId, ...readers });
      await recordAudit(stores, {
        cycleId,
        action: 'updated',
        actorId,
        beforeJson: before,
        afterJson: { ...describeCycle(cycle), ...readers, ...describeContent(stages, resolved) },
      });
    });

    return this.getById(userId, cycleId);
  }

  /** Cancels a draft, scheduled, or active cycle. A finished or cancelled cycle answers 409. */
  async cancel(userId: string, cycleId: string, reason: string): Promise<ReviewCycleDetail> {
    const text = reason.trim();
    if (text === '') throw new BadRequestException('Enter the reason for the cancellation.');
    const { company, actorId } = await this.resolveActor(userId);

    await this.inTransaction(async (stores) => {
      const cycle = await lockCycle(stores, company, cycleId);
      if (cycle.state === 'completed' || cycle.state === 'cancelled') {
        throw new ConflictException(`A ${cycle.state} cycle cannot be cancelled.`);
      }
      const { state } = cycle;

      cycle.state = 'cancelled';
      cycle.cancelledReason = text;
      await stores.cycles.save(cycle);
      await recordAudit(stores, {
        cycleId,
        action: 'cancelled',
        actorId,
        reason: text,
        beforeJson: { state },
        afterJson: { state: 'cancelled' },
      });
    });

    return this.getById(userId, cycleId);
  }

  /**
   * Gives an active cycle later deadlines (PRD Rec-001, Rec-002). Each assignment of a
   * moved stage takes the new date; its state and its saved answers stay. A finalized or
   * released cycle answers 409.
   */
  async extend(userId: string, cycleId: string, dto: ExtendReviewCycleDto): Promise<ReviewCycleDetail> {
    const reason = dto.reason.trim();
    if (reason === '') throw new BadRequestException('Enter the reason for the extension.');
    const { company, actorId } = await this.resolveActor(userId);

    await this.inTransaction(async (stores) => {
      const cycle = await lockCycle(stores, company, cycleId);
      assertOpenCycle(cycle);
      const plan = planExtension({
        goalsWeight: cycle.goalsWeight,
        assessmentStart: cycle.assessmentStart,
        verificationDeadline: cycle.verificationDeadline,
        accomplishmentDeadline: cycle.accomplishmentDeadline,
        stages: await stores.stages.find({ where: { cycleId } }),
        asked: dto,
      });
      if (plan.issues.length > 0) throw notExtendable(plan.issues);

      const change = describeExtension(cycle, plan);
      const { verificationDeadline, accomplishmentDeadline } = plan;
      if (verificationDeadline || accomplishmentDeadline) {
        await stores.cycles.save({
          ...cycle,
          verificationDeadline: verificationDeadline ?? cycle.verificationDeadline,
          accomplishmentDeadline: accomplishmentDeadline ?? cycle.accomplishmentDeadline,
        });
      }
      if (plan.stages.length > 0) await moveStageDeadlines(stores, cycleId, plan.stages);
      await recordAudit(stores, { cycleId, action: 'extended', actorId, reason, ...change });
    });

    return this.getById(userId, cycleId);
  }

  /**
   * Checks a cycle before launch and names the wizard step that owns each problem. The
   * rules are in `checkReadiness`; this method only gathers the facts, inside the company.
   */
  async readiness(userId: string, cycleId: string): Promise<ReadinessIssue[]> {
    const company = await this.companies.resolveCompany(userId);
    const cycle = await this.cycles.findOne({ where: { cycleId, company } });
    if (!cycle) throw new NotFoundException('Review cycle not found');

    const [stages, rows] = await Promise.all([
      this.stages.find({ where: { cycleId }, order: { sortOrder: 'ASC' } }),
      this.participants.find({ where: { cycleId } }),
    ]);
    const { input } = await gatherReadiness(this.factRepos, company, cycle, stages, rows, new Date());
    return checkReadiness(input);
  }

  /**
   * What the wizard offers, read inside the company of the caller: the active employees
   * that have a GUID, the published templates, and the HR evaluators (admin logins).
   */
  async options(userId: string): Promise<ReviewCycleOptions> {
    const company = await this.companies.resolveCompany(userId);
    const [people, kpi, behavioral, hrIds] = await Promise.all([
      this.employees.find({ where: { company, status: EmployeeStatus.ACTIVE }, order: { id: 'ASC' } }),
      this.kpiTemplates.find({ where: { company, status: 'published' } }),
      this.behavioralTemplates.find({ where: { company, status: 'published' } }),
      eligibleHrEvaluatorIds(this.factRepos, company),
    ]);
    const named = people.flatMap((person) =>
      person.guid
        ? [
            {
              employeeId: person.guid,
              name: `${person.firstName} ${person.lastName}`,
              position: person.position,
              department: person.department,
              employeeCode: person.employeeCode,
            },
          ]
        : [],
    );
    // A manager is an active employee of the company, so their name is already read.
    const managerOf = await appliedManagersOf(this.factRepos, company, named.map((person) => person.employeeId), dayOf(new Date()));
    const nameById = new Map(named.map((person) => [person.employeeId, person.name]));

    return {
      employees: named.map((person) => {
        const managerId = managerOf.get(person.employeeId) ?? null;
        return { ...person, managerId, managerName: nameById.get(managerId ?? '') ?? null };
      }),
      kpiTemplates: kpi.map((template) => ({
        templateId: template.templateId,
        name: template.name,
        position: template.position,
        version: template.currentVersion,
      })),
      behavioralTemplates: behavioral.map((template) => ({
        templateId: template.templateId,
        name: template.name,
        version: template.currentVersion,
      })),
      hrEvaluators: named.filter((person) => hrIds.has(person.employeeId)).map(({ employeeId, name }) => ({ employeeId, name })),
    };
  }

  /**
   * Launches a draft in one transaction. The order matters: lock the row, check that it is a
   * draft, read the facts and check readiness (so a save that committed meanwhile is seen),
   * freeze the current published version of each template, create the assignments, turn the
   * cycle active, and write the audit row. A retry finds an active cycle and gets 409; a
   * failure anywhere rolls all of it back. The assignments are a plain insert: no conflict is
   * reachable, so a unique violation would be a bug and must fail loudly.
   */
  async launch(userId: string, cycleId: string): Promise<ReviewCycleDetail> {
    const { company, actorId } = await this.resolveActor(userId);

    await this.dataSource.transaction(async (manager) => {
      const cycle = await manager.getRepository(Cycle).findOne({ where: { cycleId, company }, lock: LOCK_FOR_WRITE });
      if (!cycle) throw new NotFoundException('Review cycle not found');
      if (cycle.state !== 'draft') throw new ConflictException('Only a draft cycle can be launched.');

      const [stages, rows] = await Promise.all([
        manager.getRepository(CycleStage).find({ where: { cycleId }, order: { sortOrder: 'ASC' } }),
        manager.getRepository(CycleParticipant).find({ where: { cycleId } }),
      ]);
      const now = new Date();
      const facts = txFactRepos(manager);
      const { input, evaluators } = await gatherReadiness(facts, company, cycle, stages, rows, now);
      const issues = checkReadiness(input);
      if (issues.length > 0) throw notReady(issues);

      const refrozenCount = await refreezeParticipants(manager, txLookups(manager), company, rows);
      const assignments = buildAssignments(manager.getRepository(Assignment), { cycleId, stages, rows, evaluators });
      await manager.getRepository(Assignment).save(assignments);
      await openWorkRecords(manager.getRepository(Accomplishment), cycle, rows);

      cycle.state = 'active';
      cycle.activationDate = dayOf(now);
      await manager.getRepository(Cycle).save(cycle);
      await recordAudit(storesOf(manager), {
        cycleId,
        action: 'launched',
        actorId,
        beforeJson: { state: 'draft' },
        afterJson: { state: 'active', participantCount: rows.length, assignmentCount: assignments.length, refrozenCount },
      });
    });

    return this.getById(userId, cycleId);
  }

  /** A cycle of another company answers 404, the same as a cycle that does not exist. */
  /** Who takes part in a cycle of the caller company, and where each assignment stands: one query for each table. */
  async getParticipants(userId: string, cycleId: string): Promise<ReviewCycleParticipantDto[]> {
    const company = await this.companies.resolveCompany(userId);
    const cycle = await this.cycles.findOne({ where: { cycleId, company } });
    if (!cycle) throw new NotFoundException('Review cycle not found');

    const [participants, stages, assignments] = await Promise.all([
      this.participants.find({ where: { cycleId } }),
      this.stages.find({ where: { cycleId } }),
      this.assignments.find({ where: { cycleId } }),
    ]);
    const people = await peopleOf(this.employees, company, [
      ...participants.map((participant) => participant.employeeId),
      ...assignments.map((assignment) => assignment.evaluatorId),
    ]);
    const context = { cycle, stages: new Map(stages.map((stage) => [stage.stageId, stage])), people, now: new Date() };

    return participants
      .map((participant) => {
        const subject = subjectFields(participant, people.get(participant.employeeId));
        return {
          participantId: participant.participantId,
          name: subject.subjectName,
          position: subject.subjectPosition,
          department: subject.subjectDepartment,
          assignments: workOf(assignments.filter((assignment) => assignment.participantId === participant.participantId), context),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getById(userId: string, cycleId: string): Promise<ReviewCycleDetail> {
    const company = await this.companies.resolveCompany(userId);
    const cycle = await this.cycles.findOne({ where: { cycleId, company } });
    if (!cycle) throw new NotFoundException('Review cycle not found');

    const [stages, participants, readers] = await Promise.all([
      this.stages.find({ where: { cycleId }, order: { sortOrder: 'ASC' } }),
      this.participants.find({ where: { cycleId } }),
      this.visibility.findOne({ where: { cycleId } }),
    ]);
    const [kpiTemplateIds, behavioralTemplateIds] = await Promise.all([
      templateIdsOf(this.kpiVersions, participants.map((person) => person.kpiVersionId)),
      templateIdsOf(this.behavioralVersions, participants.map((person) => person.behavioralVersionId)),
    ]);
    // The peers are read for a cycle with a peer stage only.
    const peers = stages.some((stage) => stage.perspective === 'peer') && participants.length > 0
      ? await this.peers.find({ where: { participantId: In(participants.map((person) => person.participantId)) } })
      : [];
    return {
      ...cycle,
      ...readersOf({}, readers),
      stages,
      participants: participants.map((person) => ({
        ...person,
        peerIds: peers.filter((peer) => peer.participantId === person.participantId).map((peer) => peer.evaluatorId),
        kpiTemplateId: kpiTemplateIds.get(person.kpiVersionId ?? '') ?? null,
        behavioralTemplateId: behavioralTemplateIds.get(person.behavioralVersionId ?? '') ?? null,
      })),
    };
  }

  /**
   * The register of the caller company. It reads the cycles, then the participants,
   * stages, and assignments of all of them in one query each, and counts in memory:
   * four queries, however many cycles there are.
   */
  async list(userId: string): Promise<ReviewCycleListRowDto[]> {
    const company = await this.companies.resolveCompany(userId);
    const cycles = await this.cycles.find({ where: { company }, order: { updatedAt: 'DESC' } });
    if (cycles.length === 0) return [];

    const where = { cycleId: In(cycles.map((cycle) => cycle.cycleId)) };
    const [participants, stages, assignments] = await Promise.all([
      this.participants.find({ where, select: { participantId: true, cycleId: true } }),
      this.stages.find({ where, select: { stageId: true, cycleId: true, deadline: true } }),
      this.assignments.find({ where, select: { assignmentId: true, cycleId: true, state: true } }),
    ]);

    return cycles.map((cycle) => {
      const own = <T extends { cycleId: string }>(rows: T[]) => rows.filter((row) => row.cycleId === cycle.cycleId);
      const states = own(assignments).map((assignment) => assignment.state);
      return {
        cycleId: cycle.cycleId,
        name: cycle.name,
        reviewType: cycle.reviewType,
        state: cycle.state,
        evaluationStart: cycle.evaluationStart,
        evaluationEnd: cycle.evaluationEnd,
        deadline: lastDeadline(own(stages)),
        participantCount: own(participants).length,
        assignmentCount: states.length,
        // Completed work was submitted first, so it counts as submitted too.
        submittedCount: states.filter((state) => state === 'submitted' || state === 'completed').length,
        completedCount: states.filter((state) => state === 'completed').length,
        releasedAt: cycle.releasedAt?.toISOString() ?? null,
      };
    });
  }

  /**
   * The company and the actor of a change. Every change is recorded with who made it (PRD 6.7),
   * so an account that no audit row can name may read cycles but not change them.
   */
  private async resolveActor(userId: string): Promise<{ company: string; actorId: string }> {
    const { company, actorId } = await this.companies.resolveAccount(userId);
    if (!actorId) throw new ForbiddenException(NO_ACTOR);
    return { company, actorId };
  }

  /**
   * A stage may name a person of the company only. Whether that person may evaluate the stage
   * is a readiness rule, checked before a launch: a draft can be saved while HR decides.
   */
  private async assertStageEvaluators(company: string, dto: CreateReviewCycleDto): Promise<void> {
    const ids = [...new Set(dto.stages.flatMap((stage) => (stage.evaluatorId ? [stage.evaluatorId] : [])))];
    if (ids.length === 0) return;
    const people = await this.employees.find({ where: { guid: In(ids), company } });
    if (people.length !== ids.length) {
      throw new BadRequestException('A stage evaluator is not an employee of your company.');
    }
  }

  /** A peer is another active employee of the company. */
  private async assertPeers(company: string, dto: CreateReviewCycleDto): Promise<void> {
    const participants = dto.participants ?? [];
    if (participants.some(({ employeeId, peerIds }) => peerIds?.includes(employeeId))) {
      throw new BadRequestException('Nobody is their own peer.');
    }
    const ids = [...new Set(participants.flatMap((participant) => participant.peerIds ?? []))];
    if (ids.length === 0) return;
    const people = await this.employees.find({ where: { guid: In(ids), company, status: EmployeeStatus.ACTIVE } });
    if (people.length !== ids.length) throw new BadRequestException('A peer is not an active employee of your company.');
  }

  private inTransaction<T>(run: (stores: Stores) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) => run(storesOf(manager)));
  }
}

function storesOf(manager: EntityManager): Stores {
  return {
    cycles: manager.getRepository(Cycle),
    participants: manager.getRepository(CycleParticipant),
    stages: manager.getRepository(CycleStage),
    assignments: manager.getRepository(Assignment),
    peers: manager.getRepository(CyclePeerEvaluator),
    visibility: manager.getRepository(CycleResultVisibility),
    audit: manager.getRepository(AuditEvent),
  };
}

/** The repositories of one unit of work: the injected ones, or those of a transaction. */
interface Stores {
  peers: Repository<CyclePeerEvaluator>;
  visibility: Repository<CycleResultVisibility>;
  assignments: Repository<Assignment>;
  cycles: Repository<Cycle>;
  participants: Repository<CycleParticipant>;
  stages: Repository<CycleStage>;
  audit: Repository<AuditEvent>;
}

/**
 * The rules that the database CHECKs and the shared schema also hold: the period
 * ends on or after its start, the verification deadline is not before assessment
 * starts, and the two component weights total 1. Checked before any write.
 */
/** The parts of a draft that may be left out, as the columns store them. */
function optionalDetails(dto: CreateReviewCycleDto): Pick<Cycle, 'description' | 'accomplishmentDeadline'> {
  return {
    description: dto.description?.trim() || null,
    accomplishmentDeadline: dto.accomplishmentDeadline ? new Date(dto.accomplishmentDeadline) : null,
  };
}

function assertValidCycle(dto: CreateReviewCycleDto): void {
  if (dto.evaluationEnd < dto.evaluationStart) {
    throw new BadRequestException('The period end cannot be before the period start.');
  }
  if (new Date(dto.verificationDeadline) < new Date(dto.assessmentStart)) {
    throw new BadRequestException('The verification deadline cannot be before assessment starts.');
  }
  const { accomplishmentDeadline } = optionalDetails(dto);
  const problem =
    accomplishmentDeadline &&
    accomplishmentDeadlineProblem({
      accomplishmentDeadline,
      evaluationEnd: dto.evaluationEnd,
      verificationDeadline: new Date(dto.verificationDeadline),
    });
  if (problem) throw new BadRequestException(problem);
  if (Math.abs(dto.goalsWeight + dto.behavioralWeight - 1) > 0.0001) {
    throw new BadRequestException('Goal and behavioral weights must total 1.');
  }
}

const LOCK_FOR_WRITE = { mode: 'pessimistic_write' } as const;

/** Reads the cycle of the caller company with a write lock, so two writers wait for each other. */
async function lockCycle(stores: Stores, company: string, cycleId: string): Promise<Cycle> {
  const cycle = await stores.cycles.findOne({ where: { cycleId, company }, lock: LOCK_FOR_WRITE });
  if (!cycle) throw new NotFoundException('Review cycle not found');
  return cycle;
}

function notExtendable(issues: ExtensionPlan<CycleStage>['issues']): UnprocessableEntityException {
  return new UnprocessableEntityException({
    message: 'The deadlines cannot be extended.',
    details: issues.map((issue) => ({ ...issue, code: 'INVALID_DEADLINE' })),
  });
}

/** The audit words of an extension: only the dates that move, before and after. */
function describeExtension(cycle: Cycle, plan: ExtensionPlan<CycleStage>) {
  type Dates = Pick<Cycle, 'verificationDeadline' | 'accomplishmentDeadline'>;
  const dates = (saved: Dates, stages: { stageId: string; deadline: Date | null }[]) => ({
    ...(plan.verificationDeadline && { verificationDeadline: saved.verificationDeadline?.toISOString() ?? null }),
    ...(plan.accomplishmentDeadline && { accomplishmentDeadline: saved.accomplishmentDeadline?.toISOString() ?? null }),
    ...(stages.length > 0 && {
      stages: stages.map(({ stageId, deadline }) => ({ stageId, deadline: deadline?.toISOString() ?? null })),
    }),
  });
  return {
    beforeJson: dates(cycle, plan.stages.map(({ stage }) => stage)),
    afterJson: dates(plan, plan.stages.map(({ stage, deadline }) => ({ stageId: stage.stageId, deadline }))),
  };
}

/** Moves each stage, and every assignment of that stage with it. */
async function moveStageDeadlines(stores: Stores, cycleId: string, moves: ExtensionPlan<CycleStage>['stages']): Promise<void> {
  const deadlines = new Map(moves.map(({ stage, deadline }) => [stage.stageId, deadline]));
  await stores.stages.save(moves.map(({ stage, deadline }) => ({ ...stage, deadline })));
  const assignments = await stores.assignments.find({ where: { cycleId, stageId: In([...deadlines.keys()]) } });
  await stores.assignments.save(
    assignments.map((assignment) => ({ ...assignment, deadline: deadlines.get(assignment.stageId) ?? assignment.deadline })),
  );
}

/** The stages of the body as rows, numbered in the order sent. */
function buildStages(stores: Stores, cycleId: string, dto: CreateReviewCycleDto): CycleStage[] {
  return dto.stages.map((stage, index) =>
    stores.stages.create({
      stageId: randomUUID(),
      cycleId,
      perspective: stage.perspective,
      evaluatorRole: stage.evaluatorRole,
      evaluatorId: stage.evaluatorId ?? null,
      sortOrder: index + 1,
      deadline: new Date(stage.deadline),
    }),
  );
}

/** Saves the resolved participants of a cycle. A draft with none writes no row. */
async function saveParticipants(
  stores: Stores,
  cycleId: string,
  resolved: ResolvedParticipant[],
  dto: CreateReviewCycleDto,
): Promise<void> {
  if (resolved.length === 0) return;
  const rows = resolved.map((person) =>
      stores.participants.create({
        participantId: randomUUID(),
        cycleId,
        employeeId: person.employeeId,
        frozenPosition: person.frozenPosition,
        kpiVersionId: person.kpiVersionId,
        behavioralVersionId: person.behavioralVersionId,
      }),
  );
  await stores.participants.save(rows);
  const peers = rows.flatMap((row) =>
    peerIdsOf(dto, row.employeeId).map((evaluatorId) => ({ participantId: row.participantId, evaluatorId })),
  );
  if (peers.length > 0) await stores.peers.save(peers.map((peer) => stores.peers.create(peer)));
}

const peerIdsOf = (dto: CreateReviewCycleDto, employeeId: string) =>
  dto.participants?.find((participant) => participant.employeeId === employeeId)?.peerIds ?? [];

/** The fields of a cycle that the audit trail keeps before and after a change. */
function describeCycle(cycle: Cycle): Record<string, unknown> {
  return {
    name: cycle.name,
    reviewType: cycle.reviewType,
    state: cycle.state,
    evaluationStart: cycle.evaluationStart,
    evaluationEnd: cycle.evaluationEnd,
    assessmentStart: cycle.assessmentStart?.toISOString() ?? null,
    verificationDeadline: cycle.verificationDeadline?.toISOString() ?? null,
    accomplishmentDeadline: cycle.accomplishmentDeadline?.toISOString() ?? null,
    description: cycle.description,
    goalsWeight: cycle.goalsWeight,
    behavioralWeight: cycle.behavioralWeight,
    anonymityThreshold: cycle.anonymityThreshold,
  };
}

/** The stages and the people of a cycle as the audit trail keeps them, in a stable order. */
function describeContent(
  stages: Pick<CycleStage, 'perspective' | 'evaluatorId' | 'sortOrder' | 'deadline'>[],
  people: ResolvedParticipant[],
): Record<string, unknown> {
  return {
    stageCount: stages.length,
    participantCount: people.length,
    stages: [...stages]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ perspective, evaluatorId, deadline }) => ({ perspective, evaluatorId, deadline: deadline?.toISOString() ?? null })),
    participants: people
      .map(({ employeeId, kpiVersionId, behavioralVersionId }) => ({ employeeId, kpiVersionId, behavioralVersionId }))
      .sort((a, b) => a.employeeId.localeCompare(b.employeeId)),
  };
}

interface AuditEntry {
  cycleId: string;
  action: string;
  actorId: string;
  reason?: string;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown>;
}

/** Appends one audit row. It runs in the transaction of the change, so both stand or fall together. */
async function recordAudit(stores: Stores, entry: AuditEntry): Promise<void> {
  await stores.audit.save(
    stores.audit.create({
      eventId: randomUUID(),
      entityType: 'cycle',
      entityId: entry.cycleId,
      action: entry.action,
      actorId: entry.actorId,
      reason: entry.reason ?? null,
      beforeJson: entry.beforeJson,
      afterJson: entry.afterJson,
      idempotencyKey: null,
    }),
  );
}

/** What the wizard offers: everything inside the company of the caller, and only what a cycle may use. */
export interface ReviewCycleOptions {
  employees: { employeeId: string; name: string; position: string | null; department: string }[];
  kpiTemplates: { templateId: string; name: string | null; position: string | null; version: number }[];
  behavioralTemplates: { templateId: string; name: string | null; version: number }[];
  hrEvaluators: { employeeId: string; name: string }[];
}

/** A cycle with its stages: the shape of `reviewCycleDtoSchema`. */
export type ReviewCycleParticipantDetail = CycleParticipant & {
  /** The template of the frozen KPI version, so a re-edit can send the same choice. */
  kpiTemplateId: string | null;
  behavioralTemplateId: string | null;
};
export type ReviewCycleDetail = Cycle & Readers & { stages: CycleStage[]; participants: ReviewCycleParticipantDetail[] };

/** The latest stage deadline, as an ISO text, or null when no stage has one. */
function lastDeadline(stages: { deadline: Date | null }[]): string | null {
  const times = stages.flatMap((stage) => (stage.deadline ? [stage.deadline.getTime()] : []));
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}
