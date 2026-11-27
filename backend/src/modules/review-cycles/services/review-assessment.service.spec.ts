import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { reviewAnswerSchema, reviewDetailSchema } from '@pms/shared-types';
import { DataSource } from 'typeorm';
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
import { Cycle } from '../entities/cycle.entity.js';
import { ManagerAssignment } from '../entities/manager-assignment.entity.js';
import { table, type Row } from '../testing/memory-table-spec.js';
import { ReviewAssessmentService } from './review-assessment.service.js';

const COMPANY = 'Mayon Consolidated Inc.';
const guid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const SUBJECT = guid(27);
const BOSS = guid(26);
const HR = guid(24);
const NEW_BOSS = guid(22);
const CYCLE = guid(141);
const VERSION = guid(111);
const SELF = guid(301);
const MANAGER = guid(302);
const HR_REVIEW = guid(303);
const [Q_RATE, Q_STRICT, Q_NOTE, Q_CHOICE, Q_SHORT] = [guid(131), guid(132), guid(133), guid(134), guid(135)];
const [OFTEN, RARELY] = [guid(901), guid(902)];
const [S_ONE, S_TWO] = [guid(121), guid(122)];

/** The accounts: who each login is, and its role. */
const ACCOUNTS: Record<string, { actorId: string | null; role: string; company?: string }> = {
  user: { actorId: SUBJECT, role: '3' },
  manager: { actorId: BOSS, role: '2' },
  'new-manager': { actorId: NEW_BOSS, role: '2' },
  admin: { actorId: HR, role: '1' },
  colleague: { actorId: guid(28), role: '3' },
  'no-employee': { actorId: null, role: '1' },
  outsider: { actorId: guid(900), role: '1', company: 'Another Company' },
};

const day = (value: string) => new Date(`${value}T00:00:00Z`);
const assignmentRow = (assignmentId: string, evaluatorId: string, stageId: string, state: string, deadline: string) => ({
  assignmentId,
  cycleId: CYCLE,
  participantId: 'p-1',
  evaluatorId,
  stageId,
  state,
  deadline: day(deadline),
  submittedBy: null,
  submittedAt: null,
});
const question = (questionId: string, sortOrder: number, questionType: string, isRequired: boolean, allowNotObserved: boolean | null = null) => ({
  questionId,
  sectionId: sortOrder > 3 ? S_TWO : S_ONE,
  prompt: `Question ${sortOrder}`,
  questionType,
  isRequired,
  allowNotObserved,
  sortOrder,
});

function world() {
  return {
    cycles: table('cycleId', [{ cycleId: CYCLE, company: COMPANY, name: 'ZZ demo', state: 'active', goalsWeight: 0.5 }]),
    participants: table('participantId', [
      { participantId: 'p-1', cycleId: CYCLE, employeeId: SUBJECT, behavioralVersionId: VERSION, frozenPosition: 'Software Engineer' },
    ]),
    stages: table('stageId', [
      { stageId: 'st-hr', cycleId: CYCLE, perspective: 'hr', sortOrder: 3 },
      { stageId: 'st-self', cycleId: CYCLE, perspective: 'self', sortOrder: 1 },
      { stageId: 'st-mgr', cycleId: CYCLE, perspective: 'manager', sortOrder: 2 },
    ]),
    assignments: table('assignmentId', [
      assignmentRow(SELF, SUBJECT, 'st-self', 'not_started', '2026-12-04'),
      assignmentRow(MANAGER, BOSS, 'st-mgr', 'locked', '2026-12-11'),
      assignmentRow(HR_REVIEW, HR, 'st-hr', 'locked', '2026-12-18'),
    ]),
    responses: table('responseId', []),
    visibility: table('cycleId', [] as Row[]),
    audit: table('eventId', []),
    accomplishments: table('accomplishmentId', []),
    managers: table('assignmentId', []),
    employees: table('guid', [
      { guid: SUBJECT, company: COMPANY, firstName: 'Iging', lastName: 'UserDotTech', department: 'IT', status: 'active' },
      { guid: BOSS, company: COMPANY, firstName: 'Iging', lastName: 'ManagerDotTech', status: 'active' },
      { guid: HR, company: COMPANY, firstName: 'Lebron', lastName: 'James' },
    ]),
    templateVersions: table('versionId', [{ versionId: VERSION, templateId: guid(100), version: 2 }]),
    templates: table('templateId', [
      { templateId: guid(100), company: COMPANY, name: 'Quarterly Performance', description: 'Reflect on observable behaviors.' },
    ]),
    sections: table('sectionId', [
      { sectionId: S_TWO, versionId: VERSION, title: 'Ownership', sortOrder: 2 },
      { sectionId: S_ONE, versionId: VERSION, title: 'Collaboration', sortOrder: 1 },
      // A later version of the same template: this cycle did not freeze it.
      { sectionId: guid(129), versionId: guid(112), title: 'Added later', sortOrder: 1 },
    ]),
    questions: table('questionId', [
      question(Q_STRICT, 2, 'rating_scale', true, false),
      question(Q_RATE, 1, 'rating_scale', true, true),
      question(Q_NOTE, 3, 'paragraph', false),
      question(Q_CHOICE, 4, 'multiple_choice', true),
      question(Q_SHORT, 5, 'short_answer', false),
    ]),
    options: table('optionId', [
      { optionId: OFTEN, questionId: Q_CHOICE, label: 'Often' },
      { optionId: RARELY, questionId: Q_CHOICE, label: 'Rarely' },
    ]),
  };
}

/** What a restricted review holds: nothing of the review itself. */
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
};

