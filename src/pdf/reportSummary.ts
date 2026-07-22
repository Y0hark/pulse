import type { CompletionReport, ConsolidatedReport, DashboardAggregate } from '../dashboard/types.js';

/** Backend port of frontend/src/utils/reportSummary.ts — kept in lockstep so the PDF's
 * executive summary bullets match the on-screen report exactly. */
export function summarizeDashboard(aggregate: DashboardAggregate): string[] {
  const points: string[] = [];
  const { submitted, pending } = aggregate.submissionStatus;
  const total = submitted.length + pending.length;

  if (total > 0) {
    const pct = Math.round((submitted.length / total) * 100);
    points.push(`${submitted.length} of ${total} members submitted this period (${pct}%).`);
  }

  if (submitted.length > 0) {
    points.push(`Mean workload is ${aggregate.workload.mean}, ranging from ${aggregate.workload.min} to ${aggregate.workload.max}.`);
  }

  if (aggregate.projectHealth.blocked > 0) {
    points.push(`${aggregate.projectHealth.blocked} project(s) reported as blocked.`);
  }
  if (aggregate.projectHealth.at_risk > 0) {
    points.push(`${aggregate.projectHealth.at_risk} project(s) reported at risk.`);
  }

  const criticalAlerts = aggregate.alerts.filter((a) => a.severity === 'critical');
  if (criticalAlerts.length > 0) {
    points.push(`${criticalAlerts.length} critical alert(s) raised, most urgently: "${criticalAlerts[0].content}".`);
  }

  if (pending.length > 0) {
    points.push(`${pending.length} member(s) still haven't submitted: ${pending.map((m) => m.displayName ?? 'Unnamed').join(', ')}.`);
  }

  return points;
}

export function summarizeCompletion(report: CompletionReport): string[] {
  const points: string[] = [];
  const total = report.rows.length;
  points.push(`${report.summary.completionPct}% completion (${report.summary.onTime + report.summary.late} of ${total}).`);

  if (report.summary.missing > 0) {
    const missing = report.rows.filter((r) => r.status === 'missing').map((r) => r.displayName ?? 'Unnamed');
    points.push(`Still missing: ${missing.join(', ')}.`);
  }
  if (report.summary.late > 0) {
    points.push(`${report.summary.late} submission(s) came in after the deadline.`);
  }
  if (report.summary.missing === 0 && report.summary.late === 0 && total > 0) {
    points.push('Everyone submitted on time this period.');
  }

  return points;
}

export function summarizeConsolidated(report: ConsolidatedReport): string[] {
  const points: string[] = [];
  points.push(
    `${report.totals.missionCount} active mission(s), ${report.totals.headcount} people, ${report.totals.completionPct}% overall completion.`,
  );
  points.push(`${report.totals.totalDelivered} items delivered, ${report.totals.totalInFlight} in flight across all missions.`);

  const worst = [...report.missions].sort((a, b) => a.completionPct - b.completionPct)[0];
  if (worst && worst.completionPct < 100) {
    points.push(`${worst.missionName} has the lowest completion at ${worst.completionPct}%.`);
  }

  const criticalAlerts = report.topAlerts.filter((a) => a.severity === 'critical');
  if (criticalAlerts.length > 0) {
    points.push(
      `${criticalAlerts.length} critical alert(s) across missions, most urgently from ${criticalAlerts[0].missionName}: "${criticalAlerts[0].content}".`,
    );
  }

  return points;
}
