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
import type { EvaluatorType, ReviewAnswerDto, ReviewDetailDto, ReviewQuestionDto, ReviewSectionDto } from '@pms/shared-types';
import { AuditEvent } from '../../../common/entities/audit-event.entity.js';
import { User } from '../../auth/entities/user.entity.js';
import { BehavioralChoiceOption } from '../../behavioral-assessment/entities/behavioral-choice-option.entity.js';
import { BehavioralQuestion } from '../../behavioral-assessment/entities/behavioral-question.entity.js';
import { BehavioralSection } from '../../behavioral-assessment/entities/behavioral-section.entity.js';
import { BehavioralTemplateVersion } from '../../behavioral-assessment/entities/behavioral-template-version.entity.js';
import { BehavioralTemplate } from '../../behavioral-assessment/entities/behavioral-template.entity.js';
import { EmployeeDomain } from '../../employees/entities/employee-domain.entity.js';
import { CompanyResolver } from '../../kpi-goals/services/company-resolver.service.js';
import { Accomplishment } from '../entities/accomplishment.entity.js';
import { AssignmentResponse } from '../entities/assignment-response.entity.js';
import { Assignment } from '../entities/assignment.entity.js';
import { CycleParticipant } from '../entities/cycle-participant.entity.js';
import { CycleResultVisibility } from '../entities/cycle-result-visibility.entity.js';
import { CycleStage } from '../entities/cycle-stage.entity.js';
import { ManagerAssignment } from '../entities/manager-assignment.entity.js';
import { Cycle } from '../entities/cycle.entity.js';
import { evaluatorNameFor, isAnonymous } from './anonymity.js';
import { currentTeamOf, dayOf } from './cycle-facts.js';
import { readersOf } from './result-readers.js';
import { feedbackIn, withFeedback } from './review-feedback.js';
import { readsColleagueReview } from './review-readers.js';
import { stageCards } from './review-stage-cards.js';
import { assertOpenCycle } from './assert-open-cycle.js';
import { planReopening, saveState, type Reopening } from './review-reopening.js';
import { decodeAnswers, encodeAnswers, fitIssues, missingRequired, type StoredAnswers } from './review-answers.js';
import { firstUnfinishedStage } from './review-stages.js';
import { isOverdue, nameOf, peopleOf, subjectFields } from './reviews.service.js';
import { departmentFor, isListed, PARTICIPANT_CYCLE_STATES, viewerOf, type Viewer } from './viewer.js';

const NOT_FOUND = 'Review not found';
const WAITS = 'This review waits for an earlier stage.';
const GOALS_NOT_VERIFIED =
  'The KPI accomplishments of this employee are not verified yet, so the manager assessment cannot be submitted.';

/** The rows of one assignment, which decide who reads it and what they read. */
interface ReviewRows {
  assignment: Assignment;
  cycle: Cycle;
  participant: CycleParticipant;
  stage: CycleStage;
  stages: CycleStage[];
  /** Every assignment of the participant. */
  siblings: Assignment[];
  /** The stored responses of the assignment, newest first. */
  versions: AssignmentResponse[];
}

/**
 * How the viewer reads a review. An insider (the evaluator or an HR administrator) reads the
 * earlier versions and the reason of a reopening too. A colleague reads the submitted answers.
 * Someone who only sees the row reads nothing of the review.
 */
type Access = 'insider' | 'colleague' | 'row';

/** One review that the viewer sees. */
interface VisibleReview extends ReviewRows {
  /** The viewer is the evaluator of this assignment. */
  isOwn: boolean;
  access: Access;
  /** The employees whom the viewer manages today. Empty for an administrator, who needs no team. */
  team: ReadonlySet<string>;
}

/** What a listed review that the viewer may not read holds: nothing of the review itself. */
const WITHHELD = {
  isRestricted: true,
  canEdit: false,
  waitingFor: null,
  template: null,
  sections: [],
  response: null,
  reopenReason: null,
  history: [],
  stages: [],
  goals: null,
} satisfies Partial<ReviewDetailDto>;

const LOCK_FOR_READ = { mode: 'pessimistic_read' } as const;
const LOCK_FOR_WRITE = { mode: 'pessimistic_write' } as const;

/**
 * The review that the viewer may change now, locked until the transaction ends. The cycle is
 * locked first, in the order of a launch and a cancellation, so a cancellation waits or wins.
 */
