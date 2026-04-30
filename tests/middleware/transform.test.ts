import { describe, it, expect } from 'vitest';
import { createTransformMiddleware } from '../../src/middleware/transform.js';
import { Context } from '../../src/context.js';
import * as grpc from '@grpc/grpc-js';

function makeContext(): Context {
  return new Context({
    serviceName: 'test.Service',
    methodName: 'Test',
    metadata: new grpc.Metadata(),
    request: {},
    backend: 'localhost:50051',
  });
}

describe('Transform Middleware', () => {
  it('should add request headers', async () => {
    const transform = createTransformMiddleware({
      request: {
        add: { 'x-gateway': 'rapid-grpc' },
      },
    });
    const ctx = makeContext();

    await transform(ctx, async () => {});
    expect(ctx.get('x-gateway')).toBe('rapid-grpc');
  });

  it('should remove request headers', async () => {
    const transform = createTransformMiddleware({
      request: {
        remove: ['x-internal'],
      },
    });
    const ctx = makeContext();
    ctx.set('x-internal', 'secret');
    ctx.set('x-public', 'visible');

    await transform(ctx, async () => {});
    expect(ctx.get('x-internal')).toBeUndefined();
    expect(ctx.get('x-public')).toBe('visible');
  });

  it('should add response headers after handler', async () => {
    const transform = createTransformMiddleware({
      response: {
        add: { 'x-served-by': 'gateway' },
      },
    });
    const ctx = makeContext();

    await transform(ctx, async () => {});
    expect(ctx.get('x-served-by')).toBe('gateway');
  });

  it('should handle both request and response transforms', async () => {
    const transform = createTransformMiddleware({
      request: {
        add: { 'x-req': 'added' },
      },
      response: {
        add: { 'x-resp': 'added' },
      },
    });
    const ctx = makeContext();

    await transform(ctx, async () => {});
    expect(ctx.get('x-req')).toBe('added');
    expect(ctx.get('x-resp')).toBe('added');
  });
});
