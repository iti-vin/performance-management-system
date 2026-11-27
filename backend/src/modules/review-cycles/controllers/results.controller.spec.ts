import 'reflect-metadata';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import type { ResultsService } from '../services/results.service.js';
import { ResultsController } from './results.controller.js';

const PARTICIPANT = '00000000-0000-0000-0000-000000000151';
const request = { user: { userId: 'user-1' } };
const route = (method: keyof ResultsController) => {
  const handler = ResultsController.prototype[method] as unknown as object;
  return [Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod, Reflect.getMetadata(PATH_METADATA, handler) as string];
};

describe('ResultsController', () => {
  const service = { list: vi.fn(), get: vi.fn() };
  const controller = new ResultsController(service as unknown as ResultsService);

  // Every signed-in role may ask: the service decides what each one reads.
  it('requires a valid token on every route, and serves plural read routes', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ResultsController)).toEqual([JwtAuthGuard]);
    expect(Reflect.getMetadata(PATH_METADATA, ResultsController)).toBe('results');
    expect(route('list')).toEqual([RequestMethod.GET, '/']);
    expect(route('get')).toEqual([RequestMethod.GET, ':participantId']);
  });

  it('reads for the signed-in user', async () => {
    await controller.list(request);
    await controller.get(PARTICIPANT, request);

    expect(service.list).toHaveBeenCalledWith('user-1');
    expect(service.get).toHaveBeenCalledWith('user-1', PARTICIPANT);
  });
});
