import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { randomUUID } from 'crypto';

const PROTO_PATH = path.join(__dirname, '..', '..', 'proto', 'orders.proto');

const orders: any[] = [];

export function startOrderService(port: number): Promise<grpc.Server> {
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

    server.addService(proto.orders.OrderService.service, {
      CreateOrder: (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) => {
        const order = {
          id: randomUUID(),
          user_id: call.request.user_id,
          items: call.request.items,
          status: 'created',
        };
        orders.push(order);
        callback(null, order);
      },

      GetOrder: (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) => {
        const order = orders.find(o => o.id === call.request.id);
        if (order) {
          callback(null, order);
        } else {
          callback({
            code: grpc.status.NOT_FOUND,
            message: `Order ${call.request.id} not found`,
          });
        }
      },
    });

    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (err) => {
        if (err) reject(err);
        else {
          console.log(`Order service running on port ${port}`);
          resolve(server);
        }
      }
    );
  });
}
