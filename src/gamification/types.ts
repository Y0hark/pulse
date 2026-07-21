export type BadgeCode = 'streak' | 'first_submitter' | 'zero_blockers';

export interface Badge {
  code: BadgeCode;
  label: string;
  /** Only set for 'streak' badges — which threshold this badge represents. */
  threshold?: number;
}

/** One period's submission fact, in chronological order oldest→newest, as needed to compute streak/XP. */
export interface SubmissionRecord {
  periodId: number;
  submittedAt: string | null;
  /** The team's freeze deadline instant for this period, ISO string. */
  deadline: string;
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

/** Minimal shape of a report draft needed to score field completion — a subset of ReportDraft. */
export interface CompletionInput {
  workload: number;
  projectCards: unknown[];
  majorTasksDid: unknown[];
  majorTasksToDo: unknown[];
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string | null;
  streak: number;
  xp: number;
}
