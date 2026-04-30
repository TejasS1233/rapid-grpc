import { Middleware } from './index.js';
import { Context } from '../context.js';
import jwt from 'jsonwebtoken';

interface AuthOptions {
  jwtSecret: string;
  apiKeyHeader?: string;
  allowedKeys?: string[];
}

export function createAuthMiddleware(options: AuthOptions): Middleware {
  const { jwtSecret, apiKeyHeader, allowedKeys = [] } = options;

  return async (ctx: Context, next: () => Promise<void>) => {
    if (apiKeyHeader) {
      const apiKey = ctx.get(apiKeyHeader);
      if (apiKey) {
        if (!allowedKeys.includes(apiKey)) {
          throw new Error('Invalid API key');
        }
        ctx.set('x-auth-method', 'api-key');
        await next();
        return;
      }
    }

    const authHeader = ctx.get('authorization');
    if (!authHeader) {
      throw new Error('No authentication provided');
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
      ctx.set('x-user-id', payload.sub || '');
      ctx.set('x-auth-method', 'jwt');
    } catch {
      throw new Error('Invalid token');
    }

    await next();
  };
}
