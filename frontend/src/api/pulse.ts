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
  deadline: string | null;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API request failed with status ${status}`);
  }
}

// In production the frontend (Cloudflare Pages) and API (Render) are on different
// domains, so requests need an absolute base URL. Empty in dev, where Vite proxies
// these paths to the local API instead (see vite.config.ts).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
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

export type SubmissionStatus = 'submitted' | 'missed' | 'open';

export interface SubmissionHistoryEntry {
  periodId: number;
  isoWeek: string;
  endsOn: string;
  submittedAt: string | null;
  status: SubmissionStatus;
}

export function getSubmissionHistory(team: string): Promise<{ periods: SubmissionHistoryEntry[] }> {
  return request(`/teams/${team}/reports/mine/history`);
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
  profile: { code: string; label: string } | null;
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

export function requestMagicLink(email: string): Promise<{ ok: boolean }> {
  return request('/auth/magic-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function logout(): Promise<{ ok: boolean }> {
  return request('/auth/logout', { method: 'POST' });
}

export interface TeamMembership {
  team: { id: string; name: string; slug: string };
  role: 'member' | 'manager' | 'admin';
}

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string | null;
  profile: { code: string; label: string } | null;
  isGlobalAdmin: boolean;
  teams: TeamMembership[];
}

export function getMe(): Promise<CurrentUser> {
  return request('/me');
}

export function updateMyDisplayName(displayName: string): Promise<{ displayName: string }> {
  return request('/me', {
    method: 'PATCH',
    body: JSON.stringify({ displayName }),
  });
}

export type MissionStatus = 'active' | 'archived';
export type ReportingFrequency = 'weekly' | 'biweekly' | 'monthly';
export type FreezeMode = 'auto' | 'manual' | 'both';

export interface MissionSummary {
  id: string;
  name: string;
  slug: string;
  clientName: string | null;
  status: MissionStatus;
  reportingFrequency: ReportingFrequency;
  memberCount: number;
}

export interface MissionRecord {
  id: string;
  name: string;
  slug: string;
  clientName: string | null;
  status: MissionStatus;
  reportingFrequency: ReportingFrequency;
  timezone: string;
  startsOn: string | null;
  endsOn: string | null;
  freezeDow: number;
  freezeTime: string;
  freezeMode: FreezeMode;
  archivedAt: string | null;
  createdAt: string;
}

export interface MissionMember {
  userId: string;
  email: string;
  displayName: string | null;
  role: 'member' | 'manager' | 'admin';
  profile: { code: string; label: string } | null;
}

export interface MissionRecentReport {
  id: string;
  periodId: number;
  isoWeek: string;
  ownerDisplayName: string | null;
  ownerEmail: string;
  submittedAt: string | null;
  updatedAt: string;
}

export interface MissionDetail extends MissionRecord {
  memberCount: number;
  members: MissionMember[];
  recentReports: MissionRecentReport[];
  completion: { submitted: number; total: number } | null;
}

export interface MissionInput {
  name: string;
  clientName?: string | null;
  timezone?: string;
  startsOn?: string | null;
  endsOn?: string | null;
  reportingFrequency?: ReportingFrequency;
  freezeDow?: number;
  freezeTime?: string;
  freezeMode?: FreezeMode;
  memberEmails?: string[];
}

export interface MissionUpdateInput {
  name: string;
  clientName?: string | null;
  timezone: string;
  startsOn?: string | null;
  endsOn?: string | null;
  reportingFrequency: ReportingFrequency;
  freezeDow: number;
  freezeTime: string;
  freezeMode: FreezeMode;
}

export function getMissions(): Promise<{ missions: MissionSummary[] }> {
  return request('/missions');
}

export function getMission(slug: string): Promise<{ mission: MissionDetail }> {
  return request(`/missions/${encodeURIComponent(slug)}`);
}

export function createMission(input: MissionInput): Promise<{ mission: MissionRecord }> {
  return request('/missions', { method: 'POST', body: JSON.stringify(input) });
}

export function updateMission(slug: string, input: MissionUpdateInput): Promise<{ mission: MissionRecord }> {
  return request(`/missions/${encodeURIComponent(slug)}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function archiveMission(slug: string): Promise<{ mission: MissionRecord }> {
  return request(`/missions/${encodeURIComponent(slug)}/archive`, { method: 'POST' });
}

export function activateMission(slug: string): Promise<{ mission: MissionRecord }> {
  return request(`/missions/${encodeURIComponent(slug)}/activate`, { method: 'POST' });
}

