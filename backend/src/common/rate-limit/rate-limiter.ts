export interface Bucket {
  /** The most requests of one key in one window. */
  limit: number;
  windowMs: number;
}

interface Window {
  count: number;
  endsAt: number;
}

/** Enough for every user and login name of a busy minute, and small enough to hold. */
const MAX_KEYS = 10_000;

/**
 * A fixed window for each key, in the memory of this process: two backend processes count on
 * their own, and a restart starts again. The number of keys has a limit, so requests with
 * made-up names cannot fill the memory.
 */
export class RateLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(private readonly maxKeys = MAX_KEYS) {}

  get size(): number {
    return this.windows.size;
  }

  /** Counts one request. Answers 0 when it is allowed, otherwise the seconds until the window ends. */
  take(key: string, { limit, windowMs }: Bucket, now: number): number {
    const found = this.windows.get(key);
    if (!found || found.endsAt <= now) {
      this.windows.delete(key);
      this.makeRoom(now);
      this.windows.set(key, { count: 1, endsAt: now + windowMs });
      return 0;
    }
    if (found.count >= limit) return Math.ceil((found.endsAt - now) / 1000);
    found.count += 1;
    return 0;
  }

  /** Drops the ended windows, then the oldest ones, until one more key fits. */
  private makeRoom(now: number): void {
    if (this.windows.size < this.maxKeys) return;
    for (const [key, window] of this.windows) {
      if (window.endsAt <= now) this.windows.delete(key);
    }
    for (const key of this.windows.keys()) {
      if (this.windows.size < this.maxKeys) return;
      this.windows.delete(key);
    }
  }
}
