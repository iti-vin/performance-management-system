import 'reflect-metadata';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { AdminRoleGuard } from '../../employees/guards/admin-role.guard.js';
import type { CreateReviewCycleDto } from '../dtos/create-review-cycle.dto.js';
import type { ReviewAssessmentService } from '../services/review-assessment.service.js';
import type { CycleActivationService } from '../services/cycle-activation.service.js';
import type { ResultsService } from '../services/results.service.js';
import type { ReviewCyclesService } from '../services/review-cycles.service.js';
import { ReviewCyclesController } from './review-cycles.controller.js';

const CYCLE_ID = '00000000-0000-0000-0000-000000000141';
const request = { user: { userId: 'user-1' } };

function route(method: keyof ReviewCyclesController) {
  const handler = ReviewCyclesController.prototype[method] as unknown as object;
  return {
    verb: Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod,
    path: Reflect.getMetadata(PATH_METADATA, handler) as string,
  };
}

describe('ReviewCyclesController access and routes', () => {
  it('requires a valid token, then the HR admin role, on every route', () => {
    const guards: unknown[] = Reflect.getMetadata('__guards__', ReviewCyclesController);

    expect(guards).toEqual([JwtAuthGuard, AdminRoleGuard]);
  });

  it('serves plural kebab-case routes with no verb in the path', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ReviewCyclesController)).toBe('review-cycles');
    expect(route('list')).toEqual({ verb: RequestMethod.GET, path: '/' });
    expect(route('getById')).toEqual({ verb: RequestMethod.GET, path: ':id' });
    expect(route('options')).toEqual({ verb: RequestMethod.GET, path: 'options' });
    expect(route('readiness')).toEqual({ verb: RequestMethod.GET, path: ':id/readiness' });
    expect(route('getParticipants')).toEqual({ verb: RequestMethod.GET, path: ':id/participants' });
    expect(route('create')).toEqual({ verb: RequestMethod.POST, path: '/' });
    expect(route('update')).toEqual({ verb: RequestMethod.PUT, path: ':id' });
    expect(route('launch')).toEqual({ verb: RequestMethod.POST, path: ':id/launch' });
    expect(route('cancel')).toEqual({ verb: RequestMethod.POST, path: ':id/cancellation' });
    expect(route('finalize')).toEqual({ verb: RequestMethod.POST, path: ':id/finalization' });
    expect(route('release')).toEqual({ verb: RequestMethod.POST, path: ':id/release' });
    expect(route('results')).toEqual({ verb: RequestMethod.GET, path: ':id/results' });
    expect(route('schedule')).toEqual({ verb: RequestMethod.POST, path: ':id/schedule' });
    expect(route('unschedule')).toEqual({ verb: RequestMethod.DELETE, path: ':id/schedule' });
    expect(route('extend')).toEqual({ verb: RequestMethod.POST, path: ':id/extension' });
    expect(route('reopen')).toEqual({ verb: RequestMethod.POST, path: ':id/assignments/:assignmentId/reopening' });
  });
});

describe('ReviewCyclesController route order', () => {
  it('declares the options route before the :id route, so :id cannot catch it', () => {
    const methods = Object.getOwnPropertyNames(ReviewCyclesController.prototype);

    expect(methods.indexOf('options')).toBeLessThan(methods.indexOf('getById'));
  });
});

describe('ReviewCyclesController actor', () => {
  const service = { list: vi.fn(), options: vi.fn(), readiness: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), cancel: vi.fn(), extend: vi.fn(), launch: vi.fn(), getParticipants: vi.fn() };
  const assessments = { reopen: vi.fn() };
  const activation = { schedule: vi.fn(), unschedule: vi.fn() };
  const resultsService = { finalize: vi.fn(), release: vi.fn(), listOfCycle: vi.fn() };
  const controller = new ReviewCyclesController(
    service as unknown as ReviewCyclesService,
    assessments as unknown as ReviewAssessmentService,
    resultsService as unknown as ResultsService,
    activation as unknown as CycleActivationService,
  );
  const dto = { name: 'CY2027-Q1' } as CreateReviewCycleDto;

  it('lists for the signed-in user', async () => {
    await controller.list(request);

    expect(service.list).toHaveBeenCalledWith('user-1');
  });

  it('reads the options and the readiness for the signed-in user', async () => {
    await controller.options(request);
    await controller.readiness(CYCLE_ID, request);

    expect(service.options).toHaveBeenCalledWith('user-1');
    expect(service.readiness).toHaveBeenCalledWith('user-1', CYCLE_ID);
  });

  it('reads one cycle for the signed-in user', async () => {
    await controller.getById(CYCLE_ID, request);

    expect(service.getById).toHaveBeenCalledWith('user-1', CYCLE_ID);
  });

  it('reads the participants of one cycle for the signed-in user', async () => {
    await controller.getParticipants(CYCLE_ID, request);

    expect(service.getParticipants).toHaveBeenCalledWith('user-1', CYCLE_ID);
  });

  it('creates and updates for the signed-in user', async () => {
    await controller.create(dto, request);
    await controller.update(CYCLE_ID, dto, request);

    expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
    expect(service.update).toHaveBeenCalledWith('user-1', CYCLE_ID, dto);
  });

  it('launches for the signed-in user', async () => {
    await controller.launch(CYCLE_ID, request);

    expect(service.launch).toHaveBeenCalledWith('user-1', CYCLE_ID);
  });

  it('reopens one review of the cycle with the reason, for the signed-in user', async () => {
    const assignmentId = '00000000-0000-0000-0000-000000000301';

    await controller.reopen(CYCLE_ID, assignmentId, { reason: 'Wrong ratings' }, request);

    expect(assessments.reopen).toHaveBeenCalledWith('user-1', CYCLE_ID, assignmentId, 'Wrong ratings');
  });

  it('finalizes, releases, and reads the results of the cycle, for the signed-in user', async () => {
    await controller.finalize(CYCLE_ID, request);
    await controller.release(CYCLE_ID, { employeeVisible: false }, request);
    expect(resultsService.release).toHaveBeenCalledWith(request.user.userId, CYCLE_ID, { employeeVisible: false });
    await controller.results(CYCLE_ID, request);

    expect(resultsService.finalize).toHaveBeenCalledWith('user-1', CYCLE_ID);
    expect(resultsService.release).toHaveBeenCalledTimes(1);
    expect(resultsService.listOfCycle).toHaveBeenCalledWith('user-1', CYCLE_ID);
  });

  it('schedules and unschedules for the signed-in user, and answers the cycle', async () => {
    await controller.schedule(CYCLE_ID, request);
    await controller.unschedule(CYCLE_ID, request);

    expect(activation.schedule).toHaveBeenCalledWith('user-1', CYCLE_ID);
    expect(activation.unschedule).toHaveBeenCalledWith('user-1', CYCLE_ID);
    expect(service.getById).toHaveBeenCalledWith('user-1', CYCLE_ID);
  });

  it('extends with the body, for the signed-in user', async () => {
    const extension = { reason: 'Holiday week' };

    await controller.extend(CYCLE_ID, extension, request);

    expect(service.extend).toHaveBeenCalledWith('user-1', CYCLE_ID, extension);
  });

  it('cancels with the reason of the body, for the signed-in user', async () => {
    await controller.cancel(CYCLE_ID, { reason: 'Budget freeze' }, request);

    expect(service.cancel).toHaveBeenCalledWith('user-1', CYCLE_ID, 'Budget freeze');
  });
});
