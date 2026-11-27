import { describe, expect, it } from 'vitest';
import { RateLimiter } from './rate-limiter.js';

const BUCKET = { limit: 3, windowMs: 60_000 };

describe('RateLimiter', () => {
  const taken = (limiter: RateLimiter, key: string, times: number, now = 0) =>
    Array.from({ length: times }, () => limiter.take(key, BUCKET, now));

  it('allows the limit of a window, then says how many seconds are left', () => {
    const limiter = new RateLimiter();

    expect(taken(limiter, 'a', 3)).toEqual([0, 0, 0]);
    expect(limiter.take('a', BUCKET, 0)).toBe(60);
    expect(limiter.take('a', BUCKET, 45_500)).toBe(15);
  });

  it('starts again when the window ends, and a refused request does not extend it', () => {
    const limiter = new RateLimiter();
    taken(limiter, 'a', 10);

    // A whole new window: the limit again, and then a refusal.
    expect(taken(limiter, 'a', 4, 60_000)).toEqual([0, 0, 0, 60]);
  });

  it('counts each key on its own', () => {
    const limiter = new RateLimiter();
    taken(limiter, 'a', 4);

    expect(limiter.take('b', BUCKET, 0)).toBe(0);
  });

  it('drops ended windows first, then the oldest, so many keys cannot fill the memory', () => {
    const limiter = new RateLimiter(2);
    limiter.take('ended', { limit: 1, windowMs: 10 }, 0);
    taken(limiter, 'kept', 3, 100);

    limiter.take('new', BUCKET, 100);
    expect(limiter.size).toBe(2);
    expect(limiter.take('kept', BUCKET, 100)).toBeGreaterThan(0);

    limiter.take('newest', BUCKET, 100);
    expect(limiter.size).toBe(2);
    // The oldest key is gone, so it starts again.
    expect(limiter.take('kept', BUCKET, 100)).toBe(0);
  });
});
