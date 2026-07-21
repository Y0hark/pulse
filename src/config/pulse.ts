export interface PulseConfig {
  port: number;
  databaseUrl: string;
  appBaseUrl: string;
  redisUrl?: string;
  allowedDomains?: string[];
  magicLinkTtlMinutes: number;
  sessionTtlMinutes: number;
  cookieName: string;
  isProduction: boolean;
}

function parseAllowedDomains(raw: string | undefined): string[] | undefined {
  if (!raw || raw.trim() === '') return undefined;
  return raw
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): PulseConfig {
  return {
    port: Number(env.PORT ?? 3000),
    databaseUrl: env.DATABASE_URL ?? 'postgres://localhost:5432/pulse',
    appBaseUrl: env.APP_BASE_URL ?? 'http://localhost:3000',
    redisUrl: env.REDIS_URL,
    allowedDomains: parseAllowedDomains(env.ALLOWED_DOMAINS),
    magicLinkTtlMinutes: Number(env.MAGIC_LINK_TTL_MINUTES ?? 15),
    sessionTtlMinutes: Number(env.SESSION_TTL_MINUTES ?? 60 * 24 * 7),
    cookieName: env.SESSION_COOKIE_NAME ?? 'pulse_session',
    isProduction: env.NODE_ENV === 'production',
  };
}
