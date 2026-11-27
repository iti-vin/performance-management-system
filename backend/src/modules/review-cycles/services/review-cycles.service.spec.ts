import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In, LessThanOrEqual } from 'typeorm';
import { reviewCycleListRowSchema, reviewCycleParticipantsSchema } from '@pms/shared-types';
import type { Mock } from 'vitest';
import { AuditEvent } from '../../../common/entities/audit-event.entity.js';
import { CompanyResolver } from '../../kpi-goals/services/company-resolver.service.js';
import type { CreateReviewCycleDto } from '../dtos/create-review-cycle.dto.js';
import { Accomplishment } from '../entities/accomplishment.entity.js';
import { Assignment } from '../entities/assignment.entity.js';
import { CycleParticipant } from '../entities/cycle-participant.entity.js';
import { CyclePeerEvaluator } from '../entities/cycle-peer-evaluator.entity.js';
import { CycleStage } from '../entities/cycle-stage.entity.js';
import { Cycle } from '../entities/cycle.entity.js';
import { BehavioralTemplateVersion } from '../../behavioral-assessment/entities/behavioral-template-version.entity.js';
import { BehavioralTemplate } from '../../behavioral-assessment/entities/behavioral-template.entity.js';
import { EmployeeDomain } from '../../employees/entities/employee-domain.entity.js';
import { KpiGoalTemplate } from '../../kpi-goals/entities/kpi-goal-template.entity.js';
import { KpiTemplateVersion } from '../../kpi-goals/entities/kpi-template-version.entity.js';
import { ManagerAssignment } from '../entities/manager-assignment.entity.js';
import { User } from '../../auth/entities/user.entity.js';
import { resolveParticipants } from './participant-resolver.js';
import { CycleResultVisibility } from '../entities/cycle-result-visibility.entity.js';
import { ReviewCyclesService } from './review-cycles.service.js';

vi.mock('./participant-resolver.js', () => ({ resolveParticipants: vi.fn(async () => []) }));

const COMPANY = 'Mayon Consolidated Inc.';
const ACTOR_ID = '00000000-0000-0000-0000-000000000021';
const CYCLE_A = '00000000-0000-0000-0000-000000000141';
const CYCLE_B = '00000000-0000-0000-0000-000000000142';
const EMPLOYEE_A = '00000000-0000-0000-0000-000000000021';

type MockRepo<T> = {
  create: Mock<(data: Partial<T>) => T>;
  save: Mock<(entity: T) => Promise<T>>;
  find: Mock<(...args: unknown[]) => Promise<T[]>>;
  findOne: Mock<(...args: unknown[]) => Promise<T | null>>;
  delete: Mock<(...args: unknown[]) => Promise<unknown>>;
};

function createRepo<T>(): MockRepo<T> {
  return {
    create: vi.fn((data: Partial<T>) => data as T),
    save: vi.fn(async (entity: T) => entity),
    find: vi.fn(async () => []),
    findOne: vi.fn(async () => null),
    delete: vi.fn(async () => undefined),
  };
}

function cycle(overrides: Partial<Cycle> = {}): Cycle {
  return {
    cycleId: CYCLE_A,
    company: COMPANY,
    name: 'CY2026-Q4',
    reviewType: 'standard',
    state: 'active',
    evaluationStart: '2026-11-04',
    evaluationEnd: '2026-12-31',
    assessmentStart: null,
    verificationDeadline: null,
    description: null,
    accomplishmentDeadline: null,
    activationDate: null,
    goalsWeight: 0.5,
    behavioralWeight: 0.5,
    anonymityThreshold: null,
    cancelledReason: null,
    finalizedAt: null,
    releasedAt: null,
    idempotencyKey: null,
    createdAt: new Date('2026-11-01T00:00:00Z'),
    updatedAt: new Date('2026-11-02T00:00:00Z'),
    ...overrides,
  };
}

