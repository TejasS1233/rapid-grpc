import path from 'path';
import { loadConfig, AppConfig } from './config.js';
import { Router } from './router.js';
import { ClientPool } from './client.js';
import { GatewayServer } from './server.js';
import { Middleware } from './middleware/index.js';
import { createRateLimitMiddleware } from './middleware/rate-limit.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { createTransformMiddleware } from './middleware/transform.js';

export class RapidGrpc {
  private config: AppConfig;
  private customMiddlewares: Middleware[] = [];
  private server?: GatewayServer;
  private clientPool: ClientPool;

  constructor(configPath: string) {
    this.config = loadConfig(configPath);
    this.clientPool = new ClientPool();
  }

  use(middleware: Middleware): void {
    this.customMiddlewares.push(middleware);
  }

  async start(protoPaths?: string[]): Promise<void> {
    const middlewares = [
      ...this.buildConfigMiddleware(),
      ...this.customMiddlewares,
    ];

    const router = new Router(this.config.routes);

    const protos = protoPaths || [path.join(process.cwd(), 'proto', '*.proto')];

    this.server = new GatewayServer({
      port: this.config.server.port,
      protoPaths: protos,
      router,
      middlewares,
      clientPool: this.clientPool,
    });

    await this.server.start();
    console.log(`rapid-grpc gateway listening on port ${this.config.server.port}`);
  }

  private buildConfigMiddleware(): Middleware[] {
    const middlewares: Middleware[] = [];

    for (const mwConfig of this.config.middleware) {
      if ('rateLimit' in mwConfig) {
        middlewares.push(createRateLimitMiddleware(mwConfig.rateLimit));
      } else if ('auth' in mwConfig) {
        middlewares.push(createAuthMiddleware(mwConfig.auth));
      } else if ('transform' in mwConfig) {
        middlewares.push(createTransformMiddleware(mwConfig.transform));
      }
    }

    return middlewares;
  }

  stop(): void {
    this.server?.stop();
    this.clientPool.close();
  }
}
