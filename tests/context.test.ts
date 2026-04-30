import { describe, it, expect } from 'vitest';
import { Context } from '../src/context.js';
import * as grpc from '@grpc/grpc-js';

describe('Context', () => {
  it('should create context with required fields', () => {
    const metadata = new grpc.Metadata();
    metadata.set('x-api-key', 'test-key');

    const ctx = new Context({
      serviceName: 'users.UserService',
      methodName: 'GetUser',
      metadata,
      request: { id: '123' },
      backend: 'localhost:50051',
    });

    expect(ctx.serviceName).toBe('users.UserService');
    expect(ctx.methodName).toBe('GetUser');
    expect(ctx.request).toEqual({ id: '123' });
    expect(ctx.backend).toBe('localhost:50051');
    expect(ctx.metadata.get('x-api-key')).toEqual(['test-key']);
  });

  it('should allow setting metadata', () => {
    const ctx = new Context({
      serviceName: 'test.Service',
      methodName: 'TestMethod',
      metadata: new grpc.Metadata(),
      request: {},
      backend: 'localhost:50051',
    });

    ctx.set('x-request-id', 'abc-123');
    expect(ctx.get('x-request-id')).toBe('abc-123');
  });

  it('should allow setting response', () => {
    const ctx = new Context({
      serviceName: 'test.Service',
      methodName: 'TestMethod',
      metadata: new grpc.Metadata(),
      request: {},
      backend: 'localhost:50051',
    });

    ctx.response = { id: '1', name: 'Test' };
    expect(ctx.response).toEqual({ id: '1', name: 'Test' });
  });

  it('should return undefined for missing metadata keys', () => {
    const ctx = new Context({
      serviceName: 'test.Service',
      methodName: 'TestMethod',
      metadata: new grpc.Metadata(),
      request: {},
      backend: 'localhost:50051',
    });

    expect(ctx.get('nonexistent')).toBeUndefined();
  });
});
