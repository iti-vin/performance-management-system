import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { cycleHistoryResponseSchema } from '@pms/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditEvent } from '../../../common/entities/audit-event.entity.js';
import { AdminRoleGuard } from '../../employees/guards/admin-role.guard.js';
import { User } from '../../auth/entities/user.entity.js';
import { EmployeeDomain } from '../../employees/entities/employee-domain.entity.js';
import { CompanyResolver } from '../../kpi-goals/services/company-resolver.service.js';
import { CycleHistoryController } from '../controllers/cycle-history.controller.js';
import { Accomplishment } from '../entities/accomplishment.entity.js';
import { Assignment } from '../entities/assignment.entity.js';
import { CycleParticipant } from '../entities/cycle-participant.entity.js';
import { CycleStage } from '../entities/cycle-stage.entity.js';
import { Cycle } from '../entities/cycle.entity.js';
import { table } from '../testing/memory-table-spec.js';
import { CycleHistoryService } from './cycle-history.service.js';

const guid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [CYCLE, SELF, PEER, HRS, REPORT] = [guid(141), guid(301), guid(302), guid(303), guid(171)];
const [SUBJECT, BUDDY, HR] = [guid(27), guid(26), guid(24)];

const event = (n: number, entityType: string, entityId: string, action: string, actorId: string | null, extra: object = {}) => ({
  eventId: guid(500 + n),
  entityType,
  entityId,
  action,
  actorId,
  reason: null,
  beforeJson: null,
  afterJson: null,
  occurredAt: new Date(`2026-11-26T0${n}:00:00Z`),
  ...extra,
});

