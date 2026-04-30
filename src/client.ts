import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

export class ClientPool {
  private clients = new Map<string, grpc.Client>();
  private protoCache = new Map<string, any>();

  getClient(serviceName: string, target: string, protoPath: string): grpc.Client {
    const key = `${serviceName}:${target}`;

    if (!this.clients.has(key)) {
      const packageDefinition = protoLoader.loadSync(protoPath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const proto = grpc.loadPackageDefinition(packageDefinition);

      const parts = serviceName.split('.');
      let serviceConstructor: any = proto;
      for (const part of parts) {
        serviceConstructor = serviceConstructor?.[part];
      }

      if (!serviceConstructor) {
        throw new Error(`Service ${serviceName} not found in ${protoPath}`);
      }

      const client = new serviceConstructor(
        target,
        grpc.credentials.createInsecure()
      );

      this.clients.set(key, client);
    }

    return this.clients.get(key)!;
  }

  close(): void {
    for (const client of this.clients.values()) {
      client.close();
    }
    this.clients.clear();
  }
}
