import * as grpc from '@grpc/grpc-js';

export interface ContextOptions {
  serviceName: string;
  methodName: string;
  metadata: grpc.Metadata;
  request: any;
  backend: string;
}

export class Context {
  public readonly serviceName: string;
  public readonly methodName: string;
  public readonly metadata: grpc.Metadata;
  public readonly request: any;
  public response?: any;
  public readonly backend: string;

  constructor(options: ContextOptions) {
    this.serviceName = options.serviceName;
    this.methodName = options.methodName;
    this.metadata = options.metadata;
    this.request = options.request;
    this.backend = options.backend;
  }

  get(key: string): string | undefined {
    const values = this.metadata.get(key);
    if (values.length === 0) return undefined;
    return values[0].toString();
  }

  set(key: string, value: string): void {
    this.metadata.set(key, value);
  }
}