async function lockOwnOpenReview(manager: EntityManager, viewer: Viewer, assignmentId: string) {
  const assignments = manager.getRepository(Assignment);
  const found = await assignments.findOne({ where: { assignmentId } });
  const { actorId, company } = viewer;
  // Only the evaluator changes a response. Anyone else learns nothing about it.
  if (!found || !actorId || found.evaluatorId !== actorId) throw new NotFoundException(NOT_FOUND);
  const cycle = await manager.getRepository(Cycle).findOne({ where: { cycleId: found.cycleId, company }, lock: LOCK_FOR_READ });
  // Every assignment of the participant, in one order: two writers never wait for each other.
  const siblings = await assignments.find({
    where: { participantId: found.participantId },
    order: { assignmentId: 'ASC' },
    lock: LOCK_FOR_WRITE,
  });
  const assignment = siblings.find((row) => row.assignmentId === assignmentId);
  if (!cycle || !assignment) throw new NotFoundException(NOT_FOUND);

  if (cycle.state !== 'active') throw new ConflictException('The cycle is not active. This review cannot be changed.');
  if (assignment.state === 'locked') throw new ConflictException(WAITS);
  if (assignment.state === 'submitted' || assignment.state === 'completed') {
    throw new ConflictException('This review is already submitted.');
  }
  return { assignment, cycle, siblings, actorId };
}

/** Goals apply and the accomplishments are not verified: a manager assessment waits (PRD Acc-005). */
async function assertGoalsVerified(manager: EntityManager, cycle: Cycle, stages: CycleStage[], assignment: Assignment): Promise<void> {
  const stage = stages.find((candidate) => candidate.stageId === assignment.stageId);
  if (stage?.perspective !== 'manager' || cycle.goalsWeight <= 0) return;
  const verified = await manager
    .getRepository(Accomplishment)
    .findOne({ where: { participantId: assignment.participantId, status: 'verified' } });
  if (verified) return;
  throw new UnprocessableEntityException(GOALS_NOT_VERIFIED);
}

/** A review is submitted in stage order: an earlier stage that HR reopened comes first (PRD Rec-003). */
function assertTurn(stages: CycleStage[], rows: Assignment[], assignment: Assignment): void {
  const first = firstUnfinishedStage(stages, rows);
  if (first && first.stageId !== assignment.stageId) throw new ConflictException(WAITS);
}

/** Work that is still to be submitted. */
const isOpen = ({ state }: Assignment) => state !== 'submitted' && state !== 'completed';

/** Opens the locked reviews of the earliest stage that is not finished (PRD Rev-003). */
async function openNextStage(
  manager: EntityManager,
  stages: CycleStage[],
  rows: Assignment[],
  cause: { afterAssignmentId: string; actorId: string },
): Promise<void> {
  const next = firstUnfinishedStage(stages, rows);
  for (const row of rows.filter((candidate) => candidate.stageId === next?.stageId && candidate.state === 'locked')) {
    await manager.getRepository(Assignment).save({ ...row, state: 'not_started' });
    await recordAudit(manager, {
      assignmentId: row.assignmentId,
      action: 'stage_unlocked',
      actorId: cause.actorId,
      beforeJson: { state: 'locked' },
      afterJson: { state: 'not_started', afterAssignmentId: cause.afterAssignmentId },
    });
  }
}

/** Every answer belongs to a question of the review, and holds the kind of value that it takes. */
function assertFit(questions: ReviewQuestionDto[], answers: ReviewAnswerDto[]): void {
  const details = fitIssues(questions, answers);
  if (details.length > 0) {
    throw new BadRequestException({ message: 'Some answers do not fit the questions of this review.', details });
  }
}

interface ResponseContent {
  answersJson: StoredAnswers;
  status: 'draft' | 'submitted';
  submittedBy: string | null;
  submittedAt: Date | null;
  reopenReason?: string;
}

/** Changes the draft of the assignment, or starts the next version when the latest one is submitted. */
async function writeResponse(manager: EntityManager, assignmentId: string, content: ResponseContent): Promise<void> {
  const responses = manager.getRepository(AssignmentResponse);
  const latest = await responses.findOne({ where: { assignmentId }, order: { version: 'DESC' } });
  await responses.save(
    latest?.status === 'draft'
      ? { ...latest, ...content }
      : responses.create({ responseId: randomUUID(), assignmentId, version: (latest?.version ?? 0) + 1, ...content }),
  );
}

interface AuditEntry {
  assignmentId: string;
  action: string;
  actorId: string;
  beforeJson: Record<string, unknown>;
  afterJson: Record<string, unknown>;
  reason?: string;
}

