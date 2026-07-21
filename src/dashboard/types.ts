import type { AlertSeverity, Opportunity, ProjectStatus } from '../reports/types.js';

export type WorkloadBucket = 'low' | 'steady' | 'high' | 'critical';

export interface WorkloadDistributionBucket {
  bucket: WorkloadBucket;
  count: number;
}

export interface WorkloadStats {
  mean: number;
  max: number;
  min: number;
  distribution: WorkloadDistributionBucket[];
}

export interface ProjectHealthCounts {
  good: number;
  at_risk: number;
  blocked: number;
}

export interface ProfileBreakdownEntry {
  code: string;
  label: string;
  headcount: number;
  meanWorkload: number;
  delivered: number;
}

export interface MemberSummary {
  userId: string;
  displayName: string | null;
}

export interface DashboardAggregate {
  workload: WorkloadStats;
  totalDelivered: number;
  totalInFlight: number;
  projectHealth: ProjectHealthCounts;
  byProfile: ProfileBreakdownEntry[];
  alerts: { content: string; severity: AlertSeverity }[];
  opportunities: Opportunity[];
  submissionStatus: { submitted: MemberSummary[]; pending: MemberSummary[] };
}

/** Everyone on the team roster, regardless of whether they've filed a report yet. */
export interface RosterMember {
  userId: string;
  displayName: string | null;
  profileCode: string | null;
}

/** A team member's report row for the period, flattened with its child rows for aggregation. */
export interface TeamReportInput {
  id: string;
  userId: string;
  workload: number;
  deliveredCnt: number;
  inflightCnt: number;
  submittedAt: string | null;
  projectCardStatuses: ProjectStatus[];
  alerts: { content: string; severity: AlertSeverity }[];
  opportunities: Opportunity[];
}

export type WalkthroughStatus = 'submitted' | 'not_submitted';

/** One row of the team walkthrough: read-only presenter-mode listing of a period's reports. */
export interface WalkthroughEntry {
  user: { id: string; displayName: string | null };
  profile: { code: string | null; label: string | null };
  status: WalkthroughStatus;
  workload: number | null;
  deliveredCnt: number | null;
  inflightCnt: number | null;
  reportId: string | null;
}

/** The immutable payload persisted at freeze time — the same shape as a live dashboard aggregate. */
export interface PeriodSnapshot {
  teamId: string;
  periodId: number;
  payload: DashboardAggregate;
  frozenAt: string;
}

/** A team's freeze configuration, used by both manual freeze and the scheduled auto-freeze job. */
export interface TeamFreezeConfig {
  id: string;
  slug: string;
  timezone: string;
  freezeDow: number;
  freezeTime: string;
  freezeMode: 'auto' | 'manual' | 'both';
}
