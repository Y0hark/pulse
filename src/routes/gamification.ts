import { Router } from 'express';
import type { Queryable } from '../db/pool.js';
import type { GamificationConfig } from '../config/pulse.js';
import { getCurrentPeriod, getPeriodByIsoWeek, getReportForPeriod } from '../db/reports.js';
import { getOptedInTeamMembers, getLeaderboardOptIn, setLeaderboardOptIn } from '../db/teams.js';
import { getTeamReportsForPeriod } from '../db/dashboard.js';
import {
  computeBadges,
  computeCompletionRing,
  computeStreak,
  computeXp,
  getUserSubmissionRecords,
} from '../services/gamification.js';

async function resolvePeriod(db: Queryable, isoWeek: unknown) {
  if (typeof isoWeek === 'string' && isoWeek.trim() !== '') {
    return getPeriodByIsoWeek(db, isoWeek);
  }
  return getCurrentPeriod(db);
}

export function createGamificationRouter(db: Queryable, config: GamificationConfig): Router {
  const router = Router();

  // Never blocks or delays report submission — this is a read-only, additive signal.
  router.get('/teams/:team/gamification/me', async (req, res) => {
    const period = await resolvePeriod(db, req.query.period);
    if (!period) {
      res.status(404).json({ error: 'period_not_found' });
      return;
    }

    const [records, currentReport, teamReports] = await Promise.all([
      getUserSubmissionRecords(db, req.teamId!, req.userId!, period.id),
      getReportForPeriod(db, req.userId!, req.teamId!, period.id),
      getTeamReportsForPeriod(db, req.teamId!, period.id),
    ]);

    const streak = computeStreak(records, config);
    const xp = computeXp(records, config);
    const completionRing = currentReport
      ? computeCompletionRing(currentReport)
      : computeCompletionRing({ workload: 0, projectCards: [], majorTasksDid: [], majorTasksToDo: [] });

    const submittedTimes = teamReports
      .filter((r) => r.submittedAt != null)
      .map((r) => ({ userId: r.userId, submittedAt: new Date(r.submittedAt!).getTime() }))
      .sort((a, b) => a.submittedAt - b.submittedAt);
    const isFirstSubmitter = submittedTimes.length > 0 && submittedTimes[0].userId === req.userId;
    const hasZeroBlockers = currentReport ? !currentReport.projectCards.some((c) => c.status === 'blocked') : false;

    const badges = computeBadges(streak, isFirstSubmitter, hasZeroBlockers, config);
    const optedIn = await getLeaderboardOptIn(db, req.teamId!, req.userId!);

    res.status(200).json({ period, streak, xp, completionRing, badges, leaderboardOptIn: optedIn });
  });

  router.put('/teams/:team/gamification/opt-in', async (req, res) => {
    const optIn = Boolean((req.body as Record<string, unknown> | null)?.optIn);
    await setLeaderboardOptIn(db, req.teamId!, req.userId!, optIn);
    res.status(200).json({ leaderboardOptIn: optIn });
  });

  // Scoped strictly to this team's opted-in members — never cross-team.
  router.get('/teams/:team/gamification/leaderboard', async (req, res) => {
    const period = await resolvePeriod(db, req.query.period);
    if (!period) {
      res.status(404).json({ error: 'period_not_found' });
      return;
    }

    const members = await getOptedInTeamMembers(db, req.teamId!);
    const entries = await Promise.all(
      members.map(async (member) => {
        const records = await getUserSubmissionRecords(db, req.teamId!, member.userId, period.id);
        const streak = computeStreak(records, config);
        const xp = computeXp(records, config);
        return { userId: member.userId, displayName: member.displayName, streak: streak.current, xp: xp.total };
      }),
    );
    entries.sort((a, b) => b.xp - a.xp || b.streak - a.streak);

    res.status(200).json({ period, entries });
  });

  return router;
}
