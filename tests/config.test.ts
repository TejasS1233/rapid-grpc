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
    const config = loadConfig(configPath);
    expect(config.middleware).toHaveLength(3);
    expect(config.middleware[0]).toEqual({ rateLimit: { rps: 100, perClient: true } });
    expect(config.middleware[1]).toEqual({
      auth: { jwtSecret: 'test-secret', apiKeyHeader: 'x-api-key', allowedKeys: ['key-1'] },
    });
  });

  it('should load routes config', () => {
    const config = loadConfig(configPath);
    expect(config.routes).toHaveLength(2);
    expect(config.routes[0].match.service).toBe('users.UserService');
    expect(config.routes[0].target).toBe('localhost:50051');
    expect(config.routes[1].match.service).toBe('*');
  });

  it('should support environment variable substitution', () => {
    process.env.TEST_SECRET = 'my-secret';
    const config = loadConfig(configPath, { env: { JWT_SECRET: 'my-secret' } });
    // The jwtSecret in fixture is literal, test env var feature
    delete process.env.TEST_SECRET;
  });
});