/** Appends one audit row. It runs in the transaction of the change, so both stand or fall together. */
async function recordAudit(manager: EntityManager, { assignmentId, reason, ...entry }: AuditEntry): Promise<void> {
  const audit = manager.getRepository(AuditEvent);
  await audit.save(
    audit.create({
      eventId: randomUUID(),
      entityType: 'assignment',
      entityId: assignmentId,
      ...entry,
      reason: reason ?? null,
      idempotencyKey: null,
    }),
  );
}

/** Applies one change of a reopening: the state, the draft copy of the submitted answers, and the audit row. */
async function applyReopening(
  manager: EntityManager,
  change: Reopening,
  cause: { reopenedAssignmentId: string; actorId: string; reason: string },
): Promise<void> {
  const { assignmentId, state } = change.assignment;
  await saveState(manager, change);
  if (change.copy) {
    const submitted = await manager.getRepository(AssignmentResponse).findOne({ where: { assignmentId }, order: { version: 'DESC' } });
    await writeResponse(manager, assignmentId, {
      answersJson: submitted?.answersJson ?? {},
      status: 'draft',
      submittedBy: null,
      submittedAt: null,
      reopenReason: cause.reason,
    });
  }
  await recordAudit(manager, {
    assignmentId,
    action: change.state === 'locked' ? 'stage_locked' : 'reopened',
    actorId: cause.actorId,
    reason: cause.reason,
    beforeJson: { state },
    afterJson: { state: change.state, reopenedAssignmentId: cause.reopenedAssignmentId },
  });
}

/** What a reader sees of one stored version. */
function contentOf(row: AssignmentResponse, questions: ReviewQuestionDto[]) {
  return {
    version: row.version,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    answers: decodeAnswers(questions, row.answersJson),
    writtenFeedback: feedbackIn(row.answersJson),
  };
}

/**
 * The submitted versions other than the one shown, in the order of `versions` (newest first).
 * A reopening stores its reason on the version that replaces the submitted one.
 */
function earlierVersions(versions: AssignmentResponse[], shown: AssignmentResponse | null, questions: ReviewQuestionDto[]) {
  return versions
    .filter((row) => row.status === 'submitted' && row !== shown)
    .map((row) => ({
      ...contentOf(row, questions),
      reopenReason: versions.find((next) => next.version === row.version + 1)?.reopenReason ?? null,
    }));
}

