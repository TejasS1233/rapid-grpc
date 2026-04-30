import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.join(__dirname, '..', '..', 'proto', 'users.proto');

const users = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
  { id: '3', name: 'Charlie', email: 'charlie@example.com' },
];

export function startUserService(port: number): Promise<grpc.Server> {
  return new Promise((resolve, reject) => {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const proto = grpc.loadPackageDefinition(packageDefinition) as any;

    const server = new grpc.Server();

    server.addService(proto.users.UserService.service, {
      GetUser: (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) => {
        const user = users.find(u => u.id === call.request.id);
        if (user) {
          callback(null, user);
        } else {
          callback({
            code: grpc.status.NOT_FOUND,
            message: `User ${call.request.id} not found`,
          });
        }
      },

      ListUsers: (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) => {
        callback(null, { users });
      },
    });

    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (err) => {
        if (err) reject(err);
        else {
          console.log(`User service running on port ${port}`);
          resolve(server);
        }
      }
    );
  });
}
