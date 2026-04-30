import fs from 'fs';
import yaml from 'js-yaml';

interface ServerConfig {
  port: number;
}

interface RouteMatch {
  service?: string;
  method?: string;
  headers?: Record<string, string>;
}

interface RouteConfig {
  match: RouteMatch;
  target: string;
}

export interface AppConfig {
  server: ServerConfig;
  middleware: Record<string, any>[];
  routes: RouteConfig[];
}

interface LoadOptions {
  env?: Record<string, string>;
}

function substituteEnvVars(value: string, env: Record<string, string>): string {
  return value.replace(/\$\{(\w+)\}/g, (_, key) => env[key] || '');
}

function processValue(obj: any, env: Record<string, string>): any {
  if (typeof obj === 'string') {
    return substituteEnvVars(obj, env);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => processValue(item, env));
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = processValue(value, env);
    }
    return result;
  }
  return obj;
}

export function loadConfig(configPath: string, options: LoadOptions = {}): AppConfig {
  const content = fs.readFileSync(configPath, 'utf-8');
  const raw = yaml.load(content) as any;
  const env = options.env || process.env as Record<string, string>;

  return processValue(raw, env);
}
