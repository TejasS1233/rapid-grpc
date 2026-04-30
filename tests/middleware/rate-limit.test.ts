import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimitMiddleware, clearRateLimitBuckets } from '../../src/middleware/rate-limit.js';
import { Context } from '../../src/context.js';
import * as grpc from '@grpc/grpc-js';

function makeContext(clientId = 'client-1'): Context {
  const metadata = new grpc.Metadata();
  metadata.set('x-client-id', clientId);
  return new Context({
    serviceName: 'test.Service',
    methodName: 'Test',
    metadata,
    request: {},
    backend: 'localhost:50051',
  });
}

describe('Rate Limiter', () => {
  beforeEach(() => {
    clearRateLimitBuckets();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests under the limit', async () => {
    const rateLimit = createRateLimitMiddleware({ rps: 2 });
    const ctx = makeContext();
    let called = false;

    await rateLimit(ctx, async () => { called = true; });
    expect(called).toBe(true);
  });

  it('should block requests over the limit', async () => {
    const rateLimit = createRateLimitMiddleware({ rps: 1 });
    const ctx = makeContext();

    // First request should pass
    let called = false;
    await rateLimit(ctx, async () => { called = true; });
    expect(called).toBe(true);

    // Second request should be blocked
    await expect(
      rateLimit(makeContext(), async () => {})
    ).rejects.toThrow('Rate limit exceeded');
  });

  it('should refill tokens over time', async () => {
    const rateLimit = createRateLimitMiddleware({ rps: 1 });

    // Consume the token
    await rateLimit(makeContext(), async () => {});

    // Advance time by 1 second (refills 1 token)
    vi.advanceTimersByTime(1000);

    // Should pass now
    let called = false;
    await rateLimit(makeContext(), async () => { called = true; });
    expect(called).toBe(true);
  });

  it('should track per-client limits', async () => {
    const rateLimit = createRateLimitMiddleware({ rps: 1, perClient: true });

    // Client 1 uses their token
    await rateLimit(makeContext('client-1'), async () => {});

    // Client 2 should still have their token
    let called = false;
    await rateLimit(makeContext('client-2'), async () => { called = true; });
    expect(called).toBe(true);
  });

  it('should use global bucket when perClient is false', async () => {
    const rateLimit = createRateLimitMiddleware({ rps: 1, perClient: false });

    await rateLimit(makeContext('client-1'), async () => {});

    await expect(
      rateLimit(makeContext('client-2'), async () => {})
    ).rejects.toThrow('Rate limit exceeded');
  });
});
