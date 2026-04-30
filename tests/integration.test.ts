import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import jwt from 'jsonwebtoken';
import { startUserService } from '../examples/backends/user-service.js';
import { RapidGrpc } from '../src/gateway.js';

describe('Integration', () => {
  let backendServer: grpc.Server;
  let gateway: RapidGrpc;
  let userClient: any;
  const JWT_SECRET = 'test-secret';

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;

    backendServer = await startUserService(50051);

    const configPath = path.join(__dirname, 'fixtures', 'test-config.yaml');
    gateway = new RapidGrpc(configPath);
    await gateway.start([path.join(__dirname, '..', 'proto', 'users.proto')]);

    const protoPath = path.join(__dirname, '..', 'proto', 'users.proto');
    const packageDef = protoLoader.loadSync(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const proto = grpc.loadPackageDefinition(packageDef) as any;
    userClient = new proto.users.UserService(
      'localhost:4000',
      grpc.credentials.createInsecure()
    );
  });

  afterAll(() => {
    gateway?.stop();
    backendServer?.forceShutdown();
  });

  it('should route requests to backend', async () => {
    const token = jwt.sign({ sub: 'user-1' }, JWT_SECRET, { expiresIn: '1h' });
    const metadata = new grpc.Metadata();
    metadata.set('authorization', `Bearer ${token}`);

    const response = await new Promise<any>((resolve, reject) => {
      userClient.ListUsers({}, metadata, (err: any, resp: any) => {
        if (err) reject(err);
        else resolve(resp);
      });
    });

    expect(response.users).toHaveLength(3);
  });

  it('should reject unauthenticated requests', async () => {
    await expect(
      new Promise((resolve, reject) => {
        userClient.ListUsers({}, new grpc.Metadata(), (err: any, resp: any) => {
          if (err) reject(err);
          else resolve(resp);
        });
      })
    ).rejects.toThrow();
  });
});
