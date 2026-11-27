import { Controller, Get, HttpCode, Post, UseGuards, type CanActivate, type ExecutionContext, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { apiErrorResponseSchema } from '@pms/shared-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiExceptionFilter } from '../filters/api-exception.filter.js';
import { globalInterceptors } from './global-interceptors.js';
import { RateLimit } from './rate-limit.decorator.js';

/** Signs in whoever the header names, as the JWT guard sets `request.user`. */
class HeaderUserGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; user?: { userId: string } }>();
    request.user = { userId: request.headers['x-user'] as string };
    return true;
  }
}

@Controller('things')
@UseGuards(HeaderUserGuard)
class ThingsController {
  @Get()
  list() {
    return [];
  }

  @Post()
  @HttpCode(200)
  change() {
    return {};
  }

  @Get('me')
  @RateLimit('session')
  me() {
    return {};
  }
}

@Controller('auth')
class OpenController {
  @Post('login')
  @HttpCode(200)
  @RateLimit('login')
  login() {
    return {};
  }

  @Post('refresh-token')
  @HttpCode(200)
  @RateLimit('refresh')
  refresh() {
    return {};
  }
}

describe('the rate limit of every route', () => {
  let app: INestApplication;
  let base: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(0);
    const moduleRef = await Test.createTestingModule({ controllers: [ThingsController, OpenController] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.useGlobalInterceptors(...globalInterceptors());
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
  });

  afterEach(async () => {
    await app.close();
    vi.useRealTimers();
  });

  const send = (method: string, path: string, user?: string, body?: unknown) =>
    fetch(`${base}${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(user ? { 'x-user': user } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  /** The statuses of `times` requests, one after the other. */
  const statuses = async (times: number, request: (index: number) => Promise<Response>) => {
    const found: number[] = [];
    for (let index = 0; index < times; index += 1) found.push((await request(index)).status);
    return found;
  };
  const count = (found: number[], status: number) => found.filter((entry) => entry === status).length;

  it('answers 429 in the error envelope, with the seconds to wait, from the 61st change of a user', async () => {
    const allowed = await statuses(60, () => send('POST', '/things', 'ana'));
    const refused = await send('POST', '/things', 'ana');

    expect(count(allowed, 200)).toBe(60);
    expect(refused.status).toBe(429);
    expect(refused.headers.get('retry-after')).toBe('60');
    const body: unknown = await refused.json();
    expect(apiErrorResponseSchema.parse(body).error).toMatchObject({
      code: '(429) RATE_LIMITED',
      message: 'Too many requests. Try again in 60 seconds.',
    });
    // Another user, and the reads of the same user, are counted on their own.
    expect((await send('POST', '/things', 'ben')).status).toBe(200);
    expect((await send('GET', '/things', 'ana')).status).toBe(200);
  });

  it('allows the changes again after a minute', async () => {
    await statuses(61, () => send('POST', '/things', 'ana'));
    vi.setSystemTime(60_000);

    expect((await send('POST', '/things', 'ana')).status).toBe(200);
  });

  it('allows 300 reads of a user in a minute, and four times as many of the session read that every page makes', async () => {
    expect(count(await statuses(301, () => send('GET', '/things', 'ana')), 429)).toBe(1);
    expect(count(await statuses(1200, () => send('GET', '/things/me', 'ana')), 429)).toBe(0);
    expect((await send('GET', '/things/me', 'ana')).status).toBe(429);
  }, 30_000);

  it('allows 10 logins of one name in a minute, in any letter case, and leaves other names alone', async () => {
    const tries = await statuses(11, (index) => send('POST', '/auth/login', undefined, { identifier: index % 2 ? ' ANA ' : 'ana' }));

    expect(count(tries, 429)).toBe(1);
    expect((await send('POST', '/auth/login', undefined, { identifier: 'ben' })).status).toBe(200);
  });

  it('caps the logins of one address too, for guesses across many names or with no name', async () => {
    const tries = await statuses(301, (index) => send('POST', '/auth/login', undefined, index % 2 ? { identifier: `n${index}` } : {}));

    expect(count(tries, 429)).toBe(1);
  }, 30_000);

  it('does not let the refused logins of one name use up the cap of the address', async () => {
    await statuses(320, () => send('POST', '/auth/login', undefined, { identifier: 'ana' }));

    expect((await send('POST', '/auth/login', undefined, { identifier: 'ben' })).status).toBe(200);
  }, 30_000);

  it('caps the refresh of tokens by address', async () => {
    expect(count(await statuses(601, () => send('POST', '/auth/refresh-token', undefined, {})), 429)).toBe(1);
  }, 30_000);
});
