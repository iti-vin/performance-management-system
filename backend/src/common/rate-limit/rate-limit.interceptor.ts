import { HttpException, HttpStatus, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { RATE_LIMIT_POLICY, type RateLimitPolicy } from './rate-limit.decorator.js';
import { RateLimiter, type Bucket } from './rate-limiter.js';

const MINUTE = 60_000;
const perMinute = (limit: number): Bucket => ({ limit, windowMs: MINUTE });

/**
 * The limits of one minute. The web server sends every request of every user from its own
 * address, so a signed-in request counts for its user. Only a request without a user counts
 * for its address, with a cap that the whole company shares.
 */
const LIMITS = {
  read: perMinute(300),
  change: perMinute(60),
  /** The read of the signed-in user, which every page makes. */
  session: perMinute(1200),
  /** One login name. The account also locks after repeated wrong passwords. */
  loginName: perMinute(10),
  /** Every login of one address: it bounds the password checks, whatever names are tried. */
  loginAddress: perMinute(300),
  anonymous: perMinute(600),
} as const;

type LimitedRequest = Request & { user?: { userId?: string } };

/** The keys that a request counts against, the narrowest first: a refused one uses up nothing wider. */
function countersOf(request: LimitedRequest, policy: RateLimitPolicy | undefined): [string, Bucket][] {
  const address = request.socket.remoteAddress ?? 'unknown';
  if (policy === 'login') {
    const { identifier } = (request.body ?? {}) as { identifier?: unknown };
    const name = typeof identifier === 'string' ? identifier.trim().toLowerCase().slice(0, 254) : '';
    const own: [string, Bucket][] = name ? [[`login-name:${name}`, LIMITS.loginName]] : [];
    return [...own, [`login:${address}`, LIMITS.loginAddress]];
  }
  const userId = request.user?.userId;
  if (!userId) return [[`${policy ?? 'anonymous'}:${address}`, LIMITS.anonymous]];
  const kind = policy === 'session' ? 'session' : request.method === 'GET' || request.method === 'HEAD' ? 'read' : 'change';
  return [[`${kind}:${userId}`, LIMITS[kind]]];
}

/**
 * Refuses a request over its limit with 429 and `Retry-After`. It is an interceptor, so it
 * runs after the guards, which name the user, and before the pipes and the handler.
 */
export class RateLimitInterceptor implements NestInterceptor {
  private readonly limiter = new RateLimiter();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const policy = Reflect.getMetadata(RATE_LIMIT_POLICY, context.getHandler()) as RateLimitPolicy | undefined;
    const now = Date.now();
    for (const [key, bucket] of countersOf(http.getRequest<LimitedRequest>(), policy)) {
      const seconds = this.limiter.take(key, bucket, now);
      if (seconds > 0) {
        http.getResponse<Response>().setHeader('Retry-After', String(seconds));
        throw new HttpException(`Too many requests. Try again in ${seconds} seconds.`, HttpStatus.TOO_MANY_REQUESTS);
      }
    }
    return next.handle();
  }
}
