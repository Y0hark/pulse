export type ProjectStatus = 'good' | 'at_risk' | 'blocked';
export type ReportItemKind = 'task_done' | 'task_upcoming' | 'alert';
export type AlertSeverity = 'info' | 'warn' | 'critical';
export type OpportunityType = 'open_position' | 'new_project' | 'new_budget' | 'new_team' | 'client_need';

export interface ProjectCard {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  sortOrder: number;
}

export interface ReportItem {
  id: string;
  kind: ReportItemKind;
  content: string;
  severity: AlertSeverity | null;
}

export interface Opportunity {
  id: string;
  type: OpportunityType;
  content: string;
}

export interface ReportPeriod {
  id: number;
  isoWeek: string;
  startsOn: string;
  endsOn: string;
}

export type PeriodStatus = 'open' | 'frozen';

export interface ReportRecord {
  id: string;
  periodId: number;
  workload: number;
  deliveredCnt: number;
  inflightCnt: number;
  submittedAt: string | null;
  updatedAt: string;
  projectCards: ProjectCard[];
  majorTasksDid: string[];
  majorTasksToDo: string[];
  alerts: { content: string; severity: AlertSeverity }[];
  opportunities: Opportunity[];
}

/** A report shape that has not been persisted yet (prefilled draft, or an empty new-week draft). */
export interface ReportDraft {
  workload: number;
  deliveredCnt: number;
  inflightCnt: number;
  projectCards: Omit<ProjectCard, 'id'>[];
  majorTasksDid: string[];
  majorTasksToDo: string[];
  alerts: { content: string; severity: AlertSeverity }[];
  opportunities: Omit<Opportunity, 'id'>[];
}

/** The payload shape accepted by the upsert (PUT) endpoint. */
export type ReportWritePayload = ReportDraft;
