import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config.js';
import path from 'path';

describe('Config Loader', () => {
  const configPath = path.join(__dirname, 'fixtures', 'test-config.yaml');

  it('should load server config', () => {
    const config = loadConfig(configPath);
    expect(config.server.port).toBe(4000);
  });

  it('should load middleware config', () => {
    const config = loadConfig(configPath, { env: { JWT_SECRET: 'test-secret' } });
    expect(config.middleware).toHaveLength(3);
    expect(config.middleware[0]).toEqual({ rateLimit: { rps: 100, perClient: true } });
    expect(config.middleware[1]).toEqual({
      auth: { jwtSecret: 'test-secret', apiKeyHeader: 'x-api-key', allowedKeys: ['key-1'] },
    });
    expect(config.middleware[2]).toEqual({
      transform: { request: { add: { 'x-gateway': 'rapid-grpc' } } },
    });
  });

  it('should load routes config', () => {
    const config = loadConfig(configPath);
    expect(config.routes).toHaveLength(2);
    expect(config.routes[0].match.service).toBe('users.UserService');
    expect(config.routes[0].target).toBe('localhost:50051');
    expect(config.routes[1].match.service).toBe('*');
    expect(config.routes[1].target).toBe('localhost:50099');
  });

  it('should support environment variable substitution', () => {
    const config = loadConfig(configPath, { env: { JWT_SECRET: 'env-secret' } });
    expect(config.middleware[1]).toEqual({
      auth: { jwtSecret: 'env-secret', apiKeyHeader: 'x-api-key', allowedKeys: ['key-1'] },
    });
  });
});
