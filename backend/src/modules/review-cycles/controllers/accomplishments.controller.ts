import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  accomplishmentDecisionRequestSchema,
  reportIndicatorActualsRequestSchema,
  type AccomplishmentDetailDto,
  type AccomplishmentListRowDto,
} from '@pms/shared-types';
import { ApiErrorResponseDto } from '../../../common/dtos/api-response.dto.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { ParseGuidPipe } from '../../../common/pipes/parse-guid.pipe.js';
import type { AuthedUser } from '../../employees/types/authed-user.types.js';
import { AccomplishmentsService } from '../services/accomplishments.service.js';
import { parsed } from './parsed-input.js';

/** The request after `JwtAuthGuard`: the JWT strategy sets `user`. */
interface AuthedRequest {
  user: AuthedUser;
}

/** Every signed-in role may ask. Who sees and changes each record is decided in the service. */
@ApiTags('Accomplishments')
@Controller('accomplishments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized', type: ApiErrorResponseDto })
export class AccomplishmentsController {
  constructor(private readonly service: AccomplishmentsService) {}

  @Get()
  @ApiOperation({ summary: 'list the KPI accomplishments that you may see' })
  @ApiOkResponse({ description: 'your records, those of your team, or those of the company' })
  async list(@Req() req: AuthedRequest): Promise<AccomplishmentListRowDto[]> {
    return this.service.list(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'get one accomplishment with its frozen indicators, values and history' })
  @ApiOkResponse({ description: 'the record that the caller may read' })
  @ApiNotFoundResponse({ description: 'no record that the caller may read', type: ApiErrorResponseDto })
  async get(@Param('id', ParseGuidPipe) id: string, @Req() req: AuthedRequest): Promise<AccomplishmentDetailDto> {
    return this.service.get(req.user.userId, id);
  }

  @Put(':id/actuals')
  @ApiOperation({ summary: 'save the actual results of your own record, which may be incomplete' })
  @ApiOkResponse({ description: 'the record with the saved values' })
  @ApiBadRequestResponse({ description: 'a bad body, or an indicator of another record', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'no record of yours', type: ApiErrorResponseDto })
  @ApiConflictResponse({ description: 'submitted, verified, cycle not active, or deadline passed', type: ApiErrorResponseDto })
  async saveActuals(
    @Param('id', ParseGuidPipe) id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: AuthedRequest,
  ): Promise<AccomplishmentDetailDto> {
    return this.service.saveActuals(req.user.userId, id, parsed(reportIndicatorActualsRequestSchema, body, 'body'));
  }

  @Post(':id/submission')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'submit your own record for verification, after the evaluation period' })
  @ApiOkResponse({ description: 'the submitted record' })
  @ApiBadRequestResponse({ description: 'a bad body, or an indicator of another record', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'no record of yours', type: ApiErrorResponseDto })
  @ApiConflictResponse({ description: 'submitted, verified, cycle not active, or deadline passed', type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'the period runs, or a value or correction reason is missing', type: ApiErrorResponseDto })
  async submit(
    @Param('id', ParseGuidPipe) id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: AuthedRequest,
  ): Promise<AccomplishmentDetailDto> {
    return this.service.submit(req.user.userId, id, parsed(reportIndicatorActualsRequestSchema, body, 'body'));
  }

  @Post(':id/decision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'verify a submitted record of your team, or return it with a reason' })
  @ApiOkResponse({ description: 'the decided record' })
  @ApiBadRequestResponse({ description: 'a bad body, or a return with no reason', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'no record that you may decide on', type: ApiErrorResponseDto })
  @ApiConflictResponse({ description: 'not submitted, cycle not active, or deadline passed', type: ApiErrorResponseDto })
  async decide(
    @Param('id', ParseGuidPipe) id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: AuthedRequest,
  ): Promise<AccomplishmentDetailDto> {
    return this.service.decide(req.user.userId, id, parsed(accomplishmentDecisionRequestSchema, body, 'body'));
  }
}
