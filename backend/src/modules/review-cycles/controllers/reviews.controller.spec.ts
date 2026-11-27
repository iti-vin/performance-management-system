import 'reflect-metadata';
import { BadRequestException, RequestMethod } from '@nestjs/common';
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ParseGuidPipe } from '../../../common/pipes/parse-guid.pipe.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import type { ReviewAssessmentService } from '../services/review-assessment.service.js';
import type { ReviewsService } from '../services/reviews.service.js';
import { ReviewsController } from './reviews.controller.js';

const request = { user: { userId: 'user-1' } };
const PAGE = { items: [], page: 1, pageSize: 10, totalItems: 0 };

describe('ReviewsController access and routes', () => {
  it('requires a valid token only: every role may ask, and the service decides what each one sees', () => {
    const guards: unknown[] = Reflect.getMetadata('__guards__', ReviewsController);

    expect(guards).toEqual([JwtAuthGuard]);
  });

  it('serves GET /reviews', () => {
    const handler = ReviewsController.prototype.list as unknown as object;

    expect(Reflect.getMetadata(PATH_METADATA, ReviewsController)).toBe('reviews');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('/');
  });
});

describe('ReviewsController submission text', () => {
  it('refuses an answer with a NUL character with 400 and the field, and writes nothing', async () => {
    const assessments = { submit: vi.fn() };
    const controller = new ReviewsController({} as ReviewsService, assessments as unknown as ReviewAssessmentService);
    const body = { answers: [{ questionId: '00000000-0000-0000-0000-000000000131', writtenAnswer: 'a\u0000b' }] };

    const error = await controller.submit('00000000-0000-0000-0000-000000000301', body, request).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({ details: [{ field: 'answers.0.writtenAnswer' }] });
    expect(assessments.submit).not.toHaveBeenCalled();
  });
});

describe('ReviewsController list', () => {
  const service = { list: vi.fn().mockResolvedValue(PAGE) };
  const controller = new ReviewsController(service as unknown as ReviewsService, {} as ReviewAssessmentService);

  beforeEach(() => service.list.mockClear());

  it('asks for the signed-in user, with the parsed query and its defaults', async () => {
    const result = await controller.list({ page: '2', q: ' maria ' }, request);

    expect(service.list).toHaveBeenCalledWith('user-1', { q: 'maria', page: 2, pageSize: 10 });
    expect(result).toEqual(PAGE);
  });

  it.each([
    ['a page below 1', { page: '0' }, 'page'],
    ['a state outside the list', { state: 'done' }, 'state'],
    ['a repeated key', { state: ['locked', 'submitted'] }, 'state'],
    ['an unknown key', { evaluatorId: '00000000-0000-0000-0000-000000000022' }, 'query'],
  ])('refuses %s with 400 and the field, and reads nothing', async (_label, query, field) => {
    const error = await controller.list(query, request).then(
      () => null,
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      message: 'The request contains invalid fields.',
      details: [{ field, code: 'INVALID_QUERY' }],
    });
    expect(service.list).not.toHaveBeenCalled();
  });
});

describe('ReviewsController, one review', () => {
  const ID = '00000000-0000-0000-0000-000000000301';
  const QUESTION = '00000000-0000-0000-0000-000000000131';
  const assessments = { get: vi.fn(), saveDraft: vi.fn(), submit: vi.fn() };
  const controller = new ReviewsController({} as ReviewsService, assessments as unknown as ReviewAssessmentService);
  const filled = { questionId: QUESTION, score: 4, writtenAnswer: null, optionId: null, isNotObserved: false };

  beforeEach(() => Object.values(assessments).forEach((mock) => mock.mockReset().mockResolvedValue({ assignmentId: ID })));

  it.each([
    ['get', RequestMethod.GET, ':id'],
    ['saveDraft', RequestMethod.PUT, ':id/response'],
    ['submit', RequestMethod.POST, ':id/submission'],
  ] as const)('serves %s with a noun path, and checks the id', (method, verb, path) => {
    const handler = ReviewsController.prototype[method] as unknown as object;
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, ReviewsController, method) as Record<string, { data?: string; pipes: unknown[] }>;

    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(verb);
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
    expect(Object.values(args).find((arg) => arg.data === 'id')?.pipes).toEqual([ParseGuidPipe]);
  });

  it('answers a submission with 200: it creates no new resource', () => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, ReviewsController.prototype.submit)).toBe(200);
  });

  it('reads one review for the signed-in user', async () => {
    await controller.get(ID, request);

    expect(assessments.get).toHaveBeenCalledWith('user-1', ID);
  });

  it.each(['saveDraft', 'submit'] as const)('passes the written feedback of %s', async (method) => {
    await controller[method]('00000000-0000-0000-0000-000000000301', { answers: [], writtenFeedback: ' Good. ' }, request);

    expect(assessments[method]).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), [], 'Good.');
  });

  it.each(['saveDraft', 'submit'] as const)('passes the parsed answers of %s', async (method) => {
    await controller[method](ID, { answers: [{ questionId: QUESTION, score: 4 }] }, request);

    expect(assessments[method]).toHaveBeenCalledWith('user-1', ID, [filled], '');
  });

  it.each(['saveDraft', 'submit'] as const)('refuses a bad body of %s with 400 and the field, and calls nothing', async (method) => {
    for (const [body, field] of [
      [{}, 'answers'],
      [{ answers: [{ questionId: QUESTION, score: 9 }] }, 'answers.0.score'],
      [{ answers: [{ questionId: 'x' }] }, 'answers.0.questionId'],
    ] as const) {
      const error = await controller[method](ID, body, request).catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({ details: [{ field, code: 'INVALID_BODY' }] });
    }
    expect(assessments[method]).not.toHaveBeenCalled();
  });
});
