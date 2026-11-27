import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { reviewListQuerySchema, reviewListResponseSchema } from '@pms/shared-types';
import { User } from '../../auth/entities/user.entity.js';
import { EmployeeDomain } from '../../employees/entities/employee-domain.entity.js';
import { CompanyResolver } from '../../kpi-goals/services/company-resolver.service.js';
import { Assignment } from '../entities/assignment.entity.js';
import { CycleParticipant } from '../entities/cycle-participant.entity.js';
import { CycleStage } from '../entities/cycle-stage.entity.js';
import { ManagerAssignment } from '../entities/manager-assignment.entity.js';
import { Cycle } from '../entities/cycle.entity.js';
import { table, type Row } from '../testing/memory-table-spec.js';
import { ReviewsService } from './reviews.service.js';

const COMPANY = 'Mayon Consolidated Inc.';
const OTHER = 'Another Company';
const guid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const IGING = guid(21);
const MARIA = guid(22);
const HR = guid(25);
const ACTIVE = guid(141);
const DONE = guid(142);
const CANCELLED = guid(143);
const FOREIGN = guid(999);

/** The rows of the database. Each repository mock answers from these, honoring the `where` of the query. */
const CYCLES = [
  { cycleId: ACTIVE, company: COMPANY, name: 'CY2026-Q4', state: 'active' },
  { cycleId: DONE, company: COMPANY, name: 'CY2026-Q3', state: 'completed' },
  { cycleId: CANCELLED, company: COMPANY, name: 'CY2026-Q2', state: 'cancelled' },
  { cycleId: FOREIGN, company: OTHER, name: 'Foreign cycle', state: 'active' },
];
const PARTICIPANTS = [
  { participantId: 'p-1', cycleId: ACTIVE, employeeId: IGING, frozenPosition: 'Software Engineer' },
  { participantId: 'p-2', cycleId: DONE, employeeId: IGING },
  { participantId: 'p-4', cycleId: ACTIVE, employeeId: MARIA },
  { participantId: 'p-3', cycleId: CANCELLED, employeeId: IGING },
  { participantId: 'p-9', cycleId: FOREIGN, employeeId: guid(900) },
];
const STAGES = [
  { stageId: 's-self', cycleId: ACTIVE, perspective: 'self', sortOrder: 1 },
  { stageId: 's-mgr', cycleId: ACTIVE, perspective: 'manager', sortOrder: 2 },
  { stageId: 's-hr', cycleId: ACTIVE, perspective: 'hr', sortOrder: 3 },
  { stageId: 's-done', cycleId: DONE, perspective: 'self', sortOrder: 1 },
  { stageId: 's-cancelled', cycleId: CANCELLED, perspective: 'self', sortOrder: 1 },
  { stageId: 's-foreign', cycleId: FOREIGN, perspective: 'self', sortOrder: 1 },
];
const day = (value: string) => new Date(`${value}T00:00:00Z`);
const assignment = (assignmentId: string, cycleId: string, participantId: string, evaluatorId: string, stageId: string, state: string, deadline: Date | null) => ({
  assignmentId,
  cycleId,
  participantId,
  evaluatorId,
  stageId,
  state,
  deadline,
});
const ASSIGNMENTS = [
  assignment(guid(301), ACTIVE, 'p-1', IGING, 's-self', 'submitted', day('2026-11-10')),
  assignment(guid(302), ACTIVE, 'p-1', MARIA, 's-mgr', 'not_started', day('2026-11-20')),
  assignment(guid(303), ACTIVE, 'p-1', HR, 's-hr', 'locked', day('2026-12-30')),
  assignment(guid(304), DONE, 'p-2', MARIA, 's-done', 'completed', day('2026-09-30')),
  assignment(guid(305), CANCELLED, 'p-3', MARIA, 's-cancelled', 'not_started', day('2026-06-30')),
  assignment(guid(399), FOREIGN, 'p-9', MARIA, 's-foreign', 'not_started', day('2026-06-30')),
];
const PEOPLE = [
  { guid: IGING, company: COMPANY, firstName: 'Iging', lastName: 'DotTech', status: 'active', department: 'IT', position: 'Moved Since' },
  { guid: MARIA, company: COMPANY, firstName: 'Maria', lastName: 'Santos', status: 'active', department: 'Sales' },
  { guid: HR, company: COMPANY, firstName: 'System', lastName: 'Administrator', status: 'active' },
  { guid: guid(900), company: OTHER, firstName: 'Foreign', lastName: 'Person' },
];

