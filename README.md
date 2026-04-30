# rapid-grpc

A composable gRPC API gateway for Node.js with plugin-based middleware.

## Features

- **Rate Limiting** — Token bucket algorithm, per-client tracking
- **Authentication** — JWT validation + API key support
- **Request/Response Transform** — Add/remove headers, modify payloads
- **Flexible Routing** — Match by service, method, or headers
- **Plugin System** — Write custom middleware as simple functions
- **Config + Code** — YAML for common setup, code for custom logic

## Quick Start

```bash
# Install dependencies
npm install

# Start backend services
npm run demo:backends

# In another terminal, start the gateway
npm run demo:gateway

# In another terminal, run the demo client
npm run demo:client
```

## Architecture

```
Client ──▶ [Gateway Server] ──▶ [Auth] ──▶ [Rate Limit] ──▶ [Transform] ──▶ [Router] ──▶ Backend
```

## Configuration

```yaml
server:
  port: 4000

middleware:
  - rateLimit:
      rps: 100
      perClient: true
  - auth:
      jwtSecret: "${JWT_SECRET}"
      apiKeyHeader: "x-api-key"
      allowedKeys: ["key-1"]
  - transform:
      request:
        add:
          x-gateway: "rapid-grpc"

routes:
  - match:
      service: "users.UserService"
    target: "localhost:50051"
```

## Custom Middleware

```typescript
const gateway = new RapidGrpc('./config.yaml');

gateway.use(async (ctx, next) => {
  console.log(`→ ${ctx.serviceName}/${ctx.methodName}`);
  await next();
  console.log(`← ${ctx.serviceName}/${ctx.methodName}`);
});

await gateway.start();
```

## Testing

```bash
npm test
```

## License

MIT
