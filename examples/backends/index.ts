import { startUserService } from './user-service.js';
import { startOrderService } from './order-service.js';

async function main() {
  await startUserService(50051);
  await startOrderService(50052);

  console.log('All backend services started');
}

main().catch(console.error);
