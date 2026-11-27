import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { CycleAttentionDto } from '@pms/shared-types';
import { User } from '../../auth/entities/user.entity.js';
import { CompanyResolver } from '../../kpi-goals/services/company-resolver.service.js';
import { Accomplishment } from '../entities/accomplishment.entity.js';
import { Assignment } from '../entities/assignment.entity.js';
import { Cycle } from '../entities/cycle.entity.js';
import { ReviewCyclesService } from './review-cycles.service.js';
import { isOverdue } from './reviews.service.js';
import { viewerOf } from './viewer.js';

@Injectable()
export class CycleAttentionService {
  constructor(
    @InjectRepository(Cycle) private readonly cycles: Repository<Cycle>,
    @InjectRepository(Assignment) private readonly assignments: Repository<Assignment>,
    @InjectRepository(Accomplishment) private readonly accomplishments: Repository<Accomplishment>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly companies: CompanyResolver,
    private readonly reviewCycles: ReviewCyclesService,
  ) {}

  /** Blocked scheduled cycles and overdue work of the company, by cycle name. */
  async list(userId: string): Promise<CycleAttentionDto[]> {
    const { company, isAdmin } = await viewerOf(this.users, this.companies, userId);
    if (!isAdmin) throw new ForbiddenException('Only an HR administrator can read the attention list.');
    const cycles = await this.cycles.find({ where: { company, state: In(['scheduled', 'active']) } });
    if (cycles.length === 0) return [];

    const activeIds = cycles.filter((cycle) => cycle.state === 'active').map((cycle) => cycle.cycleId);
    const [assignments, reports] = activeIds.length
      ? await Promise.all([
          this.assignments.find({ where: { cycleId: In(activeIds) } }),
          this.accomplishments.find({ where: { cycleId: In(activeIds) } }),
        ])
      : [[], []];
    const now = new Date();

    const rows = await Promise.all(
      cycles.map(async (cycle) => {
        const state = cycle.state as CycleAttentionDto['state'];
        // One readiness read for each scheduled cycle: a company schedules few at a time.
        const problems = state === 'scheduled' ? (await this.reviewCycles.readiness(userId, cycle.cycleId)).map((issue) => issue.message) : [];
        const isPastVerification = cycle.verificationDeadline !== null && cycle.verificationDeadline < now;
        return {
          cycleId: cycle.cycleId,
          name: cycle.name,
          state,
          activationDate: cycle.activationDate,
          problems,
          overdueReviews: assignments.filter((row) => row.cycleId === cycle.cycleId && isOverdue(row, cycle, now)).length,
          overdueReports: isPastVerification
            ? reports.filter((row) => row.cycleId === cycle.cycleId && row.status !== 'verified').length
            : 0,
        };
      }),
    );
    return rows
      .filter((row) => row.problems.length + row.overdueReviews + row.overdueReports > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
