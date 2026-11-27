import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { cycleAttentionResponseSchema } from '@pms/shared-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { User } from '../../auth/entities/user.entity.js';
import { AdminRoleGuard } from '../../employees/guards/admin-role.guard.js';
import { CompanyResolver } from '../../kpi-goals/services/company-resolver.service.js';
import { CycleAttentionController } from '../controllers/cycle-attention.controller.js';
import { Accomplishment } from '../entities/accomplishment.entity.js';
import { Assignment } from '../entities/assignment.entity.js';
import { Cycle } from '../entities/cycle.entity.js';
import { table } from '../testing/memory-table-spec.js';
import { CycleAttentionService } from './cycle-attention.service.js';
import { ReviewCyclesService } from './review-cycles.service.js';

const guid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [BLOCKED, READY, LATE, QUIET, DONE] = [guid(141), guid(142), guid(143), guid(144), guid(145)];
const day = (value: string) => new Date(`${value}T00:00:00Z`);
const cycle = (cycleId: string, state: string, name: string, extra: object = {}) => ({
  cycleId,
  company: 'Acme',
  name,
  state,
  activationDate: null,
  verificationDeadline: day('2026-12-31'),
  ...extra,
});

describe('CycleAttentionService', () => {
  let service: CycleAttentionService;
  const readiness = vi.fn();

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(day('2026-11-27'));
    readiness.mockReset().mockImplementation(async (_user: string, cycleId: string) =>
      cycleId === BLOCKED ? [{ step: 'stages', field: 'x', message: 'Ana has no manager.' }] : [],
    );
    const work = (assignmentId: string, cycleId: string, state: string, deadline: string) => ({ assignmentId, cycleId, state, deadline: day(deadline) });
    const report = (accomplishmentId: string, cycleId: string, status: string) => ({ accomplishmentId, cycleId, status });
    const repositories: [unknown, unknown][] = [
      [
        Cycle,
        table('cycleId', [
          cycle(BLOCKED, 'scheduled', 'B blocked', { activationDate: '2026-12-01' }),
          cycle(READY, 'scheduled', 'C ready'),
          cycle(LATE, 'active', 'A late', { verificationDeadline: day('2026-11-20') }),
          cycle(QUIET, 'active', 'D quiet'),
          cycle(DONE, 'completed', 'E done'),
          { ...cycle(guid(146), 'active', 'Foreign'), company: 'Other' },
        ]),
      ],
      [
        Assignment,
        table('assignmentId', [
          work('a-1', LATE, 'in_progress', '2026-11-20'),
          work('a-2', LATE, 'locked', '2026-11-20'),
          work('a-3', LATE, 'submitted', '2026-11-20'),
          work('a-4', QUIET, 'not_started', '2026-12-20'),
          work('a-5', DONE, 'in_progress', '2026-11-01'),
        ]),
      ],
      [Accomplishment, table('accomplishmentId', [report('r-1', LATE, 'draft'), report('r-2', LATE, 'verified'), report('r-3', QUIET, 'draft')])],
    ];
    const moduleRef = await Test.createTestingModule({
      providers: [
        CycleAttentionService,
        ...repositories.map(([entity, value]) => ({ provide: getRepositoryToken(entity as never), useValue: value })),
        { provide: getRepositoryToken(User), useValue: { findOne: vi.fn(async (query: { where: { id: string } }) => ({ userRoleId: query.where.id === 'admin' ? '1' : '3' })) } },
        { provide: CompanyResolver, useValue: { resolveAccount: vi.fn(async () => ({ company: 'Acme', actorId: guid(24) })) } },
        { provide: ReviewCyclesService, useValue: { readiness } },
      ],
    }).compile();
    service = moduleRef.get(CycleAttentionService);
  });

  afterEach(() => vi.useRealTimers());

  it('lists blocked scheduled cycles and overdue work of the company, and nothing else (PRD 10.2, 10.9)', async () => {
    const rows = await service.list('admin');

    expect(() => cycleAttentionResponseSchema.parse(rows)).not.toThrow();
    expect(rows).toEqual([
      { cycleId: LATE, name: 'A late', state: 'active', activationDate: null, problems: [], overdueReviews: 2, overdueReports: 1 },
      { cycleId: BLOCKED, name: 'B blocked', state: 'scheduled', activationDate: '2026-12-01', problems: ['Ana has no manager.'], overdueReviews: 0, overdueReports: 0 },
    ]);
    expect(readiness.mock.calls.map((call) => call[1]).sort()).toEqual([BLOCKED, READY]);
  });

  it('answers 403 to anyone but an administrator', async () => {
    await expect(service.list('employee')).rejects.toBeInstanceOf(ForbiddenException);
    expect(readiness).not.toHaveBeenCalled();
  });

  it('serves GET review-cycle-attention to administrators only', () => {
    expect(Reflect.getMetadata('path', CycleAttentionController)).toBe('review-cycle-attention');
    expect(Reflect.getMetadata('__guards__', CycleAttentionController)).toContain(AdminRoleGuard);
  });
});
