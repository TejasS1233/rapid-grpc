import { Context } from '../context.js';

export type Middleware = (ctx: Context, next: () => Promise<void>) => Promise<void>;

export async function runMiddleware(
  ctx: Context,
  middlewares: Middleware[],
  handler: () => Promise<void>
): Promise<void> {
  let index = 0;

  async function next(): Promise<void> {
    if (index < middlewares.length) {
      const mw = middlewares[index++];
      await mw(ctx, next);
    } else {
      await handler();
    }
  }

  await next();
}
