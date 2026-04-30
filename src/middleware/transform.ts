import { Middleware } from './index.js';
import { Context } from '../context.js';

interface TransformRule {
  add?: Record<string, string>;
  remove?: string[];
}

interface TransformOptions {
  request?: TransformRule;
  response?: TransformRule;
}

function applyTransform(ctx: Context, rule: TransformRule): void {
  if (rule.add) {
    for (const [key, value] of Object.entries(rule.add)) {
      ctx.set(key, value);
    }
  }
  if (rule.remove) {
    for (const key of rule.remove) {
      ctx.metadata.remove(key);
    }
  }
}

export function createTransformMiddleware(options: TransformOptions): Middleware {
  return async (ctx: Context, next: () => Promise<void>) => {
    if (options.request) {
      applyTransform(ctx, options.request);
    }

    await next();

    if (options.response) {
      applyTransform(ctx, options.response);
    }
  };
}