describe('CycleHistoryService', () => {
  let service: CycleHistoryService;
  const accounts: Record<string, { actorId: string; role: string; company: string }> = {
    admin: { actorId: HR, role: '1', company: 'Acme' },
    subject: { actorId: SUBJECT, role: '1', company: 'Acme' },
    employee: { actorId: SUBJECT, role: '3', company: 'Acme' },
    outsider: { actorId: HR, role: '1', company: 'Other' },
  };
  let events: ReturnType<typeof table>;
  let tables: Map<unknown, ReturnType<typeof table>>;
  const rowsOf = async (entity: unknown) => (tables.get(entity) as ReturnType<typeof table>).rows;

  beforeEach(async () => {
    events = table('eventId', [
      event(1, 'cycle', CYCLE, 'launched', HR, { beforeJson: { state: 'draft' }, afterJson: { state: 'active', assignmentCount: 3 } }),
      event(2, 'assignment', PEER, 'submitted', BUDDY, {
        beforeJson: { state: 'in_progress' },
        afterJson: { state: 'submitted', answers: { q: 'secret words' } },
      }),
      event(3, 'assignment', HRS, 'stage_unlocked', BUDDY, { afterJson: { state: 'not_started', afterAssignmentId: PEER } }),
      event(4, 'assignment', SELF, 'reopened', HR, { reason: 'Wrong ratings', afterJson: { state: 'in_progress' } }),
      event(5, 'accomplishment', REPORT, 'submitted', SUBJECT, { afterJson: { status: 'submitted', remarks: 'private note', actuals: [1] } }),
      event(6, 'cycle', guid(999), 'launched', HR),
    ]);
    const repositories: [unknown, unknown][] = [
      [Cycle, table('cycleId', [{ cycleId: CYCLE, company: 'Acme' }])],
      [CycleParticipant, table('participantId', [{ participantId: 'p-1', cycleId: CYCLE, employeeId: SUBJECT }])],
      [
        CycleStage,
        table('stageId', [
          { stageId: 's-self', cycleId: CYCLE, perspective: 'self' },
          { stageId: 's-peer', cycleId: CYCLE, perspective: 'peer' },
          { stageId: 's-hr', cycleId: CYCLE, perspective: 'hr' },
        ]),
      ],
      [
        Assignment,
        table('assignmentId', [
          { assignmentId: SELF, cycleId: CYCLE, participantId: 'p-1', stageId: 's-self', evaluatorId: SUBJECT },
          { assignmentId: PEER, cycleId: CYCLE, participantId: 'p-1', stageId: 's-peer', evaluatorId: BUDDY },
          { assignmentId: HRS, cycleId: CYCLE, participantId: 'p-1', stageId: 's-hr', evaluatorId: HR },
        ]),
      ],
      [Accomplishment, table('accomplishmentId', [{ accomplishmentId: REPORT, cycleId: CYCLE, participantId: 'p-1' }])],
      [AuditEvent, events],
      [
        EmployeeDomain,
        table('guid', [
          { guid: SUBJECT, company: 'Acme', firstName: 'Iging', lastName: 'Cruz' },
          { guid: BUDDY, company: 'Acme', firstName: 'Buddy', lastName: 'Reyes' },
          { guid: HR, company: 'Acme', firstName: 'Lebron', lastName: 'James' },
        ]),
      ],
    ];
    tables = new Map(repositories as [unknown, ReturnType<typeof table>][]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        CycleHistoryService,
        ...repositories.map(([entity, value]) => ({ provide: getRepositoryToken(entity as never), useValue: value })),
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: vi.fn(async (query: { where: { id: string } }) => ({ userRoleId: accounts[query.where.id]?.role })) },
        },
        { provide: CompanyResolver, useValue: { resolveAccount: vi.fn(async (id: string) => accounts[id]) } },
      ],
    }).compile();
    service = moduleRef.get(CycleHistoryService);
  });

  it('lists the events of the cycle, its reviews, and its reports, newest first, with actor, reason, before, and after', async () => {
    const rows = await service.list('admin', CYCLE);

    expect(() => cycleHistoryResponseSchema.parse(rows)).not.toThrow();
    expect(rows.map((row) => [row.area, row.action])).toEqual([
      ['report', 'submitted'],
      ['review', 'reopened'],
      ['review', 'stage_unlocked'],
      ['review', 'submitted'],
      ['cycle', 'launched'],
    ]);
    expect(rows[1]).toMatchObject({ employeeName: 'Iging Cruz', perspective: 'self', actorName: 'Lebron James', reason: 'Wrong ratings' });
    expect(rows[4]).toMatchObject({ employeeName: null, perspective: null, before: { state: 'draft' }, after: { state: 'active', assignmentCount: 3 } });
  });

  it('names no peer who acted, on their own review or on the stage that it opened (Res-008)', async () => {
    const rows = await service.list('admin', CYCLE);

    expect(rows.filter((row) => ['submitted', 'stage_unlocked'].includes(row.action) && row.area === 'review').map((row) => row.actorName)).toEqual([
      'Anonymous peer',
      'Anonymous peer',
    ]);
    expect(JSON.stringify(rows)).not.toContain('Buddy');
  });

  it('names the person who opened a peer stage as another evaluator, even when that person is a peer too', async () => {
    const MANAGER_REVIEW = guid(304);
    const rows = await rowsOf(Assignment);
    rows.push({ assignmentId: MANAGER_REVIEW, cycleId: CYCLE, participantId: 'p-1', stageId: 's-mgr', evaluatorId: BUDDY });
    (await rowsOf(CycleStage)).push({ stageId: 's-mgr', cycleId: CYCLE, perspective: 'manager' });
    events.rows.push(event(8, 'assignment', PEER, 'stage_unlocked', BUDDY, { afterJson: { state: 'not_started', afterAssignmentId: MANAGER_REVIEW } }));

    expect((await service.list('admin', CYCLE))[0]).toMatchObject({ action: 'stage_unlocked', perspective: 'peer', actorName: 'Buddy Reyes' });
  });

  it('carries no answer, actual value, remark, or record id', async () => {
    const text = JSON.stringify(await service.list('admin', CYCLE));

    for (const hidden of ['secret words', 'private note', 'actuals', 'remarks', 'answers', 'afterAssignmentId']) {
      expect(text).not.toContain(hidden);
    }
  });

  it('shows an administrator the rows about themselves too (decision D1)', async () => {
    expect(await service.list('subject', CYCLE)).toEqual(await service.list('admin', CYCLE));
  });

  it('shows no progress of a review that is not submitted (decision D4)', async () => {
    events.rows.push(event(9, 'assignment', SELF, 'draft_saved', SUBJECT, { afterJson: { state: 'in_progress', answeredCount: 5 } }));

    expect((await service.list('admin', CYCLE))[0]?.after).toEqual({ state: 'in_progress' });
  });

  it('says System for a change with no actor', async () => {
    events.rows.push(event(7, 'cycle', CYCLE, 'activated', null));

    expect((await service.list('admin', CYCLE))[0]).toMatchObject({ action: 'activated', actorName: 'System' });
  });

  it('answers 404 outside the company and 403 to anyone but an administrator, and reads no event', async () => {
    await expect(service.list('outsider', CYCLE)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.list('employee', CYCLE)).rejects.toBeInstanceOf(ForbiddenException);
    expect(events.find).not.toHaveBeenCalled();
  });

  it('serves GET :id/history to administrators only', () => {
    expect(Reflect.getMetadata('path', CycleHistoryController.prototype.list)).toBe(':id/history');
    expect(Reflect.getMetadata('__guards__', CycleHistoryController)).toContain(AdminRoleGuard);
  });
});
