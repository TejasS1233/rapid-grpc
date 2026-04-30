import path from 'path';
import { RapidGrpc } from '../src/gateway.js';

async function main() {
  const configPath = path.join(__dirname, 'config.yaml');
  const protoPaths = [
    path.join(__dirname, '..', 'proto', 'users.proto'),
    path.join(__dirname, '..', 'proto', 'orders.proto'),
  ];

  const gateway = new RapidGrpc(configPath);

  // Add custom middleware example
  gateway.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    console.log(`${ctx.serviceName}/${ctx.methodName} completed in ${duration}ms`);
  });

  await gateway.start(protoPaths);
}

main().catch(console.error);