describe('ReviewAssessmentService', () => {
  let service: ReviewAssessmentService;
  let db: ReturnType<typeof world>;
  const dataSource = { transaction: vi.fn() };
  const users = { findOne: vi.fn(async (query: { where: { id: string } }) => ({ id: query.where.id, userRoleId: ACCOUNTS[query.where.id]?.role })) };
  const resolver = {
    resolveAccount: vi.fn(async (userId: string) => ({ company: ACCOUNTS[userId]?.company ?? COMPANY, actorId: ACCOUNTS[userId]?.actorId ?? null })),
  };

  const set = (assignmentId: string, change: Row) => {
    const row = db.assignments.rows.find((candidate) => candidate.assignmentId === assignmentId);
    Object.assign(row as Row, change);
  };
  const respond = (assignmentId: string, status: string, answersJson: Row, version = 1) =>
    db.responses.rows.push({
      responseId: `r-${assignmentId}-${version}`,
      assignmentId,
      version,
      status,
      answersJson,
      submittedAt: status === 'submitted' ? day('2026-11-26') : null,
    });
  /** The answers as the controller passes them: parsed by the shared schema. */
  const answers = (...input: Record<string, unknown>[]) => input.map((answer) => reviewAnswerSchema.parse(answer));
  const stateOf = (assignmentId: string) => db.assignments.rows.find((row) => row.assignmentId === assignmentId)?.state;
  const nothingWritten = () => {
    expect(db.responses.save).not.toHaveBeenCalled();
    expect(db.assignments.save).not.toHaveBeenCalled();
    expect(db.audit.save).not.toHaveBeenCalled();
  };
  const cancelCycle = () => Object.assign(db.cycles.rows[0] as Row, { state: 'cancelled' });

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(day('2026-11-26'));
    db = world();
    const tables: [unknown, unknown][] = [
      [Cycle, db.cycles],
      [CycleParticipant, db.participants],
      [CycleStage, db.stages],
      [Assignment, db.assignments],
      [AssignmentResponse, db.responses],
      [CycleResultVisibility, db.visibility],
      [AuditEvent, db.audit],
      [Accomplishment, db.accomplishments],
      [ManagerAssignment, db.managers],
      [EmployeeDomain, db.employees],
      [BehavioralTemplate, db.templates],
      [BehavioralTemplateVersion, db.templateVersions],
      [BehavioralSection, db.sections],
      [BehavioralQuestion, db.questions],
      [BehavioralChoiceOption, db.options],
    ];
    dataSource.transaction.mockReset().mockImplementation(async (run: (manager: unknown) => unknown) =>
      run({ getRepository: (entity: unknown) => new Map(tables).get(entity) }),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReviewAssessmentService,
        ...tables.map(([entity, value]) => ({ provide: getRepositoryToken(entity as never), useValue: value })),
        { provide: getRepositoryToken(User), useValue: users },
        { provide: CompanyResolver, useValue: resolver },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = moduleRef.get(ReviewAssessmentService);
  });

  afterEach(() => vi.useRealTimers());

  describe('saveDraft', () => {
    const DRAFT = () => answers({ questionId: Q_RATE, isNotObserved: true }, { questionId: Q_STRICT, score: 3 }, { questionId: Q_CHOICE, optionId: OFTEN });

    it('saves the first draft keyed by question id, and starts the review', async () => {
      const review = await service.saveDraft('user', SELF, DRAFT());

      expect(db.responses.rows).toEqual([
        expect.objectContaining({
          assignmentId: SELF,
          version: 1,
          status: 'draft',
          answersJson: { [Q_RATE]: 'not_observed', [Q_STRICT]: 3, [Q_CHOICE]: OFTEN },
          submittedBy: null,
          submittedAt: null,
        }),
      ]);
      expect(stateOf(SELF)).toBe('in_progress');
      expect(review).toMatchObject({ state: 'in_progress', canEdit: true, response: { status: 'draft', version: 1 } });
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('changes the same draft on the next save, and keeps only what is filled in', async () => {
      await service.saveDraft('user', SELF, DRAFT());
      await service.saveDraft('user', SELF, answers({ questionId: Q_NOTE, writtenAnswer: 'Steady.' }, { questionId: Q_SHORT }));

      expect(db.responses.rows).toHaveLength(1);
      expect(db.responses.rows[0]).toMatchObject({ version: 1, answersJson: { [Q_NOTE]: 'Steady.' } });
    });

    it('writes one audit row with the actor, in the same transaction', async () => {
      await service.saveDraft('user', SELF, DRAFT());

      expect(db.audit.rows).toEqual([
        expect.objectContaining({
          entityType: 'assignment',
          entityId: SELF,
          action: 'draft_saved',
          actorId: SUBJECT,
          beforeJson: { state: 'not_started' },
          afterJson: { state: 'in_progress', answeredCount: 3 },
        }),
      ]);
    });

    it('locks the cycle for reading, then every assignment of the participant for writing, in one order', async () => {
      await service.saveDraft('user', SELF, DRAFT());

      const cycleLock = db.cycles.findOne.mock.calls.findIndex(([query]) => query.lock?.mode === 'pessimistic_read');
      const rowLock = db.assignments.find.mock.calls.findIndex(([query]) => query?.lock?.mode === 'pessimistic_write');
      expect(db.assignments.find.mock.calls[rowLock]?.[0]).toEqual({
        where: { participantId: 'p-1' },
        order: { assignmentId: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      expect(db.cycles.findOne.mock.invocationCallOrder[cycleLock]).toBeLessThan(db.assignments.find.mock.invocationCallOrder[rowLock] ?? 0);
    });

    it.each([
      ['another evaluator', 'manager'],
      ['an administrator, who may read it only', 'admin'],
      ['an account of another company', 'outsider'],
    ])('answers 404 to %s, and writes nothing', async (_label, account) => {
      await expect(service.saveDraft(account, SELF, DRAFT())).rejects.toBeInstanceOf(NotFoundException);
      nothingWritten();
    });

    it.each([
      ['locked', 'This review waits for an earlier stage.'],
      ['submitted', 'This review is already submitted.'],
      ['completed', 'This review is already submitted.'],
    ])('answers 409 to a %s review, and writes nothing', async (state, message) => {
      set(SELF, { state });

      await expect(service.saveDraft('user', SELF, DRAFT())).rejects.toThrow(new ConflictException(message));
      nothingWritten();
    });

    it('reads the state of the cycle under the lock, so a cancellation that committed first wins', async () => {
      const found = db.cycles.findOne.getMockImplementation();
      db.cycles.findOne.mockImplementation(async (query) => {
        const cycle = await found?.(query);
        return cycle && query.lock ? { ...cycle, state: 'cancelled' } : (cycle ?? null);
      });

      await expect(service.saveDraft('user', SELF, DRAFT())).rejects.toThrow(new ConflictException('The cycle is not active. This review cannot be changed.'));
      nothingWritten();
    });

    it.each([
      ['a question of another template version', { questionId: guid(999), score: 3 }, 'UNKNOWN_QUESTION'],
      ['a text for a rating question', { questionId: Q_RATE, writtenAnswer: 'good' }, 'WRONG_TYPE'],
      ['a rating for a text question', { questionId: Q_NOTE, score: 3 }, 'WRONG_TYPE'],
      ['a rating for a choice question', { questionId: Q_CHOICE, score: 3 }, 'WRONG_TYPE'],
      ['an option of no choice of the question', { questionId: Q_CHOICE, optionId: guid(999) }, 'UNKNOWN_OPTION'],
      ['Not observed where the question does not offer it', { questionId: Q_STRICT, isNotObserved: true }, 'NOT_OBSERVED_NOT_ALLOWED'],
    ])('answers 400 to %s, with the question, and writes nothing', async (_label, answer, code) => {
      const error = await service.saveDraft('user', SELF, answers(answer)).catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({ details: [{ field: `answers.${answer.questionId}`, code }] });
      nothingWritten();
    });
  });

  describe('submit', () => {
    const FULL = () =>
      answers({ questionId: Q_RATE, score: 4 }, { questionId: Q_STRICT, score: 5 }, { questionId: Q_CHOICE, optionId: RARELY });
    const verifyKpis = (status = 'verified') => db.accomplishments.rows.push({ accomplishmentId: 'acc-1', participantId: 'p-1', status });
    /** The self review is done, so the manager review is open. */
    const openManagerReview = () => {
      set(SELF, { state: 'submitted' });
      set(MANAGER, { state: 'not_started' });
    };

    it('submits the response with its actor and time, and closes the review', async () => {
      const review = await service.submit('user', SELF, FULL());

      expect(db.responses.rows).toEqual([
        expect.objectContaining({
          version: 1,
          status: 'submitted',
          answersJson: { [Q_RATE]: 4, [Q_STRICT]: 5, [Q_CHOICE]: RARELY },
          submittedBy: SUBJECT,
          submittedAt: day('2026-11-26'),
        }),
      ]);
      expect(db.assignments.rows[0]).toMatchObject({ state: 'submitted', submittedBy: SUBJECT, submittedAt: day('2026-11-26') });
      expect(review).toMatchObject({ state: 'submitted', canEdit: false, response: { status: 'submitted' } });
    });

    it('turns the saved draft into the submitted response, with no second version', async () => {
      await service.saveDraft('user', SELF, answers({ questionId: Q_RATE, score: 1 }));
      await service.submit('user', SELF, FULL());

      expect(db.responses.rows).toHaveLength(1);
      expect(db.responses.rows[0]).toMatchObject({ version: 1, status: 'submitted' });
    });

    it('opens the next stage of this participant only, and leaves the later one locked', async () => {
      db.assignments.rows.push({ ...assignmentRow(guid(402), BOSS, 'st-mgr', 'locked', '2026-12-11'), participantId: 'p-2' });

      await service.submit('user', SELF, FULL());

      expect([stateOf(MANAGER), stateOf(HR_REVIEW), stateOf(guid(402))]).toEqual(['not_started', 'locked', 'locked']);
    });

    it('records the submitted answers and the opened review in the audit trail', async () => {
      await service.submit('user', SELF, FULL());

      expect(db.audit.rows).toEqual([
        expect.objectContaining({
          entityId: SELF,
          action: 'submitted',
          actorId: SUBJECT,
          beforeJson: { state: 'not_started' },
          afterJson: { state: 'submitted', answers: { [Q_RATE]: 4, [Q_STRICT]: 5, [Q_CHOICE]: RARELY } },
        }),
        expect.objectContaining({
          entityId: MANAGER,
          action: 'stage_unlocked',
          actorId: SUBJECT,
          beforeJson: { state: 'locked' },
          afterJson: { state: 'not_started', afterAssignmentId: SELF },
        }),
      ]);
    });

    it('opens the next stage only when every review of the stage before is done (Rev-003)', async () => {
      openManagerReview();
      verifyKpis();
      db.assignments.rows.push(assignmentRow(guid(403), NEW_BOSS, 'st-mgr', 'not_started', '2026-12-11'));

      await service.submit('manager', MANAGER, FULL());
      expect(stateOf(HR_REVIEW)).toBe('locked');

      await service.submit('new-manager', guid(403), FULL());
      expect(stateOf(HR_REVIEW)).toBe('not_started');
    });

    it('accepts late work while the cycle is active (Rev-004)', async () => {
      set(SELF, { deadline: day('2026-10-01') });

      expect(await service.submit('user', SELF, FULL())).toMatchObject({ state: 'submitted' });
    });

    it('refuses a submission with a required question unanswered, naming each one', async () => {
      const error = await service.submit('user', SELF, answers({ questionId: Q_RATE, score: 4 }, { questionId: Q_NOTE, writtenAnswer: 'x' })).catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect((error as UnprocessableEntityException).getResponse()).toMatchObject({
        details: [
          { field: `answers.${Q_STRICT}`, code: 'REQUIRED' },
          { field: `answers.${Q_CHOICE}`, code: 'REQUIRED' },
        ],
      });
      nothingWritten();
    });

    it('takes Not observed as the answer of a required rating that offers it', async () => {
      const input = answers({ questionId: Q_RATE, isNotObserved: true }, { questionId: Q_STRICT, score: 5 }, { questionId: Q_CHOICE, optionId: OFTEN });

      expect(await service.submit('user', SELF, input)).toMatchObject({ state: 'submitted' });
    });

    it('refuses answers that do not fit before it looks for missing ones', async () => {
      await expect(service.submit('user', SELF, answers({ questionId: Q_RATE, writtenAnswer: 'x' }))).rejects.toBeInstanceOf(BadRequestException);
      nothingWritten();
    });

    it.each([
      ['no accomplishment', undefined],
      ['an accomplishment that is only submitted', 'submitted'],
    ])('holds a manager assessment while goals apply and there is %s (Acc-005)', async (_label, status) => {
      openManagerReview();
      if (status) verifyKpis(status);

      await expect(service.submit('manager', MANAGER, FULL())).rejects.toThrow(
        new UnprocessableEntityException('The KPI accomplishments of this employee are not verified yet, so the manager assessment cannot be submitted.'),
      );
      nothingWritten();
    });

    it('submits a manager assessment once the accomplishments are verified, and opens the HR review', async () => {
      openManagerReview();
      verifyKpis();

      await service.submit('manager', MANAGER, FULL());

      expect([stateOf(MANAGER), stateOf(HR_REVIEW)]).toEqual(['submitted', 'not_started']);
    });

    it('does not wait for accomplishments when goals do not apply', async () => {
      openManagerReview();
      Object.assign(db.cycles.rows[0] as Row, { goalsWeight: 0 });

      expect(await service.submit('manager', MANAGER, FULL())).toMatchObject({ state: 'submitted' });
    });

    it('does not hold a self assessment for accomplishments', async () => {
      expect(await service.submit('user', SELF, FULL())).toMatchObject({ state: 'submitted' });
      expect(db.accomplishments.rows).toEqual([]);
    });

    it.each([
      ['another evaluator', 'manager', NotFoundException],
      ['an administrator, who may read it only', 'admin', NotFoundException],
    ])('answers 404 to %s, and writes nothing', async (_label, account, expected) => {
      await expect(service.submit(account, SELF, FULL())).rejects.toBeInstanceOf(expected);
      nothingWritten();
    });

    it.each(['locked', 'submitted', 'completed'])('answers 409 to a %s review, and writes nothing', async (state) => {
      set(SELF, { state });

      await expect(service.submit('user', SELF, FULL())).rejects.toBeInstanceOf(ConflictException);
      nothingWritten();
    });

    it('lets a failed write reach the caller, with no audit row', async () => {
      db.responses.save.mockRejectedValue(new Error('insert failed'));

      await expect(service.submit('user', SELF, FULL())).rejects.toThrow('insert failed');
      expect(db.audit.save).not.toHaveBeenCalled();
    });
  });

  describe('submit, in stage order', () => {
    const FULL = () =>
      answers({ questionId: Q_RATE, score: 4 }, { questionId: Q_STRICT, score: 5 }, { questionId: Q_CHOICE, optionId: RARELY });

    it('answers 409 while an earlier stage is not finished, and writes nothing', async () => {
      set(SELF, { state: 'in_progress' });
      set(MANAGER, { state: 'in_progress' });
      db.accomplishments.rows.push({ accomplishmentId: 'acc-1', participantId: 'p-1', status: 'verified' });

      await expect(service.submit('manager', MANAGER, FULL())).rejects.toThrow(new ConflictException('This review waits for an earlier stage.'));
      nothingWritten();
    });

    it('still saves a draft while an earlier stage is not finished', async () => {
      set(SELF, { state: 'in_progress' });
      set(MANAGER, { state: 'in_progress' });

      expect(await service.saveDraft('manager', MANAGER, FULL())).toMatchObject({ state: 'in_progress', response: { status: 'draft' } });
    });

    it('accepts the review once the earlier stage is submitted again', async () => {
      set(SELF, { state: 'in_progress' });
      set(MANAGER, { state: 'in_progress' });
      db.accomplishments.rows.push({ accomplishmentId: 'acc-1', participantId: 'p-1', status: 'verified' });

      await service.submit('user', SELF, FULL());

      expect(await service.submit('manager', MANAGER, FULL())).toMatchObject({ state: 'submitted' });
    });
  });

  describe('reopen', () => {
    const REASON = 'Wrong ratings';
    const responsesOf = (assignmentId: string) => db.responses.rows.filter((row) => row.assignmentId === assignmentId);
    const reopen = (assignmentId: string, reason = REASON, cycleId = CYCLE, account = 'admin') =>
      service.reopen(account, cycleId, assignmentId, reason);
    const refused = () => {
      nothingWritten();
      expect([stateOf(SELF), stateOf(MANAGER), stateOf(HR_REVIEW)]).toEqual(['submitted', 'submitted', 'submitted']);
    };

    beforeEach(() => {
      for (const [assignmentId, score] of [[SELF, 1], [MANAGER, 2], [HR_REVIEW, 3]] as const) {
        set(assignmentId, { state: 'submitted', submittedBy: SUBJECT, submittedAt: day('2026-11-20') });
        respond(assignmentId, 'submitted', { [Q_RATE]: score });
      }
      db.accomplishments.rows.push({ accomplishmentId: 'acc-1', participantId: 'p-1', status: 'verified' });
    });

    it('opens the review again with a draft copy that keeps the reason, and leaves the old version as it was', async () => {
      const before = { ...responsesOf(HR_REVIEW)[0] };

      await reopen(HR_REVIEW, '  Wrong ratings  ');

      expect(db.assignments.rows.find((row) => row.assignmentId === HR_REVIEW)).toMatchObject({
        state: 'in_progress',
        submittedBy: null,
        submittedAt: null,
      });
      expect(responsesOf(HR_REVIEW)).toEqual([
        before,
        expect.objectContaining({ version: 2, status: 'draft', answersJson: { [Q_RATE]: 3 }, reopenReason: REASON, submittedBy: null, submittedAt: null }),
      ]);
      // Upstream work stays.
      expect([stateOf(SELF), stateOf(MANAGER)]).toEqual(['submitted', 'submitted']);
      expect(responsesOf(SELF)).toHaveLength(1);
    });

    it('opens every submitted later review of the participant too, each with its own copy (Rec-003)', async () => {
      await reopen(SELF);

      expect([stateOf(SELF), stateOf(MANAGER), stateOf(HR_REVIEW)]).toEqual(['in_progress', 'in_progress', 'in_progress']);
      expect(responsesOf(MANAGER)[1]).toMatchObject({ version: 2, status: 'draft', answersJson: { [Q_RATE]: 2 }, reopenReason: REASON });
      expect(responsesOf(HR_REVIEW)[1]).toMatchObject({ version: 2, answersJson: { [Q_RATE]: 3 } });
    });

    it('locks a later review that has not started, and leaves a started draft as it is', async () => {
      set(MANAGER, { state: 'in_progress' });
      set(HR_REVIEW, { state: 'not_started' });
      db.responses.rows.splice(1, 2);
      respond(MANAGER, 'draft', { [Q_RATE]: 5 });

      await reopen(SELF);

      expect([stateOf(MANAGER), stateOf(HR_REVIEW)]).toEqual(['in_progress', 'locked']);
      expect(responsesOf(MANAGER)).toEqual([expect.objectContaining({ version: 1, status: 'draft', answersJson: { [Q_RATE]: 5 } })]);
      expect(responsesOf(HR_REVIEW)).toEqual([]);
    });

    it('touches no other participant and no accomplishment (Rec-004)', async () => {
      db.assignments.rows.push({ ...assignmentRow(guid(402), BOSS, 'st-mgr', 'submitted', '2026-12-11'), participantId: 'p-2' });

      await reopen(SELF);

      expect(stateOf(guid(402))).toBe('submitted');
      expect(db.accomplishments.save).not.toHaveBeenCalled();
      expect(db.accomplishments.rows).toEqual([{ accomplishmentId: 'acc-1', participantId: 'p-1', status: 'verified' }]);
    });

    it('records the actor and the reason for each review that changes', async () => {
      set(HR_REVIEW, { state: 'not_started' });

      await reopen(SELF);

      const row = (entityId: string, action: string, before: string, after: string) =>
        expect.objectContaining({
          entityType: 'assignment',
          entityId,
          action,
          actorId: HR,
          reason: REASON,
          beforeJson: { state: before },
          afterJson: { state: after, reopenedAssignmentId: SELF },
        });
      expect(db.audit.rows).toHaveLength(3);
      expect(db.audit.rows).toEqual(
        expect.arrayContaining([
          row(SELF, 'reopened', 'submitted', 'in_progress'),
          row(MANAGER, 'reopened', 'submitted', 'in_progress'),
          row(HR_REVIEW, 'stage_locked', 'not_started', 'locked'),
        ]),
      );
    });

    it('locks the cycle, then every assignment of the participant, for writing', async () => {
      await reopen(HR_REVIEW);

      expect(db.cycles.findOne).toHaveBeenCalledWith({ where: { cycleId: CYCLE, company: COMPANY }, lock: { mode: 'pessimistic_write' } });
      expect(db.assignments.find).toHaveBeenCalledWith({
        where: { participantId: 'p-1' },
        order: { assignmentId: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it.each([
      ['a draft', { state: 'draft' }],
      ['a cancelled', { state: 'cancelled' }],
      ['a completed', { state: 'completed' }],
      ['a finalized', { finalizedAt: day('2026-11-25') }],
      ['a released', { releasedAt: day('2026-11-25') }],
    ])('answers 409 for %s cycle, and writes nothing (Rec-005)', async (_what, change) => {
      Object.assign(db.cycles.rows[0] as Row, change);

      await expect(reopen(SELF)).rejects.toBeInstanceOf(ConflictException);
      refused();
    });

    it.each(['locked', 'not_started', 'in_progress', 'completed'])('answers 409 for a %s review, and writes nothing', async (state) => {
      set(HR_REVIEW, { state });

      await expect(reopen(HR_REVIEW)).rejects.toThrow(new ConflictException('Only a submitted review can be reopened.'));
      nothingWritten();
    });

    it.each([
      ['a cycle that does not hold the review', () => {
        db.cycles.rows.push({ cycleId: guid(142), company: COMPANY, state: 'active' });
        return reopen(SELF, REASON, guid(142));
      }],
      ['an administrator of another company', () => reopen(SELF, REASON, CYCLE, 'outsider')],
      ['a review that does not exist', () => reopen(guid(999))],
    ])('answers 404 for %s, and writes nothing', async (_what, act) => {
      await expect(act()).rejects.toBeInstanceOf(NotFoundException);
      refused();
    });

    it('needs a reason that is not blank, and opens no transaction without one', async () => {
      await expect(reopen(SELF, '   ')).rejects.toBeInstanceOf(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('tells the evaluator of a later draft which stage it waits for now', async () => {
      await reopen(SELF);

      expect(await service.get('manager', MANAGER)).toMatchObject({ state: 'in_progress', canEdit: true, waitingFor: 'self' });
      expect(await service.get('user', SELF)).toMatchObject({ waitingFor: null });
    });

    it.each([
      ['an evaluator who is not an HR administrator', 'manager'],
      ['an account with no employee record', 'no-employee'],
    ])('answers 403 to %s, and opens no transaction', async (_what, account) => {
      await expect(reopen(SELF, REASON, CYCLE, account)).rejects.toBeInstanceOf(ForbiddenException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('shows the evaluator the draft with the reason, and the administrator the last submitted version (Rec-003)', async () => {
      await reopen(SELF);

      expect(await service.get('user', SELF)).toMatchObject({
        state: 'in_progress',
        canEdit: true,
        reopenReason: REASON,
        response: { version: 2, status: 'draft' },
      });
      expect(await service.get('admin', SELF)).toMatchObject({ reopenReason: REASON, response: { version: 1, status: 'submitted' } });
    });

    it('keeps the reason on a saved draft, and stops showing it once the review is submitted again', async () => {
      await reopen(HR_REVIEW);
      const full = answers({ questionId: Q_RATE, score: 4 }, { questionId: Q_STRICT, score: 5 }, { questionId: Q_CHOICE, optionId: RARELY });

      await service.saveDraft('admin', HR_REVIEW, full);
      expect(responsesOf(HR_REVIEW)[1]).toMatchObject({ version: 2, reopenReason: REASON });

      expect(await service.submit('admin', HR_REVIEW, full)).toMatchObject({ state: 'submitted', reopenReason: null, response: { version: 2 } });
    });
  });

  describe('the written feedback', () => {
    const FULL = () =>
      answers({ questionId: Q_RATE, score: 4 }, { questionId: Q_STRICT, score: 5 }, { questionId: Q_CHOICE, optionId: RARELY });

    it('is saved with a draft and with a submission, and read back', async () => {
      const draft = await service.saveDraft('user', SELF, FULL(), 'Half way.');
      expect(draft.response?.writtenFeedback).toBe('Half way.');

      const done = await service.submit('user', SELF, FULL(), 'Good quarter.');

      expect(db.responses.rows[0]?.answersJson).toMatchObject({ written_feedback: 'Good quarter.' });
      expect(done.response?.writtenFeedback).toBe('Good quarter.');
      expect(done.response?.answers).toHaveLength(3);
    });

    it('stores nothing for a blank one, and counts as no answer', async () => {
      await service.saveDraft('user', SELF, [], '');

      expect(db.responses.rows[0]?.answersJson).toEqual({});
      expect((await service.get('user', SELF)).response?.writtenFeedback).toBeNull();
    });
  });

  describe('the stages and the goals of a review', () => {
    const report = () => db.accomplishments.rows.push({ accomplishmentId: guid(171), participantId: 'p-1', status: 'draft' });

    it('lists every stage in order with its evaluator, deadline, and state, and marks this one', async () => {
      set(SELF, { state: 'submitted' });
      set(MANAGER, { state: 'in_progress' });

      const { stages } = await service.get('manager', MANAGER);

      expect(stages).toEqual([
        { perspective: 'self', evaluatorName: 'Iging UserDotTech', deadline: '2026-12-04T00:00:00.000Z', state: 'submitted', isCurrent: false },
        { perspective: 'manager', evaluatorName: 'Iging ManagerDotTech', deadline: '2026-12-11T00:00:00.000Z', state: 'in_progress', isCurrent: true },
        { perspective: 'hr', evaluatorName: 'Lebron James', deadline: '2026-12-18T00:00:00.000Z', state: 'locked', isCurrent: false },
      ]);
    });

    it.each([
      [['submitted', 'not_started'], 'in_progress'],
      [['not_started', 'not_started'], 'not_started'],
      [['submitted', 'completed'], 'submitted'],
    ])('shows one card for an anonymous group in the states %o: %s, with no name', async (states, expected) => {
      Object.assign(db.stages.rows.find((row) => row.stageId === 'st-mgr') as Row, { perspective: 'peer' });
      set(MANAGER, { state: states[0] });
      db.assignments.rows.push(assignmentRow(guid(402), NEW_BOSS, 'st-mgr', states[1] as string, '2026-12-11'));

      const { stages } = await service.get('user', SELF);

      expect(stages.filter((stage) => stage.perspective === 'peer')).toEqual([
        expect.objectContaining({ evaluatorName: 'Anonymous peer', state: expected, isCurrent: false }),
      ]);
    });

    it('shows an anonymous evaluator nothing about the other stages of the colleague', async () => {
      Object.assign(db.stages.rows.find((row) => row.stageId === 'st-mgr') as Row, { perspective: 'peer' });
      set(MANAGER, { state: 'not_started' });

      expect((await service.get('manager', MANAGER)).stages).toEqual([]);
      expect((await service.get('admin', MANAGER)).stages).toHaveLength(3);
    });

    it.each(['user', 'admin'])('offers the goals of the subject to %s', async (account) => {
      report();

      expect((await service.get(account, SELF)).goals).toEqual({ accomplishmentId: guid(171), status: 'draft' });
    });

    it('offers them to the current manager of the subject, and to no other evaluator', async () => {
      report();
      db.managers.rows.push({ assignmentId: 'm-1', company: COMPANY, employeeId: SUBJECT, managerId: BOSS, effectiveDate: '2026-11-01', status: 'applied' });

      expect((await service.get('manager', MANAGER)).goals).not.toBeNull();

      db.managers.rows.length = 0;
      expect((await service.get('manager', MANAGER)).goals).toBeNull();
    });

    it('offers none when the cycle has no report', async () => {
      expect((await service.get('user', SELF)).goals).toBeNull();
    });
  });

  describe('get', () => {
    it('says the frozen position and the department of the subject, and whether the caller answers it', async () => {
      expect(await service.get('user', SELF)).toMatchObject({
        subjectPosition: 'Software Engineer',
        subjectDepartment: 'IT',
        isAssignedToCaller: true,
      });
      expect(await service.get('admin', SELF)).toMatchObject({ isAssignedToCaller: false });
    });

    it('names the template of the frozen version', async () => {
      expect((await service.get('user', SELF)).template).toEqual({
        name: 'Quarterly Performance',
        description: 'Reflect on observable behaviors.',
        version: 2,
      });
    });

    it.each<[string, (rows: ReturnType<typeof world>) => void]>([
      ['no frozen version', (rows) => Object.assign(rows.participants.rows[0] as Row, { behavioralVersionId: null })],
      ['a template of another company', (rows) => Object.assign(rows.templates.rows[0] as Row, { company: 'Another Company' })],
    ])('names no template for %s', async (_what, change) => {
      change(db);

      expect((await service.get('user', SELF)).template).toBeNull();
    });

    it('shows the evaluator their review with the questions of the frozen version, in order', async () => {
      const review = await service.get('user', SELF);

      expect(() => reviewDetailSchema.parse(review)).not.toThrow();
      expect(review).toMatchObject({
        assignmentId: SELF,
        cycleName: 'ZZ demo',
        cycleState: 'active',
        subjectName: 'Iging UserDotTech',
        evaluatorName: 'Iging UserDotTech',
        perspective: 'self',
        state: 'not_started',
        deadline: '2026-12-04T00:00:00.000Z',
        isOverdue: false,
        canEdit: true,
        waitingFor: null,
        response: null,
      });
      expect(review.sections.map((section) => section.title)).toEqual(['Collaboration', 'Ownership']);
      expect(review.sections.flatMap((section) => section.questions.map((row) => row.questionId))).toEqual([Q_RATE, Q_STRICT, Q_NOTE, Q_CHOICE, Q_SHORT]);
      expect(review.sections[0]?.questions[0]).toMatchObject({ allowNotObserved: true, options: [] });
      expect(review.sections[0]?.questions[2]).toMatchObject({ allowNotObserved: false });
      expect(review.sections[1]?.questions[0]?.options).toEqual([
        { optionId: OFTEN, label: 'Often' },
        { optionId: RARELY, label: 'Rarely' },
      ]);
    });

    it.each([
      [MANAGER, 'manager'],
      [HR_REVIEW, 'admin'],
    ])('keeps a locked review closed, and names the first stage that is not finished', async (assignmentId, account) => {
      expect(await service.get(account, assignmentId)).toMatchObject({ state: 'locked', canEdit: false, waitingFor: 'self' });
    });

    it('shows the evaluator the saved draft, answer by answer', async () => {
      set(SELF, { state: 'in_progress' });
      respond(SELF, 'draft', { [Q_RATE]: 'not_observed', [Q_STRICT]: 3, [Q_NOTE]: 'Steady.', [Q_CHOICE]: OFTEN });

      const review = await service.get('user', SELF);

      const blank = { score: null, writtenAnswer: null, optionId: null, isNotObserved: false };
      expect(review.response).toEqual({
        version: 1,
        status: 'draft',
        submittedAt: null,
        writtenFeedback: null,
        answers: [
          { ...blank, questionId: Q_RATE, isNotObserved: true },
          { ...blank, questionId: Q_STRICT, score: 3 },
          { ...blank, questionId: Q_NOTE, writtenAnswer: 'Steady.' },
          { ...blank, questionId: Q_CHOICE, optionId: OFTEN },
        ],
      });
    });

    it('reads the latest version, in the shape that the seed stores', async () => {
      set(SELF, { state: 'submitted' });
      respond(SELF, 'submitted', { [Q_RATE]: 1 }, 1);
      respond(SELF, 'submitted', { [Q_RATE]: 4, [Q_STRICT]: 4 }, 2);

      const review = await service.get('user', SELF);

      expect(review.canEdit).toBe(false);
      expect(review.response).toMatchObject({ version: 2, status: 'submitted', submittedAt: '2026-11-26T00:00:00.000Z' });
      expect(review.response?.answers.map((answer) => answer.score)).toEqual([4, 4]);
    });

    it('lets an administrator read a submitted response of another evaluator, and change nothing', async () => {
      set(SELF, { state: 'submitted' });
      respond(SELF, 'submitted', { [Q_RATE]: 4 });

      const review = await service.get('admin', SELF);

      expect(review.canEdit).toBe(false);
      expect(review.response?.answers).toHaveLength(1);
    });

    it('does not show an administrator the draft of another evaluator (PRD 8.3)', async () => {
      set(SELF, { state: 'in_progress' });
      respond(SELF, 'draft', { [Q_RATE]: 2 });

      const review = await service.get('admin', SELF);

      expect(review.response).toBeNull();
      expect(review.state).toBe('in_progress');
    });

    it('lets an administrator read a review of a cancelled cycle', async () => {
      cancelCycle();

      expect(await service.get('admin', SELF)).toMatchObject({ cycleState: 'cancelled', canEdit: false });
    });

    it('marks late open work as overdue', async () => {
      set(SELF, { deadline: day('2026-11-01') });

      expect(await service.get('user', SELF)).toMatchObject({ isOverdue: true, canEdit: true });
    });

    it.each([
      ['another evaluator', 'manager', SELF],
      ['an administrator of another company', 'outsider', SELF],
      ['anyone, for an id that does not exist', 'admin', guid(999)],
    ])('answers 404 to %s', async (_label, account, assignmentId) => {
      await expect(service.get(account, assignmentId)).rejects.toThrow(new NotFoundException('Review not found'));
    });

    it.each(['cancelled', 'draft', 'scheduled'])('answers 404 to the evaluator while the cycle is %s', async (state) => {
      Object.assign(db.cycles.rows[0] as Row, { state });

      await expect(service.get('user', SELF)).rejects.toBeInstanceOf(NotFoundException);
    });

    describe('of a completed cycle', () => {
      beforeEach(() => {
        Object.assign(db.cycles.rows[0] as Row, { state: 'completed' });
        set(SELF, { state: 'completed' });
        respond(SELF, 'submitted', { [Q_RATE]: 2 });
      });

      it('lets the evaluator read their own review, and change nothing (Rev-007)', async () => {
        expect(await service.get('user', SELF)).toMatchObject({
          cycleState: 'completed',
          canEdit: false,
          response: { version: 1, status: 'submitted' },
        });
      });

      it('keeps the department of today from an evaluator who is not the subject (CWE-200)', async () => {
        set(MANAGER, { state: 'completed' });

        expect((await service.get('manager', MANAGER)).subjectDepartment).toBeNull();
        expect((await service.get('admin', MANAGER)).subjectDepartment).toBe('IT');
        expect((await service.get('user', SELF)).subjectDepartment).toBe('IT');
      });

      it.each(['manager', 'new-manager', 'outsider'])('still answers 404 to the %s, who does not evaluate it', async (account) => {
        await expect(service.get(account, SELF)).rejects.toBeInstanceOf(NotFoundException);
      });

      it.each([
        ['saveDraft', () => service.saveDraft('user', SELF, answers({ questionId: Q_RATE, score: 3 }))],
        ['submit', () => service.submit('user', SELF, answers({ questionId: Q_RATE, score: 3 }))],
      ])('refuses %s even on an assignment that looks open, and writes nothing', async (_name, write) => {
        set(SELF, { state: 'in_progress' });

        await expect(write()).rejects.toThrow(new ConflictException('The cycle is not active. This review cannot be changed.'));
        nothingWritten();
      });

      it('gives a prior manager their own assignment, and no way to the goals of the subject (Rev-007)', async () => {
        db.accomplishments.rows.push({ accomplishmentId: guid(171), participantId: 'p-1', status: 'verified' });
        set(MANAGER, { state: 'completed' });

        expect(await service.get('manager', MANAGER)).toMatchObject({ assignmentId: MANAGER, canEdit: false, goals: null });
      });
    });

    describe('the earlier versions (Rev-006, Rec-003)', () => {
      const version = (number: number, status: string, score: number, reopenReason: string | null = null) => {
        respond(SELF, status, { [Q_RATE]: score }, number);
        Object.assign(db.responses.rows.at(-1) as Row, { reopenReason });
      };
      const entry = (number: number, score: number, reopenReason: string) => ({
        version: number,
        submittedAt: '2026-11-26T00:00:00.000Z',
        answers: [expect.objectContaining({ questionId: Q_RATE, score })],
        writtenFeedback: null,
        reopenReason,
      });

      it('gives an administrator the versions before the one shown, newest first, with why each was reopened', async () => {
        set(SELF, { state: 'submitted' });
        version(1, 'submitted', 1);
        version(2, 'submitted', 2, 'First reason');
        version(3, 'submitted', 3, 'Second reason');

        const review = await service.get('admin', SELF);

        expect(review.response?.version).toBe(3);
        expect(review.history).toEqual([entry(2, 2, 'Second reason'), entry(1, 1, 'First reason')]);
        expect(() => reviewDetailSchema.parse(review)).not.toThrow();
      });

      it('gives the evaluator the submitted version behind a reopened draft', async () => {
        set(SELF, { state: 'in_progress' });
        version(1, 'submitted', 1);
        version(2, 'draft', 4, 'Wrong ratings');

        const review = await service.get('user', SELF);

        expect(review.response).toMatchObject({ version: 2, status: 'draft' });
        expect(review.history).toEqual([entry(1, 1, 'Wrong ratings')]);
      });

      it('gives anyone else no version beyond the one shown while the new one is a draft (PRD 8.3)', async () => {
        set(SELF, { state: 'in_progress' });
        version(1, 'submitted', 1);
        version(2, 'draft', 4, 'Wrong ratings');

        const review = await service.get('admin', SELF);

        expect(review.response?.version).toBe(1);
        expect(review.history).toEqual([]);
      });

      it('keeps the reason with the replaced version after the review is submitted again', async () => {
        set(SELF, { state: 'submitted' });
        version(1, 'submitted', 1);

        await service.reopen('admin', CYCLE, SELF, 'Wrong ratings');
        await service.submit(
          'user',
          SELF,
          answers({ questionId: Q_RATE, score: 5 }, { questionId: Q_STRICT, score: 4 }, { questionId: Q_CHOICE, optionId: OFTEN }),
        );

        const review = await service.get('admin', SELF);
        expect(review.response?.version).toBe(2);
        expect(review.history).toEqual([expect.objectContaining({ version: 1, reopenReason: 'Wrong ratings' })]);
      });

      it('gives nobody but the evaluator the versions of an anonymous review, an administrator included (Res-008)', async () => {
        Object.assign(db.stages.rows.find((row) => row.stageId === 'st-mgr') as Row, { perspective: 'peer' });
        set(MANAGER, { state: 'submitted' });
        respond(MANAGER, 'submitted', { [Q_RATE]: 2 }, 1);
        respond(MANAGER, 'submitted', { [Q_RATE]: 3 }, 2);

        expect((await service.get('admin', MANAGER)).history).toEqual([]);
        expect((await service.get('manager', MANAGER)).history.map((row) => row.version)).toEqual([1]);
      });
    });

    describe('an anonymous perspective (Res-008)', () => {
      beforeEach(() => {
        Object.assign(db.stages.rows.find((row) => row.stageId === 'st-mgr') as Row, { perspective: 'peer' });
        set(MANAGER, { state: 'submitted' });
        respond(MANAGER, 'submitted', { [Q_RATE]: 2 });
      });

      it('hides the evaluator and the answers from anyone else, an administrator included', async () => {
        expect(await service.get('admin', MANAGER)).toMatchObject({ evaluatorName: 'Anonymous peer', response: null });
      });

      it('shows the evaluator their own name and answers', async () => {
        const review = await service.get('manager', MANAGER);

        expect(review.evaluatorName).toBe('Iging ManagerDotTech');
        expect(review.response?.answers).toHaveLength(1);
      });
    });

    describe('who reads a review of somebody else (D5)', () => {
      const cycleRow = () => db.cycles.rows[0] as Row;
      const stageRow = (stageId: string) => db.stages.rows.find((row) => row.stageId === stageId) as Row;
      const choose = (choice: Row) =>
        db.visibility.rows.push({ cycleId: CYCLE, employeeVisible: true, managerVisible: true, earlierAnswersVisible: false, ...choice });
      const submitted = (assignmentId: string, version = 1) => {
        set(assignmentId, { state: 'submitted' });
        respond(assignmentId, 'submitted', { [Q_RATE]: 4 }, version);
      };
      const refused = (account: string, assignmentId: string) => expect(service.get(account, assignmentId)).rejects.toBeInstanceOf(NotFoundException);
      /** A row that the viewer sees in their list, and may not read. */
      const restricted = async (account: string, assignmentId: string) => expect(await service.get(account, assignmentId)).toMatchObject(WITHHELD);
      const READ_ONLY = { canEdit: false, isAssignedToCaller: false, reopenReason: null, history: [] };

      describe('the reviewer of a later stage, while the cycle runs', () => {
        beforeEach(() => submitted(SELF));

        it('reads the submitted answers of an earlier stage when the cycle allows it, read only', async () => {
          choose({ earlierAnswersVisible: true });

          const review = await service.get('manager', SELF);

          expect(review).toMatchObject({ ...READ_ONLY, response: { version: 1, status: 'submitted' } });
          expect(review.response?.answers).toHaveLength(1);
        });

        it('reads it as the reviewer of the HR stage too', async () => {
          choose({ earlierAnswersVisible: true });
          set(HR_REVIEW, { evaluatorId: NEW_BOSS });

          expect(await service.get('new-manager', SELF)).toMatchObject({ response: { version: 1 } });
        });

        it('reads the submitted version of a reopened review, and neither the draft nor its reason', async () => {
          choose({ earlierAnswersVisible: true });
          set(SELF, { state: 'in_progress' });
          db.responses.rows.push({ responseId: 'r-draft', assignmentId: SELF, version: 2, status: 'draft', answersJson: { [Q_RATE]: 1 }, submittedAt: null, reopenReason: 'Wrong' });

          expect(await service.get('manager', SELF)).toMatchObject({ ...READ_ONLY, response: { version: 1, status: 'submitted' } });
        });

        it.each([
          ['the cycle does not allow it', () => choose({ earlierAnswersVisible: false })],
          ['the cycle has no stored choice', () => undefined],
          [
            'the cycle is completed and not released',
            () => {
              choose({ earlierAnswersVisible: true });
              Object.assign(cycleRow(), { state: 'completed' });
            },
          ],
          [
            'the later stage of that reviewer is a peer stage',
            () => {
              choose({ earlierAnswersVisible: true });
              stageRow('st-mgr').perspective = 'peer';
            },
          ],
          [
            'the later stage of that reviewer is an upward stage',
            () => {
              choose({ earlierAnswersVisible: true });
              stageRow('st-mgr').perspective = 'upward';
            },
          ],
          [
            'the stage of that reviewer comes first',
            () => {
              choose({ earlierAnswersVisible: true });
              stageRow('st-mgr').sortOrder = 0;
            },
          ],
        ])('answers 404 when %s', async (_when, arrange) => {
          arrange();

          await refused('manager', SELF);
        });

        it('answers 404 for a review that was never submitted: a draft stays with its evaluator', async () => {
          choose({ earlierAnswersVisible: true });
          db.responses.rows.length = 0;
          respond(SELF, 'draft', { [Q_RATE]: 2 });

          await refused('manager', SELF);
        });

        it.each(['peer', 'upward'])('never shows the answers of a %s review', async (perspective) => {
          choose({ earlierAnswersVisible: true });
          stageRow('st-self').perspective = perspective;

          await refused('manager', SELF);
        });

        it('shows the employee nothing of the reviews about them before the release', async () => {
          choose({ earlierAnswersVisible: true });
          submitted(MANAGER);

          await restricted('user', MANAGER);
        });

        it('keeps it from the employee who also reviews a later stage of their own', async () => {
          choose({ earlierAnswersVisible: true });
          submitted(MANAGER);
          set(HR_REVIEW, { evaluatorId: SUBJECT });

          await restricted('user', MANAGER);
        });

        it('answers 404 to a manager who holds no stage of this participant', async () => {
          choose({ earlierAnswersVisible: true });

          await refused('new-manager', SELF);
        });
      });

      describe('after the release', () => {
        beforeEach(() => {
          Object.assign(cycleRow(), { state: 'completed', releasedAt: day('2026-11-26') });
          submitted(SELF);
          submitted(MANAGER);
          db.managers.rows.push({ assignmentId: 'm-1', company: COMPANY, employeeId: SUBJECT, managerId: NEW_BOSS, effectiveDate: '2026-11-01', status: 'applied' });
          db.employees.rows.push({ guid: NEW_BOSS, company: COMPANY, firstName: 'New', lastName: 'Boss', status: 'active' });
        });

        it('lets the employee read a review about them, when the cycle has no stored choice', async () => {
          expect(await service.get('user', MANAGER)).toMatchObject({ ...READ_ONLY, response: { version: 1, status: 'submitted' } });
        });

        it('lets the current manager of the employee read it', async () => {
          expect(await service.get('new-manager', SELF)).toMatchObject({ ...READ_ONLY, response: { version: 1 } });
        });

        it('shows no earlier version to either of them', async () => {
          submitted(MANAGER, 2);

          expect((await service.get('user', MANAGER)).history).toEqual([]);
        });

        it.each([
          ['the employee, when employees do not read results', 'user', MANAGER, { employeeVisible: false }],
          ['the current manager, when managers do not read results', 'new-manager', SELF, { managerVisible: false }],
        ])('shows %s the row and nothing of the review', async (_who, account, assignmentId, choice) => {
          choose(choice);

          await restricted(account, assignmentId);
        });

        it('answers 404 to a former manager, who reviews this participant and no longer manages them', async () => {
          choose({ earlierAnswersVisible: true });

          await refused('manager', SELF);
        });

        it('says the department to the current manager (D11)', async () => {
          expect((await service.get('new-manager', SELF)).subjectDepartment).toBe('IT');
        });

        it('keeps a peer review from the employee, with no name', async () => {
          stageRow('st-mgr').perspective = 'peer';

          await restricted('user', MANAGER);
          expect((await service.get('user', MANAGER)).evaluatorName).toBe('Anonymous peer');
        });

        it('keeps a review that was never submitted from the employee', async () => {
          set(MANAGER, { state: 'in_progress' });
          db.responses.rows.length = 0;
          respond(MANAGER, 'draft', { [Q_RATE]: 2 });

          await restricted('user', MANAGER);
        });

        it('withholds the review before the release, even for a finalized cycle', async () => {
          Object.assign(cycleRow(), { releasedAt: null, finalizedAt: day('2026-11-26') });

          await restricted('user', MANAGER);
        });
      });
    });

    describe('a listed review that the viewer may not read (D5)', () => {
      beforeEach(() => {
        db.managers.rows.push({ assignmentId: 'm-1', company: COMPANY, employeeId: SUBJECT, managerId: NEW_BOSS, effectiveDate: '2026-11-01', status: 'applied' });
        db.employees.rows.push({ guid: NEW_BOSS, company: COMPANY, firstName: 'New', lastName: 'Boss', status: 'active' });
        set(MANAGER, { state: 'in_progress' });
        respond(MANAGER, 'draft', { [Q_RATE]: 2 });
      });

      it.each(['new-manager', 'user'])('tells the %s the stage, the status, and the due date, and no answer', async (account) => {
        const review = await service.get(account, MANAGER);

        expect(review).toMatchObject({ ...WITHHELD, perspective: 'manager', state: 'in_progress', deadline: '2026-12-11T00:00:00.000Z' });
        expect(() => reviewDetailSchema.parse(review)).not.toThrow();
      });

      it('answers 404 to a person who is neither the evaluator, the employee, nor the current manager', async () => {
        await expect(service.get('colleague', MANAGER)).rejects.toBeInstanceOf(NotFoundException);
      });

      it.each(['cancelled', 'draft', 'scheduled'])('answers 404 to the employee while the cycle is %s', async (state) => {
        Object.assign(db.cycles.rows[0] as Row, { state });

        await expect(service.get('user', MANAGER)).rejects.toBeInstanceOf(NotFoundException);
      });

      it.each(['manager', 'admin'])('withholds nothing from the %s, who answers or administers it', async (account) => {
        expect((await service.get(account, MANAGER)).isRestricted).toBe(false);
      });
    });

    it('keeps the access of the evaluator who holds the assignment, whoever the manager is now (Rev-007)', async () => {
      expect(await service.get('manager', MANAGER)).toMatchObject({ assignmentId: MANAGER });
      await expect(service.get('new-manager', MANAGER)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
