import 'reflect-metadata';
import { BadRequestException, RequestMethod } from '@nestjs/common';
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { ParseGuidPipe } from '../../../common/pipes/parse-guid.pipe.js';
import type { AccomplishmentsService } from '../services/accomplishments.service.js';
import { AccomplishmentsController } from './accomplishments.controller.js';

const request = { user: { userId: 'user-1' } };
const ID = '00000000-0000-0000-0000-000000000171';
const INDICATOR = '00000000-0000-0000-0000-000000000061';

describe('AccomplishmentsController', () => {
  const service = { list: vi.fn(), get: vi.fn(), saveActuals: vi.fn(), submit: vi.fn(), decide: vi.fn() };
  const controller = new AccomplishmentsController(service as unknown as AccomplishmentsService);

  beforeEach(() => Object.values(service).forEach((mock) => mock.mockReset().mockResolvedValue({ accomplishmentId: ID })));

  it('requires a valid token only: the service decides what each account sees', () => {
    expect(Reflect.getMetadata('__guards__', AccomplishmentsController)).toEqual([JwtAuthGuard]);
    expect(Reflect.getMetadata(PATH_METADATA, AccomplishmentsController)).toBe('accomplishments');
  });

  it.each([
    ['list', RequestMethod.GET, '/'],
    ['get', RequestMethod.GET, ':id'],
    ['saveActuals', RequestMethod.PUT, ':id/actuals'],
    ['submit', RequestMethod.POST, ':id/submission'],
    ['decide', RequestMethod.POST, ':id/decision'],
  ] as const)('serves %s with a noun path', (method, verb, path) => {
    const handler = AccomplishmentsController.prototype[method] as unknown as object;

    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(verb);
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
  });

  it.each(['get', 'saveActuals', 'submit', 'decide'] as const)('checks the id of %s', (method) => {
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, AccomplishmentsController, method) as Record<string, { data?: string; pipes: unknown[] }>;

    expect(Object.values(args).find((arg) => arg.data === 'id')?.pipes).toEqual([ParseGuidPipe]);
  });

  it.each(['submit', 'decide'] as const)('answers %s with 200: it creates no new resource', (method) => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, AccomplishmentsController.prototype[method])).toBe(200);
  });

  it('reads the list and one record for the signed-in user', async () => {
    await controller.list(request);
    await controller.get(ID, request);

    expect(service.list).toHaveBeenCalledWith('user-1');
    expect(service.get).toHaveBeenCalledWith('user-1', ID);
  });

  it.each(['saveActuals', 'submit'] as const)('passes the parsed report of %s', async (method) => {
    await controller[method](ID, { actuals: [{ indicatorId: INDICATOR, actualValue: 0 }] }, request);

    expect(service[method]).toHaveBeenCalledWith('user-1', ID, {
      actuals: [{ indicatorId: INDICATOR, actualValue: 0, remarks: '' }],
      remarks: '',
      correctionReason: '',
    });
  });

  it('passes the parsed decision', async () => {
    await controller.decide(ID, { outcome: 'returned', reason: ' Wrong count. ' }, request);

    expect(service.decide).toHaveBeenCalledWith('user-1', ID, { outcome: 'returned', reason: 'Wrong count.' });
  });

  it.each([
    ['saveActuals', { actuals: [{ indicatorId: INDICATOR, actualValue: -1 }] }, 'actuals.0.actualValue'],
    ['submit', {}, 'actuals'],
    ['decide', { outcome: 'returned' }, 'reason'],
  ] as const)('refuses a bad body of %s with 400 and the field, and calls nothing', async (method, body, field) => {
    const error = await controller[method](ID, body, request).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({ details: [{ field, code: 'INVALID_BODY' }] });
    expect(service[method]).not.toHaveBeenCalled();
  });
});
