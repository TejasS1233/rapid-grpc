# rapid-grpc

A composable gRPC API gateway for Node.js with plugin-based middleware.

## What Is This?

rapid-grpc sits between clients and backend gRPC services, handling cross-cutting concerns like authentication, rate limiting, and request transformation. Instead of each service implementing its own auth and rate limiting, the gateway handles it once in one place.

```
Client → [Gateway] → Auth → Rate Limit → Transform → Router → Backend Service
```

## Architecture

The gateway follows an **interceptor chain** pattern (also called middleware pipeline). When a request arrives:

1. **Router** matches the request to a backend based on service name, method, or headers
2. **Context** is created carrying all request state (metadata, payload, target backend)
3. **Middleware chain** executes in order — each middleware can inspect/modify the request before passing it along
4. **Backend client** forwards the request to the target service
5. **Response** flows back through the middleware chain (in reverse) to the client

This "onion model" means each middleware has two phases: before the handler (request) and after the handler (response).

## Engineering Decisions

### Token Bucket Rate Limiting

The rate limiter uses a **token bucket algorithm** instead of a simple fixed-window counter.

**How it works:** A bucket holds tokens (one per request). Tokens refill over time based on elapsed seconds. When a request arrives, it takes one token. If the bucket is empty, the request is rejected.

```
Bucket (10 rps):
  Start:  [●●●●●●●●●●]  10 tokens
  Req 1:  [●●●●●●●●●○]   9 tokens
  Req 2:  [●●●●●●●●○○]   8 tokens
  Wait 1s: [●●●●●●●●●●]  10 tokens (refilled)
```

**Why token bucket over fixed window:** A fixed window (10 requests per second, reset at :00) allows bursts at window boundaries — 10 requests at :59 and 10 more at :00 = 20 in 2 seconds. Token bucket smoothly refills over time, preventing this edge case. The implementation in `src/middleware/rate-limit.ts` tracks per-client buckets when `perClient: true` is set, using `x-client-id` metadata as the key.

### JWT + API Key Authentication

The auth middleware supports **two authentication methods** in a single middleware:

**JWT (JSON Web Token):** A signed token containing user claims. The server verifies the signature using a secret key — no database lookup needed. JWTs are stateless and self-contained.

**API Key:** A simple string passed in a header. The server checks if the key exists in an allow list. API keys are cheaper to verify (no crypto) and work well for server-to-server communication.

The middleware checks API keys first (`src/middleware/auth.ts:15-25`) because they're faster to validate. If no API key is present, it falls back to JWT verification. On success, it sets `x-user-id` and `x-auth-method` metadata so downstream middleware and backends know who made the request.

### Environment Variable Substitution in Config

Configuration files shouldn't contain secrets. The config loader (`src/config.ts`) supports `${VAR_NAME}` placeholders that are replaced with environment variables at runtime:

```yaml
auth:
  jwtSecret: "${JWT_SECRET}"    # replaced with process.env.JWT_SECRET at startup
```

This follows the **12-factor app methodology** — configuration lives in the environment, not in code. The same build runs in development, staging, and production without code changes. The substitution is recursive, working through nested objects and arrays in the YAML.

### Error Mapping to gRPC Status Codes

gRPC has a defined set of status codes (like HTTP status codes but for gRPC). The gateway maps middleware errors to appropriate codes so clients can handle them programmatically:

| Error | gRPC Code | Client Action |
|-------|-----------|---------------|
| Rate limit exceeded | `RESOURCE_EXHAUSTED` (8) | Retry after delay |
| Invalid/missing auth | `UNAUTHENTICATED` (16) | Re-authenticate |
| No route matched | `NOT_FOUND` (5) | Check service name |
| Unexpected error | `INTERNAL` (13) | Log and alert |

The mapping in `src/server.ts:116-120` inspects the error message to determine the appropriate code. This lets clients react differently to "you're rate limited" vs "your token expired" vs "something broke."

## Features

- **Rate Limiting** — Token bucket algorithm, per-client or global tracking
- **Authentication** — JWT validation + API key support, checked in order
- **Request/Response Transform** — Add/remove headers before/after handler
- **Flexible Routing** — Match by service name, method, or headers with wildcard support
- **Plugin System** — Custom middleware as simple async functions
- **Config + Code** — YAML for declarative setup, code for custom logic
- **Environment Variables** — `${VAR}` substitution in config for secrets

## Quick Start

```bash
# Install dependencies
npm install

# Start backend services (User Service on 50051, Order Service on 50052)
npm run demo:backends

# In another terminal, start the gateway (port 4000)
npm run demo:gateway

# In another terminal, run the demo client
npm run demo:client
```

The demo client runs 4 tests:
1. List users with JWT auth (succeeds)
2. Get specific user (succeeds)
3. Request without auth (rejected: UNAUTHENTICATED)
4. Request with API key (succeeds)

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
        remove:
          - x-internal-header

routes:
  - match:
      service: "users.UserService"
    target: "localhost:50051"
  - match:
      service: "*"
    target: "localhost:50052"
```

**Route matching** uses first-match-wins. Routes can match by:
- Exact service name (`users.UserService`)
- Wildcard service (`users.*` or `*` for all)
- Method name (`GetUser`, `*` for all)
- Header values (`x-env: production`)

## Custom Middleware

Middleware is an async function that receives a context and a `next` function. Call `next()` to pass control to the next middleware. Code before `next()` runs on the way in; code after runs on the way out.

```typescript
import { RapidGrpc } from './src/gateway.js';

const gateway = new RapidGrpc('./config.yaml');

// Timing middleware — logs how long each request takes
gateway.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  console.log(`${ctx.serviceName}/${ctx.methodName} took ${duration}ms`);
});

await gateway.start();
```

## Project Structure

```
src/
  context.ts          # Request state container (service, method, metadata, request, response)
  router.ts           # Route matching (service/method/header patterns)
  config.ts           # YAML loader with ${VAR} substitution
  client.ts           # gRPC client connection pool (caches by service:target)
  server.ts           # gRPC server — registers handlers, runs middleware chain
  gateway.ts          # Main entry point — ties config, router, middleware, server together
  middleware/
    index.ts          # Middleware type + chain runner (Koa-style onion model)
    rate-limit.ts     # Token bucket rate limiter (per-client or global)
    auth.ts           # JWT + API key authentication
    transform.ts      # Request/response header manipulation
examples/
  backends/           # Sample User and Order services for demo
  config.yaml         # Example gateway configuration
  gateway.ts          # Example gateway startup with custom middleware
  client.ts           # Example client that tests 4 scenarios
tests/                # 38 tests across 8 test files
```

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```
