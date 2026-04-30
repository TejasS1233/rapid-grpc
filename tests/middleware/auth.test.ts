import { describe, it, expect } from 'vitest';
import { createAuthMiddleware } from '../../src/middleware/auth.js';
import { Context } from '../../src/context.js';
import * as grpc from '@grpc/grpc-js';
import jwt from 'jsonwebtoken';

function makeContext(headers: Record<string, string> = {}): Context {
  const metadata = new grpc.Metadata();
  for (const [key, value] of Object.entries(headers)) {
    metadata.set(key, value);
  }
  return new Context({
    serviceName: 'test.Service',
    methodName: 'Test',
    metadata,
    request: {},
    backend: 'localhost:50051',
  });
}

describe('Auth Middleware', () => {
  const secret = 'test-secret-key';

  it('should allow valid JWT token', async () => {
    const auth = createAuthMiddleware({ jwtSecret: secret });
    const token = jwt.sign({ sub: 'user-1' }, secret, { expiresIn: '1h' });
    const ctx = makeContext({ authorization: `Bearer ${token}` });

    let called = false;
    await auth(ctx, async () => { called = true; });
    expect(called).toBe(true);
  });

  it('should reject invalid JWT token', async () => {
    const auth = createAuthMiddleware({ jwtSecret: secret });
    const ctx = makeContext({ authorization: 'Bearer invalid-token' });

    await expect(
      auth(ctx, async () => {})
    ).rejects.toThrow('Invalid token');
  });

  it('should reject expired JWT token', async () => {
    const auth = createAuthMiddleware({ jwtSecret: secret });
    const token = jwt.sign({ sub: 'user-1' }, secret, { expiresIn: '-1s' });
    const ctx = makeContext({ authorization: `Bearer ${token}` });

    await expect(
      auth(ctx, async () => {})
    ).rejects.toThrow('Invalid token');
  });

  it('should allow valid API key', async () => {
    const auth = createAuthMiddleware({
      jwtSecret: secret,
      apiKeyHeader: 'x-api-key',
      allowedKeys: ['valid-key-123'],
    });
    const ctx = makeContext({ 'x-api-key': 'valid-key-123' });

    let called = false;
    await auth(ctx, async () => { called = true; });
    expect(called).toBe(true);
  });

  it('should reject invalid API key', async () => {
    const auth = createAuthMiddleware({
      jwtSecret: secret,
      apiKeyHeader: 'x-api-key',
      allowedKeys: ['valid-key-123'],
    });
    const ctx = makeContext({ 'x-api-key': 'wrong-key' });

    await expect(
      auth(ctx, async () => {})
    ).rejects.toThrow('Invalid API key');
  });

  it('should reject when no auth is provided', async () => {
    const auth = createAuthMiddleware({ jwtSecret: secret });
    const ctx = makeContext();

    await expect(
      auth(ctx, async () => {})
    ).rejects.toThrow('No authentication provided');
  });
});
