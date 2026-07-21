import { DateTime } from 'luxon';
import type { Queryable } from '../db/pool.js';
import { getAutoFreezeTeams } from '../db/teams.js';
import {
  getPeriodSnapshot,
  getUnfrozenEndedPeriods,
  insertPeriodSnapshotIfAbsent,
  setTeamPeriodStatus,
} from '../db/reports.js';
import { getTeamDashboard } from './aggregation.js';
import type { PeriodSnapshot, TeamFreezeConfig } from '../dashboard/types.js';

/**
 * Freezes a team's period: computes the aggregate and persists it, then marks the period
 * frozen for that team. Idempotent and keyed by (team, period) — re-freezing (manual retry,
 * a concurrent request, or the scheduled job re-checking) always returns the first snapshot
 * ever written, never recomputes.
 */
export async function freezeTeamPeriod(db: Queryable, teamId: string, periodId: number): Promise<PeriodSnapshot> {
  const existing = await getPeriodSnapshot(db, teamId, periodId);
  if (existing) return existing;

  const aggregate = await getTeamDashboard(db, teamId, periodId);
  const snapshot = await insertPeriodSnapshotIfAbsent(db, teamId, periodId, aggregate);
  await setTeamPeriodStatus(db, teamId, periodId, 'frozen');
  return snapshot;
}

export async function getFrozenSnapshot(db: Queryable, teamId: string, periodId: number): Promise<PeriodSnapshot | null> {
  return getPeriodSnapshot(db, teamId, periodId);
}

/** node-postgres returns `date` columns as JS `Date` objects, not ISO strings, regardless of
 * how callers type them — normalize to the calendar date string Luxon expects. */
function toISODateString(endsOn: string | Date): string {
  return endsOn instanceof Date ? endsOn.toISOString().slice(0, 10) : endsOn;
}

/** Pure: the next instant (in the team's timezone) at which a period ending on `endsOn`
 * becomes due for auto-freeze, per that team's configured weekday + time. */
export function computeFreezeInstant(endsOn: string | Date, config: Pick<TeamFreezeConfig, 'timezone' | 'freezeDow' | 'freezeTime'>): DateTime {
  const [hour, minute] = config.freezeTime.split(':').map(Number);
  let candidate = DateTime.fromISO(toISODateString(endsOn), { zone: config.timezone })
    .plus({ days: 1 })
    .set({ hour, minute, second: 0, millisecond: 0 });
  if (!candidate.isValid) {
    throw new Error(`computeFreezeInstant: invalid endsOn value: ${String(endsOn)}`);
  }
  while (candidate.weekday !== config.freezeDow) {
    candidate = candidate.plus({ days: 1 });
  }
  return candidate;
}

/** One tick of the scheduled auto-freeze job: for every team configured for auto/both freeze
 * mode, freeze any ended-but-still-open period whose due instant has passed. Safe to call as
 * often as desired (e.g. every minute) — freezeTeamPeriod is idempotent, and a period already
 * frozen is excluded from the candidate query, so a re-check never recomputes it. */
export async function runScheduledFreezes(db: Queryable, now: Date = new Date()): Promise<void> {
  const teams = await getAutoFreezeTeams(db);
  for (const team of teams) {
    const periods = await getUnfrozenEndedPeriods(db, team.id, now);
    for (const period of periods) {
      const freezeAt = computeFreezeInstant(period.endsOn, team);
      if (freezeAt.toUTC().toJSDate().getTime() <= now.getTime()) {
        await freezeTeamPeriod(db, team.id, period.id);
      }
    }
  }
}
