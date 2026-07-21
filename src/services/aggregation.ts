import type { Queryable } from '../db/pool.js';
import { getTeamReportsForPeriod, getTeamRoster } from '../db/dashboard.js';
import { listMissions } from '../db/missions.js';
import { PROFILE_DEFS } from '../dashboard/profiles.js';
import type { AlertSeverity } from '../reports/types.js';
import type {
  ConsolidatedReport,
  DashboardAggregate,
  MemberSummary,
  ProfileBreakdownEntry,
  RosterMember,
  TeamReportInput,
  WorkloadBucket,
} from '../dashboard/types.js';

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, warn: 1, info: 2 };

function bucketFor(workload: number): WorkloadBucket {
  if (workload <= 25) return 'low';
  if (workload <= 60) return 'steady';
  if (workload <= 85) return 'high';
  return 'critical';
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Pure aggregation over a team's roster + this period's reports.
 *
 * Only *submitted* reports feed the numeric stats (workload, totals, project
 * health, alerts, opportunities, by-profile means): a saved-but-unsubmitted
 * autosave draft shouldn't move the team's live numbers. It still shows up in
 * submissionStatus.pending so the manager knows who hasn't filed yet.
 */
export function computeDashboard(roster: RosterMember[], reports: TeamReportInput[]): DashboardAggregate {
  const submitted = reports.filter((r) => r.submittedAt !== null);
  const workloads = submitted.map((r) => r.workload);

  const distributionCounts: Record<WorkloadBucket, number> = { low: 0, steady: 0, high: 0, critical: 0 };
  for (const w of workloads) distributionCounts[bucketFor(w)] += 1;

  const projectHealth = { good: 0, at_risk: 0, blocked: 0 };
  for (const r of submitted) {
    for (const status of r.projectCardStatuses) projectHealth[status] += 1;
  }

  const byProfile: ProfileBreakdownEntry[] = PROFILE_DEFS.map(({ code, label }) => {
    const memberIds = new Set(roster.filter((m) => m.profileCode === code).map((m) => m.userId));
    const profileReports = submitted.filter((r) => memberIds.has(r.userId));
    const profileWorkloads = profileReports.map((r) => r.workload);
    return {
      code,
      label,
      headcount: memberIds.size,
      meanWorkload: profileWorkloads.length ? round1(mean(profileWorkloads)) : 0,
      delivered: profileReports.reduce((sum, r) => sum + r.deliveredCnt, 0),
    };
  });

  const alerts = submitted
    .flatMap((r) => r.alerts)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const opportunities = submitted.flatMap((r) => r.opportunities);

  const submittedIds = new Set(submitted.map((r) => r.userId));
  const submittedStatus: MemberSummary[] = [];
  const pendingStatus: MemberSummary[] = [];
  for (const member of roster) {
    const bucket = submittedIds.has(member.userId) ? submittedStatus : pendingStatus;
    bucket.push({ userId: member.userId, displayName: member.displayName });
  }

  return {
    workload: {
      mean: workloads.length ? round1(mean(workloads)) : 0,
      max: workloads.length ? Math.max(...workloads) : 0,
      min: workloads.length ? Math.min(...workloads) : 0,
      distribution: (Object.keys(distributionCounts) as WorkloadBucket[]).map((bucket) => ({
        bucket,
        count: distributionCounts[bucket],
      })),
    },
    totalDelivered: submitted.reduce((sum, r) => sum + r.deliveredCnt, 0),
    totalInFlight: submitted.reduce((sum, r) => sum + r.inflightCnt, 0),
    projectHealth,
    byProfile,
    alerts,
    opportunities,
    submissionStatus: { submitted: submittedStatus, pending: pendingStatus },
  };
}

// --- cache + DB orchestration (per team+period, invalidated on report writes) ---

const cache = new Map<string, DashboardAggregate>();

function cacheKey(teamId: string, periodId: number): string {
  return `${teamId}:${periodId}`;
}

export function invalidateTeamDashboard(teamId: string, periodId: number): void {
  cache.delete(cacheKey(teamId, periodId));
}

export async function getTeamDashboard(db: Queryable, teamId: string, periodId: number): Promise<DashboardAggregate> {
  const key = cacheKey(teamId, periodId);
  const cached = cache.get(key);
  if (cached) return cached;

  const [roster, reports] = await Promise.all([
    getTeamRoster(db, teamId),
    getTeamReportsForPeriod(db, teamId, periodId),
  ]);
  const aggregate = computeDashboard(roster, reports);
  cache.set(key, aggregate);
  return aggregate;
}

/**
 * Cross-mission rollup for one period: every active mission's own dashboard aggregate, rolled
 * up into per-mission rows plus org-wide totals — the "consolidated report" for someone overseeing
 * multiple missions at once. Reuses getTeamDashboard (and its cache) per mission rather than
 * re-querying, so it stays cheap even with many active missions.
 */
export async function getConsolidatedReport(db: Queryable, periodId: number): Promise<ConsolidatedReport> {
  const missions = await listMissions(db);
  const active = missions.filter((m) => m.status === 'active');

  const rows: ConsolidatedReport['missions'] = [];
  const topAlerts: ConsolidatedReport['topAlerts'] = [];

  for (const mission of active) {
    const aggregate = await getTeamDashboard(db, mission.id, periodId);
    const submitted = aggregate.submissionStatus.submitted.length;
    rows.push({
      missionId: mission.id,
      missionName: mission.name,
      missionSlug: mission.slug,
      headcount: mission.memberCount,
      submitted,
      meanWorkload: aggregate.workload.mean,
      totalDelivered: aggregate.totalDelivered,
      totalInFlight: aggregate.totalInFlight,
      completionPct: mission.memberCount > 0 ? Math.round((submitted / mission.memberCount) * 100) : 0,
    });
    for (const alert of aggregate.alerts) {
      topAlerts.push({ ...alert, missionName: mission.name });
    }
  }

  const headcount = rows.reduce((sum, r) => sum + r.headcount, 0);
  const totalSubmitted = rows.reduce((sum, r) => sum + r.submitted, 0);
  const workloadValues = rows.filter((r) => r.submitted > 0).map((r) => r.meanWorkload);

  return {
    missions: rows,
    totals: {
      missionCount: rows.length,
      headcount,
      totalDelivered: rows.reduce((sum, r) => sum + r.totalDelivered, 0),
      totalInFlight: rows.reduce((sum, r) => sum + r.totalInFlight, 0),
      meanWorkload: workloadValues.length ? round1(mean(workloadValues)) : 0,
      completionPct: headcount > 0 ? Math.round((totalSubmitted / headcount) * 100) : 0,
    },
    topAlerts: topAlerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]).slice(0, 10),
  };
}
