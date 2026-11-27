import { BadRequestException, ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  accomplishmentDecisionRequestSchema,
  accomplishmentDetailSchema,
  accomplishmentListSchema,
  reportIndicatorActualsRequestSchema,
} from '@pms/shared-types';
import { DataSource } from 'typeorm';
import { AuditEvent } from '../../../common/entities/audit-event.entity.js';
import { User } from '../../auth/entities/user.entity.js';
import { EmployeeDomain } from '../../employees/entities/employee-domain.entity.js';
import { CompanyResolver } from '../../kpi-goals/services/company-resolver.service.js';
import { KpiIndicatorMatrixCell } from '../../kpi-goals/entities/kpi-indicator-matrix-cell.entity.js';
import { KpiIndicatorMatrixColumn } from '../../kpi-goals/entities/kpi-indicator-matrix-column.entity.js';
import { KpiIndicatorMatrixRow } from '../../kpi-goals/entities/kpi-indicator-matrix-row.entity.js';
import { KpiIndicatorScale } from '../../kpi-goals/entities/kpi-indicator-scale.entity.js';
import { KpiIndicator } from '../../kpi-goals/entities/kpi-indicator.entity.js';
import { KpiGoalTemplate } from '../../kpi-goals/entities/kpi-goal-template.entity.js';
import { KpiTemplateVersion } from '../../kpi-goals/entities/kpi-template-version.entity.js';
import { AccomplishmentActual } from '../entities/accomplishment-actual.entity.js';
import { AccomplishmentVersion } from '../entities/accomplishment-version.entity.js';
import { Accomplishment } from '../entities/accomplishment.entity.js';
import { CycleParticipant } from '../entities/cycle-participant.entity.js';
import { Cycle } from '../entities/cycle.entity.js';
import { ManagerAssignment } from '../entities/manager-assignment.entity.js';
import { table, type Row } from '../testing/memory-table-spec.js';
import { AccomplishmentsService } from './accomplishments.service.js';

const COMPANY = 'Mayon Consolidated Inc.';
const guid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [EMPLOYEE, OTHER, BOSS, OLD_BOSS, NEXT_BOSS, HR] = [guid(27), guid(21), guid(26), guid(22), guid(23), guid(24)];
const [CYCLE, CANCELLED] = [guid(141), guid(143)];
const [MINE, THEIRS, MINE_CANCELLED] = [guid(171), guid(172), guid(173)];
const KPI = guid(51);
const [P_MINE, P_THEIRS, P_OLD] = [guid(151), guid(152), guid(153)];
const [DEFECTS, SALES] = [guid(61), guid(62)];

const ACCOUNTS: Record<string, { actorId: string | null; role: string; company?: string }> = {
  employee: { actorId: EMPLOYEE, role: '3' },
  other: { actorId: OTHER, role: '3' },
  manager: { actorId: BOSS, role: '2' },
  'old-manager': { actorId: OLD_BOSS, role: '2' },
  'next-manager': { actorId: NEXT_BOSS, role: '2' },
  admin: { actorId: HR, role: '1' },
  unlinked: { actorId: null, role: '3' },
  outsider: { actorId: guid(900), role: '1', company: 'Another Company' },
};

const person = (id: number, personGuid: string, firstName: string, lastName: string) => ({
  id: String(id),
  guid: personGuid,
  company: COMPANY,
  status: 'active',
  firstName,
  lastName,
});
const link = (employeeId: string, managerId: string, effectiveDate: string) => ({
  assignmentId: `${employeeId}-${effectiveDate}`,
  employeeId,
  managerId,
  company: COMPANY,
  status: 'applied',
  effectiveDate,
});
const indicator = (indicatorId: string, versionId: string, name: string) => ({
  indicatorId,
  versionId,
  name,
  description: null,
  unit: 'Count',
  // As the driver returns a numeric column.
  target: '2.00',
  direction: 'lower_is_better',
  weight: '50.00',
  scoreTargetMet: '5.00',
  scoreBelowTarget: '2.00',
  matrixKind: 'none',
  matrixTitle: null,
  scaleBound: null,
  useForScoring: false,
});
const record = (accomplishmentId: string, participantId: string, cycleId: string, employeeId: string, status: string) => ({
  accomplishmentId,
  participantId,
  cycleId,
  employeeId,
  status,
  remarks: null,
  returnReason: null,
  submittedAt: null,
  verifiedAt: null,
});
const cycle = (cycleId: string, state: string, name: string) => ({
  cycleId,
  company: COMPANY,
  name,
  state,
  goalsWeight: 0.5,
  evaluationStart: '2026-10-01',
  evaluationEnd: '2026-11-25',
  verificationDeadline: new Date('2026-12-31T15:59:59Z'),
});

