import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { resultDetailSchema, resultListSchema } from '@pms/shared-types';
import { DataSource } from 'typeorm';
import { AuditEvent } from '../../../common/entities/audit-event.entity.js';
import { User } from '../../auth/entities/user.entity.js';
import { BehavioralQuestion } from '../../behavioral-assessment/entities/behavioral-question.entity.js';
import { BehavioralSection } from '../../behavioral-assessment/entities/behavioral-section.entity.js';
import { BehavioralTemplateVersion } from '../../behavioral-assessment/entities/behavioral-template-version.entity.js';
import { BehavioralTemplate } from '../../behavioral-assessment/entities/behavioral-template.entity.js';
import { EmployeeDomain } from '../../employees/entities/employee-domain.entity.js';
import { KpiGoalTemplate } from '../../kpi-goals/entities/kpi-goal-template.entity.js';
import { KpiIndicatorScale } from '../../kpi-goals/entities/kpi-indicator-scale.entity.js';
import { KpiIndicator } from '../../kpi-goals/entities/kpi-indicator.entity.js';
import { KpiTemplateVersion } from '../../kpi-goals/entities/kpi-template-version.entity.js';
import { CompanyResolver } from '../../kpi-goals/services/company-resolver.service.js';
import { AccomplishmentActual } from '../entities/accomplishment-actual.entity.js';
import { Accomplishment } from '../entities/accomplishment.entity.js';
import { AssignmentResponse } from '../entities/assignment-response.entity.js';
import { Assignment } from '../entities/assignment.entity.js';
import { CycleParticipant } from '../entities/cycle-participant.entity.js';
import { CycleStage } from '../entities/cycle-stage.entity.js';
import { Cycle } from '../entities/cycle.entity.js';
import { EvaluationSnapshot } from '../entities/evaluation-snapshot.entity.js';
import { ManagerAssignment } from '../entities/manager-assignment.entity.js';
import { table, type Row } from '../testing/memory-table-spec.js';
import { CycleResultVisibility } from '../entities/cycle-result-visibility.entity.js';
import { ResultsService } from './results.service.js';

const COMPANY = 'Mayon Consolidated Inc.';
const guid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [ANA, BEN, BOSS, HR] = [guid(27), guid(28), guid(26), guid(24)];
const CYCLE = guid(141);
const [P_ANA, P_BEN] = [guid(151), guid(152)];
const [KPI, BEHAVIOR] = [guid(51), guid(111)];
const [SPRINT, DEFECTS] = [guid(61), guid(62)];
const [RATE, NOTE] = [guid(131), guid(132)];
const NOW = new Date('2026-12-20T00:00:00Z');

const ACCOUNTS: Record<string, { actorId: string | null; role: string; company?: string }> = {
  ana: { actorId: ANA, role: '3' },
  ben: { actorId: BEN, role: '3' },
  boss: { actorId: BOSS, role: '2' },
  admin: { actorId: HR, role: '1' },
  'admin-ana': { actorId: ANA, role: '1' },
  outsider: { actorId: guid(900), role: '1', company: 'Another Company' },
};

const assignment = (n: number, participantId: string, evaluatorId: string, stageId: string) => ({
  assignmentId: guid(n),
  cycleId: CYCLE,
  participantId,
  evaluatorId,
  stageId,
  state: 'submitted',
});
const response = (n: number, assignmentId: string, version: number, answersJson: Row, status = 'submitted') => ({
  responseId: guid(n),
  assignmentId,
  version,
  status,
  answersJson,
  submittedAt: status === 'submitted' ? new Date('2026-12-01T00:00:00Z') : null,
});
const person = (guidOf: string, firstName: string) => ({ guid: guidOf, company: COMPANY, firstName, lastName: 'Reyes', department: 'IT', status: 'active' });
const record = (participantId: string, employeeId: string, accomplishmentId: string) => ({
  accomplishmentId,
  participantId,
  cycleId: CYCLE,
  employeeId,
  status: 'verified',
});
/** `pg` returns numeric columns as text. */
const kpiIndicator = (indicatorId: string, name: string, direction: string, target: string, weight: string) => ({
  indicatorId,
  versionId: KPI,
  name,
  unit: 'Count',
  direction,
  target,
  weight,
  scoreTargetMet: '5.00',
  scoreBelowTarget: '1.00',
  useForScoring: false,
  scaleBound: null,
});