export function addMissionMember(slug: string, email: string): Promise<{ member: MissionMember }> {
  return request(`/missions/${encodeURIComponent(slug)}/members`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function removeMissionMember(slug: string, userId: string): Promise<void> {
  return request(`/missions/${encodeURIComponent(slug)}/members/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

// --- Settings > Users ---

export interface UserMissionRole {
  id: string;
  name: string;
  slug: string;
  role: 'member' | 'manager' | 'admin';
}

export interface UserAdminSummary {
  id: string;
  email: string;
  displayName: string | null;
  profile: { code: string; label: string } | null;
  isGlobalAdmin: boolean;
  isActive: boolean;
  missions: UserMissionRole[];
}

export interface UserCreateInput {
  email: string;
  displayName?: string | null;
  profileId?: number | null;
}

export interface UserUpdateInput {
  displayName?: string | null;
  profileId?: number | null;
}

export function getUsers(): Promise<{ users: UserAdminSummary[] }> {
  return request('/users');
}

export interface ProfileOption {
  id: number;
  code: string;
  label: string;
}

export function getProfiles(): Promise<{ profiles: ProfileOption[] }> {
  return request('/profiles');
}

export interface BulkCreateUsersInput {
  emails: string[];
  missionSlug?: string | null;
  role?: 'member' | 'manager' | 'admin';
}

export function bulkCreateUsers(input: BulkCreateUsersInput): Promise<{ created: string[]; skipped: string[] }> {
  return request('/users/bulk', { method: 'POST', body: JSON.stringify(input) });
}

export function createUser(input: UserCreateInput): Promise<{ user: UserRecordSummary }> {
  return request('/users', { method: 'POST', body: JSON.stringify(input) });
}

export interface UserRecordSummary {
  id: string;
  email: string;
  displayName: string | null;
  isGlobalAdmin: boolean;
}

export function updateUser(userId: string, input: UserUpdateInput): Promise<{ ok: boolean }> {
  return request(`/users/${encodeURIComponent(userId)}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function activateUser(userId: string): Promise<{ ok: boolean }> {
  return request(`/users/${encodeURIComponent(userId)}/activate`, { method: 'POST' });
}

export function deactivateUser(userId: string): Promise<{ ok: boolean }> {
  return request(`/users/${encodeURIComponent(userId)}/deactivate`, { method: 'POST' });
}

export function setUserGlobalAdmin(userId: string, isGlobalAdmin: boolean): Promise<{ ok: boolean }> {
  return request(`/users/${encodeURIComponent(userId)}/global-admin`, {
    method: 'PUT',
    body: JSON.stringify({ isGlobalAdmin }),
  });
}

export function setUserMissionRole(
  userId: string,
  missionSlug: string,
  role: 'member' | 'manager' | 'admin',
): Promise<{ ok: boolean }> {
  return request(`/users/${encodeURIComponent(userId)}/missions/${encodeURIComponent(missionSlug)}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export function removeUserFromMission(userId: string, missionSlug: string): Promise<void> {
  return request(`/users/${encodeURIComponent(userId)}/missions/${encodeURIComponent(missionSlug)}`, {
    method: 'DELETE',
  });
}

// --- Premium reports ---

export type CompletionStatus = 'on_time' | 'late' | 'missing';

export interface CompletionRow {
  userId: string;
  displayName: string | null;
  profileCode: string | null;
  profileLabel: string | null;
  status: CompletionStatus;
  submittedAt: string | null;
}

export interface CompletionReport {
  deadline: string | null;
  rows: CompletionRow[];
  summary: { onTime: number; late: number; missing: number; completionPct: number };
}

export interface CompletionResponse {
  period: ReportPeriod;
  completion: CompletionReport;
}

export function getCompletionReport(team: string, isoWeek?: string): Promise<CompletionResponse> {
  const query = isoWeek ? `?period=${encodeURIComponent(isoWeek)}` : '';
  return request(`/teams/${team}/reports/completion${query}`);
}

export interface FrozenPeriodEntry {
  period: ReportPeriod;
  frozenAt: string;
}

export function getPeriodHistory(team: string): Promise<{ history: FrozenPeriodEntry[] }> {
  return request(`/teams/${team}/periods/history`);
}

export interface ConsolidatedMissionRow {
  missionId: string;
  missionName: string;
  missionSlug: string;
  headcount: number;
  submitted: number;
  meanWorkload: number;
  totalDelivered: number;
  totalInFlight: number;
  completionPct: number;
}

export interface ConsolidatedReport {
  missions: ConsolidatedMissionRow[];
  totals: {
    missionCount: number;
    headcount: number;
    totalDelivered: number;
    totalInFlight: number;
    meanWorkload: number;
    completionPct: number;
  };
  topAlerts: (AlertDraft & { missionName: string })[];
}

export interface ConsolidatedReportResponse {
  period: ReportPeriod;
  report: ConsolidatedReport;
}

export function getConsolidatedReport(isoWeek?: string): Promise<ConsolidatedReportResponse> {
  const query = isoWeek ? `?period=${encodeURIComponent(isoWeek)}` : '';
  return request(`/missions/consolidated-report${query}`);
}

export { ApiError };
