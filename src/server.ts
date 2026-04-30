import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { Context } from './context.js';
import { Router } from './router.js';
import { Middleware, runMiddleware } from './middleware/index.js';
import { ClientPool } from './client.js';

export interface GatewayServerOptions {
  port: number;
  protoPaths: string[];
  router: Router;
  middlewares: Middleware[];
  clientPool: ClientPool;
}

export class GatewayServer {
  private server: grpc.Server;
  private options: GatewayServerOptions;

  constructor(options: GatewayServerOptions) {
    this.options = options;
    this.server = new grpc.Server();
  }

  async start(): Promise<void> {
    for (const protoPath of this.options.protoPaths) {
      const packageDefinition = protoLoader.loadSync(protoPath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const proto = grpc.loadPackageDefinition(packageDefinition) as any;
      this.registerServices(proto, protoPath);
    }

    const address = `0.0.0.0:${this.options.port}`;

    return new Promise((resolve, reject) => {
      this.server.bindAsync(
        address,
        grpc.ServerCredentials.createInsecure(),
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private registerServices(proto: any, protoPath: string): void {
    for (const [packageName, packageDef] of Object.entries(proto)) {
      if (typeof packageDef !== 'object' || packageDef === null) continue;

      for (const [serviceName, serviceDef] of Object.entries(packageDef as any)) {
        if (typeof serviceDef !== 'function') continue;

        const serviceProto = (serviceDef as any).service;
        if (!serviceProto?.service) continue;

        const handlers: any = {};

        for (const [methodName, methodDef] of Object.entries(serviceProto.service)) {
          if (typeof methodDef !== 'object' || methodDef === null) continue;

          const fullServiceName = `${packageName}.${serviceName}`;

          handlers[methodName] = async (
            call: grpc.ServerUnaryCall<any, any>,
            callback: grpc.sendUnaryData<any>
          ) => {
            try {
              const routeMatch = this.options.router.match(
                fullServiceName,
                methodName,
                call.metadata
              );

              if (!routeMatch) {
                callback({
                  code: grpc.status.NOT_FOUND,
                  message: `No route for ${fullServiceName}/${methodName}`,
                });
                return;
              }

              const ctx = new Context({
                serviceName: fullServiceName,
                methodName,
                metadata: call.metadata,
                request: call.request,
                backend: routeMatch.target,
              });

              await runMiddleware(ctx, this.options.middlewares, async () => {
                const client = this.options.clientPool.getClient(
                  fullServiceName,
                  routeMatch.target,
                  protoPath
                );

                const response = await new Promise((resolve, reject) => {
                  (client as any)[methodName](ctx.request, ctx.metadata, (err: any, response: any) => {
                    if (err) reject(err);
                    else resolve(response);
                  });
                });

                ctx.response = response;
              });

              callback(null, ctx.response);
            } catch (err: any) {
              const code = err.message.includes('Rate limit')
                ? grpc.status.RESOURCE_EXHAUSTED
                : err.message.includes('Auth') || err.message.includes('token')
                  ? grpc.status.UNAUTHENTICATED
                  : grpc.status.INTERNAL;

              callback({
                code,
                message: err.message,
              });
            }
          };
        }

        this.server.addService(serviceProto.service, handlers);
      }
    }
  }

  stop(): void {
    this.server.forceShutdown();
  }
}
