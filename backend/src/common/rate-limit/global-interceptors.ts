import type { NestInterceptor } from '@nestjs/common';
import { RateLimitInterceptor } from './rate-limit.interceptor.js';

/** What `main.ts` runs around every route, so a test can run the same. */
export function globalInterceptors(): NestInterceptor[] {
  return [new RateLimitInterceptor()];
}
