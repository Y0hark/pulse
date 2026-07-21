import { defineStore } from 'pinia';
import * as api from '../api/pulse';
import type { GamificationSummary, PeriodStatus, ReportDraft, ReportPeriod } from '../api/pulse';

const AUTOSAVE_DEBOUNCE_MS = 1500;

function emptyDraft(): ReportDraft {
  return {
    workload: 0,
    deliveredCnt: 0,
    inflightCnt: 0,
    projectCards: [],
    majorTasksDid: [],
    majorTasksToDo: [],
    alerts: [],
    opportunities: [],
  };
}

interface ReportState {
  team: string;
  period: ReportPeriod | null;
  status: PeriodStatus;
  draft: ReportDraft;
  loading: boolean;
  saving: boolean;
  submitting: boolean;
  lastSavedAt: string | null;
  justSubmitted: boolean;
  error: string | null;
  autosaveTimer: ReturnType<typeof setTimeout> | null;
  gamification: GamificationSummary | null;
}

export const useReportStore = defineStore('report', {
  state: (): ReportState => ({
    team: '',
    period: null,
    status: 'open',
    draft: emptyDraft(),
    loading: false,
    saving: false,
    submitting: false,
    lastSavedAt: null,
    justSubmitted: false,
    error: null,
    autosaveTimer: null,
    gamification: null,
  }),

  getters: {
    isFrozen: (state): boolean => state.status === 'frozen',
  },

  actions: {
    async loadCurrentPeriod(team: string): Promise<void> {
      if (!team) return;
      this.team = team;
      this.loading = true;
      this.error = null;
      this.justSubmitted = false;
      try {
        const res = await api.getCurrentPeriod(team);
        this.period = res.period;
        this.status = res.status;
        this.draft = res.draft;
        this.justSubmitted = 'submittedAt' in res.draft && res.draft.submittedAt !== null;
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to load current period';
      } finally {
        this.loading = false;
      }
      void this.loadGamification();
    },

    /** Gamification is a soft, additive signal — a failure here is swallowed rather than
     * surfaced as a report error, so it can never look like it's blocking submission. */
    async loadGamification(): Promise<void> {
      if (!this.period) return;
      try {
        this.gamification = await api.getMyGamification(this.team, this.period.isoWeek);
      } catch {
        this.gamification = null;
      }
    },

    /** Call after any field mutation. Debounces the actual PUT so keystrokes don't each fire a request. */
    scheduleAutosave(): void {
      if (this.isFrozen) return;
      this.justSubmitted = false;
      if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
      this.autosaveTimer = setTimeout(() => {
        void this.save();
      }, AUTOSAVE_DEBOUNCE_MS);
    },

    async save(): Promise<void> {
      if (!this.period || this.isFrozen) return;
      this.saving = true;
      this.error = null;
      try {
        const res = await api.putMyReport(this.team, this.period.isoWeek, this.draft);
        this.lastSavedAt = res.report.updatedAt;
        void this.loadGamification();
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Autosave failed';
      } finally {
        this.saving = false;
      }
    },

    async submit(): Promise<void> {
      if (!this.period || this.isFrozen) return;
      if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
      this.submitting = true;
      this.error = null;
      try {
        await api.putMyReport(this.team, this.period.isoWeek, this.draft);
        const res = await api.submitMyReport(this.team, this.period.isoWeek);
        this.lastSavedAt = res.report.updatedAt;
        this.justSubmitted = true;
        void this.loadGamification();
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Submit failed';
      } finally {
        this.submitting = false;
      }
    },
  },
});
