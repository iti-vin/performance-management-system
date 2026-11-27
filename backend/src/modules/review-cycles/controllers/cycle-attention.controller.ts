import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { AdminRoleGuard } from '../../employees/guards/admin-role.guard.js';
import { CycleAttentionService } from '../services/cycle-attention.service.js';

@ApiTags('review-cycles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('review-cycle-attention')
export class CycleAttentionController {
  constructor(private readonly service: CycleAttentionService) {}

  @Get()
  @ApiOperation({ summary: 'blocked scheduled cycles and overdue work' })
  @ApiOkResponse({ description: 'one row for each cycle that needs attention' })
  list(@Req() req: { user: { userId: string } }) {
    return this.service.list(req.user.userId);
  }
}