function world() {
  return {
    cycles: table('cycleId', [
      {
        cycleId: CYCLE,
        company: COMPANY,
        name: 'ZZ demo',
        state: 'active',
        evaluationStart: '2026-10-01',
        evaluationEnd: '2026-11-25',
        goalsWeight: 0.5,
        behavioralWeight: 0.5,
        anonymityThreshold: null,
        finalizedAt: null,
        releasedAt: null,
      },
    ]),
    participants: table('participantId', [
      { participantId: P_ANA, cycleId: CYCLE, employeeId: ANA, frozenPosition: 'Engineer', kpiVersionId: KPI, behavioralVersionId: BEHAVIOR },
      { participantId: P_BEN, cycleId: CYCLE, employeeId: BEN, frozenPosition: 'Engineer', kpiVersionId: KPI, behavioralVersionId: BEHAVIOR },
    ]),
    stages: table('stageId', [
      { stageId: 'self', cycleId: CYCLE, perspective: 'self', sortOrder: 1 },
      { stageId: 'manager', cycleId: CYCLE, perspective: 'manager', sortOrder: 2 },
    ]),
    assignments: table('assignmentId', [
      assignment(301, P_ANA, ANA, 'self'),
      assignment(302, P_ANA, BOSS, 'manager'),
      assignment(303, P_BEN, BEN, 'self'),
      assignment(304, P_BEN, BOSS, 'manager'),
    ]),
    responses: table('responseId', [
      response(401, guid(301), 1, { [RATE]: 1 }),
      // The reopened review: only its latest submitted version counts.
      response(402, guid(301), 2, { [RATE]: 5, [NOTE]: 'Steady.' }),
      response(403, guid(301), 3, { [RATE]: 1 }, 'draft'),
      response(404, guid(302), 1, { [RATE]: 3 }),
      response(405, guid(303), 1, { [RATE]: 2 }),
      response(406, guid(304), 1, { [RATE]: 2 }),
    ]),
    accomplishments: table('accomplishmentId', [record(P_ANA, ANA, guid(171)), record(P_BEN, BEN, guid(172))]),
    actuals: table('actualId', [
      { actualId: 'a1', accomplishmentId: guid(171), indicatorId: SPRINT, actualValue: 95, remarks: 'Early.' },
      { actualId: 'a2', accomplishmentId: guid(171), indicatorId: DEFECTS, actualValue: 4, remarks: null },
      { actualId: 'a3', accomplishmentId: guid(172), indicatorId: SPRINT, actualValue: 10, remarks: null },
      { actualId: 'a4', accomplishmentId: guid(172), indicatorId: DEFECTS, actualValue: 9, remarks: null },
    ]),
    indicators: table('indicatorId', [
      kpiIndicator(SPRINT, 'Sprint', 'higher_is_better', '90', '75'),
      kpiIndicator(DEFECTS, 'Defects', 'lower_is_better', '2', '25'),
    ]),
    scales: table('scaleId', [] as Row[]),
    kpiVersions: table('versionId', [{ versionId: KPI, templateId: guid(41), version: 2 }]),
    kpiTemplates: table('templateId', [{ templateId: guid(41), company: COMPANY, name: 'Engineer goals' }]),
    sections: table('sectionId', [{ sectionId: guid(121), versionId: BEHAVIOR, title: 'Work', sortOrder: 1 }]),
    questions: table('questionId', [
      { questionId: RATE, sectionId: guid(121), prompt: 'Delivers', questionType: 'rating_scale', sortOrder: 1 },
      { questionId: NOTE, sectionId: guid(121), prompt: 'Strengths', questionType: 'paragraph', sortOrder: 2 },
    ]),
    behavioralVersions: table('versionId', [{ versionId: BEHAVIOR, templateId: guid(100), version: 3 }]),
    behavioralTemplates: table('templateId', [{ templateId: guid(100), company: COMPANY, name: 'Quarterly' }]),
    employees: table('guid', [person(ANA, 'Ana'), person(BEN, 'Ben'), person(BOSS, 'Bianca'), person(HR, 'Hana')]),
    managers: table('assignmentId', [
      { assignmentId: 'm1', company: COMPANY, employeeId: ANA, managerId: BOSS, effectiveDate: '2026-01-01', status: 'applied' },
    ]),
    snapshots: table('snapshotId', [] as Row[]),
    audit: table('eventId', [] as Row[]),
    visibility: table('cycleId', [] as Row[]),
  };
}

