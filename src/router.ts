import * as grpc from '@grpc/grpc-js';

interface RouteMatch {
  service?: string;
  method?: string;
  headers?: Record<string, string>;
}

export interface Route {
  match: RouteMatch;
  target: string;
}

export interface MatchResult {
  target: string;
}

export class Router {
  private routes: Route[];

  constructor(routes: Route[]) {
    this.routes = routes;
  }

  match(
    serviceName: string,
    methodName: string,
    metadata: grpc.Metadata
  ): MatchResult | null {
    for (const route of this.routes) {
      if (this.matchesRoute(route, serviceName, methodName, metadata)) {
        return { target: route.target };
      }
    }
    return null;
  }

  private matchesRoute(
    route: Route,
    serviceName: string,
    methodName: string,
    metadata: grpc.Metadata
  ): boolean {
    const { match } = route;

    if (match.service) {
      if (match.service === '*') {
      } else if (match.service !== serviceName) {
        return false;
      }
    }

    if (match.method) {
      const fullPath = `${serviceName}/${methodName}`;
      if (match.method.endsWith('/*')) {
        const prefix = match.method.slice(0, -2);
        if (!fullPath.startsWith(prefix)) {
          return false;
        }
      } else if (match.method !== fullPath) {
        return false;
      }
    }

    if (match.headers) {
      for (const [key, expectedValue] of Object.entries(match.headers)) {
        const actualValues = metadata.get(key);
        if (actualValues.length === 0 || actualValues[0].toString() !== expectedValue) {
          return false;
        }
      }
    }

    return true;
  }
}
