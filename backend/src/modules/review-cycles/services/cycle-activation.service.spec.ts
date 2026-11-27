import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditEvent } from '../../../common/entities/audit-event.entity.js';
import { User } from '../../auth/entities/user.entity.js';
import { BehavioralTemplateVersion } from '../../behavioral-assessment/entities/behavioral-template-version.entity.js';
import { BehavioralTemplate } from '../../behavioral-assessment/entities/behavioral-template.entity.js';
import { EmployeeDomain } from '../../employees/entities/employee-domain.entity.js';
import { KpiGoalTemplate } from '../../kpi-goals/entities/kpi-goal-template.entity.js';
import { KpiTemplateVersion } from '../../kpi-goals/entities/kpi-template-version.entity.js';
import { CompanyResolver } from '../../kpi-goals/services/company-resolver.service.js';
import { Accomplishment } from '../entities/accomplishment.entity.js';
import { Assignment } from '../entities/assignment.entity.js';
import { CycleParticipant } from '../entities/cycle-participant.entity.js';
import { CyclePeerEvaluator } from '../entities/cycle-peer-evaluator.entity.js';
import { CycleStage } from '../entities/cycle-stage.entity.js';
import { Cycle } from '../entities/cycle.entity.js';
import { ManagerAssignment } from '../entities/manager-assignment.entity.js';
import { table, type Row } from '../testing/memory-table-spec.js';
import { CycleActivationService } from './cycle-activation.service.js';
import { resolveParticipants } from './participant-resolver.js';

vi.mock('./participant-resolver.js', () => ({ resolveParticipants: vi.fn(async () => []) }));

const COMPANY = 'Mayon Consolidated Inc.';
const guid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [EMPLOYEE, MANAGER, HR, ACTOR] = [guid(21), guid(22), guid(25), guid(24)];
const CYCLE = guid(141);
const day = (value: string) => new Date(`${value}T00:00:00Z`);

const person = (id: string, guidOf: string) => ({ id, guid: guidOf, firstName: 'Iging', lastName: id, company: COMPANY, status: 'active', position: 'Engineer' });

function world() {
  return {
    cycles: table('cycleId', [
      {
        cycleId: CYCLE,
        company: COMPANY,
        name: 'CY2027',
        state: 'draft',
        evaluationStart: '2026-11-01',
        evaluationEnd: '2026-12-31',
        assessmentStart: day('2027-01-05'),
        verificationDeadline: day('2027-01-12'),
        accomplishmentDeadline: null,
        activationDate: null,
        goalsWeight: 0.5,
        behavioralWeight: 0.5,
      },
    ] as Row[]),
    stages: table('stageId', [
      { stageId: 'st-self', cycleId: CYCLE, perspective: 'self', sortOrder: 1, evaluatorId: null, deadline: day('2027-01-10') },
      { stageId: 'st-mgr', cycleId: CYCLE, perspective: 'manager', sortOrder: 2, evaluatorId: null, deadline: day('2027-01-15') },
    ]),
    participants: table('participantId', [
      { participantId: 'p-1', cycleId: CYCLE, employeeId: EMPLOYEE, frozenPosition: 'Engineer', kpiVersionId: 'kv-1', behavioralVersionId: 'bv-1' },
    ]),
    assignments: table('assignmentId', [] as Row[]),
    accomplishments: table('accomplishmentId', [] as Row[]),
    audit: table('eventId', [] as Row[]),
    employees: table('guid', [person('21', EMPLOYEE), person('22', MANAGER), person('25', HR)]),
    managers: table('assignmentId', [
      { assignmentId: 'm-1', company: COMPANY, employeeId: EMPLOYEE, managerId: MANAGER, effectiveDate: '2026-11-01', status: 'applied' },
    ]),
    peers: table('participantId', [] as Row[]),
    users: table('id', [{ id: '10', employeeId: '25', userRoleId: '1' }]),
    kpiVersions: table('versionId', [{ versionId: 'kv-1', templateId: 'kt-1' }]),
    kpiTemplates: table('templateId', [{ templateId: 'kt-1', status: 'published', company: COMPANY }]),
    behavioralVersions: table('versionId', [{ versionId: 'bv-1', templateId: 'bt-1' }]),
    behavioralTemplates: table('templateId', [{ templateId: 'bt-1', status: 'published', company: COMPANY }]),
  };
}