describe('ResultsService', () => {
  let service: ResultsService;
  let db: ReturnType<typeof world>;
  const dataSource = { transaction: vi.fn() };
  const users = { findOne: vi.fn(async (query: { where: { id: string } }) => ({ id: query.where.id, userRoleId: ACCOUNTS[query.where.id]?.role })) };
  const resolver = {
    resolveAccount: vi.fn(async (userId: string) => ({ company: ACCOUNTS[userId]?.company ?? COMPANY, actorId: ACCOUNTS[userId]?.actorId ?? null })),
  };
  const set = (rows: Row[], key: string, value: string, change: Row) => Object.assign(rows.find((row) => row[key] === value) as Row, change);
  const nothingWritten = () => {
    for (const written of [db.snapshots, db.assignments, db.cycles, db.audit]) expect(written.save).not.toHaveBeenCalled();
  };
  const finalize = (account = 'admin') => service.finalize(account, CYCLE);
  const release = (account = 'admin') => service.release(account, CYCLE);
  const failureOf = async (promise: Promise<unknown>) => {
    const error = await promise.then(() => null, (thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(UnprocessableEntityException);
    return (error as UnprocessableEntityException).getResponse() as { details: { message: string }[] };
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    db = world();
    const tables: [unknown, unknown][] = [
      [Cycle, db.cycles],
      [CycleParticipant, db.participants],
      [CycleStage, db.stages],
      [Assignment, db.assignments],
      [AssignmentResponse, db.responses],
      [Accomplishment, db.accomplishments],
      [AccomplishmentActual, db.actuals],
      [KpiIndicator, db.indicators],
      [KpiIndicatorScale, db.scales],
      [KpiTemplateVersion, db.kpiVersions],
      [KpiGoalTemplate, db.kpiTemplates],
      [BehavioralSection, db.sections],
      [BehavioralQuestion, db.questions],
      [BehavioralTemplateVersion, db.behavioralVersions],
      [BehavioralTemplate, db.behavioralTemplates],
      [EmployeeDomain, db.employees],
      [ManagerAssignment, db.managers],
      [EvaluationSnapshot, db.snapshots],
      [AuditEvent, db.audit],
      [CycleResultVisibility, db.visibility],
    ];
    dataSource.transaction.mockReset().mockImplementation(async (run: (manager: unknown) => unknown) =>
      run({ getRepository: (entity: unknown) => new Map(tables).get(entity) }),
    );
    const moduleRef = await Test.createTestingModule({
      providers: [
        ResultsService,
        ...tables.map(([entity, value]) => ({ provide: getRepositoryToken(entity as never), useValue: value })),
        { provide: getRepositoryToken(User), useValue: users },
        { provide: CompanyResolver, useValue: resolver },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = moduleRef.get(ResultsService);
  });

  afterEach(() => vi.useRealTimers());

  describe('finalize', () => {
    it('saves one snapshot for each participant, with the scores of the frozen rules', async () => {
      const rows = await finalize();

      expect(resultListSchema.parse(rows)).toEqual(rows);
      // Goals of Ana: 75% met (5) and 25% below (1). Behavior: latest submitted 5, and 3.
      expect(rows.map((row) => [row.employeeName, row.goalsScore, row.behavioralScore, row.overallScore, row.releasedAt])).toEqual([
        ['Ana Reyes', 4, 4, 4, null],
        ['Ben Reyes', 1, 2, 1.5, null],
      ]);
      expect(db.snapshots.rows).toHaveLength(2);
      expect(db.snapshots.rows[0]).toMatchObject({ cycleId: CYCLE, participantId: P_ANA, finalizedBy: HR, finalizedAt: NOW, releasedAt: null });
    });

    it('completes the assignments and the cycle, and records who did it, in one transaction', async () => {
      await finalize();

      expect(db.assignments.rows.map((row) => row.state)).toEqual(['completed', 'completed', 'completed', 'completed']);
      expect(db.cycles.rows[0]).toMatchObject({ state: 'completed', finalizedAt: NOW, releasedAt: null });
      expect(db.audit.rows).toEqual([
        expect.objectContaining({ entityType: 'cycle', entityId: CYCLE, action: 'finalized', actorId: HR, afterJson: { state: 'completed', resultCount: 2 } }),
      ]);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(db.cycles.findOne).toHaveBeenCalledWith({ where: { cycleId: CYCLE, company: COMPANY }, lock: { mode: 'pessimistic_write' } });
    });

    it('names every unfinished review and unverified report, and writes nothing (Res-001)', async () => {
      set(db.assignments.rows, 'assignmentId', guid(302), { state: 'in_progress' });
      set(db.accomplishments.rows, 'participantId', P_BEN, { status: 'submitted' });

      const { details } = await failureOf(finalize());

      expect(details.map((detail) => detail.message)).toEqual([
        'Ana Reyes: the Manager review is not submitted.',
        'Ben Reyes: the KPI accomplishments are not verified.',
      ]);
      nothingWritten();
    });

    it('asks for no accomplishment when goals do not apply, and leaves that component out (Res-007)', async () => {
      Object.assign(db.cycles.rows[0] as Row, { goalsWeight: 0, behavioralWeight: 1 });
      db.accomplishments.rows.length = 0;

      const rows = await finalize();

      expect(rows[0]).toMatchObject({ goalsScore: null, behavioralScore: 4, overallScore: 4 });
      expect(((db.snapshots.rows[0] as Row).evidenceJson as Row).goals).toBeNull();
    });

    it('leaves no overall score when a component that applies cannot be scored', async () => {
      for (const row of db.responses.rows) row.answersJson = { [RATE]: 'not_observed' };

      expect((await finalize())[0]).toMatchObject({ goalsScore: 4, behavioralScore: null, overallScore: null });
    });

    it.each([
      ['a completed', { state: 'completed' }],
      ['a draft', { state: 'draft' }],
      ['a cancelled', { state: 'cancelled' }],
      ['a finalized', { finalizedAt: NOW }],
    ])('answers 409 for %s cycle, and writes nothing', async (_what, change) => {
      Object.assign(db.cycles.rows[0] as Row, change);

      await expect(finalize()).rejects.toBeInstanceOf(ConflictException);
      nothingWritten();
    });

    it.each([
      ['an administrator of another company', 'outsider', NotFoundException],
      ['an account that is not an administrator', 'boss', ForbiddenException],
    ])('refuses %s, and writes nothing', async (_what, account, expected) => {
      await expect(finalize(account)).rejects.toBeInstanceOf(expected);
      nothingWritten();
    });
  });

  describe('release', () => {
    it('releases every result of a finalized cycle, as its own action (Res-003)', async () => {
      await finalize();
      vi.setSystemTime(new Date('2026-12-21T00:00:00Z'));

      const rows = await release();

      expect(rows.map((row) => row.releasedAt)).toEqual(['2026-12-21T00:00:00.000Z', '2026-12-21T00:00:00.000Z']);
      expect(db.cycles.rows[0]).toMatchObject({ releasedAt: new Date('2026-12-21T00:00:00Z') });
      expect(db.audit.rows.at(-1)).toMatchObject({ action: 'released', actorId: HR });
    });

    it.each([
      ['a cycle that is not finalized', { finalizedAt: null }],
      ['a released cycle', { finalizedAt: NOW, releasedAt: NOW }],
    ])('answers 409 for %s', async (_what, change) => {
      Object.assign(db.cycles.rows[0] as Row, change, { state: 'completed' });

      await expect(release()).rejects.toBeInstanceOf(ConflictException);
      nothingWritten();
    });

    it('refuses an account that is not an administrator', async () => {
      await expect(release('boss')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it.each([
      ['the employee', 'ana', { employeeVisible: false, managerVisible: true }],
      ['the manager', 'boss', { employeeVisible: true, managerVisible: false }],
    ])('answers 404 to %s on one hidden result, and still shows it to HR', async (_who, account, visibility) => {
      await finalize();
      await service.release('admin', CYCLE, visibility);
      const participantId = String(db.participants.rows.find((row) => row.employeeId === ANA)?.participantId);

      await expect(service.get(account, participantId)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.get('admin', participantId)).resolves.toMatchObject({ participantId });
    });

    it('keeps who may read, in the release and in its audit row (Cyc-001, D5)', async () => {
      await finalize();

      await service.release('admin', CYCLE, { employeeVisible: false, managerVisible: true });

      expect(db.visibility.rows).toEqual([{ cycleId: CYCLE, employeeVisible: false, managerVisible: true, earlierAnswersVisible: false }]);
      expect(db.audit.rows.at(-1)).toMatchObject({ action: 'released', afterJson: expect.objectContaining({ employeeVisible: false }) });
    });

    it('keeps the choice of the cycle when the release names none, and widens nothing', async () => {
      await finalize();
      db.visibility.rows.push({ cycleId: CYCLE, employeeVisible: false, managerVisible: true, earlierAnswersVisible: false });

      await service.release('admin', CYCLE, {});

      expect(db.visibility.rows).toEqual([{ cycleId: CYCLE, employeeVisible: false, managerVisible: true, earlierAnswersVisible: false }]);
      expect((await service.list('ana')).length).toBe(0);
    });

    it('keeps whether later reviewers read earlier answers: a release does not change it (D5)', async () => {
      await finalize();
      db.visibility.rows.push({ cycleId: CYCLE, employeeVisible: true, managerVisible: true, earlierAnswersVisible: true });

      await service.release('admin', CYCLE, { employeeVisible: false, earlierAnswersVisible: false } as never);

      expect(db.visibility.rows).toEqual([{ cycleId: CYCLE, employeeVisible: false, managerVisible: true, earlierAnswersVisible: true }]);
    });

    it('reads no visibility before a release, so finalization needs no new table', async () => {
      await finalize();

      expect(db.visibility.find).not.toHaveBeenCalled();
    });

    it.each([
      ['employees', { employeeVisible: false, managerVisible: true }, { owner: 0, manager: 1 }],
      ['managers', { employeeVisible: true, managerVisible: false }, { owner: 1, manager: 0 }],
      ['both of them', { employeeVisible: false, managerVisible: false }, { owner: 0, manager: 0 }],
    ])('hides a released result from the %s, and never from HR', async (_who, visibility, counts) => {
      await finalize();
      const [all] = [await service.listOfCycle('admin', CYCLE)];
      await service.release('admin', CYCLE, visibility);

      expect(await service.listOfCycle('admin', CYCLE)).toHaveLength(all.length);
      const own = (await service.list('ana')).length;
      const team = (await service.list('boss')).length;
      expect([own > 0, team > 0]).toEqual([counts.owner > 0, counts.manager > 0]);
    });
  });

  describe('reading results', () => {
    const idsOf = async (account: string) => (await service.list(account)).map((row) => row.participantId);

    it('shows only the administrator a result before its release', async () => {
      await finalize();

      expect(await idsOf('admin')).toEqual([P_ANA, P_BEN]);
      for (const account of ['ana', 'ben', 'boss']) expect(await idsOf(account)).toEqual([]);
      await expect(service.get('ana', P_ANA)).rejects.toThrow(new NotFoundException('Result not found'));
      await expect(service.get('boss', P_ANA)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('shows the employee their own, the manager their current team, and the administrator the company (Res-003)', async () => {
      await finalize();
      await release();

      expect(await idsOf('ana')).toEqual([P_ANA]);
      expect(await idsOf('ben')).toEqual([P_BEN]);
      expect(await idsOf('boss')).toEqual([P_ANA]);
      expect(await idsOf('admin')).toEqual([P_ANA, P_BEN]);
      expect(await idsOf('outsider')).toEqual([]);
      for (const [account, participantId] of [['ana', P_BEN], ['boss', P_BEN], ['outsider', P_ANA]] as const) {
        await expect(service.get(account, participantId)).rejects.toBeInstanceOf(NotFoundException);
      }
    });

    it('shows an administrator their own result only once it is released', async () => {
      await finalize();
      expect(await idsOf('admin-ana')).toEqual([P_BEN]);
      await expect(service.get('admin-ana', P_ANA)).rejects.toBeInstanceOf(NotFoundException);

      await release();

      expect(await idsOf('admin-ana')).toEqual([P_ANA, P_BEN]);
    });

    it('answers the frozen evidence of one result, as the contract names it', async () => {
      await finalize();
      await release();
      // A later change of a template or an actual result does not move a finalized result.
      set(db.actuals.rows, 'actualId', 'a1', { actualValue: 0 });

      const detail = await service.get('ana', P_ANA);

      expect(resultDetailSchema.parse(detail)).toEqual(detail);
      expect(detail).toMatchObject({
        employeeName: 'Ana Reyes',
        position: 'Engineer',
        goalsWeight: 0.5,
        overallScore: 4,
        goals: { templateName: 'Engineer goals', templateVersion: 2 },
        behavioral: { templateName: 'Quarterly', templateVersion: 3 },
      });
      expect(detail.goals?.indicators[0]).toMatchObject({ name: 'Sprint', actualValue: 95, score: 5, weight: 75, target: 90, remarks: 'Early.' });
      expect(detail.behavioral?.feedback).toEqual([{ perspective: 'self', evaluatorName: 'Ana Reyes', prompt: 'Strengths', text: 'Steady.' }]);
    });

    it('lists the results of one cycle for an administrator of its company only', async () => {
      await finalize();

      expect((await service.listOfCycle('admin', CYCLE)).map((row) => row.participantId)).toEqual([P_ANA, P_BEN]);
      await expect(service.listOfCycle('outsider', CYCLE)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.listOfCycle('boss', CYCLE)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