describe('ReviewCyclesService', () => {
  let service: ReviewCyclesService;
  let cycles: MockRepo<Cycle>;
  let participants: MockRepo<CycleParticipant>;
  let stages: MockRepo<CycleStage>;
  let assignments: MockRepo<Assignment>;
  let audit: MockRepo<AuditEvent>;
  let employees: MockRepo<EmployeeDomain>;
  let kpiTemplates: MockRepo<KpiGoalTemplate>;
  let kpiVersions: MockRepo<KpiTemplateVersion>;
  let behavioralTemplates: MockRepo<BehavioralTemplate>;
  let behavioralVersions: MockRepo<BehavioralTemplateVersion>;
  let managers: MockRepo<ManagerAssignment>;
  let users: MockRepo<User>;
  let accomplishments: MockRepo<Accomplishment>;
  let peers: MockRepo<CyclePeerEvaluator>;
  let visibility: MockRepo<CycleResultVisibility>;
  const resolver = { resolveAccount: vi.fn(), resolveCompany: vi.fn() };
  // The transaction hands out the same repository mocks, as the behavioral spec does.
  const manager = { getRepository: vi.fn() };
  const dataSource = { transaction: vi.fn() };

  beforeEach(async () => {
    cycles = createRepo();
    participants = createRepo();
    stages = createRepo();
    assignments = createRepo();
    audit = createRepo();
    employees = createRepo();
    kpiTemplates = createRepo();
    kpiVersions = createRepo();
    behavioralTemplates = createRepo();
    behavioralVersions = createRepo();
    managers = createRepo();
    users = createRepo();
    accomplishments = createRepo();
    peers = createRepo();
    visibility = createRepo();
    manager.getRepository.mockReset().mockImplementation((entity: unknown) => {
      if (entity === Cycle) return cycles;
      if (entity === CyclePeerEvaluator) return peers;
      if (entity === CycleResultVisibility) return visibility;
      if (entity === CycleParticipant) return participants;
      if (entity === CycleStage) return stages;
      if (entity === Assignment) return assignments;
      if (entity === AuditEvent) return audit;
      if (entity === EmployeeDomain) return employees;
      if (entity === ManagerAssignment) return managers;
      if (entity === User) return users;
      if (entity === Accomplishment) return accomplishments;
      if (entity === KpiTemplateVersion) return kpiVersions;
      if (entity === KpiGoalTemplate) return kpiTemplates;
      if (entity === BehavioralTemplateVersion) return behavioralVersions;
      if (entity === BehavioralTemplate) return behavioralTemplates;
      return undefined;
    });
    resolver.resolveAccount.mockReset().mockResolvedValue({ company: COMPANY, actorId: ACTOR_ID });
    resolver.resolveCompany.mockReset().mockResolvedValue(COMPANY);
    vi.mocked(resolveParticipants).mockReset().mockResolvedValue([]);
    dataSource.transaction
      .mockReset()
      .mockImplementation(async (run: (m: typeof manager) => Promise<unknown>) => run(manager));

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReviewCyclesService,
        { provide: getRepositoryToken(Cycle), useValue: cycles },
        { provide: getRepositoryToken(CycleParticipant), useValue: participants },
        { provide: getRepositoryToken(CycleStage), useValue: stages },
        { provide: getRepositoryToken(Assignment), useValue: assignments },
        { provide: getRepositoryToken(EmployeeDomain), useValue: employees },
        { provide: getRepositoryToken(KpiGoalTemplate), useValue: kpiTemplates },
        { provide: getRepositoryToken(KpiTemplateVersion), useValue: kpiVersions },
        { provide: getRepositoryToken(BehavioralTemplate), useValue: behavioralTemplates },
        { provide: getRepositoryToken(BehavioralTemplateVersion), useValue: behavioralVersions },
        { provide: getRepositoryToken(ManagerAssignment), useValue: managers },
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(CyclePeerEvaluator), useValue: peers },
        { provide: getRepositoryToken(CycleResultVisibility), useValue: visibility },
        { provide: CompanyResolver, useValue: resolver },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = moduleRef.get(ReviewCyclesService);
  });

  describe('the actor of a change', () => {
    const BODY = {
      name: 'CY2027-Q1',
      reviewType: 'standard',
      evaluationStart: '2027-01-01',
      evaluationEnd: '2027-03-31',
      assessmentStart: '2027-04-01T00:00:00.000Z',
      verificationDeadline: '2027-04-20T00:00:00.000Z',
      goalsWeight: 0.5,
      behavioralWeight: 0.5,
      stages: [{ perspective: 'self', evaluatorRole: 'employee', deadline: '2027-04-07T00:00:00.000Z' }],
    } as CreateReviewCycleDto;

    it.each([
      ['create', () => service.create(BODY, 'user-1')],
      ['update', () => service.update('user-1', CYCLE_A, BODY)],
      ['cancel', () => service.cancel('user-1', CYCLE_A, 'Budget freeze')],
      ['launch', () => service.launch('user-1', CYCLE_A)],
    ])('refuses %s with 403, before any transaction, when the account has no employee ID to record', async (_label, act) => {
      resolver.resolveAccount.mockResolvedValue({ company: COMPANY, actorId: null });
      cycles.findOne.mockResolvedValue(cycle({ state: 'draft' }));

      await expect(act()).rejects.toBeInstanceOf(ForbiddenException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const DTO = {
      name: ' CY2027-Q1 ',
      reviewType: 'standard',
      evaluationStart: '2027-01-01',
      evaluationEnd: '2027-03-31',
      assessmentStart: '2027-04-01T00:00:00.000Z',
      verificationDeadline: '2027-04-20T00:00:00.000Z',
      goalsWeight: 0.5,
      behavioralWeight: 0.5,
      anonymityThreshold: null,
      stages: [
        { perspective: 'self', evaluatorRole: 'employee', deadline: '2027-04-07T00:00:00.000Z' },
        {
          perspective: 'hr',
          evaluatorRole: 'hr_officer',
          evaluatorId: '00000000-0000-0000-0000-000000000023',
          deadline: '2027-04-14T00:00:00.000Z',
        },
      ],
    } as CreateReviewCycleDto;
    const HR_GUID = '00000000-0000-0000-0000-000000000023';

    // The HR stage names a person: the company lists them.
    beforeEach(() => {
      employees.find.mockResolvedValue([{ guid: HR_GUID }] as EmployeeDomain[]);
    });

    it.each([
      ['the choice', { employeeVisible: false, managerVisible: true }, { employeeVisible: false, managerVisible: true }],
      ['both readers when none is chosen', {}, { employeeVisible: true, managerVisible: true }],
    ])('stores who reads the results: %s (Cyc-001)', async (_what, chosen, stored) => {
      cycles.findOne.mockResolvedValue(cycle({ state: 'draft' }));

      await service.create({ ...DTO, ...chosen }, 'user-1');

      expect(visibility.save).toHaveBeenCalledWith(expect.objectContaining(stored));
      expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ afterJson: expect.objectContaining(stored) }));
    });

    it('saves the description and the accomplishment deadline, and records them', async () => {
      cycles.findOne.mockResolvedValue(cycle());

      await service.create(
        { ...DTO, description: '  Yearly review  ', accomplishmentDeadline: '2027-04-10T00:00:00.000Z' } as CreateReviewCycleDto,
        'user-1',
      );

      const saved = { description: 'Yearly review', accomplishmentDeadline: new Date('2027-04-10T00:00:00.000Z') };
      expect(cycles.save).toHaveBeenCalledWith(expect.objectContaining(saved));
    });

    it('stores null for a description and a deadline that are left out', async () => {
      cycles.findOne.mockResolvedValue(cycle());

      await service.create({ ...DTO, description: '' } as CreateReviewCycleDto, 'user-1');

      expect(cycles.save).toHaveBeenCalledWith(expect.objectContaining({ description: null, accomplishmentDeadline: null }));
    });

    it('replaces both on a draft, with the old and the new values in the audit row', async () => {
      cycles.findOne.mockResolvedValue(cycle({ state: 'draft', description: 'Old', accomplishmentDeadline: null }));

      await service.update(
        'user-1',
        CYCLE_A,
        { ...DTO, description: 'New', accomplishmentDeadline: '2027-04-10T00:00:00.000Z' } as CreateReviewCycleDto,
      );

      expect(cycles.save).toHaveBeenCalledWith(expect.objectContaining({ description: 'New' }));
      expect(audit.save).toHaveBeenCalledWith(
        expect.objectContaining({
          beforeJson: expect.objectContaining({ description: 'Old', accomplishmentDeadline: null }),
          afterJson: expect.objectContaining({ description: 'New', accomplishmentDeadline: '2027-04-10T00:00:00.000Z' }),
        }),
      );
    });

    it.each(['2027-03-31T00:00:00.000Z', '2027-04-21T00:00:00.000Z'])(
      'answers 400 to the accomplishment deadline %s, and opens no transaction',
      async (accomplishmentDeadline) => {
        await expect(service.create({ ...DTO, accomplishmentDeadline } as CreateReviewCycleDto, 'user-1')).rejects.toBeInstanceOf(
          BadRequestException,
        );
        expect(dataSource.transaction).not.toHaveBeenCalled();
      },
    );

    it('asks the company once for each person that the stages name', async () => {
      cycles.findOne.mockResolvedValue(cycle());
      const twice = [...DTO.stages, { ...DTO.stages[1], deadline: '2027-04-21T00:00:00.000Z' }];

      await service.create({ ...DTO, stages: twice } as CreateReviewCycleDto, 'user-1');

      expect(employees.find).toHaveBeenCalledTimes(1);
      expect(employees.find).toHaveBeenCalledWith({ where: { guid: In([HR_GUID]), company: COMPANY } });
    });

    it('asks no employee when no stage names a person', async () => {
      cycles.findOne.mockResolvedValue(cycle());

      await service.create({ ...DTO, stages: [DTO.stages[0]] } as CreateReviewCycleDto, 'user-1');

      expect(employees.find).not.toHaveBeenCalled();
    });

    it.each([
      ['create', () => service.create(DTO, 'user-1')],
      ['update', () => service.update('user-1', CYCLE_A, DTO)],
    ])('refuses %s with 400, before any write, when a stage names a person outside the company', async (_label, act) => {
      cycles.findOne.mockResolvedValue(cycle({ state: 'draft' }));
      employees.find.mockResolvedValue([]);

      await expect(act()).rejects.toThrow('A stage evaluator is not an employee of your company.');
      await expect(act()).rejects.toBeInstanceOf(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('saves a draft cycle in the caller company with its stages in order and one audit row, in one transaction', async () => {
      cycles.findOne.mockResolvedValue(cycle());

      await service.create(DTO, 'user-1');

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(cycles.save).toHaveBeenCalledWith(
        expect.objectContaining({
          company: COMPANY,
          name: 'CY2027-Q1',
          state: 'draft',
          reviewType: 'standard',
          evaluationStart: '2027-01-01',
          evaluationEnd: '2027-03-31',
          assessmentStart: new Date('2027-04-01T00:00:00.000Z'),
          goalsWeight: 0.5,
          behavioralWeight: 0.5,
        }),
      );
      const savedStages = stages.save.mock.calls[0]?.[0] as unknown as Partial<CycleStage>[];
      expect(savedStages.map((stage) => [stage.perspective, stage.sortOrder, stage.evaluatorId ?? null])).toEqual([
        ['self', 1, null],
        ['hr', 2, '00000000-0000-0000-0000-000000000023'],
      ]);
      expect(audit.save).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'cycle', action: 'created', actorId: ACTOR_ID, beforeJson: null }),
      );
      const savedCycle = cycles.save.mock.calls[0]?.[0] as Cycle | undefined;
      const cycleId = savedCycle?.cycleId;
      expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ entityId: cycleId }));
      expect(savedStages.every((stage) => stage.cycleId === cycleId)).toBe(true);
    });


    it('resolves the participants inside the company and saves them with their frozen versions, in the same transaction', async () => {
      cycles.findOne.mockResolvedValue(cycle());
      const requested = [{ employeeId: EMPLOYEE_A, behavioralTemplateId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' }];
      vi.mocked(resolveParticipants).mockResolvedValue([
        { employeeId: EMPLOYEE_A, frozenPosition: 'Software Engineer', kpiVersionId: 'kv-1', behavioralVersionId: 'bv-1' },
      ]);

      await service.create({ ...DTO, participants: requested } as CreateReviewCycleDto, 'user-1');

      expect(resolveParticipants).toHaveBeenCalledWith(expect.anything(), COMPANY, requested);
      const saved = participants.save.mock.calls[0]?.[0] as unknown as Partial<CycleParticipant>[];
      const cycleId = (cycles.save.mock.calls[0]?.[0] as Cycle | undefined)?.cycleId;
      expect(saved).toEqual([
        expect.objectContaining({ cycleId, employeeId: EMPLOYEE_A, frozenPosition: 'Software Engineer', kpiVersionId: 'kv-1', behavioralVersionId: 'bv-1' }),
      ]);
      expect(saved[0]?.participantId).toEqual(expect.any(String));
      expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ afterJson: expect.objectContaining({ participantCount: 1 }) }));
    });

    it('records the stages and the people of the new draft in the audit row', async () => {
      cycles.findOne.mockResolvedValue(cycle());
      vi.mocked(resolveParticipants).mockResolvedValue([
        { employeeId: EMPLOYEE_A, frozenPosition: 'Software Engineer', kpiVersionId: 'kv-1', behavioralVersionId: null },
      ]);

      await service.create({ ...DTO, participants: [{ employeeId: EMPLOYEE_A }] } as CreateReviewCycleDto, 'user-1');

      const entry = audit.save.mock.calls[0]?.[0] as AuditEvent;
      expect(entry.afterJson).toMatchObject({
        stages: [
          { perspective: 'self', evaluatorId: null, deadline: '2027-04-07T00:00:00.000Z' },
          { perspective: 'hr', evaluatorId: HR_GUID, deadline: '2027-04-14T00:00:00.000Z' },
        ],
        participants: [{ employeeId: EMPLOYEE_A, kpiVersionId: 'kv-1', behavioralVersionId: null }],
      });
    });

    it.each([
      ['a new cycle opens earlier answers to later reviewers', undefined, true],
      ['a new cycle can keep them closed', false, false],
    ])('%s (D5)', async (_what, earlierAnswersVisible, stored) => {
      cycles.findOne.mockResolvedValue(cycle());

      await service.create({ ...DTO, earlierAnswersVisible } as CreateReviewCycleDto, 'user-1');

      expect(visibility.save).toHaveBeenCalledWith(expect.objectContaining({ earlierAnswersVisible: stored }));
    });

    it('saves no participant row for a draft with none', async () => {
      cycles.findOne.mockResolvedValue(cycle());

      await service.create(DTO, 'user-1');

      expect(participants.save).not.toHaveBeenCalled();
    });

    it('refuses before any write when a participant does not fit the company', async () => {
      vi.mocked(resolveParticipants).mockRejectedValue(new BadRequestException('not yours'));

      await expect(service.create({ ...DTO, participants: [{ employeeId: EMPLOYEE_A }] } as CreateReviewCycleDto, 'user-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('lets a failed stage insert reach the caller, and writes no audit row', async () => {
      stages.save.mockRejectedValue(new Error('insert failed'));

      await expect(service.create(DTO, 'user-1')).rejects.toThrow('insert failed');
      expect(audit.save).not.toHaveBeenCalled();
    });

    it.each([
      ['a period that ends before it starts', { evaluationEnd: '2026-12-31' }],
      ['a verification deadline before assessment starts', { verificationDeadline: '2027-03-01T00:00:00.000Z' }],
      ['weights that do not total 1', { goalsWeight: 0.6, behavioralWeight: 0.5 }],
    ])('refuses %s before any write', async (_label, change) => {
      await expect(service.create({ ...DTO, ...change }, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const CHANGE = {
      name: ' CY2027-Q1 revised ',
      reviewType: '360',
      evaluationStart: '2027-01-01',
      evaluationEnd: '2027-03-31',
      assessmentStart: '2027-04-01T00:00:00.000Z',
      verificationDeadline: '2027-04-20T00:00:00.000Z',
      goalsWeight: 0.4,
      behavioralWeight: 0.6,
      anonymityThreshold: 5,
      stages: [{ perspective: 'self', evaluatorRole: 'employee', deadline: '2027-04-07T00:00:00.000Z' }],
    } as CreateReviewCycleDto;

    it('leaves earlier answers closed for a draft that stored no choice: a change opens nothing by itself (D5)', async () => {
      cycles.findOne.mockResolvedValue(cycle({ state: 'draft' }));
      visibility.findOne.mockResolvedValue(null);

      await service.update('user-1', CYCLE_A, CHANGE);

      expect(visibility.save).toHaveBeenCalledWith(expect.objectContaining({ earlierAnswersVisible: false }));
    });

    it('keeps the stored readers when a change names none, and records them before and after', async () => {
      cycles.findOne.mockResolvedValue(cycle({ state: 'draft' }));
      visibility.findOne.mockResolvedValue({ cycleId: CYCLE_A, employeeVisible: false, managerVisible: false, earlierAnswersVisible: false });

      await service.update('user-1', CYCLE_A, { ...CHANGE, managerVisible: true });

      expect(visibility.save).toHaveBeenCalledWith({ cycleId: CYCLE_A, employeeVisible: false, managerVisible: true, earlierAnswersVisible: false });
      expect(audit.save).toHaveBeenCalledWith(
        expect.objectContaining({
          beforeJson: expect.objectContaining({ employeeVisible: false, managerVisible: false }),
          afterJson: expect.objectContaining({ employeeVisible: false, managerVisible: true }),
        }),
      );
    });

    it('replaces the details and the stages of a draft under a write lock, and records before and after', async () => {
      const draft = cycle({ state: 'draft', name: 'CY2027-Q1' });
      cycles.findOne.mockResolvedValue(draft);

      await service.update('user-1', CYCLE_A, CHANGE);

      expect(cycles.findOne).toHaveBeenCalledWith({
        where: { cycleId: CYCLE_A, company: COMPANY },
        lock: { mode: 'pessimistic_write' },
      });
      expect(cycles.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'CY2027-Q1 revised', reviewType: '360', goalsWeight: 0.4, anonymityThreshold: 5 }),
      );
      expect(stages.delete).toHaveBeenCalledWith({ cycleId: CYCLE_A });
      const savedStages = stages.save.mock.calls[0]?.[0] as unknown as Partial<CycleStage>[];
      expect(savedStages).toHaveLength(1);
      expect(savedStages[0]).toMatchObject({ cycleId: CYCLE_A, perspective: 'self', sortOrder: 1 });
      expect(audit.save).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'cycle',
          entityId: CYCLE_A,
          action: 'updated',
          actorId: ACTOR_ID,
          beforeJson: expect.objectContaining({ name: 'CY2027-Q1', reviewType: 'standard' }),
          afterJson: expect.objectContaining({ name: 'CY2027-Q1 revised', reviewType: '360' }),
        }),
      );
    });

    it('records which people, stages, and dates changed, with the old rows read before the delete', async () => {
      const OLD = '00000000-0000-0000-0000-000000000024';
      cycles.findOne.mockResolvedValue(
        cycle({ state: 'draft', assessmentStart: new Date('2027-03-01T00:00:00Z'), verificationDeadline: new Date('2027-03-20T00:00:00Z') }),
      );
      stages.find.mockResolvedValueOnce([
        { perspective: 'manager', evaluatorId: null, sortOrder: 1, deadline: new Date('2027-03-09T00:00:00Z') },
      ] as CycleStage[]);
      participants.find.mockResolvedValueOnce([{ employeeId: OLD, kpiVersionId: 'kv-old', behavioralVersionId: null }] as CycleParticipant[]);
      vi.mocked(resolveParticipants).mockResolvedValue([
        { employeeId: EMPLOYEE_A, frozenPosition: 'Software Engineer', kpiVersionId: null, behavioralVersionId: 'bv-1' },
      ]);

      await service.update('user-1', CYCLE_A, { ...CHANGE, participants: [{ employeeId: EMPLOYEE_A }] } as CreateReviewCycleDto);

      const entry = audit.save.mock.calls[0]?.[0] as AuditEvent;
      expect(entry.beforeJson).toMatchObject({
        assessmentStart: '2027-03-01T00:00:00.000Z',
        verificationDeadline: '2027-03-20T00:00:00.000Z',
        anonymityThreshold: null,
        stages: [{ perspective: 'manager', evaluatorId: null, deadline: '2027-03-09T00:00:00.000Z' }],
        participants: [{ employeeId: OLD, kpiVersionId: 'kv-old', behavioralVersionId: null }],
      });
      expect(entry.afterJson).toMatchObject({
        assessmentStart: '2027-04-01T00:00:00.000Z',
        anonymityThreshold: 5,
        stages: [{ perspective: 'self', evaluatorId: null, deadline: '2027-04-07T00:00:00.000Z' }],
        participants: [{ employeeId: EMPLOYEE_A, kpiVersionId: null, behavioralVersionId: 'bv-1' }],
      });
      expect(stages.find.mock.invocationCallOrder[0]).toBeLessThan(stages.delete.mock.invocationCallOrder[0] ?? 0);
      expect(participants.find.mock.invocationCallOrder[0]).toBeLessThan(participants.delete.mock.invocationCallOrder[0] ?? 0);
    });

    it('replaces the participants of a draft: deletes the old rows, then saves the resolved ones', async () => {
      cycles.findOne.mockResolvedValue(cycle({ state: 'draft' }));
      vi.mocked(resolveParticipants).mockResolvedValue([
        { employeeId: EMPLOYEE_A, frozenPosition: 'Software Engineer', kpiVersionId: null, behavioralVersionId: 'bv-1' },
      ]);

      await service.update('user-1', CYCLE_A, { ...CHANGE, participants: [{ employeeId: EMPLOYEE_A }] } as CreateReviewCycleDto);

      expect(participants.delete).toHaveBeenCalledWith({ cycleId: CYCLE_A });
      expect(participants.save.mock.calls[0]?.[0]).toEqual([expect.objectContaining({ cycleId: CYCLE_A, employeeId: EMPLOYEE_A, kpiVersionId: null })]);
    });

    it.each(['scheduled', 'active', 'completed', 'cancelled'] as const)('answers 409 for a %s cycle and writes nothing', async (state) => {
      cycles.findOne.mockResolvedValue(cycle({ state }));

      await expect(service.update('user-1', CYCLE_A, CHANGE)).rejects.toBeInstanceOf(ConflictException);
      expect(cycles.save).not.toHaveBeenCalled();
      expect(stages.delete).not.toHaveBeenCalled();
      expect(audit.save).not.toHaveBeenCalled();
    });

    it('answers 404 for a cycle of another company and writes nothing', async () => {
      cycles.findOne.mockResolvedValue(null);

      await expect(service.update('user-1', CYCLE_B, CHANGE)).rejects.toBeInstanceOf(NotFoundException);
      expect(cycles.save).not.toHaveBeenCalled();
    });

    it('refuses a body that breaks a rule before it opens a transaction', async () => {
      await expect(service.update('user-1', CYCLE_A, { ...CHANGE, goalsWeight: 0.9 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it.each(['draft', 'scheduled', 'active'] as const)('cancels a %s cycle with its reason, and records the change', async (state) => {
      cycles.findOne.mockResolvedValue(cycle({ state }));

      await service.cancel('user-1', CYCLE_A, '  Budget freeze  ');

      expect(cycles.findOne).toHaveBeenCalledWith(expect.objectContaining({ lock: { mode: 'pessimistic_write' } }));
      expect(cycles.save).toHaveBeenCalledWith(expect.objectContaining({ state: 'cancelled', cancelledReason: 'Budget freeze' }));
      expect(audit.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'cancelled',
          reason: 'Budget freeze',
          actorId: ACTOR_ID,
          beforeJson: { state },
          afterJson: { state: 'cancelled' },
        }),
      );
    });

    it.each(['completed', 'cancelled'] as const)('answers 409 for a %s cycle and writes nothing', async (state) => {
      cycles.findOne.mockResolvedValue(cycle({ state }));

      await expect(service.cancel('user-1', CYCLE_A, 'Budget freeze')).rejects.toBeInstanceOf(ConflictException);
      expect(cycles.save).not.toHaveBeenCalled();
      expect(audit.save).not.toHaveBeenCalled();
    });

    it('needs a reason that is not blank, and opens no transaction without one', async () => {
      await expect(service.cancel('user-1', CYCLE_A, '   ')).rejects.toBeInstanceOf(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('answers 404 for a cycle of another company', async () => {
      cycles.findOne.mockResolvedValue(null);

      await expect(service.cancel('user-1', CYCLE_B, 'Budget freeze')).rejects.toBeInstanceOf(NotFoundException);
      expect(cycles.save).not.toHaveBeenCalled();
    });
  });

  describe('extend', () => {
    const at = (day: string) => new Date(`2027-01-${day}T00:00:00Z`);
    const iso = (day: string) => at(day).toISOString();
    const STAGES = [
      { stageId: 's-1', cycleId: CYCLE_A, perspective: 'self', sortOrder: 1, deadline: at('10') },
      { stageId: 's-2', cycleId: CYCLE_A, perspective: 'hr', sortOrder: 2, deadline: at('15') },
    ] as CycleStage[];
    const running = (overrides: Partial<Cycle> = {}) => cycle({ assessmentStart: at('05'), verificationDeadline: at('20'), ...overrides });
    const body = { reason: '  Holiday week  ', stages: [{ stageId: 's-2', deadline: iso('18') }] };

    beforeEach(() => {
      cycles.findOne.mockResolvedValue(running());
      stages.find.mockResolvedValue(STAGES.map((stage) => ({ ...stage })));
      assignments.find.mockResolvedValue([
        { assignmentId: 'as-1', cycleId: CYCLE_A, stageId: 's-2', state: 'in_progress', deadline: at('15') },
        { assignmentId: 'as-2', cycleId: CYCLE_A, stageId: 's-2', state: 'locked', deadline: at('15') },
      ] as Assignment[]);
    });

    const nothingWritten = () => {
      expect(cycles.save).not.toHaveBeenCalled();
      expect(stages.save).not.toHaveBeenCalled();
      expect(assignments.save).not.toHaveBeenCalled();
      expect(audit.save).not.toHaveBeenCalled();
    };
    const detailsOf = async (promise: Promise<unknown>) => {
      const error = await promise.then(() => null, (thrown: unknown) => thrown);
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      return (error as UnprocessableEntityException).getResponse() as { details: { field: string; message: string }[] };
    };

    it('moves a stage and its assignments later, keeps their state, and records both dates', async () => {
      await service.extend('user-1', CYCLE_A, body);

      expect(cycles.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { cycleId: CYCLE_A, company: COMPANY }, lock: { mode: 'pessimistic_write' } }));
      expect(stages.save).toHaveBeenCalledWith([expect.objectContaining({ stageId: 's-2', deadline: at('18') })]);
      expect(assignments.find).toHaveBeenCalledWith({ where: { cycleId: CYCLE_A, stageId: In(['s-2']) } });
      expect(assignments.save).toHaveBeenCalledWith([
        expect.objectContaining({ assignmentId: 'as-1', state: 'in_progress', deadline: at('18') }),
        expect.objectContaining({ assignmentId: 'as-2', state: 'locked', deadline: at('18') }),
      ]);
      expect(audit.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'extended',
          reason: 'Holiday week',
          actorId: ACTOR_ID,
          beforeJson: { stages: [{ stageId: 's-2', deadline: iso('15') }] },
          afterJson: { stages: [{ stageId: 's-2', deadline: iso('18') }] },
        }),
      );
    });

    it('moves the verification deadline alone, and touches no stage or assignment', async () => {
      await service.extend('user-1', CYCLE_A, { reason: 'Late proof', verificationDeadline: iso('25') });

      expect(cycles.save).toHaveBeenCalledWith(expect.objectContaining({ verificationDeadline: at('25'), state: 'active' }));
      expect(stages.save).not.toHaveBeenCalled();
      expect(assignments.save).not.toHaveBeenCalled();
      expect(audit.save).toHaveBeenCalledWith(
        expect.objectContaining({ beforeJson: { verificationDeadline: iso('20') }, afterJson: { verificationDeadline: iso('25') } }),
      );
    });

    it.each([
      ['a draft', { state: 'draft' as const }],
      ['a scheduled', { state: 'scheduled' as const }],
      ['a cancelled', { state: 'cancelled' as const }],
      ['a completed', { state: 'completed' as const }],
      ['a finalized', { finalizedAt: new Date() }],
      ['a released', { releasedAt: new Date() }],
    ])('answers 409 for %s cycle and writes nothing', async (_what, overrides) => {
      cycles.findOne.mockResolvedValue(running(overrides));

      await expect(service.extend('user-1', CYCLE_A, body)).rejects.toBeInstanceOf(ConflictException);
      nothingWritten();
    });

    it.each([
      ['an earlier stage deadline', { stages: [{ stageId: 's-2', deadline: iso('14') }] }, 'stages.1.deadline', 'cannot move earlier'],
      ['an earlier verification deadline', { verificationDeadline: iso('19') }, 'verificationDeadline', 'cannot move earlier'],
      ['a stage that passes the next one', { stages: [{ stageId: 's-1', deadline: iso('16') }] }, 'stages.1.deadline', 'must be after stage 1'],
      ['a stage of another cycle', { stages: [{ stageId: 's-9', deadline: iso('18') }] }, 'stages', 'not part of this cycle'],
      ['the same stage twice', { stages: [{ stageId: 's-2', deadline: iso('17') }, { stageId: 's-2', deadline: iso('18') }] }, 'stages', 'once'],
      ['no changed date', { verificationDeadline: iso('20'), stages: [{ stageId: 's-2', deadline: iso('15') }] }, 'stages', 'at least one'],
    ])('answers 422 for %s, names the field, and writes nothing', async (_what, dates, field, words) => {
      const { details } = await detailsOf(service.extend('user-1', CYCLE_A, { reason: 'x', ...dates }));

      expect(details).toContainEqual(expect.objectContaining({ field, message: expect.stringContaining(words) }));
      nothingWritten();
    });

    it('moves the accomplishment deadline, and records both dates', async () => {
      cycles.findOne.mockResolvedValue(running({ accomplishmentDeadline: at('12') }));

      await service.extend('user-1', CYCLE_A, { reason: 'Late proof', accomplishmentDeadline: iso('19') });

      expect(cycles.save).toHaveBeenCalledWith(expect.objectContaining({ accomplishmentDeadline: at('19'), verificationDeadline: at('20') }));
      expect(audit.save).toHaveBeenCalledWith(
        expect.objectContaining({ beforeJson: { accomplishmentDeadline: iso('12') }, afterJson: { accomplishmentDeadline: iso('19') } }),
      );
    });

    it.each([
      ['an earlier accomplishment deadline', '12', { accomplishmentDeadline: '11' }, 'cannot move earlier'],
      ['one after the verification deadline', '12', { accomplishmentDeadline: '21' }, 'after the verification deadline'],
      ['one for a cycle that has none', null, { accomplishmentDeadline: '19' }, 'no accomplishment deadline'],
    ])('answers 422 for %s', async (_what, current, { accomplishmentDeadline }, words) => {
      cycles.findOne.mockResolvedValue(running({ accomplishmentDeadline: current ? at(current) : null }));

      const { details } = await detailsOf(service.extend('user-1', CYCLE_A, { reason: 'x', accomplishmentDeadline: iso(accomplishmentDeadline) }));

      expect(details).toContainEqual(expect.objectContaining({ field: 'accomplishmentDeadline', message: expect.stringContaining(words) }));
      nothingWritten();
    });

    it('needs a reason that is not blank, and opens no transaction without one', async () => {
      await expect(service.extend('user-1', CYCLE_A, { ...body, reason: '  ' })).rejects.toBeInstanceOf(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('answers 404 for a cycle of another company', async () => {
      cycles.findOne.mockResolvedValue(null);

      await expect(service.extend('user-1', CYCLE_B, body)).rejects.toBeInstanceOf(NotFoundException);
      nothingWritten();
    });
  });

  const HR_EMPLOYEE = '00000000-0000-0000-0000-000000000025';
  const MANAGER = '00000000-0000-0000-0000-000000000022';
  const future = (day: string) => new Date('2027-01-' + day + 'T00:00:00Z');
  let people: Record<string, unknown>[];

  const person = (id: string, guid: string, firstName: string, lastName: string, status = 'active') => ({
    id,
    guid,
    firstName,
    lastName,
    position: 'Software Engineer',
    company: COMPANY,
    status,
  });
  const setStatus = (guid: string, status: string) => {
    people = people.map((row) => (row.guid === guid ? { ...row, status } : row));
  };

  /** A cycle that passes every rule, with every lookup answered. Each test breaks one. */
  function arrange() {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-25T00:00:00Z'));
    people = [
      person('21', EMPLOYEE_A, 'Iging', 'DotTech'),
      person('22', MANAGER, 'Maria', 'Santos'),
      person('25', HR_EMPLOYEE, 'System', 'Administrator'),
    ];
    cycles.findOne.mockResolvedValue(
      cycle({ state: 'draft', assessmentStart: future('05'), verificationDeadline: future('12'), evaluationStart: '2026-11-04', evaluationEnd: '2026-12-31' }),
    );
    stages.find.mockResolvedValue([
      { stageId: 's-1', cycleId: CYCLE_A, perspective: 'self', sortOrder: 1, evaluatorId: null, deadline: future('10') },
      { stageId: 's-2', cycleId: CYCLE_A, perspective: 'manager', sortOrder: 2, evaluatorId: null, deadline: future('15') },
      { stageId: 's-3', cycleId: CYCLE_A, perspective: 'hr', sortOrder: 3, evaluatorId: HR_EMPLOYEE, deadline: future('20') },
    ] as CycleStage[]);
    participants.find.mockResolvedValue([
      { participantId: 'p-1', cycleId: CYCLE_A, employeeId: EMPLOYEE_A, frozenPosition: 'Software Engineer', kpiVersionId: 'kv-1', behavioralVersionId: 'bv-1' },
    ]);
    // Answers by the key of the query: the GUIDs of the employees, or the ids of the accounts.
    employees.find.mockImplementation((async (query: unknown) => {
      const where = (query as { where: { guid?: { value: string[] }; id?: { value: string[] } } }).where;
      return people.filter((row) => (where.guid ? where.guid.value.includes(row.guid as string) : where.id ? where.id.value.includes(row.id as string) : true));
    }) as never);
    kpiVersions.find.mockResolvedValue([{ versionId: 'kv-1', templateId: 'kt-1' }] as KpiTemplateVersion[]);
    kpiTemplates.find.mockResolvedValue([{ templateId: 'kt-1', status: 'published', company: COMPANY }] as KpiGoalTemplate[]);
    behavioralVersions.find.mockResolvedValue([{ versionId: 'bv-1', templateId: 'bt-1' }] as BehavioralTemplateVersion[]);
    behavioralTemplates.find.mockResolvedValue([{ templateId: 'bt-1', status: 'published', company: COMPANY }] as BehavioralTemplate[]);
    managers.find.mockResolvedValue([{ employeeId: EMPLOYEE_A, managerId: MANAGER, effectiveDate: '2026-11-04', status: 'applied' }] as ManagerAssignment[]);
    users.find.mockResolvedValue([{ id: '10', employeeId: '25', userRoleId: '1' }] as User[]);
  }


  afterEach(() => vi.useRealTimers());

  describe('launch', () => {
    const LOCK = { mode: 'pessimistic_write' };

    function saved<T>(repo: MockRepo<T>): Partial<T>[] {
      return (repo.save.mock.calls[0]?.[0] ?? []) as unknown as Partial<T>[];
    }

    it('locks the cycle, then creates one assignment for each participant and stage, and opens the first stage only', async () => {
      arrange();

      await service.launch('user-1', CYCLE_A);

      expect(cycles.findOne).toHaveBeenCalledWith({ where: { cycleId: CYCLE_A, company: COMPANY }, lock: LOCK });
      const rows = saved(assignments);
      expect(rows).toHaveLength(3);
      expect(rows.map((row) => [row.stageId, row.evaluatorId, row.state])).toEqual([
        ['s-1', EMPLOYEE_A, 'not_started'],
        ['s-2', MANAGER, 'locked'],
        ['s-3', HR_EMPLOYEE, 'locked'],
      ]);
      expect(rows.every((row) => row.cycleId === CYCLE_A && row.participantId === 'p-1')).toBe(true);
      expect(rows[0]?.deadline).toEqual(future('10'));
    });

    it('turns the cycle active on today, and writes one audit row with the counts, in one transaction', async () => {
      arrange();
      const draft = cycle({ state: 'draft', assessmentStart: future('05'), verificationDeadline: future('12') });
      cycles.findOne.mockResolvedValue(draft);

      await service.launch('user-1', CYCLE_A);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(cycles.save).toHaveBeenCalledWith(expect.objectContaining({ state: 'active', activationDate: '2026-11-25' }));
      expect(audit.save).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'cycle',
          entityId: CYCLE_A,
          action: 'launched',
          actorId: ACTOR_ID,
          beforeJson: { state: 'draft' },
          afterJson: expect.objectContaining({ state: 'active', participantCount: 1, assignmentCount: 3 }),
        }),
      );
    });

    it('opens one draft work record for each participant, in the same transaction (Cyc-006)', async () => {
      arrange();

      await service.launch('user-1', CYCLE_A);

      expect(saved(accomplishments)).toEqual([
        expect.objectContaining({ participantId: 'p-1', cycleId: CYCLE_A, employeeId: EMPLOYEE_A, status: 'draft' }),
      ]);
      expect(saved(accomplishments)[0]?.accomplishmentId).toEqual(expect.any(String));
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('opens no work record when goals do not count', async () => {
      arrange();
      const draft = await cycles.findOne();
      cycles.findOne.mockResolvedValue({ ...(draft as Cycle), goalsWeight: 0, behavioralWeight: 1 });

      await service.launch('user-1', CYCLE_A);

      expect(accomplishments.save).not.toHaveBeenCalled();
    });

    it('counts today as the day in Manila, for the manager in force and for the activation day', async () => {
      arrange();
      // 01:00 of 26 November in Manila, still 25 November in UTC.
      vi.setSystemTime(new Date('2026-11-25T17:00:00Z'));

      await service.launch('user-1', CYCLE_A);

      expect(managers.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ effectiveDate: LessThanOrEqual('2026-11-26') }) }),
      );
      expect(cycles.save).toHaveBeenCalledWith(expect.objectContaining({ activationDate: '2026-11-26' }));
    });

    it('checks readiness after the lock, so a save that committed in between is seen', async () => {
      arrange();

      await service.launch('user-1', CYCLE_A);

      const lockedAt = cycles.findOne.mock.invocationCallOrder[0] ?? 0;
      expect(lockedAt).toBeGreaterThan(0);
      expect(participants.find.mock.invocationCallOrder[0]).toBeGreaterThan(lockedAt);
      expect(managers.find.mock.invocationCallOrder[0]).toBeGreaterThan(lockedAt);
    });

    it.each(['scheduled', 'active', 'completed', 'cancelled'] as const)('answers 409 for a %s cycle and writes nothing', async (state) => {
      arrange();
      cycles.findOne.mockResolvedValue(cycle({ state }));

      await expect(service.launch('user-1', CYCLE_A)).rejects.toBeInstanceOf(ConflictException);
      expect(assignments.save).not.toHaveBeenCalled();
      expect(cycles.save).not.toHaveBeenCalled();
      expect(audit.save).not.toHaveBeenCalled();
    });

    it('answers 404 for a cycle of another company', async () => {
      arrange();
      cycles.findOne.mockResolvedValue(null);

      await expect(service.launch('user-1', CYCLE_B)).rejects.toBeInstanceOf(NotFoundException);
      expect(assignments.save).not.toHaveBeenCalled();
    });

    it('answers 422 with every problem when the cycle is not ready, and creates nothing', async () => {
      arrange();
      managers.find.mockResolvedValue([]);

      const outcome = service.launch('user-1', CYCLE_A);

      await expect(outcome).rejects.toBeInstanceOf(UnprocessableEntityException);
      await expect(outcome).rejects.toMatchObject({
        response: {
          message: 'The cycle is not ready to launch.',
          details: [{ field: 'participants.' + EMPLOYEE_A + '.manager', code: 'STAGES', message: expect.stringContaining('no manager') }],
        },
      });
      expect(assignments.save).not.toHaveBeenCalled();
      expect(cycles.save).not.toHaveBeenCalled();
      expect(audit.save).not.toHaveBeenCalled();
    });

    it('lets a failed insert reach the caller, with no active cycle and no audit row', async () => {
      arrange();
      assignments.save.mockRejectedValue(new Error('insert failed'));

      await expect(service.launch('user-1', CYCLE_A)).rejects.toThrow('insert failed');
      expect(cycles.save).not.toHaveBeenCalled();
      expect(audit.save).not.toHaveBeenCalled();
    });

    it('gives a retry after a launch a 409, and no second set of assignments', async () => {
      arrange();
      // The first launch turns this very row active, as the database would.
      const draft = cycle({ state: 'draft', assessmentStart: future('05'), verificationDeadline: future('12') });
      cycles.findOne.mockResolvedValue(draft);

      await service.launch('user-1', CYCLE_A);
      await expect(service.launch('user-1', CYCLE_A)).rejects.toBeInstanceOf(ConflictException);

      expect(assignments.save).toHaveBeenCalledTimes(1);
      expect(audit.save).toHaveBeenCalledTimes(1);
    });

    it('freezes the current published version of each template at launch, and says how many moved', async () => {
      arrange();
      vi.mocked(resolveParticipants).mockResolvedValue([
        { employeeId: EMPLOYEE_A, frozenPosition: 'Software Engineer', kpiVersionId: 'kv-2', behavioralVersionId: 'bv-1' },
      ]);

      await service.launch('user-1', CYCLE_A);

      expect(resolveParticipants).toHaveBeenCalledWith(expect.anything(), COMPANY, [
        { employeeId: EMPLOYEE_A, kpiTemplateId: 'kt-1', behavioralTemplateId: 'bt-1' },
      ]);
      expect(participants.save).toHaveBeenCalledWith([expect.objectContaining({ participantId: 'p-1', kpiVersionId: 'kv-2', behavioralVersionId: 'bv-1' })]);
      expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ afterJson: expect.objectContaining({ refrozenCount: 1 }) }));
    });

    it('saves no participant row when every version is already the current one', async () => {
      arrange();
      vi.mocked(resolveParticipants).mockResolvedValue([
        { employeeId: EMPLOYEE_A, frozenPosition: 'Software Engineer', kpiVersionId: 'kv-1', behavioralVersionId: 'bv-1' },
      ]);

      await service.launch('user-1', CYCLE_A);

      expect(participants.save).not.toHaveBeenCalled();
      expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ afterJson: expect.objectContaining({ refrozenCount: 0 }) }));
    });
  });

  describe('getParticipants', () => {
    const person = (guid: string, firstName: string, department: string) => ({ guid, firstName, lastName: 'DotTech', department, company: COMPANY });
    const work = (assignmentId: string, participantId: string, stageId: string, evaluatorId: string, state: string, deadline: string) => ({
      assignmentId,
      participantId,
      cycleId: CYCLE_A,
      stageId,
      evaluatorId,
      state,
      deadline: new Date(deadline),
    });
    const ZED = '00000000-0000-0000-0000-000000000022';
    const [FIRST, SECOND] = ['00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000202'];

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-26T02:00:00Z'));
      cycles.findOne.mockResolvedValue(cycle({ state: 'active' }));
      participants.find.mockResolvedValue([
        { participantId: '00000000-0000-0000-0000-000000000152', cycleId: CYCLE_A, employeeId: ZED, frozenPosition: null },
        { participantId: '00000000-0000-0000-0000-000000000151', cycleId: CYCLE_A, employeeId: EMPLOYEE_A, frozenPosition: 'Software Engineer' },
      ] as CycleParticipant[]);
      stages.find.mockResolvedValue([
        { stageId: 's-mgr', cycleId: CYCLE_A, perspective: 'manager', sortOrder: 2 },
        { stageId: 's-self', cycleId: CYCLE_A, perspective: 'self', sortOrder: 1 },
      ] as CycleStage[]);
      assignments.find.mockResolvedValue([
        work(SECOND, '00000000-0000-0000-0000-000000000151', 's-mgr', ZED, 'not_started', '2026-11-20T00:00:00Z'),
        work(FIRST, '00000000-0000-0000-0000-000000000151', 's-self', EMPLOYEE_A, 'submitted', '2026-11-10T00:00:00Z'),
      ] as unknown as Assignment[]);
      employees.find.mockResolvedValue([person(EMPLOYEE_A, 'Iging', 'Engineering'), person(ZED, 'Zed', 'Sales')] as never);
    });
    afterEach(() => vi.useRealTimers());

    it('lists the participants by name, with the frozen position, and their assignments in stage order', async () => {
      const rows = await service.getParticipants('user-1', CYCLE_A);

      expect(() => reviewCycleParticipantsSchema.parse(rows)).not.toThrow();
      expect(rows.map((row) => [row.name, row.position, row.department])).toEqual([
        ['Iging DotTech', 'Software Engineer', 'Engineering'],
        ['Zed DotTech', null, 'Sales'],
      ]);
      expect(rows[0]?.assignments.map((item) => [item.assignmentId, item.perspective, item.evaluatorName, item.state, item.isOverdue])).toEqual([
        [FIRST, 'self', 'Iging DotTech', 'submitted', false],
        [SECOND, 'manager', 'Zed DotTech', 'not_started', true],
      ]);
      expect(rows[1]?.assignments).toEqual([]);
    });

    it('names no evaluator of a peer or upward stage, to an administrator either (Res-008)', async () => {
      stages.find.mockResolvedValue([
        { stageId: 's-mgr', cycleId: CYCLE_A, perspective: 'upward', sortOrder: 2 },
        { stageId: 's-self', cycleId: CYCLE_A, perspective: 'peer', sortOrder: 1 },
      ] as CycleStage[]);

      const rows = await service.getParticipants('user-1', CYCLE_A);

      expect(rows[0]?.assignments.map((item) => item.evaluatorName)).toEqual(['Anonymous peer', 'Anonymous direct report']);
    });

    it('reads the cycle inside the caller company first, and one query for each table', async () => {
      await service.getParticipants('user-1', CYCLE_A);

      expect(cycles.findOne).toHaveBeenCalledWith({ where: { cycleId: CYCLE_A, company: COMPANY } });
      for (const repo of [participants, stages, assignments, employees]) expect(repo.find).toHaveBeenCalledTimes(1);
    });

    it('answers 404 for a cycle that the company does not have, and reads nothing else', async () => {
      cycles.findOne.mockResolvedValue(null);

      await expect(service.getParticipants('user-1', CYCLE_B)).rejects.toBeInstanceOf(NotFoundException);
      expect(participants.find).not.toHaveBeenCalled();
    });
  });

  describe('readiness', () => {
    afterEach(() => vi.useRealTimers());

    it('finds nothing wrong with a complete draft, and reads each lookup inside the company', async () => {
      arrange();

      await expect(service.readiness('user-1', CYCLE_A)).resolves.toEqual([]);

      expect(employees.find).toHaveBeenCalledWith({ where: { guid: In([EMPLOYEE_A]), company: COMPANY } });
      expect(managers.find).toHaveBeenCalledWith({
        where: { employeeId: In([EMPLOYEE_A]), company: COMPANY, status: 'applied', effectiveDate: LessThanOrEqual('2026-11-25') },
        order: { effectiveDate: 'DESC' },
      });
      expect(users.find).toHaveBeenCalledWith({ where: { userRoleId: '1' } });
      expect(kpiTemplates.find).toHaveBeenCalledWith({ where: { templateId: In(['kt-1']), company: COMPANY } });
    });

    it('flags the manager of a participant who is named as their peer, by name (D12)', async () => {
      arrange();
      cycles.findOne.mockResolvedValue(
        cycle({ state: 'draft', assessmentStart: future('05'), verificationDeadline: future('12'), evaluationStart: '2026-11-04', evaluationEnd: '2026-12-31', anonymityThreshold: 1 }),
      );
      stages.find.mockResolvedValue([{ stageId: 's-1', cycleId: CYCLE_A, perspective: 'peer', sortOrder: 1, evaluatorId: null, deadline: future('10') }] as CycleStage[]);
      peers.find.mockResolvedValue([{ participantId: 'p-1', evaluatorId: MANAGER }] as CyclePeerEvaluator[]);

      await expect(service.readiness('user-1', CYCLE_A)).resolves.toEqual([
        expect.objectContaining({ field: 'participants.' + EMPLOYEE_A + '.peers', message: expect.stringContaining('Maria Santos cannot be an anonymous peer') }),
      ]);
    });

    it('flags a participant with no applied manager', async () => {
      arrange();
      managers.find.mockResolvedValue([]);

      await expect(service.readiness('user-1', CYCLE_A)).resolves.toEqual([
        expect.objectContaining({ step: 'stages', field: 'participants.' + EMPLOYEE_A + '.manager' }),
      ]);
    });

    it('flags a manager who is no longer an active employee: the manager stage would give them work', async () => {
      arrange();
      setStatus(MANAGER, 'inactive');

      await expect(service.readiness('user-1', CYCLE_A)).resolves.toEqual([
        expect.objectContaining({ step: 'stages', field: 'participants.' + EMPLOYEE_A + '.manager' }),
      ]);
    });

    it('takes the latest applied manager of an employee, so a manager change counts', async () => {
      arrange();
      managers.find.mockResolvedValue([
        { employeeId: EMPLOYEE_A, managerId: MANAGER, effectiveDate: '2026-11-20', status: 'applied' },
        { employeeId: EMPLOYEE_A, managerId: '00000000-0000-0000-0000-000000000099', effectiveDate: '2026-10-01', status: 'applied' },
      ] as ManagerAssignment[]);
      setStatus('00000000-0000-0000-0000-000000000099', 'inactive');

      // The later row names the active manager, and the old one is not asked about.
      await expect(service.readiness('user-1', CYCLE_A)).resolves.toEqual([]);
    });

    it('flags a participant who is no longer an active employee, and gives only that problem', async () => {
      arrange();
      setStatus(EMPLOYEE_A, 'inactive');

      await expect(service.readiness('user-1', CYCLE_A)).resolves.toEqual([
        expect.objectContaining({ step: 'participants', field: 'participants.' + EMPLOYEE_A + '.employee' }),
      ]);
    });

    it('flags a participant that the company no longer lists at all', async () => {
      arrange();
      people = people.filter((row) => row.guid !== EMPLOYEE_A);

      await expect(service.readiness('user-1', CYCLE_A)).resolves.toEqual([
        expect.objectContaining({ step: 'participants', field: 'participants.' + EMPLOYEE_A + '.employee' }),
      ]);
    });

    it('flags a KPI template that was archived after the cycle chose it', async () => {
      arrange();
      kpiTemplates.find.mockResolvedValue([{ templateId: 'kt-1', status: 'archived', company: COMPANY }] as KpiGoalTemplate[]);

      await expect(service.readiness('user-1', CYCLE_A)).resolves.toEqual([
        expect.objectContaining({ step: 'kpi', message: expect.stringContaining('no longer published') }),
      ]);
    });

    it('flags an HR evaluator that has no admin login in the company', async () => {
      arrange();
      users.find.mockResolvedValue([]);

      await expect(service.readiness('user-1', CYCLE_A)).resolves.toEqual([
        expect.objectContaining({ step: 'stages', field: 'stages.2.evaluatorId' }),
      ]);
    });

    it('flags an HR evaluator who is no longer an active employee', async () => {
      arrange();
      setStatus(HR_EMPLOYEE, 'inactive');

      await expect(service.readiness('user-1', CYCLE_A)).resolves.toEqual([
        expect.objectContaining({ step: 'stages', field: 'stages.2.evaluatorId' }),
      ]);
    });

    it('answers 404 for a cycle of another company', async () => {
      cycles.findOne.mockResolvedValue(null);

      await expect(service.readiness('user-1', CYCLE_B)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('options', () => {
    it('offers the active employees, the published templates, and the HR evaluators of the company only', async () => {
      employees.find.mockImplementation((async (query: unknown) => {
        const where = (query as { where: Record<string, unknown> }).where;
        return where.id
          ? [{ id: '25', guid: '00000000-0000-0000-0000-000000000025', company: COMPANY, status: 'active' }]
          : [
              { guid: EMPLOYEE_A, employeeCode: 'EMP-001', status: 'active', firstName: 'Iging', lastName: 'DotTech', position: 'Software Engineer', department: 'Engineering', company: COMPANY },
              { guid: '00000000-0000-0000-0000-000000000025', employeeCode: 'EMP-025', status: 'active', firstName: 'System', lastName: 'Administrator', position: null, department: 'Engineering', company: COMPANY },
              { guid: null, firstName: 'No', lastName: 'Guid', position: 'X', department: 'Engineering', company: COMPANY },
            ];
      }) as never);
      kpiTemplates.find.mockResolvedValue([
        { templateId: 'kt-1', name: 'Engineer goals', position: 'Software Engineer', currentVersion: 2, status: 'published', company: COMPANY },
      ] as KpiGoalTemplate[]);
      behavioralTemplates.find.mockResolvedValue([
        { templateId: 'bt-1', name: 'Quarterly review', currentVersion: 1, status: 'published', company: COMPANY },
      ] as BehavioralTemplate[]);
      users.find.mockResolvedValue([{ id: '10', employeeId: '25', userRoleId: '1' }] as User[]);

      managers.find.mockResolvedValue([
        { employeeId: EMPLOYEE_A, managerId: '00000000-0000-0000-0000-000000000025', effectiveDate: '2026-01-01', status: 'applied' },
      ] as ManagerAssignment[]);

      const offered = await service.options('user-1');

      expect(employees.find).toHaveBeenCalledWith(expect.objectContaining({ where: { company: COMPANY, status: 'active' } }));
      expect(kpiTemplates.find).toHaveBeenCalledWith({ where: { company: COMPANY, status: 'published' } });
      expect(behavioralTemplates.find).toHaveBeenCalledWith({ where: { company: COMPANY, status: 'published' } });
      expect(offered.employees).toEqual([
        { employeeId: EMPLOYEE_A, name: 'Iging DotTech', position: 'Software Engineer', department: 'Engineering', employeeCode: 'EMP-001', managerId: '00000000-0000-0000-0000-000000000025', managerName: 'System Administrator' },
        { employeeId: '00000000-0000-0000-0000-000000000025', name: 'System Administrator', position: null, department: 'Engineering', employeeCode: 'EMP-025', managerId: null, managerName: null },
      ]);
      expect(offered.kpiTemplates).toEqual([{ templateId: 'kt-1', name: 'Engineer goals', position: 'Software Engineer', version: 2 }]);
      expect(offered.behavioralTemplates).toEqual([{ templateId: 'bt-1', name: 'Quarterly review', version: 1 }]);
      expect(offered.hrEvaluators).toEqual([{ employeeId: '00000000-0000-0000-0000-000000000025', name: 'System Administrator' }]);
    });
  });

  describe('getById', () => {
    it.each([
      ['both readers for a cycle with no stored choice', null, { employeeVisible: true, managerVisible: true }],
      ['the stored choice', { employeeVisible: false, managerVisible: true }, { employeeVisible: false, managerVisible: true }],
    ])('says who reads the results: %s', async (_what, row, expected) => {
      cycles.findOne.mockResolvedValue(cycle());
      visibility.findOne.mockResolvedValue(row as CycleResultVisibility | null);

      expect(await service.getById('user-1', CYCLE_A)).toMatchObject(expected);
      expect(visibility.findOne).toHaveBeenCalledWith({ where: { cycleId: CYCLE_A } });
    });

    it('returns the cycle with its stages in stage order, found inside the caller company', async () => {
      cycles.findOne.mockResolvedValue(cycle());
      stages.find.mockResolvedValue([
        { stageId: 's-1', cycleId: CYCLE_A, perspective: 'self', sortOrder: 1 },
        { stageId: 's-2', cycleId: CYCLE_A, perspective: 'manager', sortOrder: 2 },
      ] as CycleStage[]);

      const detail = await service.getById('user-1', CYCLE_A);

      expect(cycles.findOne).toHaveBeenCalledWith({ where: { cycleId: CYCLE_A, company: COMPANY } });
      expect(stages.find).toHaveBeenCalledWith({ where: { cycleId: CYCLE_A }, order: { sortOrder: 'ASC' } });
      expect(detail).toMatchObject({ cycleId: CYCLE_A, name: 'CY2026-Q4' });
      expect(detail.stages.map((stage) => stage.stageId)).toEqual(['s-1', 's-2']);
    });

    it('returns the participants with their frozen versions, so the wizard can show them again', async () => {
      cycles.findOne.mockResolvedValue(cycle());
      participants.find.mockResolvedValue([
        { participantId: 'p-1', cycleId: CYCLE_A, employeeId: EMPLOYEE_A, frozenPosition: 'Software Engineer', kpiVersionId: 'kv-1', behavioralVersionId: null },
      ]);

      const detail = await service.getById('user-1', CYCLE_A);

      expect(participants.find).toHaveBeenCalledWith({ where: { cycleId: CYCLE_A } });
      expect(detail.participants).toEqual([expect.objectContaining({ employeeId: EMPLOYEE_A, kpiVersionId: 'kv-1', behavioralVersionId: null })]);
    });

    it('names the template of each frozen version, so the wizard can show the choice again', async () => {
      cycles.findOne.mockResolvedValue(cycle());
      participants.find.mockResolvedValue([
        { participantId: 'p-1', cycleId: CYCLE_A, employeeId: EMPLOYEE_A, frozenPosition: 'Software Engineer', kpiVersionId: 'kv-1', behavioralVersionId: 'bv-1' },
        { participantId: 'p-2', cycleId: CYCLE_A, employeeId: '00000000-0000-0000-0000-000000000022', frozenPosition: null, kpiVersionId: null, behavioralVersionId: 'bv-1' },
      ] as CycleParticipant[]);
      kpiVersions.find.mockResolvedValue([{ versionId: 'kv-1', templateId: 'kt-1' }] as KpiTemplateVersion[]);
      behavioralVersions.find.mockResolvedValue([{ versionId: 'bv-1', templateId: 'bt-1' }] as BehavioralTemplateVersion[]);

      const detail = await service.getById('user-1', CYCLE_A);

      expect(kpiVersions.find).toHaveBeenCalledWith({ where: { versionId: In(['kv-1']) } });
      expect(behavioralVersions.find).toHaveBeenCalledWith({ where: { versionId: In(['bv-1']) } });
      expect(detail.participants.map((person) => [person.kpiTemplateId, person.behavioralTemplateId])).toEqual([
        ['kt-1', 'bt-1'],
        [null, 'bt-1'],
      ]);
    });

    it('reads no version when no participant has one', async () => {
      cycles.findOne.mockResolvedValue(cycle());

      await service.getById('user-1', CYCLE_A);

      expect(kpiVersions.find).not.toHaveBeenCalled();
      expect(behavioralVersions.find).not.toHaveBeenCalled();
    });

    it('answers 404 for a cycle of another company, and reads no stage', async () => {
      cycles.findOne.mockResolvedValue(null);

      await expect(service.getById('user-1', CYCLE_B)).rejects.toBeInstanceOf(NotFoundException);
      expect(stages.find).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('lists the cycles of the caller company only, newest change first, with the counts of the register', async () => {
      cycles.find.mockResolvedValue([
        cycle(),
        cycle({ cycleId: CYCLE_B, name: 'CY2026-Q3', state: 'draft', releasedAt: new Date('2026-10-01T00:00:00Z') }),
      ]);
      participants.find.mockResolvedValue([
        { participantId: 'p-1', cycleId: CYCLE_A },
        { participantId: 'p-2', cycleId: CYCLE_A },
        { participantId: 'p-3', cycleId: CYCLE_B },
      ] as CycleParticipant[]);
      stages.find.mockResolvedValue([
        { stageId: 's-1', cycleId: CYCLE_A, deadline: new Date('2026-12-10T00:00:00Z') },
        { stageId: 's-2', cycleId: CYCLE_A, deadline: new Date('2026-12-15T00:00:00Z') },
        { stageId: 's-3', cycleId: CYCLE_B, deadline: null },
      ] as CycleStage[]);
      assignments.find.mockResolvedValue([
        { assignmentId: 'a-1', cycleId: CYCLE_A, state: 'completed' },
        { assignmentId: 'a-2', cycleId: CYCLE_A, state: 'submitted' },
        { assignmentId: 'a-3', cycleId: CYCLE_A, state: 'in_progress' },
        { assignmentId: 'a-4', cycleId: CYCLE_A, state: 'locked' },
      ] as Assignment[]);

      const rows = await service.list('user-1');

      expect(resolver.resolveCompany).toHaveBeenCalledWith('user-1');
      expect(cycles.find).toHaveBeenCalledWith({ where: { company: COMPANY }, order: { updatedAt: 'DESC' } });
      expect(participants.find).toHaveBeenCalledWith(expect.objectContaining({ where: { cycleId: In([CYCLE_A, CYCLE_B]) } }));
      expect(rows).toEqual([
        {
          cycleId: CYCLE_A,
          name: 'CY2026-Q4',
          reviewType: 'standard',
          state: 'active',
          evaluationStart: '2026-11-04',
          evaluationEnd: '2026-12-31',
          deadline: '2026-12-15T00:00:00.000Z',
          participantCount: 2,
          assignmentCount: 4,
          submittedCount: 2,
          completedCount: 1,
          releasedAt: null,
        },
        {
          cycleId: CYCLE_B,
          name: 'CY2026-Q3',
          reviewType: 'standard',
          state: 'draft',
          evaluationStart: '2026-11-04',
          evaluationEnd: '2026-12-31',
          deadline: null,
          participantCount: 1,
          assignmentCount: 0,
          submittedCount: 0,
          completedCount: 0,
          releasedAt: '2026-10-01T00:00:00.000Z',
        },
      ]);
      for (const row of rows) expect(() => reviewCycleListRowSchema.parse(row)).not.toThrow();
    });

    it('returns an empty list and reads nothing else when the company has no cycle', async () => {
      const rows = await service.list('user-1');

      expect(rows).toEqual([]);
      expect(participants.find).not.toHaveBeenCalled();
      expect(stages.find).not.toHaveBeenCalled();
      expect(assignments.find).not.toHaveBeenCalled();
    });
  });
});
