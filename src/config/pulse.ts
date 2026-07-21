/** XP/streak/badge rules — boot-configurable so tuning gamification never needs a code change. */
export interface GamificationConfig {
  onTimeXp: number;
  lateXpDecayPerHour: number;
  streakBreaksOnLate: boolean;
  badgeStreakThresholds: number[];
}

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
  gamification: GamificationConfig;
}

function parseIntList(raw: string | undefined, fallback: number[]): number[] {
  if (!raw || raw.trim() === '') return fallback;
  const parsed = raw
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isInteger(v) && v > 0);
  return parsed.length > 0 ? parsed : fallback;
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
    gamification: {
      onTimeXp: Number(env.GAMIFICATION_ON_TIME_XP ?? 10),
      lateXpDecayPerHour: Number(env.GAMIFICATION_LATE_XP_DECAY_PER_HOUR ?? 1),
      streakBreaksOnLate: (env.GAMIFICATION_STREAK_BREAKS_ON_LATE ?? 'true') !== 'false',
      badgeStreakThresholds: parseIntList(env.GAMIFICATION_BADGE_STREAK_THRESHOLDS, [4, 8, 12]),
    },
  };
}
