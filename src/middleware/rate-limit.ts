import { Middleware } from './index.js';
import { Context } from '../context.js';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitOptions {
  rps: number;
  perClient?: boolean;
  store?: Map<string, TokenBucket>;
}

class RateLimiter {
  private buckets: Map<string, TokenBucket>;
  private rps: number;

  constructor(rps: number, store?: Map<string, TokenBucket>) {
    this.rps = rps;
    this.buckets = store ?? new Map();
  }

  getBucket(key: string): TokenBucket {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: this.rps, lastRefill: Date.now() };
      this.buckets.set(key, bucket);
    }

    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(this.rps, bucket.tokens + elapsed * this.rps);
    bucket.lastRefill = now;

    return bucket;
  }

  clear(): void {
    this.buckets.clear();
  }
}

export function createRateLimitMiddleware(options: RateLimitOptions): Middleware {
  const { rps, perClient = false, store } = options;
  const limiter = new RateLimiter(rps, store);

  return async (ctx: Context, next: () => Promise<void>) => {
    const key = perClient
      ? `rate:${ctx.get('x-client-id') || 'anonymous'}`
      : 'rate:global';

    const bucket = limiter.getBucket(key);

    if (bucket.tokens < 1) {
      throw new Error('Rate limit exceeded');
    }

    bucket.tokens -= 1;
    await next();
  };
}
