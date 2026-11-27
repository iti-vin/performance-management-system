import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseGuidPipe } from '../../../common/pipes/parse-guid.pipe.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { AdminRoleGuard } from '../../employees/guards/admin-role.guard.js';
import { CycleHistoryService } from '../services/cycle-history.service.js';

@ApiTags('review-cycles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('review-cycles')
export class CycleHistoryController {
  constructor(private readonly service: CycleHistoryService) {}

  @Get(':id/history')
  @ApiOperation({ summary: 'the audit history of a cycle, its reviews, and its reports' })
  @ApiOkResponse({ description: 'actor, action, time, reason, before and after, newest first' })
  list(@Param('id', ParseGuidPipe) cycleId: string, @Req() req: { user: { userId: string } }) {
    return this.service.list(req.user.userId, cycleId);
  }
}
