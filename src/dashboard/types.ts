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
  userId: string;
  workload: number;
  deliveredCnt: number;
  inflightCnt: number;
  submittedAt: string | null;
  projectCardStatuses: ProjectStatus[];
  alerts: { content: string; severity: AlertSeverity }[];
  opportunities: Opportunity[];
}