function world() {
  return {
    cycles: table('cycleId', [cycle(CYCLE, 'active', 'ZZ demo'), cycle(CANCELLED, 'cancelled', 'Old cycle')]),
    participants: table('participantId', [
      { participantId: P_MINE, cycleId: CYCLE, employeeId: EMPLOYEE, kpiVersionId: KPI, frozenPosition: 'Software Engineer' },
      { participantId: P_THEIRS, cycleId: CYCLE, employeeId: OTHER, kpiVersionId: KPI },
      { participantId: P_OLD, cycleId: CANCELLED, employeeId: EMPLOYEE, kpiVersionId: KPI },
    ]),
    accomplishments: table('accomplishmentId', [
      record(MINE, P_MINE, CYCLE, EMPLOYEE, 'draft'),
      record(THEIRS, P_THEIRS, CYCLE, OTHER, 'submitted'),
      record(MINE_CANCELLED, P_OLD, CANCELLED, EMPLOYEE, 'submitted'),
    ]),
    actuals: table('actualId', [] as Row[]),
    versions: table('versionId', [] as Row[]),
    managers: table('assignmentId', [
      // The employee moved from the old manager to the boss. A later change is not in force yet.
      link(EMPLOYEE, OLD_BOSS, '2026-01-01'),
      link(EMPLOYEE, BOSS, '2026-11-01'),
      link(EMPLOYEE, NEXT_BOSS, '2026-12-01'),
      link(OTHER, OLD_BOSS, '2026-11-01'),
    ]),
    employees: table('guid', [
      person(27, EMPLOYEE, 'Iging', 'UserDotTech'),
      person(21, OTHER, 'Iging', 'DotTech'),
      person(26, BOSS, 'Iging', 'ManagerDotTech'),
      person(22, OLD_BOSS, 'Maria', 'Santos'),
      person(23, NEXT_BOSS, 'Ramon', 'Reyes'),
      person(24, HR, 'Lebron', 'James'),
    ]),
    templateVersions: table('versionId', [{ versionId: KPI, templateId: guid(41), version: 2 }]),
    // The template moved on to version 3 after the cycle froze version 2.
    templates: table('templateId', [{ templateId: guid(41), name: 'Engineer goals', currentVersion: 3 }]),
    indicators: table('indicatorId', [
      indicator(DEFECTS, KPI, 'Defects'),
      indicator(SALES, KPI, 'Sales calls'),
      // Of a later version of the same template: the cycle did not freeze it.
      indicator(guid(69), guid(59), 'Added later'),
    ]),
    scales: table('scaleId', [] as Row[]),
    matrixRows: table('rowId', [] as Row[]),
    matrixColumns: table('colId', [] as Row[]),
    matrixCells: table('rowId', [] as Row[]),
    audit: table('eventId', [] as Row[]),
  };
}

