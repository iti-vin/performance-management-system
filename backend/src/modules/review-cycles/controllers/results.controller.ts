import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { ResultDetailDto, ResultRowDto } from '@pms/shared-types';
import { ApiErrorResponseDto } from '../../../common/dtos/api-response.dto.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import type { AuthedUser } from '../../employees/types/authed-user.types.js';
import { ResultsService } from '../services/results.service.js';
import { ParseGuidPipe } from '../../../common/pipes/parse-guid.pipe.js';

/** The request after `JwtAuthGuard`: the JWT strategy sets `user`. */
interface AuthedRequest {
  user: AuthedUser;
}

/** Every signed-in role may ask. What each one reads is decided in the service, from the account. */
@ApiTags('Results')
@Controller('results')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized', type: ApiErrorResponseDto })
export class ResultsController {
  constructor(private readonly service: ResultsService) {}

  @Get()
  @ApiOperation({ summary: 'list the results that you may read' })
  @ApiOkResponse({ description: 'your released results, those of your team, or those of your company' })
  async list(@Req() req: AuthedRequest): Promise<ResultRowDto[]> {
    return this.service.list(req.user.userId);
  }

  @Get(':participantId')
  @ApiOperation({ summary: 'get one result with its evidence' })
  @ApiOkResponse({ description: 'the result that the caller may read' })
  @ApiNotFoundResponse({ description: 'no result that the caller may read', type: ApiErrorResponseDto })
  async get(@Param('participantId', ParseGuidPipe) participantId: string, @Req() req: AuthedRequest): Promise<ResultDetailDto> {
    return this.service.get(req.user.userId, participantId);
  }
}
