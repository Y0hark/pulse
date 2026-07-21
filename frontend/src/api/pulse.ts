export type ProjectStatus = 'good' | 'at_risk' | 'blocked';
export type AlertSeverity = 'info' | 'warn' | 'critical';
export type OpportunityType = 'open_position' | 'new_project' | 'new_budget' | 'new_team' | 'client_need';

export interface ProjectCardDraft {
  title: string;
  description: string | null;
  status: ProjectStatus;
  sortOrder: number;
}

export interface AlertDraft {
  content: string;
  severity: AlertSeverity;
}

export interface OpportunityDraft {
  type: OpportunityType;
  content: string;
}

export interface ReportDraft {
  workload: number;
  deliveredCnt: number;
  inflightCnt: number;
  projectCards: ProjectCardDraft[];
  majorTasksDid: string[];
  majorTasksToDo: string[];
  alerts: AlertDraft[];
  opportunities: OpportunityDraft[];
}

export interface ReportRecord extends ReportDraft {
  id: string;
  periodId: number;
  submittedAt: string | null;
  updatedAt: string;
}

export interface ReportPeriod {
  id: number;
  isoWeek: string;
  startsOn: string;
  endsOn: string;
}

export type PeriodStatus = 'open' | 'frozen';

export interface CurrentPeriodResponse {
  period: ReportPeriod;
  status: PeriodStatus;
  draft: ReportDraft | ReportRecord;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API request failed with status ${status}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export function getCurrentPeriod(team: string): Promise<CurrentPeriodResponse> {
  return request(`/teams/${team}/periods/current`);
}

export function getMyReport(team: string, isoWeek: string): Promise<{ period: ReportPeriod; report: ReportRecord }> {
  return request(`/teams/${team}/reports/mine?period=${encodeURIComponent(isoWeek)}`);
}

export function putMyReport(
  team: string,
  isoWeek: string,
  payload: ReportDraft,
): Promise<{ period: ReportPeriod; report: ReportRecord }> {
  return request(`/teams/${team}/reports/mine?period=${encodeURIComponent(isoWeek)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function submitMyReport(
  team: string,
  isoWeek: string,
): Promise<{ period: ReportPeriod; report: ReportRecord }> {
  return request(`/teams/${team}/reports/mine/submit?period=${encodeURIComponent(isoWeek)}`, {
    method: 'POST',
  });
}

export interface ReportOwner {
  id: string;
  displayName: string;
}

export interface ReportViewResponse {
  report: ReportRecord;
  period: ReportPeriod;
  periodStatus: PeriodStatus;
  owner: ReportOwner | null;
  isOwner: boolean;
  canEdit: boolean;
}

export function getReport(team: string, reportId: string): Promise<ReportViewResponse> {
  return request(`/teams/${team}/reports/${encodeURIComponent(reportId)}`);
}

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
  alerts: AlertDraft[];
  opportunities: (OpportunityDraft & { id: string })[];
  submissionStatus: { submitted: MemberSummary[]; pending: MemberSummary[] };
}

export interface DashboardResponse {
  period: ReportPeriod;
  aggregate: DashboardAggregate;
}

export function getTeamDashboard(team: string, isoWeek?: string): Promise<DashboardResponse> {
  const query = isoWeek ? `?period=${encodeURIComponent(isoWeek)}` : '';
  return request(`/teams/${team}/dashboard${query}`);
}

export interface PeriodSnapshot {
  teamId: string;
  periodId: number;
  payload: DashboardAggregate;
  frozenAt: string;
}

export interface SnapshotResponse {
  period: ReportPeriod;
  snapshot: PeriodSnapshot;
}

export function freezePeriod(team: string, periodId: number): Promise<SnapshotResponse> {
  return request(`/teams/${team}/periods/${periodId}/freeze`, { method: 'POST' });
}

export function getPeriodSnapshot(team: string, periodId: number): Promise<SnapshotResponse> {
  return request(`/teams/${team}/periods/${periodId}/snapshot`);
}

export type WalkthroughStatus = 'submitted' | 'not_submitted';

export interface WalkthroughEntry {
  user: { id: string; displayName: string | null };
  profile: { code: string | null; label: string | null };
  status: WalkthroughStatus;
  workload: number | null;
  deliveredCnt: number | null;
  inflightCnt: number | null;
  reportId: string | null;
}

export interface WalkthroughResponse {
  period: ReportPeriod;
  entries: WalkthroughEntry[];
}

export function getTeamWalkthrough(team: string, isoWeek?: string): Promise<WalkthroughResponse> {
  const query = isoWeek ? `?period=${encodeURIComponent(isoWeek)}` : '';
  return request(`/teams/${team}/reports${query}`);
}

export type BadgeCode = 'streak' | 'first_submitter' | 'zero_blockers';

export interface Badge {
  code: BadgeCode;
  label: string;
  threshold?: number;
}

export interface StreakResult {
  current: number;
  longest: number;
}

export interface PeriodXp {
  periodId: number;
  xp: number;
  onTime: boolean;
}

export interface XpResult {
  total: number;
  periods: PeriodXp[];
}

export interface CompletionRingResult {
  percent: number;
  filledFields: number;
  totalFields: number;
}

export interface GamificationSummary {
  period: ReportPeriod;
  streak: StreakResult;
  xp: XpResult;
  completionRing: CompletionRingResult;
  badges: Badge[];
  leaderboardOptIn: boolean;
}

export function getMyGamification(team: string, isoWeek?: string): Promise<GamificationSummary> {
  const query = isoWeek ? `?period=${encodeURIComponent(isoWeek)}` : '';
  return request(`/teams/${team}/gamification/me${query}`);
}

export function setLeaderboardOptIn(team: string, optIn: boolean): Promise<{ leaderboardOptIn: boolean }> {
  return request(`/teams/${team}/gamification/opt-in`, {
    method: 'PUT',
    body: JSON.stringify({ optIn }),
  });
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string | null;
  streak: number;
  xp: number;
}

export interface LeaderboardResponse {
  period: ReportPeriod;
  entries: LeaderboardEntry[];
}

export function getTeamLeaderboard(team: string, isoWeek?: string): Promise<LeaderboardResponse> {
  const query = isoWeek ? `?period=${encodeURIComponent(isoWeek)}` : '';
  return request(`/teams/${team}/gamification/leaderboard${query}`);
}

export { ApiError };