describe('AccomplishmentsService', () => {
  let service: AccomplishmentsService;
  let db: ReturnType<typeof world>;
  const dataSource = { transaction: vi.fn() };
  const users = { findOne: vi.fn(async (query: { where: { id: string } }) => ({ id: query.where.id, userRoleId: ACCOUNTS[query.where.id]?.role })) };
  const resolver = {
    resolveAccount: vi.fn(async (userId: string) => ({ company: ACCOUNTS[userId]?.company ?? COMPANY, actorId: ACCOUNTS[userId]?.actorId ?? null })),
  };

  const set = (accomplishmentId: string, change: Row) =>
    Object.assign(db.accomplishments.rows.find((row) => row.accomplishmentId === accomplishmentId) as Row, change);
  const setCycle = (change: Row) => Object.assign(db.cycles.rows[0] as Row, change);
  const report = (indicatorId: string, actualValue: number | null, accomplishmentId = MINE) =>
    db.actuals.rows.push({ actualId: `${accomplishmentId}-${indicatorId}`, accomplishmentId, indicatorId, actualValue });

  beforeEach(async () => {
    vi.useFakeTimers();
    // 10:00 of 26 November in Manila: the evaluation period ended yesterday.
    vi.setSystemTime(new Date('2026-11-26T02:00:00Z'));
    db = world();
    const tables: [unknown, unknown][] = [
      [Cycle, db.cycles],
      [CycleParticipant, db.participants],
      [Accomplishment, db.accomplishments],
      [AccomplishmentActual, db.actuals],
      [AccomplishmentVersion, db.versions],
      [ManagerAssignment, db.managers],
      [EmployeeDomain, db.employees],
      [KpiIndicator, db.indicators],
      [KpiIndicatorScale, db.scales],
      [KpiIndicatorMatrixRow, db.matrixRows],
      [KpiIndicatorMatrixColumn, db.matrixColumns],
      [KpiIndicatorMatrixCell, db.matrixCells],
      [AuditEvent, db.audit],
      [KpiTemplateVersion, db.templateVersions],
      [KpiGoalTemplate, db.templates],
    ];
    dataSource.transaction.mockReset().mockImplementation(async (run: (manager: unknown) => unknown) =>
      run({ getRepository: (entity: unknown) => new Map(tables).get(entity) }),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        AccomplishmentsService,
        ...tables.map(([entity, value]) => ({ provide: getRepositoryToken(entity as never), useValue: value })),
        { provide: getRepositoryToken(User), useValue: users },
        { provide: CompanyResolver, useValue: resolver },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = moduleRef.get(AccomplishmentsService);
  });

  afterEach(() => vi.useRealTimers());

  /** The body as the controller passes it: parsed by the shared schema. */
  const body = (values: Record<string, number | null>, extra: Row = {}) =>
    reportIndicatorActualsRequestSchema.parse({
      actuals: Object.entries(values).map(([indicatorId, actualValue]) => ({ indicatorId, actualValue })),
      ...extra,
    });
  const stored = () => db.accomplishments.rows.find((row) => row.accomplishmentId === MINE) as Row;
  const values = () => db.actuals.rows.map((row) => [row.indicatorId, row.actualValue]).sort();
  const nothingWritten = () => {
    for (const written of [db.accomplishments, db.actuals, db.versions, db.audit]) expect(written.save).not.toHaveBeenCalled();
  };
  const responseOf = (error: unknown) => (error as BadRequestException).getResponse();
  const FULL = () => body({ [DEFECTS]: 0, [SALES]: 12 }, { remarks: 'Done.' });

  describe('saveActuals', () => {
    it('keeps one value for each frozen indicator, and leaves the record a draft', async () => {
      const detail = await service.saveActuals('employee', MINE, body({ [DEFECTS]: 1 }, { remarks: 'Half way.' }));

      expect(values()).toEqual([[DEFECTS, 1], [SALES, null]]);
      expect(stored()).toMatchObject({ status: 'draft', remarks: 'Half way.' });
      expect(detail.actuals).toHaveLength(2);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('changes the same rows on the next save, and clears a value that is left out', async () => {
      await service.saveActuals('employee', MINE, body({ [DEFECTS]: 1, [SALES]: 5 }));
      const ids = db.actuals.rows.map((row) => row.actualId);

      await service.saveActuals('employee', MINE, body({ [SALES]: 7 }));

      expect(db.actuals.rows.map((row) => row.actualId)).toEqual(ids);
      expect(values()).toEqual([[DEFECTS, null], [SALES, 7]]);
    });

    it('keeps a returned record returned until it is submitted again', async () => {
      set(MINE, { status: 'returned', returnReason: 'Wrong count.' });

      await service.saveActuals('employee', MINE, body({ [DEFECTS]: 1 }));

      expect(stored()).toMatchObject({ status: 'returned', returnReason: 'Wrong count.' });
    });

    it('saves while the evaluation period still runs (Acc-002)', async () => {
      setCycle({ evaluationEnd: '2026-12-15' });

      await expect(service.saveActuals('employee', MINE, body({ [DEFECTS]: 1 }))).resolves.toMatchObject({ canSubmit: false });
    });

    it('writes one audit row with the actor and the values', async () => {
      await service.saveActuals('employee', MINE, body({ [DEFECTS]: 1 }));

      expect(db.audit.rows).toEqual([
        expect.objectContaining({
          entityType: 'accomplishment',
          entityId: MINE,
          action: 'actuals_saved',
          actorId: EMPLOYEE,
          afterJson: { status: 'draft', actuals: [{ indicator_id: DEFECTS, actual_value: 1, remarks: null }, { indicator_id: SALES, actual_value: null, remarks: null }] },
        }),
      ]);
    });

    it('locks the cycle for reading, then the record for writing', async () => {
      await service.saveActuals('employee', MINE, body({ [DEFECTS]: 1 }));

      const cycleLock = db.cycles.findOne.mock.calls.findIndex(([query]) => query.lock?.mode === 'pessimistic_read');
      const rowLock = db.accomplishments.findOne.mock.calls.findIndex(([query]) => query.lock?.mode === 'pessimistic_write');
      expect(cycleLock).toBeGreaterThanOrEqual(0);
      expect(db.cycles.findOne.mock.invocationCallOrder[cycleLock]).toBeLessThan(db.accomplishments.findOne.mock.invocationCallOrder[rowLock] ?? 0);
    });

    it('answers 400 to an indicator of another version, naming it', async () => {
      const error = await service.saveActuals('employee', MINE, body({ [guid(69)]: 1 })).catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(responseOf(error)).toMatchObject({ details: [{ field: `actuals.${guid(69)}`, code: 'UNKNOWN_INDICATOR' }] });
      nothingWritten();
    });
  });

  describe('the remarks of each indicator', () => {
    const REPORT = (extra: Row = {}) =>
      reportIndicatorActualsRequestSchema.parse({
        actuals: [
          { indicatorId: DEFECTS, actualValue: 0, remarks: 'None found.' },
          { indicatorId: SALES, actualValue: 12 },
        ],
        ...extra,
      });
    const remarksOf = () => db.actuals.rows.map((row) => [row.indicatorId, row.remarks]).sort();

    it('keeps them with the saved values, and answers them', async () => {
      const detail = await service.saveActuals('employee', MINE, REPORT());

      expect(remarksOf()).toEqual([[DEFECTS, 'None found.'], [SALES, null]]);
      expect(detail.actuals).toContainEqual({ indicatorId: DEFECTS, actualValue: 0, remarks: 'None found.' });
    });

    it('keeps them in the version of a submission, and answers the history with them', async () => {
      const detail = await service.submit('employee', MINE, REPORT());

      expect(db.versions.rows[0]?.actualsJson).toEqual({
        actuals: [
          { indicator_id: DEFECTS, actual_value: 0, remarks: 'None found.' },
          { indicator_id: SALES, actual_value: 12, remarks: null },
        ],
      });
      expect(detail.versions[0]?.actuals).toContainEqual({ indicatorId: DEFECTS, actualValue: 0, remarks: 'None found.' });
    });
  });

  describe('the accomplishment deadline (Acc-006)', () => {
    const passed = { accomplishmentDeadline: new Date('2026-11-26T01:00:00Z') };
    const LATE = 'The accomplishment deadline has passed. HR must extend the cycle schedule.';

    it('closes the first submission and the draft', async () => {
      setCycle(passed);

      await expect(service.submit('employee', MINE, FULL())).rejects.toThrow(LATE);
      await expect(service.saveActuals('employee', MINE, FULL())).rejects.toThrow(LATE);
      nothingWritten();
      expect(await service.get('employee', MINE)).toMatchObject({
        canEdit: false,
        canSubmit: false,
        notice: LATE,
        accomplishmentDeadline: '2026-11-26T01:00:00.000Z',
      });
    });

    it('leaves a returned record open through the verification deadline', async () => {
      setCycle(passed);
      Object.assign(stored(), { status: 'returned' });

      expect(await service.submit('employee', MINE, body({ [DEFECTS]: 0, [SALES]: 12 }, { correctionReason: 'Counted again.' }))).toMatchObject({
        status: 'submitted',
      });
    });

    it('holds nothing before it, or when the cycle has none', async () => {
      setCycle({ accomplishmentDeadline: new Date('2026-12-01T00:00:00Z') });
      expect(await service.get('employee', MINE)).toMatchObject({ canEdit: true, canSubmit: true });
      setCycle({ accomplishmentDeadline: null });
      expect(await service.get('employee', MINE)).toMatchObject({ canEdit: true, canSubmit: true, accomplishmentDeadline: null });
    });
  });

  describe('submit', () => {
    it('locks the values: saves them, keeps a version, and waits for the manager', async () => {
      const detail = await service.submit('employee', MINE, FULL());

      expect(values()).toEqual([[DEFECTS, 0], [SALES, 12]]);
      expect(stored()).toMatchObject({ status: 'submitted', remarks: 'Done.', submittedBy: EMPLOYEE, submittedAt: new Date('2026-11-26T02:00:00Z') });
      expect(db.versions.rows).toEqual([
        expect.objectContaining({
          accomplishmentId: MINE,
          version: 1,
          actualsJson: {
            actuals: [
              { indicator_id: DEFECTS, actual_value: 0, remarks: null },
              { indicator_id: SALES, actual_value: 12, remarks: null },
            ],
          },
          remarks: 'Done.',
          actorId: EMPLOYEE,
          actedAt: new Date('2026-11-26T02:00:00Z'),
          correctionReason: null,
        }),
      ]);
      expect(db.audit.rows).toEqual([expect.objectContaining({ action: 'submitted', actorId: EMPLOYEE })]);
      expect(detail).toMatchObject({ status: 'submitted', canEdit: false, canSubmit: false });
    });

    it('refuses before the evaluation period ends (Acc-002)', async () => {
      // The last day of the period is today in Manila.
      setCycle({ evaluationEnd: '2026-11-26' });

      await expect(service.submit('employee', MINE, FULL())).rejects.toThrow(
        new UnprocessableEntityException('You can submit after the evaluation period ends.'),
      );
      nothingWritten();
    });

    it('refuses a report with a missing value, naming each indicator', async () => {
      const error = await service.submit('employee', MINE, body({ [DEFECTS]: null })).catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(responseOf(error)).toMatchObject({
        details: [
          { field: `actuals.${DEFECTS}`, code: 'REQUIRED' },
          { field: `actuals.${SALES}`, code: 'REQUIRED' },
        ],
      });
      nothingWritten();
    });

    it('needs the correction reason after a return, and keeps it with the next version (Acc-003)', async () => {
      set(MINE, { status: 'returned', returnReason: 'Wrong count.' });
      db.versions.rows.push({ versionId: 'v-1', accomplishmentId: MINE, version: 1, actualsJson: { actuals: [] } });

      const error = await service.submit('employee', MINE, FULL()).catch((reason: unknown) => reason);
      expect(responseOf(error)).toMatchObject({ details: [{ field: 'correctionReason', code: 'REQUIRED' }] });
      nothingWritten();

      await service.submit('employee', MINE, body({ [DEFECTS]: 1, [SALES]: 12 }, { correctionReason: 'Recounted.' }));

      expect(db.versions.rows.map((row) => [row.version, row.correctionReason])).toEqual([[1, undefined], [2, 'Recounted.']]);
      expect(stored()).toMatchObject({ status: 'submitted', returnReason: null });
    });

    it('keeps no correction reason on a first submission', async () => {
      await service.submit('employee', MINE, body({ [DEFECTS]: 0, [SALES]: 1 }, { correctionReason: 'Not a correction.' }));

      expect(db.versions.rows[0]?.correctionReason).toBeNull();
    });

    it('lets a failed write reach the caller, with no audit row', async () => {
      db.versions.save.mockRejectedValue(new Error('insert failed'));

      await expect(service.submit('employee', MINE, FULL())).rejects.toThrow('insert failed');
      expect(db.audit.save).not.toHaveBeenCalled();
    });
  });

  describe.each([
    ['saveActuals', (account: string) => service.saveActuals(account, MINE, FULL())],
    ['submit', (account: string) => service.submit(account, MINE, FULL())],
  ] as const)('who and when: %s', (_name, act) => {
    it.each(['manager', 'admin', 'other', 'outsider', 'unlinked'])('answers 404 to the %s, and writes nothing', async (account) => {
      await expect(act(account)).rejects.toThrow(new NotFoundException('Accomplishment not found'));
      nothingWritten();
    });

    it.each([
      ['submitted', 'This record is submitted. It cannot be changed.'],
      ['verified', 'This record is verified. It cannot be changed.'],
    ])('answers 409 to a %s record', async (status, message) => {
      set(MINE, { status });

      await expect(act('employee')).rejects.toThrow(new ConflictException(message));
      nothingWritten();
    });

    it('answers 409 once the cycle is not active', async () => {
      setCycle({ state: 'cancelled' });

      await expect(act('employee')).rejects.toThrow(new ConflictException('The cycle is not active. This record cannot be changed.'));
      nothingWritten();
    });

    it('answers 409 after the verification deadline (Acc-006)', async () => {
      setCycle({ verificationDeadline: new Date('2026-11-25T00:00:00Z') });

      await expect(act('employee')).rejects.toThrow(
        new ConflictException('The verification deadline has passed. HR must extend the cycle schedule.'),
      );
      nothingWritten();
    });
  });

  describe('decide', () => {
    const verify = () => accomplishmentDecisionRequestSchema.parse({ outcome: 'verified' });
    const sendBack = () => accomplishmentDecisionRequestSchema.parse({ outcome: 'returned', reason: 'Wrong count.' });

    beforeEach(() => {
      set(MINE, { status: 'submitted', submittedBy: EMPLOYEE, submittedAt: new Date('2026-11-26T01:00:00Z') });
      // Far below the target of a lower-is-better indicator.
      report(DEFECTS, 99);
    });

    it('verifies the evidence of the current manager, whatever the target says (Acc-004)', async () => {
      const detail = await service.decide('manager', MINE, verify());

      expect(stored()).toMatchObject({ status: 'verified', verifiedBy: BOSS, verifiedAt: new Date('2026-11-26T02:00:00Z'), returnReason: null });
      expect(db.actuals.save).not.toHaveBeenCalled();
      expect(detail).toMatchObject({ status: 'verified', canDecide: false, actuals: [{ indicatorId: DEFECTS, actualValue: 99 }] });
    });

    it('returns it with the reason, and the employee can edit it again (Acc-006)', async () => {
      await service.decide('manager', MINE, sendBack());

      expect(stored()).toMatchObject({ status: 'returned', returnReason: 'Wrong count.', verifiedBy: null, verifiedAt: null });
      expect(await service.get('employee', MINE)).toMatchObject({ canEdit: true, returnReason: 'Wrong count.' });
    });

    it.each([
      ['verified', verify, null],
      ['returned', sendBack, 'Wrong count.'],
    ])('writes one audit row for a record that is %s', async (status, decision, reason) => {
      await service.decide('manager', MINE, decision());

      expect(db.audit.rows).toEqual([
        expect.objectContaining({
          entityType: 'accomplishment',
          entityId: MINE,
          action: status,
          actorId: BOSS,
          reason,
          beforeJson: { status: 'submitted' },
          afterJson: { status },
        }),
      ]);
    });

    it('locks the cycle for reading, then the record for writing', async () => {
      await service.decide('manager', MINE, verify());

      const cycleLock = db.cycles.findOne.mock.calls.findIndex(([query]) => query.lock?.mode === 'pessimistic_read');
      const rowLock = db.accomplishments.findOne.mock.calls.findIndex(([query]) => query.lock?.mode === 'pessimistic_write');
      expect(cycleLock).toBeGreaterThanOrEqual(0);
      expect(db.cycles.findOne.mock.invocationCallOrder[cycleLock]).toBeLessThan(db.accomplishments.findOne.mock.invocationCallOrder[rowLock] ?? 0);
    });

    it.each(['employee', 'old-manager', 'next-manager', 'admin', 'other', 'outsider', 'unlinked'])(
      'answers 404 to the %s: only the current manager decides',
      async (account) => {
        await expect(service.decide(account, MINE, verify())).rejects.toThrow(new NotFoundException('Accomplishment not found'));
        nothingWritten();
      },
    );

    it('never lets a person decide on their own record', async () => {
      db.managers.rows.push(link(EMPLOYEE, EMPLOYEE, '2026-11-20'));

      await expect(service.decide('employee', MINE, verify())).rejects.toBeInstanceOf(NotFoundException);
      nothingWritten();
    });

    it.each(['draft', 'returned', 'verified'])('answers 409 to a %s record', async (status) => {
      set(MINE, { status });

      await expect(service.decide('manager', MINE, verify())).rejects.toThrow(new ConflictException('This record is not waiting for a decision.'));
      nothingWritten();
    });

    it('answers 409 once the cycle is not active', async () => {
      setCycle({ state: 'cancelled' });

      await expect(service.decide('manager', MINE, verify())).rejects.toBeInstanceOf(ConflictException);
      nothingWritten();
    });

    it('answers 409 after the verification deadline (Acc-005)', async () => {
      setCycle({ verificationDeadline: new Date('2026-11-25T00:00:00Z') });

      await expect(service.decide('manager', MINE, verify())).rejects.toThrow(
        new ConflictException('The verification deadline has passed. HR must extend the cycle schedule.'),
      );
      nothingWritten();
    });
  });

  describe('a completed cycle', () => {
    const [DONE, P_DONE, MINE_DONE] = [guid(142), guid(154), guid(174)];

    beforeEach(() => {
      db.cycles.rows.push(cycle(DONE, 'completed', 'Done cycle'));
      db.participants.rows.push({ participantId: P_DONE, cycleId: DONE, employeeId: EMPLOYEE, kpiVersionId: KPI });
      db.accomplishments.rows.push(record(MINE_DONE, P_DONE, DONE, EMPLOYEE, 'verified'));
    });

    it.each(['employee', 'manager'])('lists and opens the record for the %s, and permits nothing', async (account) => {
      expect((await service.list(account)).map((row) => row.accomplishmentId)).toContain(MINE_DONE);
      expect(await service.get(account, MINE_DONE)).toMatchObject({
        cycleState: 'completed',
        canEdit: false,
        canSubmit: false,
        canDecide: false,
        notice: 'The cycle is completed. This record cannot be changed.',
      });
    });

    it.each(['other', 'old-manager', 'next-manager', 'outsider', 'unlinked'])('hides it from the %s', async (account) => {
      expect((await service.list(account)).map((row) => row.accomplishmentId)).not.toContain(MINE_DONE);
      await expect(service.get(account, MINE_DONE)).rejects.toThrow(new NotFoundException('Accomplishment not found'));
    });

    it('still hides from the manager the values that were never submitted', async () => {
      set(MINE_DONE, { status: 'draft', remarks: 'Not final.' });
      report(DEFECTS, 9, MINE_DONE);

      expect(await service.get('manager', MINE_DONE)).toMatchObject({ actuals: [], remarks: null });
    });

    it('refuses a change by the employee and a decision by the manager, and writes nothing', async () => {
      set(MINE_DONE, { status: 'draft' });
      await expect(service.saveActuals('employee', MINE_DONE, body({ [DEFECTS]: 1 }))).rejects.toBeInstanceOf(ConflictException);
      set(MINE_DONE, { status: 'submitted' });
      await expect(
        service.decide('manager', MINE_DONE, accomplishmentDecisionRequestSchema.parse({ outcome: 'verified' })),
      ).rejects.toBeInstanceOf(ConflictException);
      nothingWritten();
    });
  });

  describe('list', () => {
    const idsFor = async (account: string) => (await service.list(account)).map((row) => row.accomplishmentId).sort();

    it('shows the employee their own records, and none of a cancelled cycle', async () => {
      const rows = await service.list('employee');

      expect(() => accomplishmentListSchema.parse(rows)).not.toThrow();
      expect(rows).toEqual([
        {
          accomplishmentId: MINE,
          cycleId: CYCLE,
          cycleName: 'ZZ demo',
          cycleState: 'active',
          employeeName: 'Iging UserDotTech',
          status: 'draft',
          evaluationEnd: '2026-11-25',
          verificationDeadline: '2026-12-31T15:59:59.000Z',
          accomplishmentDeadline: null,
          isOwn: true,
          canDecide: false,
          position: 'Software Engineer',
          kpiTemplateName: 'Engineer goals',
          kpiTemplateVersion: 2,
        },
      ]);
    });

    it('says no position where the cycle froze none, and reads the templates once for the whole list', async () => {
      const rows = await service.list('admin');

      expect(rows.find((row) => row.accomplishmentId === THEIRS)?.position).toBeNull();
      expect(db.templateVersions.find).toHaveBeenCalledTimes(1);
      expect(db.templates.find).toHaveBeenCalledTimes(1);
    });

    it('says no template for a participant who froze none', async () => {
      Object.assign(db.participants.rows[0] as Row, { kpiVersionId: null });

      expect((await service.list('employee'))[0]).toMatchObject({ kpiTemplateName: null, kpiTemplateVersion: null });
    });

    it('shows a manager the records of the people they manage today, and no other', async () => {
      expect(await idsFor('manager')).toEqual([MINE]);
      // The old manager keeps the person who did not move, and loses the one who did.
      expect(await idsFor('old-manager')).toEqual([THEIRS]);
      // A change that starts later gives nothing yet.
      expect(await idsFor('next-manager')).toEqual([]);
    });

    it('lets the current manager decide on a submitted record only', async () => {
      expect((await service.list('manager'))[0]?.canDecide).toBe(false);
      set(MINE, { status: 'submitted' });

      expect((await service.list('manager'))[0]?.canDecide).toBe(true);
    });

    it('shows an administrator every record of the company, with nothing to decide', async () => {
      const rows = await service.list('admin');

      expect(rows.map((row) => row.accomplishmentId).sort()).toEqual([MINE, THEIRS, MINE_CANCELLED]);
      expect(rows.every((row) => !row.canDecide)).toBe(true);
    });

    it.each(['outsider', 'unlinked'])('shows nothing to an account that has no part in these cycles (%s)', async (account) => {
      expect(await service.list(account)).toEqual([]);
    });
  });

  describe('get', () => {
    it('says the position and the KPI template of the record', async () => {
      expect(await service.get('employee', MINE)).toMatchObject({
        position: 'Software Engineer',
        kpiTemplateName: 'Engineer goals',
        kpiTemplateVersion: 2,
      });
    });

    it('shows the owner the indicators of the frozen version, their values, and what they may do', async () => {
      report(DEFECTS, 1);

      const detail = await service.get('employee', MINE);
      const parsed = accomplishmentDetailSchema.parse(detail);

      expect(parsed.kpi.indicators.map((row) => row.name)).toEqual(['Defects', 'Sales calls']);
      expect(parsed.kpi.indicators[0]).toMatchObject({ target: 2, weight: 50, direction: 'lower_is_better' });
      expect(parsed.actuals).toEqual([{ indicatorId: DEFECTS, actualValue: 1, remarks: null }]);
      expect(detail).toMatchObject({
        participantId: P_MINE,
        status: 'draft',
        evaluationStart: '2026-10-01',
        evaluationEnd: '2026-11-25',
        canEdit: true,
        canSubmit: true,
        canDecide: false,
        notice: null,
      });
    });

    it('lets the owner save but not submit while the evaluation period runs, and says why', async () => {
      setCycle({ evaluationEnd: '2026-11-26' });

      expect(await service.get('employee', MINE)).toMatchObject({
        canEdit: true,
        canSubmit: false,
        notice: 'You can submit after the evaluation period ends.',
      });
    });

    it.each([
      ['submitted', 'Submitted. It waits for your manager.'],
      ['verified', 'Verified. It cannot be changed.'],
    ])('closes a %s record to its owner', async (status, notice) => {
      set(MINE, { status });

      expect(await service.get('employee', MINE)).toMatchObject({ canEdit: false, canSubmit: false, notice });
    });

    it('closes the record to its owner after the verification deadline', async () => {
      set(MINE, { status: 'returned' });
      setCycle({ verificationDeadline: new Date('2026-11-25T00:00:00Z') });

      expect(await service.get('employee', MINE)).toMatchObject({
        canEdit: false,
        canSubmit: false,
        notice: 'The verification deadline has passed. HR must extend the cycle schedule.',
      });
    });

    it('shows the current manager a submitted record with its values, ready to decide', async () => {
      set(MINE, { status: 'submitted', remarks: 'Done early.', submittedAt: new Date('2026-11-26T01:00:00Z') });
      report(DEFECTS, 1);

      expect(await service.get('manager', MINE)).toMatchObject({
        canEdit: false,
        canSubmit: false,
        canDecide: true,
        notice: null,
        remarks: 'Done early.',
        actuals: [{ indicatorId: DEFECTS, actualValue: 1 }],
        submittedAt: '2026-11-26T01:00:00.000Z',
      });
    });

    it.each([
      ['manager', 'draft', 'The employee has not submitted it yet.'],
      ['manager', 'returned', 'Returned to the employee.'],
      ['admin', 'returned', 'Returned to the employee.'],
    ])('hides from the %s the values that the employee still holds (%s)', async (account, status, notice) => {
      set(MINE, { status, remarks: 'Not final.' });
      report(DEFECTS, 9);

      expect(await service.get(account, MINE)).toMatchObject({ actuals: [], remarks: null, canDecide: false, notice });
    });

    it('lets an administrator read a record of a cancelled cycle, and change nothing', async () => {
      expect(await service.get('admin', MINE_CANCELLED)).toMatchObject({ canEdit: false, canDecide: false, cycleState: 'cancelled' });
    });

    it('tells an administrator that a submitted record waits for the manager', async () => {
      set(MINE, { status: 'submitted' });

      expect(await service.get('admin', MINE)).toMatchObject({ canDecide: false, notice: 'It waits for the current manager.' });
    });

    it('shows the history of the submissions, oldest first, with the names of who sent them', async () => {
      const snapshot = (value: number) => ({ actuals: [{ indicator_id: DEFECTS, actual_value: value }] });
      db.versions.rows.push(
        { versionId: 'v-2', accomplishmentId: MINE, version: 2, actualsJson: snapshot(1), remarks: 'Fixed.', actorId: EMPLOYEE, actedAt: new Date('2026-11-26T01:00:00Z'), correctionReason: 'Wrong count.' },
        {
          versionId: 'v-1',
          accomplishmentId: MINE,
          version: 1,
          // The seed holds one id that is not a whole GUID: that value is left out.
          actualsJson: { actuals: [...snapshot(4).actuals, { indicator_id: '00000000-0000-0000-000000000062', actual_value: 1 }] },
          remarks: null,
          actorId: null,
          actedAt: null,
          correctionReason: null,
        },
      );

      const history = (await service.get('employee', MINE)).versions;

      expect(history).toEqual([
        { version: 1, actedAt: null, actorName: 'Unknown employee', remarks: null, correctionReason: null, actuals: [{ indicatorId: DEFECTS, actualValue: 4, remarks: null }] },
        { version: 2, actedAt: '2026-11-26T01:00:00.000Z', actorName: 'Iging UserDotTech', remarks: 'Fixed.', correctionReason: 'Wrong count.', actuals: [{ indicatorId: DEFECTS, actualValue: 1, remarks: null }] },
      ]);
    });

    it.each([
      ['another employee', 'other', MINE],
      ['the prior manager (AUTH-004)', 'old-manager', MINE],
      ['the manager of a later date', 'next-manager', MINE],
      ['an administrator of another company', 'outsider', MINE],
      ['the owner, once the cycle is cancelled', 'employee', MINE_CANCELLED],
      ['the manager, once the cycle is cancelled', 'manager', MINE_CANCELLED],
      ['anyone, for an id that does not exist', 'admin', guid(999)],
    ])('answers 404 to %s', async (_label, account, accomplishmentId) => {
      await expect(service.get(account, accomplishmentId)).rejects.toThrow(new NotFoundException('Accomplishment not found'));
    });
  });
});
