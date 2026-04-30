import { describe, it, expect } from 'vitest';
import { runMiddleware, Middleware } from '../../src/middleware/index.js';
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

describe('runMiddleware', () => {
  it('should run a single middleware', async () => {
    const order: number[] = [];
    const mw: Middleware = async (ctx, next) => {
      order.push(1);
      await next();
    };

    await runMiddleware(makeContext(), [mw], async () => { order.push(2); });
    expect(order).toEqual([1, 2]);
  });

  it('should run middleware in order', async () => {
    const order: number[] = [];
    const mw1: Middleware = async (ctx, next) => { order.push(1); await next(); };
    const mw2: Middleware = async (ctx, next) => { order.push(2); await next(); };
    const mw3: Middleware = async (ctx, next) => { order.push(3); await next(); };

    await runMiddleware(makeContext(), [mw1, mw2, mw3], async () => { order.push(4); });
    expect(order).toEqual([1, 2, 3, 4]);
  });

  it('should allow short-circuiting the chain', async () => {
    const order: number[] = [];
    const mw1: Middleware = async (ctx, next) => { order.push(1); /* no next() */ };
    const mw2: Middleware = async (ctx, next) => { order.push(2); await next(); };

    await runMiddleware(makeContext(), [mw1, mw2], async () => { order.push(3); });
    expect(order).toEqual([1]);
  });

  it('should run response code after handler', async () => {
    const order: number[] = [];
    const mw: Middleware = async (ctx, next) => {
      order.push(1);
      await next();
      order.push(3);
    };

    await runMiddleware(makeContext(), [mw], async () => { order.push(2); });
    expect(order).toEqual([1, 2, 3]);
  });

  it('should propagate errors from middleware', async () => {
    const mw: Middleware = async (ctx, next) => {
      throw new Error('Auth failed');
    };

    await expect(
      runMiddleware(makeContext(), [mw], async () => {})
    ).rejects.toThrow('Auth failed');
  });

  it('should propagate errors from handler', async () => {
    const mw: Middleware = async (ctx, next) => {
      await next();
    };

    await expect(
      runMiddleware(makeContext(), [mw], async () => { throw new Error('Backend down'); })
    ).rejects.toThrow('Backend down');
  });
});
