import type { FetchConfig } from './fetch/secureFetch';

/** Configuration serveur lue depuis les variables d'environnement (voir .env.example). */
export interface ServerConfig {
  port: number;
  host: string;
  enableLiveFetch: boolean;
  serveStatic: boolean;
  trustProxy: boolean | number;
  rateLimit: { max: number; windowMs: number };
  maxConcurrentFetches: number;
  fetch: FetchConfig;
}

type Env = Record<string, string | undefined>;

function int(env: Env, key: string, def: number, min: number, max: number): number {
  const raw = env[key];
  if (raw === undefined || raw.trim() === '') return def;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max)
    throw new Error(`Variable ${key} invalide : "${raw}" (entier attendu entre ${min} et ${max}).`);
  return n;
}

function bool(env: Env, key: string, def: boolean): boolean {
  const raw = env[key]?.trim().toLowerCase();
  if (!raw) return def;
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
  if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  throw new Error(`Variable ${key} invalide : "${env[key]}" (true/false attendu).`);
}

export function loadConfig(env: Env = process.env): ServerConfig {
  const ports = (env.ALLOWED_PORTS ?? '80,443')
    .split(',')
    .map((p) => Number(p.trim()))
    .filter((p) => Number.isInteger(p) && p > 0 && p < 65536);
  if (ports.length === 0) throw new Error('ALLOWED_PORTS ne contient aucun port valide.');

  const trustRaw = env.TRUST_PROXY?.trim().toLowerCase();
  const trustProxy = !trustRaw || trustRaw === 'false' ? false : /^\d+$/.test(trustRaw) ? Number(trustRaw) : trustRaw === 'true';

  return {
    port: int(env, 'PORT', 8787, 1, 65535),
    host: env.HOST?.trim() || '0.0.0.0',
    enableLiveFetch: bool(env, 'ENABLE_LIVE_FETCH', true),
    serveStatic: bool(env, 'SERVE_STATIC', true),
    trustProxy,
    rateLimit: {
      max: int(env, 'RATE_LIMIT_MAX', 10, 1, 10_000),
      windowMs: int(env, 'RATE_LIMIT_WINDOW_MS', 60_000, 1_000, 86_400_000),
    },
    maxConcurrentFetches: int(env, 'MAX_CONCURRENT_FETCHES', 8, 1, 1000),
    fetch: {
      timeoutMs: int(env, 'FETCH_TIMEOUT_MS', 10_000, 1_000, 60_000),
      socketTimeoutMs: int(env, 'CONNECT_TIMEOUT_MS', 4_000, 500, 30_000),
      maxBytes: int(env, 'MAX_RESPONSE_BYTES', 3_000_000, 10_000, 20_000_000),
      maxRedirects: int(env, 'MAX_REDIRECTS', 5, 0, 10),
      userAgent:
        env.USER_AGENT?.trim() || 'SEOQuickBot/0.1 (+https://example.com/robot; audit SEO on-page a la demande)',
      allowedPorts: ports,
    },
  };
}