/** Matches a row against a TypeORM `where` of equal values and `In(...)`. */
function matches(row: Record<string, unknown>, where: Record<string, unknown>) {
  return Object.entries(where).every(([key, expected]) => {
    const operator = expected as { value?: unknown[] };
    return operator && typeof operator === 'object' && Array.isArray(operator.value) ? operator.value.includes(row[key]) : row[key] === expected;
  });
}
const repoOf = <T extends Record<string, unknown>>(rows: T[]) => ({
  find: vi.fn(async (query: { where: Record<string, unknown> }) => rows.filter((row) => matches(row, query.where))),
});

describe('ReviewsService.list', () => {
  let service: ReviewsService;
  let cycles: ReturnType<typeof repoOf>;
  let assignments: ReturnType<typeof repoOf>;
  let managers: ReturnType<typeof table>;
  const users = { findOne: vi.fn() };
  const resolver = { resolveAccount: vi.fn() };

  const list = (query: Record<string, string> = {}) => service.list('user-1', reviewListQuerySchema.parse(query));
  const ids = async (query: Record<string, string> = {}) => (await list(query)).items.map((row) => row.assignmentId);

  function signIn(role: 'admin' | 'manager', actorId: string | null) {
    users.findOne.mockResolvedValue({ id: 'user-1', userRoleId: role === 'admin' ? '1' : '2' });
    resolver.resolveAccount.mockResolvedValue({ company: COMPANY, actorId });
  }

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(day('2026-11-26'));
    cycles = repoOf(CYCLES);
    assignments = repoOf(ASSIGNMENTS);
    managers = table('assignmentId', [] as Row[]);
    users.findOne.mockReset();
    resolver.resolveAccount.mockReset();
    signIn('admin', HR);

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getRepositoryToken(Cycle), useValue: cycles },
        { provide: getRepositoryToken(CycleParticipant), useValue: repoOf(PARTICIPANTS) },
        { provide: getRepositoryToken(CycleStage), useValue: repoOf(STAGES) },
        { provide: getRepositoryToken(Assignment), useValue: assignments },
        { provide: getRepositoryToken(EmployeeDomain), useValue: repoOf(PEOPLE) },
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(ManagerAssignment), useValue: managers },
        { provide: CompanyResolver, useValue: resolver },
      ],
    }).compile();
    service = moduleRef.get(ReviewsService);
  });

  afterEach(() => vi.useRealTimers());

  describe('an HR administrator', () => {
    it('names no evaluator of an anonymous perspective, and finds none by that name (Res-008)', async () => {
      const peer = STAGES[2] as { perspective: string };
      peer.perspective = 'peer';
      try {
        // The HR employee asks as someone else, so the peer row is not their own.
        signIn('admin', guid(900));

        expect((await list({ perspective: 'peer' })).items.map((row) => row.evaluatorName)).toEqual(['Anonymous peer']);
        expect(await ids({ q: 'System', perspective: 'peer' })).toEqual([]);

        signIn('admin', HR);
        expect((await list({ perspective: 'peer' })).items[0]?.evaluatorName).not.toBe('Anonymous peer');
      } finally {
        peer.perspective = 'hr';
      }
    });

    it('sees every assignment of the company, in every cycle state, and none of another company', async () => {
      expect((await ids()).sort()).toEqual([guid(301), guid(302), guid(303), guid(304), guid(305)]);
      expect((await list()).totalItems).toBe(5);
    });

    it('shows the cycle, the people by name, the stage, the state, and the deadline, in the shared shape', async () => {
      const page = await list({ perspective: 'manager', cycleId: ACTIVE });

      expect(page.items).toEqual([
        {
          assignmentId: guid(302),
          cycleId: ACTIVE,
          cycleName: 'CY2026-Q4',
          cycleState: 'active',
          subjectName: 'Iging DotTech',
          evaluatorName: 'Maria Santos',
          perspective: 'manager',
          state: 'not_started',
          deadline: '2026-11-20T00:00:00.000Z',
          isOverdue: true,
          subjectPosition: 'Software Engineer',
          subjectDepartment: 'IT',
          isAssignedToCaller: false,
        },
      ]);
      expect(() => reviewListResponseSchema.parse(page)).not.toThrow();
    });

    it('reads the cycles of the company first, and the assignments of those cycles only', async () => {
      await list();

      expect(cycles.find).toHaveBeenCalledWith({ where: { company: COMPANY } });
      const where = assignments.find.mock.calls[0]?.[0].where as { cycleId: { value: string[] }; evaluatorId?: string };
      expect(where.cycleId.value.sort()).toEqual([ACTIVE, DONE, CANCELLED].sort());
      expect(where.evaluatorId).toBeUndefined();
    });
  });

  describe('a manager or an employee', () => {
    it('sees only the assignments where they are the evaluator, in active and completed cycles (Rev-007)', async () => {
      signIn('manager', MARIA);

      expect(await ids()).toEqual([guid(304), guid(302)]);
      expect((await list()).totalItems).toBe(2);
      expect(await ids({ cycleState: 'completed' })).toEqual([guid(304)]);
    });

    it('sees the reviews about them that another person answers, in active and completed cycles (D5)', async () => {
      signIn('manager', IGING);

      expect(await ids()).toEqual([304, 301, 302, 303].map(guid));
    });

    it('names no anonymous evaluator of a review about them, and finds none by that name (Res-008)', async () => {
      const stage = STAGES[1] as { perspective: string };
      stage.perspective = 'peer';
      try {
        signIn('manager', IGING);

        expect((await list({ perspective: 'peer' })).items.map((row) => row.evaluatorName)).toEqual(['Anonymous peer']);
        expect(await ids({ perspective: 'peer', q: 'Maria' })).toEqual([]);
      } finally {
        stage.perspective = 'manager';
      }
    });

    it('sees nothing, and no assignment is read, when the account has no employee GUID', async () => {
      signIn('manager', null);

      expect(await list()).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, cycles: [], departments: [] });
      expect(assignments.find).not.toHaveBeenCalled();
    });

    it.each([
      ['a cancelled cycle by state', { cycleState: 'cancelled' }],
      ['a cancelled cycle by id', { cycleId: CANCELLED }],
      ['a cycle of another company', { cycleId: FOREIGN }],
      ['a search that matches only a row of another evaluator', { q: 'Administrator' }],
    ])('cannot widen the list with %s', async (_label, query) => {
      signIn('manager', MARIA);

      expect(await list(query)).toMatchObject({ items: [], totalItems: 0 });
    });
  });

  describe('the team of a manager (D3, D11)', () => {
    const manages = (managerId: string, employeeId: string, effectiveDate = '2026-11-01', company = COMPANY) =>
      managers.rows.push({ assignmentId: `m-${managers.rows.length}`, company, employeeId, managerId, effectiveDate, status: 'applied' });

    beforeEach(() => signIn('manager', MARIA));

    it('lists every review about a current team member, whoever answers it', async () => {
      manages(MARIA, IGING);

      expect(await ids()).toEqual([304, 301, 302, 303].map(guid));
      expect(await ids({ view: 'team' })).toEqual([304, 301, 302, 303].map(guid));
      expect(await ids({ view: 'mine' })).toEqual([304, 302].map(guid));
    });

    it('names the evaluator of a team review, and no evaluator of an anonymous one', async () => {
      manages(MARIA, IGING);
      const stage = STAGES[2] as { perspective: string };
      stage.perspective = 'peer';
      try {
        const rows = (await list()).items;

        expect(rows.find((row) => row.assignmentId === guid(301))?.evaluatorName).toBe('Iging DotTech');
        expect(rows.find((row) => row.assignmentId === guid(303))?.evaluatorName).toBe('Anonymous peer');
        expect(await ids({ q: 'System' })).toEqual([]);
      } finally {
        stage.perspective = 'hr';
      }
    });

    it('lists no team review once another manager takes over', async () => {
      manages(MARIA, IGING);
      manages(HR, IGING, '2026-11-20');

      expect(await ids({ view: 'team' })).toEqual([]);
      expect(await ids()).toEqual([304, 302].map(guid));
    });

    it('gives nobody without a team a team review', async () => {
      signIn('manager', IGING);

      expect(await ids({ view: 'team' })).toEqual([]);
    });

    it('lists nothing of another company, whatever the manager rows say', async () => {
      manages(MARIA, guid(900), '2026-11-01', OTHER);

      expect(await ids()).toEqual([304, 302].map(guid));
    });

    it('shows the current manager the department on a finished review (D11)', async () => {
      manages(MARIA, IGING);

      expect((await list()).items.find((row) => row.assignmentId === guid(304))?.subjectDepartment).toBe('IT');
    });
  });

  describe('the department of today on a finished review (CWE-200)', () => {
    const departments = async () => Object.fromEntries((await list()).items.map((row) => [row.assignmentId, row.subjectDepartment]));

    it('hides it from an evaluator who is not the subject, in the rows and in the filter', async () => {
      signIn('manager', MARIA);

      expect(await departments()).toEqual({ [guid(304)]: null, [guid(302)]: 'IT' });
      expect(await ids({ department: 'IT' })).toEqual([guid(302)]);
    });

    it('shows it to an administrator', async () => {
      expect((await departments())[guid(304)]).toBe('IT');
    });

    it('shows it to the subject on their own finished review', async () => {
      const own = ASSIGNMENTS.find((row) => row.assignmentId === guid(304)) as { evaluatorId: string };
      own.evaluatorId = IGING;
      try {
        signIn('manager', IGING);

        expect((await departments())[guid(304)]).toBe('IT');
      } finally {
        own.evaluatorId = MARIA;
      }
    });
  });

  describe('who a row is about, and whose it is', () => {
    it('shows the position that the cycle froze, never the position of today, and none when none was frozen', async () => {
      const rows = (await list()).items;

      expect(rows.find((row) => row.assignmentId === guid(302))?.subjectPosition).toBe('Software Engineer');
      expect(rows.find((row) => row.assignmentId === guid(304))?.subjectPosition).toBeNull();
    });

    it('marks the assignments that the caller answers', async () => {
      const mine = (await list()).items.filter((row) => row.isAssignedToCaller).map((row) => row.assignmentId);

      expect(mine).toEqual([guid(303)]);
    });

    it('marks none for an administrator with no employee GUID', async () => {
      signIn('admin', null);

      expect((await list()).items.some((row) => row.isAssignedToCaller)).toBe(false);
    });
  });

  describe('the tabs and the filter options', () => {
    it('offers the cycles and the departments of every row in scope, whatever the filters', async () => {
      const page = await list({ perspective: 'hr' });

      expect(page.cycles).toEqual([
        { cycleId: CANCELLED, name: 'CY2026-Q2' },
        { cycleId: DONE, name: 'CY2026-Q3' },
        { cycleId: ACTIVE, name: 'CY2026-Q4' },
      ]);
      expect(page.departments).toEqual(['IT']);
    });

    it('offers a manager only what their own rows hold', async () => {
      signIn('manager', MARIA);

      const page = await list();

      expect(page.cycles).toEqual([
        { cycleId: DONE, name: 'CY2026-Q3' },
        { cycleId: ACTIVE, name: 'CY2026-Q4' },
      ]);
      expect(page.departments).toEqual(['IT']);
    });

    it.each([
      ['my reviews', { view: 'mine' }, [303]],
      ['completed work, submitted or finalized', { view: 'completed' }, [304, 301]],
      ['the department of the subject', { department: 'IT' }, [305, 304, 301, 302, 303]],
      ['a department with no row', { department: 'Sales' }, []],
      ['late work', { state: 'overdue' }, [302]],
    ])('shows %s', async (_label, query, expected) => {
      expect(await ids(query)).toEqual((expected as number[]).map(guid));
    });

    it.each<Record<string, string>>([{ view: 'completed' }, { view: 'mine' }, { department: 'IT' }, { state: 'overdue' }])(
      'cannot widen the list of a manager with %o',
      async (query) => {
        signIn('manager', MARIA);

        expect((await ids(query)).filter((id) => id !== guid(302) && id !== guid(304))).toEqual([]);
      },
    );
  });

  describe('filters, search, order, and pages, on the rows the caller may see', () => {
    it.each([
      ['the cycle', { cycleId: DONE }, [304]],
      ['the state of the cycle', { cycleState: 'cancelled' }, [305]],
      ['the stage', { perspective: 'hr' }, [303]],
      ['the state of the assignment', { state: 'submitted' }, [301]],
      ['the name of the evaluator, without case', { q: 'maria' }, [305, 304, 302]],
      ['the name of the cycle', { q: 'q3' }, [304]],
    ])('filters by %s', async (_label, query, expected) => {
      expect(await ids(query)).toEqual((expected as number[]).map(guid));
    });

    it('answers nothing for a cycle of another company, even for an administrator', async () => {
      expect(await list({ cycleId: FOREIGN })).toMatchObject({ items: [], totalItems: 0 });
    });

    it('orders by deadline, earliest first', async () => {
      expect(await ids()).toEqual([305, 304, 301, 302, 303].map(guid));
    });

    it('cuts a page out of the filtered rows, and counts all of them', async () => {
      const many = Array.from({ length: 12 }, (_, index) =>
        assignment(guid(400 + index), ACTIVE, 'p-1', HR, 's-hr', 'locked', day('2027-01-01')),
      );
      assignments.find.mockImplementation(async () => many);

      const second = await list({ page: '2', pageSize: '10' });

      expect(second).toMatchObject({ page: 2, pageSize: 10, totalItems: 12 });
      expect(second.items).toHaveLength(2);
    });

    it('marks overdue only open work of an active cycle that is past its deadline', async () => {
      const overdue = Object.fromEntries((await list()).items.map((row) => [row.assignmentId, row.isOverdue]));

      expect(overdue).toEqual({
        [guid(301)]: false, // submitted
        [guid(302)]: true, // open, active cycle, past
        [guid(303)]: false, // deadline ahead
        [guid(304)]: false, // completed cycle
        [guid(305)]: false, // cancelled cycle: no work is expected
      });
    });

    it('answers an empty page, and reads nothing more, when the company has no cycle', async () => {
      resolver.resolveAccount.mockResolvedValue({ company: 'Empty Company', actorId: HR });

      expect(await list()).toMatchObject({ items: [], totalItems: 0 });
      expect(assignments.find).not.toHaveBeenCalled();
    });
  });
});
