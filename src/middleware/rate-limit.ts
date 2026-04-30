import { Middleware } from './index.js';
import { Context } from '../context.js';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitOptions {
  rps: number;
  perClient?: boolean;
}

const buckets = new Map<string, TokenBucket>();

export function clearRateLimitBuckets(): void {
  buckets.clear();
}

function getBucket(key: string, rps: number): TokenBucket {
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: rps, lastRefill: Date.now() };
    buckets.set(key, bucket);
  }

  const now = Date.now();
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(rps, bucket.tokens + elapsed * rps);
  bucket.lastRefill = now;

  return bucket;
}

export function createRateLimitMiddleware(options: RateLimitOptions): Middleware {
  const { rps, perClient = false } = options;

  return async (ctx: Context, next: () => Promise<void>) => {
    const key = perClient
      ? `rate:${ctx.get('x-client-id') || 'anonymous'}`
      : 'rate:global';

    const bucket = getBucket(key, rps);

    if (bucket.tokens < 1) {
      throw new Error('Rate limit exceeded');
    }

    bucket.tokens -= 1;
    await next();
  };
}
