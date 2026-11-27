import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  EVALUATION_STATUSES,
  EVALUATOR_TYPES,
  CYCLE_STATUSES,
  REVIEW_PAGE_SIZES,
  reviewListQuerySchema,
  submitBehavioralAssessmentRequestSchema,
  type ReviewDetailDto,
  type ReviewListResponseDto,
} from '@pms/shared-types';
import { ApiErrorResponseDto } from '../../../common/dtos/api-response.dto.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { ParseGuidPipe } from '../../../common/pipes/parse-guid.pipe.js';
import type { AuthedUser } from '../../employees/types/authed-user.types.js';
import { ReviewAssessmentService } from '../services/review-assessment.service.js';
import { ReviewsService } from '../services/reviews.service.js';
import { parsed } from './parsed-input.js';

/** The request after `JwtAuthGuard`: the JWT strategy sets `user`. */
interface AuthedRequest {
  user: AuthedUser;
}

/** Every signed-in role may ask. What each one sees is decided in the service, from the account. */
@ApiTags('Reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized', type: ApiErrorResponseDto })
export class ReviewsController {
  constructor(
    private readonly service: ReviewsService,
    private readonly assessments: ReviewAssessmentService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'list the review assignments that you may see, filtered and paged' })
  @ApiQuery({ name: 'cycleId', required: false })
  @ApiQuery({ name: 'cycleState', required: false, enum: CYCLE_STATUSES })
  @ApiQuery({ name: 'perspective', required: false, enum: EVALUATOR_TYPES })
  @ApiQuery({ name: 'state', required: false, enum: EVALUATION_STATUSES })
  @ApiQuery({ name: 'q', required: false, description: 'a name of the subject, the evaluator, or the cycle' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, enum: [...REVIEW_PAGE_SIZES] })
  @ApiOkResponse({ description: 'one page of assignments, with the total of the same set' })
  @ApiBadRequestResponse({ description: 'a bad or unknown query key', type: ApiErrorResponseDto })
  async list(@Query() query: Record<string, unknown>, @Req() req: AuthedRequest): Promise<ReviewListResponseDto> {
    return this.service.list(req.user.userId, parsed(reviewListQuerySchema, query, 'query'));
  }

  @Get(':id')
  @ApiOperation({ summary: 'get one review with its questions and the saved response' })
  @ApiOkResponse({ description: 'the review that the caller may read' })
  @ApiNotFoundResponse({ description: 'no review that the caller may read', type: ApiErrorResponseDto })
  async get(@Param('id', ParseGuidPipe) id: string, @Req() req: AuthedRequest): Promise<ReviewDetailDto> {
    return this.assessments.get(req.user.userId, id);
  }

  @Put(':id/response')
  @ApiOperation({ summary: 'save the draft answers of your own open review' })
  @ApiOkResponse({ description: 'the review with the saved draft' })
  @ApiBadRequestResponse({ description: 'a bad body, or an answer that does not fit its question', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'no review of yours', type: ApiErrorResponseDto })
  @ApiConflictResponse({ description: 'the review is locked or submitted, or the cycle is not active', type: ApiErrorResponseDto })
  async saveDraft(
    @Param('id', ParseGuidPipe) id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: AuthedRequest,
  ): Promise<ReviewDetailDto> {
    const { answers, writtenFeedback } = parsed(submitBehavioralAssessmentRequestSchema, body, 'body');
    return this.assessments.saveDraft(req.user.userId, id, answers, writtenFeedback);
  }

  @Post(':id/submission')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'submit your own open review: the response becomes read-only' })
  @ApiOkResponse({ description: 'the submitted review' })
  @ApiBadRequestResponse({ description: 'a bad body, or an answer that does not fit its question', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'no review of yours', type: ApiErrorResponseDto })
  @ApiConflictResponse({ description: 'the review is locked or submitted, or the cycle is not active', type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'required answers are missing, or the goals are not verified', type: ApiErrorResponseDto })
  async submit(
    @Param('id', ParseGuidPipe) id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: AuthedRequest,
  ): Promise<ReviewDetailDto> {
    const { answers, writtenFeedback } = parsed(submitBehavioralAssessmentRequestSchema, body, 'body');
    return this.assessments.submit(req.user.userId, id, answers, writtenFeedback);
  }
}