@Injectable()
export class ReviewAssessmentService {
  constructor(
    @InjectRepository(Cycle) private readonly cycles: Repository<Cycle>,
    @InjectRepository(CycleParticipant) private readonly participants: Repository<CycleParticipant>,
    @InjectRepository(CycleStage) private readonly stages: Repository<CycleStage>,
    @InjectRepository(Assignment) private readonly assignments: Repository<Assignment>,
    @InjectRepository(AssignmentResponse) private readonly responses: Repository<AssignmentResponse>,
    @InjectRepository(EmployeeDomain) private readonly employees: Repository<EmployeeDomain>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(BehavioralSection) private readonly sections: Repository<BehavioralSection>,
    @InjectRepository(BehavioralQuestion) private readonly questions: Repository<BehavioralQuestion>,
    @InjectRepository(BehavioralChoiceOption) private readonly options: Repository<BehavioralChoiceOption>,
    @InjectRepository(BehavioralTemplateVersion) private readonly templateVersions: Repository<BehavioralTemplateVersion>,
    @InjectRepository(BehavioralTemplate) private readonly templates: Repository<BehavioralTemplate>,
    @InjectRepository(Accomplishment) private readonly accomplishments: Repository<Accomplishment>,
    @InjectRepository(ManagerAssignment) private readonly managers: Repository<ManagerAssignment>,
    @InjectRepository(CycleResultVisibility) private readonly visibility: Repository<CycleResultVisibility>,
    private readonly companies: CompanyResolver,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * One review with the questions of the frozen template version. `findVisible` says who reads
   * it. Anyone else gets the same 404 as for a review that does not exist.
   */
  async get(userId: string, assignmentId: string): Promise<ReviewDetailDto> {
    const viewer = await viewerOf(this.users, this.companies, userId);
    const { assignment, cycle, participant, stage, stages, siblings, versions, isOwn, access, team } = await this.findVisible(viewer, assignmentId);
    const latest = versions[0];
    const isInsider = access === 'insider';
    const people = await peopleOf(this.employees, viewer.company, [participant.employeeId, ...siblings.map((row) => row.evaluatorId)]);
    const subject = subjectFields(participant, people.get(participant.employeeId));
    const header = {
      assignmentId,
      cycleId: cycle.cycleId,
      cycleName: cycle.name,
      cycleState: cycle.state,
      ...subject,
      subjectDepartment: departmentFor(viewer, {
        cycleState: cycle.state,
        subjectId: participant.employeeId,
        team,
        department: subject.subjectDepartment,
      }),
      evaluatorName: evaluatorNameFor(stage.perspective, nameOf(people.get(assignment.evaluatorId)), isOwn),
      isAssignedToCaller: isOwn,
      perspective: stage.perspective,
      state: assignment.state,
      deadline: assignment.deadline?.toISOString() ?? null,
      isOverdue: isOverdue(assignment, cycle, new Date()),
    };
    if (access === 'row') return { ...header, ...WITHHELD };

    const [sections, template, goals] = await Promise.all([
      this.sectionsOf(participant.behavioralVersionId),
      this.templateOf(viewer.company, participant.behavioralVersionId),
      this.goalsOf(viewer, participant, team),
    ]);
    // A draft belongs to its evaluator. Others see the last submitted version (PRD 8.3, Rec-003),
    // and nothing of an anonymous one: those answers show only pooled, in the results (Res-008).
    const mayReadAnswers = isOwn || !isAnonymous(stage.perspective);
    const response = (isOwn ? latest : mayReadAnswers && versions.find((version) => version.status === 'submitted')) || null;
    // An unfinished review waits when an earlier stage is unfinished: locked, or reopened upstream.
    const questions = sections.flatMap((section) => section.questions);
    const first = isOpen(assignment) ? firstUnfinishedStage(stages, siblings) : null;
    const waitingFor: EvaluatorType | null = first && first.stageId !== assignment.stageId ? first.perspective : null;

    return {
      ...header,
      isRestricted: false,
      canEdit: isOwn && cycle.state === 'active' && (assignment.state === 'not_started' || assignment.state === 'in_progress'),
      waitingFor,
      template,
      sections,
      response: response && { ...contentOf(response, questions), status: response.status },
      reopenReason: isInsider && latest?.status === 'draft' ? (latest.reopenReason ?? null) : null,
      history: isInsider && mayReadAnswers ? earlierVersions(versions, response, questions) : [],
      // A peer or a direct report answers one review of a colleague, and reads nothing about the others.
      stages:
        isAnonymous(stage.perspective) && !viewer.isAdmin
          ? []
          : stageCards({ stages, rows: siblings, current: assignment, nameOfEvaluator: (id) => nameOf(people.get(id)) }),
      goals,
    };
  }

  /**
   * Saves the answers so far, which may be incomplete. Only the evaluator, only while the
   * cycle is active and the review is open. The first save starts the review.
   */
  async saveDraft(userId: string, assignmentId: string, answers: ReviewAnswerDto[], writtenFeedback = ''): Promise<ReviewDetailDto> {
    const viewer = await viewerOf(this.users, this.companies, userId);
    const questions = await this.questionsOf(assignmentId);

    await this.dataSource.transaction(async (manager) => {
      const { assignment, actorId } = await lockOwnOpenReview(manager, viewer, assignmentId);
      assertFit(questions, answers);
      const stored = withFeedback(encodeAnswers(answers), writtenFeedback);
      await writeResponse(manager, assignmentId, { answersJson: stored, status: 'draft', submittedBy: null, submittedAt: null });

      const { state } = assignment;
      await manager.getRepository(Assignment).save({ ...assignment, state: 'in_progress' });
      await recordAudit(manager, {
        assignmentId,
        action: 'draft_saved',
        actorId,
        beforeJson: { state },
        afterJson: { state: 'in_progress', answeredCount: Object.keys(encodeAnswers(answers)).length },
      });
    });

    return this.get(userId, assignmentId);
  }

  /**
   * Submits the answers in one transaction: the response and the assignment become submitted,
   * and the next stage of this participant opens once every review before it is done. A
   * submitted response is read-only. `completed` is set by finalization, not here.
   */
  async submit(userId: string, assignmentId: string, answers: ReviewAnswerDto[], writtenFeedback = ''): Promise<ReviewDetailDto> {
    const viewer = await viewerOf(this.users, this.companies, userId);
    const questions = await this.questionsOf(assignmentId);

    await this.dataSource.transaction(async (manager) => {
      const { assignment, cycle, siblings, actorId } = await lockOwnOpenReview(manager, viewer, assignmentId);
      assertFit(questions, answers);
      const missing = missingRequired(questions, answers);
      if (missing.length > 0) {
        throw new UnprocessableEntityException({ message: 'Answer every required question before you submit.', details: missing });
      }
      const stages = await manager.getRepository(CycleStage).find({ where: { cycleId: cycle.cycleId }, order: { sortOrder: 'ASC' } });
      assertTurn(stages, siblings, assignment);
      await assertGoalsVerified(manager, cycle, stages, assignment);

      const submitted = { submittedBy: actorId, submittedAt: new Date() };
      const stored = withFeedback(encodeAnswers(answers), writtenFeedback);
      await writeResponse(manager, assignmentId, { answersJson: stored, status: 'submitted', ...submitted });
      const done: Assignment = { ...assignment, state: 'submitted', ...submitted };
      await manager.getRepository(Assignment).save(done);
      await recordAudit(manager, {
        assignmentId,
        action: 'submitted',
        actorId,
        beforeJson: { state: assignment.state },
        afterJson: { state: 'submitted', answers: stored },
      });

      const rows = siblings.map((row) => (row.assignmentId === assignmentId ? done : row));
      await openNextStage(manager, stages, rows, { afterAssignmentId: assignmentId, actorId });
    });

    return this.get(userId, assignmentId);
  }

  /**
   * Opens a submitted review of a running cycle again, with the later reviews of the same
   * participant that it affects (PRD Rev-005, Rec-003). Submitted versions stay readable, and
   * the KPI accomplishments do not change (Rec-004). The route is for HR administrators.
   */
  async reopen(userId: string, cycleId: string, assignmentId: string, reason: string): Promise<ReviewDetailDto> {
    const text = reason.trim();
    if (text === '') throw new BadRequestException('Enter the reason for reopening the review.');
    const { company, actorId, isAdmin } = await viewerOf(this.users, this.companies, userId);
    // The route has the admin guard. The rule holds here too: the service has other callers.
    if (!isAdmin || !actorId) throw new ForbiddenException('Only an HR administrator with an employee record can reopen a review.');

    await this.dataSource.transaction(async (manager) => {
      const cycle = await manager.getRepository(Cycle).findOne({ where: { cycleId, company }, lock: LOCK_FOR_WRITE });
      const assignments = manager.getRepository(Assignment);
      const found = cycle && (await assignments.findOne({ where: { assignmentId, cycleId } }));
      if (!cycle || !found) throw new NotFoundException(NOT_FOUND);
      const siblings = await assignments.find({
        where: { participantId: found.participantId },
        order: { assignmentId: 'ASC' },
        lock: LOCK_FOR_WRITE,
      });
      const target = siblings.find((row) => row.assignmentId === assignmentId);
      if (!target) throw new NotFoundException(NOT_FOUND);
      assertOpenCycle(cycle);
      if (target.state !== 'submitted') throw new ConflictException('Only a submitted review can be reopened.');

      const stages = await manager.getRepository(CycleStage).find({ where: { cycleId } });
      for (const change of planReopening(stages, siblings, target)) {
        await applyReopening(manager, change, { reopenedAssignmentId: assignmentId, actorId, reason: text });
      }
    });

    return this.get(userId, assignmentId);
  }

  /** The KPI report of the subject, for the readers of that report: the subject, their manager of today, and HR. */
  private async goalsOf(
    { actorId, isAdmin }: Viewer,
    participant: CycleParticipant,
    team: ReadonlySet<string>,
  ): Promise<ReviewDetailDto['goals']> {
    const record = await this.accomplishments.findOne({ where: { participantId: participant.participantId } });
    const mayOpen = isAdmin || participant.employeeId === actorId || team.has(participant.employeeId);
    return record && mayOpen ? { accomplishmentId: record.accomplishmentId, status: record.status } : null;
  }

  /**
   * The questions of the version that the cycle froze for the subject of this assignment. They
   * never change, so a write reads them before its transaction: it holds one connection, not two.
   * An unknown assignment has none, and the transaction then answers 404.
   */
  private async questionsOf(assignmentId: string): Promise<ReviewQuestionDto[]> {
    const assignment = await this.assignments.findOne({ where: { assignmentId } });
    const participant = assignment && (await this.participants.findOne({ where: { participantId: assignment.participantId } }));
    const sections = await this.sectionsOf(participant?.behavioralVersionId ?? null);
    return sections.flatMap((section) => section.questions);
  }

  /**
   * One review that the viewer sees, and how they read it. The evaluator reads it while the
   * cycle is active or completed, an HR administrator of the company in any state, and a
   * colleague its submitted answers only (D5). A person who lists the row and may not read it
   * learns where it stands. Everyone else gets a 404. The company scope comes from the cycle:
   * an assignment has none of its own.
   */
  private async findVisible(viewer: Viewer, assignmentId: string): Promise<VisibleReview> {
    const assignment = await this.assignments.findOne({ where: { assignmentId } });
    const cycle = assignment && (await this.cycles.findOne({ where: { cycleId: assignment.cycleId, company: viewer.company } }));
    if (!assignment || !cycle) throw new NotFoundException(NOT_FOUND);

    const [participant, stages, siblings, versions] = await Promise.all([
      this.participants.findOne({ where: { participantId: assignment.participantId } }),
      this.stages.find({ where: { cycleId: cycle.cycleId }, order: { sortOrder: 'ASC' } }),
      this.assignments.find({ where: { participantId: assignment.participantId } }),
      this.responses.find({ where: { assignmentId }, order: { version: 'DESC' } }),
    ]);
    const stage = stages.find((candidate) => candidate.stageId === assignment.stageId);
    if (!participant || !stage) throw new NotFoundException(NOT_FOUND);

    const rows: ReviewRows = { assignment, cycle, participant, stage, stages, siblings, versions };
    const isOwn = viewer.actorId !== null && assignment.evaluatorId === viewer.actorId;
    const { actorId, company, isAdmin } = viewer;
    const team =
      !isAdmin && actorId
        ? await currentTeamOf({ employees: this.employees, managers: this.managers }, company, actorId, dayOf(new Date()))
        : new Set<string>();
    const found = { ...rows, isOwn, team };
    if (isAdmin || (isOwn && PARTICIPANT_CYCLE_STATES.includes(cycle.state))) return { ...found, access: 'insider' };
    if (await this.readsAsColleague(actorId, rows, team)) return { ...found, access: 'colleague' };
    const listed = { cycleState: cycle.state, subjectId: participant.employeeId, team, evaluatorId: assignment.evaluatorId };
    if (isListed(actorId, listed)) return { ...found, access: 'row' };
    throw new NotFoundException(NOT_FOUND);
  }

  /** A colleague reads a submitted version, when the rules of the cycle open it to them. */
  private async readsAsColleague(actorId: string | null, rows: ReviewRows, team: ReadonlySet<string>): Promise<boolean> {
    const { cycle, participant, stage, stages, siblings, versions } = rows;
    if (!actorId || !versions.some((version) => version.status === 'submitted')) return false;
    const stored = await this.visibility.findOne({ where: { cycleId: cycle.cycleId } });
    return readsColleagueReview({
      actorId,
      cycle,
      subjectId: participant.employeeId,
      stage,
      stages,
      assignments: siblings,
      readers: readersOf({}, stored),
      team,
    });
  }

  /** The template of a frozen version, inside the company of the viewer. */
  private async templateOf(company: string, versionId: string | null): Promise<ReviewDetailDto['template']> {
    const frozen = versionId ? await this.templateVersions.findOne({ where: { versionId } }) : null;
    const template = frozen && (await this.templates.findOne({ where: { templateId: frozen.templateId, company } }));
    return template ? { name: template.name, description: template.description, version: frozen.version } : null;
  }

  /** The sections of one frozen version, with their questions and choices: one query for each level. */
  private async sectionsOf(versionId: string | null): Promise<ReviewSectionDto[]> {
    if (!versionId) return [];
    const sections = await this.sections.find({ where: { versionId }, order: { sortOrder: 'ASC' } });
    if (sections.length === 0) return [];
    const questions = await this.questions.find({
      where: { sectionId: In(sections.map((section) => section.sectionId)) },
      order: { sortOrder: 'ASC' },
    });
    const options = questions.length
      ? await this.options.find({ where: { questionId: In(questions.map((question) => question.questionId)) } })
      : [];

    return sections.map((section) => ({
      sectionId: section.sectionId,
      title: section.title,
      questions: questions
        .filter((question) => question.sectionId === section.sectionId)
        .map((question) => ({
          questionId: question.questionId,
          prompt: question.prompt,
          questionType: question.questionType,
          isRequired: question.isRequired,
          allowNotObserved: question.questionType === 'rating_scale' && question.allowNotObserved === true,
          options: options
            .filter((option) => option.questionId === question.questionId)
            .map(({ optionId, label }) => ({ optionId, label })),
        })),
    }));
  }
}
