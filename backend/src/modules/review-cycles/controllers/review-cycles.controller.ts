import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../../../common/dtos/api-response.dto.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { ParseGuidPipe } from '../../../common/pipes/parse-guid.pipe.js';
import { AdminRoleGuard } from '../../employees/guards/admin-role.guard.js';
import type { AuthedUser } from '../../employees/types/authed-user.types.js';
import { releaseResultsRequestSchema } from '@pms/shared-types';
import { parsed } from './parsed-input.js';
import { CancelReviewCycleDto } from '../dtos/cancel-review-cycle.dto.js';
import { CreateReviewCycleDto } from '../dtos/create-review-cycle.dto.js';
import { ReopenReviewDto } from '../dtos/reopen-review.dto.js';
import { ExtendReviewCycleDto } from '../dtos/extend-review-cycle.dto.js';
import { CycleActivationService } from '../services/cycle-activation.service.js';
import { ResultsService } from '../services/results.service.js';
import { ReviewAssessmentService } from '../services/review-assessment.service.js';
import { ReviewCyclesService } from '../services/review-cycles.service.js';

/** The request after `JwtAuthGuard`: the JWT strategy sets `user`. */
interface AuthedRequest {
  user: AuthedUser;
}

@ApiTags('Review Cycles')
@Controller('review-cycles')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Admin role required', type: ApiErrorResponseDto })
@ApiUnauthorizedResponse({ description: 'Unauthorized', type: ApiErrorResponseDto })
export class ReviewCyclesController {
  constructor(
    private readonly service: ReviewCyclesService,
    private readonly assessments: ReviewAssessmentService,
    private readonly resultsService: ResultsService,
    private readonly activation: CycleActivationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'list the review cycles of your company, with their counts' })
  @ApiOkResponse({ description: 'the review cycle register' })
  async list(@Req() req: AuthedRequest) {
    return this.service.list(req.user.userId);
  }

  // Declared before ':id': a route declared later would never match, because ':id' catches 'options' first.
  @Get('options')
  @ApiOperation({ summary: 'list what the cycle wizard offers: employees, published templates, HR evaluators' })
  @ApiOkResponse({ description: 'the options inside your company' })
  async options(@Req() req: AuthedRequest) {
    return this.service.options(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'get a review cycle with its stages' })
  @ApiOkResponse({ description: 'the cycle and its stages' })
  @ApiNotFoundResponse({ description: 'cycle not found in your company', type: ApiErrorResponseDto })
  async getById(@Param('id', ParseGuidPipe) cycleId: string, @Req() req: AuthedRequest) {
    return this.service.getById(req.user.userId, cycleId);
  }

  @Get(':id/readiness')
  @ApiOperation({ summary: 'check a cycle before launch: the problems, each with the wizard step that owns it' })
  @ApiOkResponse({ description: 'an empty list when the cycle is ready' })
  @ApiNotFoundResponse({ description: 'cycle not found in your company', type: ApiErrorResponseDto })
  async readiness(@Param('id', ParseGuidPipe) cycleId: string, @Req() req: AuthedRequest) {
    return this.service.readiness(req.user.userId, cycleId);
  }

  @Get(':id/participants')
  @ApiOperation({ summary: 'list the participants of a cycle with their assignments' })
  @ApiOkResponse({ description: 'the participants, by name' })
  @ApiNotFoundResponse({ description: 'no cycle of your company', type: ApiErrorResponseDto })
  async getParticipants(@Param('id', ParseGuidPipe) cycleId: string, @Req() req: AuthedRequest) {
    return this.service.getParticipants(req.user.userId, cycleId);
  }

  @Post()
  @ApiOperation({ summary: 'create a review cycle as a draft' })
  @ApiOkResponse({ description: 'the draft cycle with its stages' })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ApiErrorResponseDto })
  async create(@Body() dto: CreateReviewCycleDto, @Req() req: AuthedRequest) {
    return this.service.create(dto, req.user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'replace the details and the stages of a draft cycle' })
  @ApiOkResponse({ description: 'the updated cycle with its stages' })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ApiErrorResponseDto })
  @ApiConflictResponse({ description: 'the cycle is not a draft', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'cycle not found in your company', type: ApiErrorResponseDto })
  async update(
    @Param('id', ParseGuidPipe) cycleId: string,
    @Body() dto: CreateReviewCycleDto,
    @Req() req: AuthedRequest,
  ) {
    return this.service.update(req.user.userId, cycleId, dto);
  }

  @Post(':id/launch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'launch a draft cycle: freeze its templates and create the assignments' })
  @ApiOkResponse({ description: 'the active cycle with its stages and participants' })
  @ApiConflictResponse({ description: 'the cycle is not a draft', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'cycle not found in your company', type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'the cycle is not ready: each problem is a detail', type: ApiErrorResponseDto })
  async launch(@Param('id', ParseGuidPipe) cycleId: string, @Req() req: AuthedRequest) {
    return this.service.launch(req.user.userId, cycleId);
  }

  @Post(':id/extension')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'give an active cycle later deadlines, with a reason' })
  @ApiOkResponse({ description: 'the cycle with its new deadlines' })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ApiErrorResponseDto })
  @ApiConflictResponse({ description: 'the cycle is not active, or is finalized or released', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'cycle not found in your company', type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'a date moves earlier, breaks the order, or none changes', type: ApiErrorResponseDto })
  async extend(
    @Param('id', ParseGuidPipe) cycleId: string,
    @Body() dto: ExtendReviewCycleDto,
    @Req() req: AuthedRequest,
  ) {
    return this.service.extend(req.user.userId, cycleId, dto);
  }

  @Post(':id/assignments/:assignmentId/reopening')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'open a submitted review again, with the later reviews that it affects' })
  @ApiOkResponse({ description: 'the reopened review' })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ApiErrorResponseDto })
  @ApiConflictResponse({ description: 'the review is not submitted, or the cycle is not open', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'no review of this cycle in your company', type: ApiErrorResponseDto })
  async reopen(
    @Param('id', ParseGuidPipe) cycleId: string,
    @Param('assignmentId', ParseGuidPipe) assignmentId: string,
    @Body() dto: ReopenReviewDto,
    @Req() req: AuthedRequest,
  ) {
    return this.assessments.reopen(req.user.userId, cycleId, assignmentId, dto.reason);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'list the finalized results of a cycle' })
  @ApiOkResponse({ description: 'the results, by employee name; empty before finalization' })
  @ApiNotFoundResponse({ description: 'cycle not found in your company', type: ApiErrorResponseDto })
  async results(@Param('id', ParseGuidPipe) cycleId: string, @Req() req: AuthedRequest) {
    return this.resultsService.listOfCycle(req.user.userId, cycleId);
  }

  @Post(':id/finalization')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'finalize an active cycle: score every participant and lock the work' })
  @ApiOkResponse({ description: 'the results, not released yet' })
  @ApiConflictResponse({ description: 'the cycle is not active, or is already finalized', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'cycle not found in your company', type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'a review or a report is not complete: each one is a detail', type: ApiErrorResponseDto })
  async finalize(@Param('id', ParseGuidPipe) cycleId: string, @Req() req: AuthedRequest) {
    return this.resultsService.finalize(req.user.userId, cycleId);
  }

  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'release the results of a finalized cycle' })
  @ApiOkResponse({ description: 'the released results' })
  @ApiConflictResponse({ description: 'the cycle is not finalized, or is already released', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'cycle not found in your company', type: ApiErrorResponseDto })
  async release(@Param('id', ParseGuidPipe) cycleId: string, @Body() body: unknown, @Req() req: AuthedRequest) {
    return this.resultsService.release(req.user.userId, cycleId, parsed(releaseResultsRequestSchema, body ?? {}, 'body'));
  }

  @Post(':id/schedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'freeze a ready draft and activate it on the day the assessment starts' })
  @ApiOkResponse({ description: 'the scheduled cycle' })
  @ApiConflictResponse({ description: 'the cycle is not a draft', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'cycle not found in your company', type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'not ready, or the assessment starts today or earlier', type: ApiErrorResponseDto })
  async schedule(@Param('id', ParseGuidPipe) cycleId: string, @Req() req: AuthedRequest) {
    await this.activation.schedule(req.user.userId, cycleId);
    return this.service.getById(req.user.userId, cycleId);
  }

  @Delete(':id/schedule')
  @ApiOperation({ summary: 'return a scheduled cycle to draft' })
  @ApiOkResponse({ description: 'the draft cycle' })
  @ApiConflictResponse({ description: 'the cycle is not scheduled', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'cycle not found in your company', type: ApiErrorResponseDto })
  async unschedule(@Param('id', ParseGuidPipe) cycleId: string, @Req() req: AuthedRequest) {
    await this.activation.unschedule(req.user.userId, cycleId);
    return this.service.getById(req.user.userId, cycleId);
  }

  @Post(':id/cancellation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'cancel a draft, scheduled, or active cycle, with a reason' })
  @ApiOkResponse({ description: 'the cancelled cycle with its stages' })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ApiErrorResponseDto })
  @ApiConflictResponse({ description: 'the cycle is already finished or cancelled', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'cycle not found in your company', type: ApiErrorResponseDto })
  async cancel(
    @Param('id', ParseGuidPipe) cycleId: string,
    @Body() dto: CancelReviewCycleDto,
    @Req() req: AuthedRequest,
  ) {
    return this.service.cancel(req.user.userId, cycleId, dto.reason);
  }
}
