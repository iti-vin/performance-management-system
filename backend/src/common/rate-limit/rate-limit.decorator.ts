import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_POLICY = 'rate-limit-policy';

/** A route whose limits differ from those of a plain read or change. */
export type RateLimitPolicy = 'login' | 'refresh' | 'session';

export const RateLimit = (policy: RateLimitPolicy) => SetMetadata(RATE_LIMIT_POLICY, policy);
