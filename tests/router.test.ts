import { describe, it, expect } from 'vitest';
import { Router } from '../src/router.js';
import * as grpc from '@grpc/grpc-js';

describe('Router', () => {
  it('should match by service name', () => {
    const router = new Router([
      { match: { service: 'users.UserService' }, target: 'localhost:50051' },
    ]);

    const result = router.match('users.UserService', 'GetUser', new grpc.Metadata());
    expect(result).toEqual({ target: 'localhost:50051' });
  });

  it('should match by method with wildcard', () => {
    const router = new Router([
      { match: { method: 'orders.OrderService/*' }, target: 'localhost:50052' },
    ]);

    const result = router.match('orders.OrderService', 'CreateOrder', new grpc.Metadata());
    expect(result).toEqual({ target: 'localhost:50052' });
  });

  it('should match by headers', () => {
    const router = new Router([
      { match: { headers: { 'x-tenant': 'premium' } }, target: 'localhost:50053' },
    ]);

    const metadata = new grpc.Metadata();
    metadata.set('x-tenant', 'premium');

    const result = router.match('any.Service', 'AnyMethod', metadata);
    expect(result).toEqual({ target: 'localhost:50053' });
  });

  it('should return first matching route', () => {
    const router = new Router([
      { match: { service: 'users.UserService' }, target: 'localhost:50051' },
      { match: { service: '*' }, target: 'localhost:50099' },
    ]);

    const result = router.match('users.UserService', 'GetUser', new grpc.Metadata());
    expect(result).toEqual({ target: 'localhost:50051' });
  });

  it('should match wildcard service', () => {
    const router = new Router([
      { match: { service: '*' }, target: 'localhost:50099' },
    ]);

    const result = router.match('anything.Here', 'Method', new grpc.Metadata());
    expect(result).toEqual({ target: 'localhost:50099' });
  });

  it('should return null when no route matches', () => {
    const router = new Router([
      { match: { service: 'users.UserService' }, target: 'localhost:50051' },
    ]);

    const result = router.match('other.Service', 'Method', new grpc.Metadata());
    expect(result).toBeNull();
  });

  it('should match specific method', () => {
    const router = new Router([
      { match: { method: 'users.UserService/GetUser' }, target: 'localhost:50051' },
    ]);

    const result = router.match('users.UserService', 'GetUser', new grpc.Metadata());
    expect(result).toEqual({ target: 'localhost:50051' });

    const noMatch = router.match('users.UserService', 'ListUsers', new grpc.Metadata());
    expect(noMatch).toBeNull();
  });
});