describe('CycleActivationService', () => {
  let service: CycleActivationService;
  let db: ReturnType<typeof world>;
  const dataSource = { transaction: vi.fn() };
  const resolver = { resolveAccount: vi.fn() };

  const cycle = () => db.cycles.rows[0] as Row;
  const actions = () => db.audit.rows.map((row) => row.action);
  const nothingWritten = () => {
    for (const written of [db.cycles, db.assignments, db.accomplishments, db.participants, db.audit]) {
      expect(written.save).not.toHaveBeenCalled();
    }
  };
  const scheduled = () => Object.assign(cycle(), { state: 'scheduled', activationDate: '2027-01-05' });

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(day('2026-11-26'));
    db = world();
    const tables: [unknown, unknown][] = [
      [Cycle, db.cycles],
      [CycleStage, db.stages],
      [CycleParticipant, db.participants],
      [Assignment, db.assignments],
      [Accomplishment, db.accomplishments],
      [AuditEvent, db.audit],
      [EmployeeDomain, db.employees],
      [ManagerAssignment, db.managers],
      [User, db.users],
      [CyclePeerEvaluator, db.peers],
      [KpiTemplateVersion, db.kpiVersions],
      [KpiGoalTemplate, db.kpiTemplates],
      [BehavioralTemplateVersion, db.behavioralVersions],
      [BehavioralTemplate, db.behavioralTemplates],
    ];
    resolver.resolveAccount.mockReset().mockResolvedValue({ company: COMPANY, actorId: ACTOR });
    vi.mocked(resolveParticipants).mockReset().mockResolvedValue([]);
    dataSource.transaction.mockReset().mockImplementation(async (run: (manager: unknown) => unknown) =>
      run({ getRepository: (entity: unknown) => new Map(tables).get(entity) }),
    );
    const moduleRef = await Test.createTestingModule({
      providers: [
        CycleActivationService,
        { provide: getRepositoryToken(Cycle), useValue: db.cycles },
        { provide: CompanyResolver, useValue: resolver },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = moduleRef.get(CycleActivationService);
  });

  afterEach(() => {
    service.onModuleDestroy();
    vi.useRealTimers();
  });

  describe('schedule (Cyc-006)', () => {
    it('freezes the current templates, waits for the assessment start, and opens no work', async () => {
      vi.mocked(resolveParticipants).mockResolvedValue([{ employeeId: EMPLOYEE, kpiVersionId: 'kv-2', behavioralVersionId: 'bv-1' }] as never);

      await service.schedule('user-1', CYCLE);

      expect(cycle()).toMatchObject({ state: 'scheduled', activationDate: '2027-01-05' });
      expect(db.participants.rows[0]).toMatchObject({ kpiVersionId: 'kv-2' });
      expect(db.assignments.rows).toEqual([]);
      expect(db.accomplishments.rows).toEqual([]);
      expect(db.audit.rows).toEqual([
        expect.objectContaining({ action: 'scheduled', actorId: ACTOR, afterJson: { state: 'scheduled', activationDate: '2027-01-05', refrozenCount: 1 } }),
      ]);
      expect(db.cycles.findOne).toHaveBeenCalledWith({ where: { cycleId: CYCLE, company: COMPANY }, lock: { mode: 'pessimistic_write' } });
    });

    it('answers 422 when the assessment starts today in Manila or earlier, and writes nothing', async () => {
      // 20:00 UTC on January 4 is already January 5 in Manila.
      vi.setSystemTime(new Date('2027-01-04T20:00:00Z'));

      await expect(service.schedule('user-1', CYCLE)).rejects.toThrow('The assessment starts today or earlier. Launch the cycle instead.');
      nothingWritten();
    });

    it('answers 422 with the readiness problems, and writes nothing', async () => {
      db.managers.rows.length = 0;

      await expect(service.schedule('user-1', CYCLE)).rejects.toBeInstanceOf(UnprocessableEntityException);
      nothingWritten();
    });

    it.each(['scheduled', 'active', 'completed', 'cancelled'])('answers 409 for a %s cycle', async (state) => {
      cycle().state = state;

      await expect(service.schedule('user-1', CYCLE)).rejects.toBeInstanceOf(ConflictException);
      nothingWritten();
    });

    it('answers 404 for a cycle of another company, and 403 to an account with no employee record', async () => {
      resolver.resolveAccount.mockResolvedValue({ company: 'Other', actorId: ACTOR });
      await expect(service.schedule('user-1', CYCLE)).rejects.toBeInstanceOf(NotFoundException);
      resolver.resolveAccount.mockResolvedValue({ company: COMPANY, actorId: null });
      await expect(service.schedule('user-1', CYCLE)).rejects.toBeInstanceOf(ForbiddenException);
      nothingWritten();
    });
  });

  describe('unschedule', () => {
    it('returns a scheduled cycle to draft, so HR can repair it', async () => {
      scheduled();

      await service.unschedule('user-1', CYCLE);

      expect(cycle()).toMatchObject({ state: 'draft', activationDate: null });
      expect(actions()).toEqual(['unscheduled']);
    });

    it('answers 409 for a cycle that is not scheduled', async () => {
      await expect(service.unschedule('user-1', CYCLE)).rejects.toBeInstanceOf(ConflictException);
      nothingWritten();
    });
  });

  describe('activateDue (Cyc-006, Cyc-008)', () => {
    beforeEach(() => {
      scheduled();
      // 16:00 UTC on January 4 is the start of January 5 in Manila.
      vi.setSystemTime(new Date('2027-01-04T16:00:00Z'));
    });

    it('creates the assignments and the reports of a due cycle once, with the frozen versions', async () => {
      await service.activateDue();
      await service.activateDue();

      expect(cycle()).toMatchObject({ state: 'active', activationDate: '2027-01-05' });
      expect(db.assignments.rows.map((row) => [row.evaluatorId, row.state])).toEqual([
        [EMPLOYEE, 'not_started'],
        [MANAGER, 'locked'],
      ]);
      expect(db.accomplishments.rows).toHaveLength(1);
      expect(resolveParticipants).not.toHaveBeenCalled();
      expect(db.audit.rows).toEqual([expect.objectContaining({ action: 'activated', actorId: null })]);
    });

    it('waits for its day', async () => {
      vi.setSystemTime(new Date('2027-01-04T15:59:00Z'));

      await service.activateDue();

      nothingWritten();
    });

    it.each([
      ['an archived template', () => Object.assign(db.kpiTemplates.rows[0] as Row, { status: 'archived' }), 'no longer published'],
      ['a window that passed', () => vi.setSystemTime(day('2027-03-01')), 'has passed'],
    ])('keeps a cycle with %s scheduled, records why once, and creates nothing (Cyc-008)', async (_what, breakIt, words) => {
      breakIt();

      await service.activateDue();
      await service.activateDue();

      expect(cycle().state).toBe('scheduled');
      expect(db.assignments.rows).toEqual([]);
      expect(actions()).toEqual(['activation_blocked']);
      expect(JSON.stringify(db.audit.rows[0]?.afterJson)).toContain(words);
    });

    it('goes on with the next cycle when one fails', async () => {
      // The first one read fails.
      db.cycles.rows.unshift({ ...cycle(), cycleId: guid(142) });
      db.stages.find.mockRejectedValueOnce(new Error('read failed'));

      await service.activateDue();

      expect(db.cycles.rows.map((row) => row.state)).toEqual(['scheduled', 'active']);
    });

    it('runs every minute from the start of the module until its end', async () => {
      service.onModuleInit();
      await vi.advanceTimersByTimeAsync(60_000);
      expect(cycle().state).toBe('active');

      service.onModuleDestroy();
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
