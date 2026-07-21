import { defineStore } from 'pinia';
import * as api from '../api/pulse';
import type { DashboardAggregate, ReportPeriod } from '../api/pulse';

const POLL_INTERVAL_MS = 15000;

interface DashboardState {
  team: string;
  period: ReportPeriod | null;
  aggregate: DashboardAggregate | null;
  loading: boolean;
  error: string | null;
  pollTimer: ReturnType<typeof setInterval> | null;
}

export const useDashboardStore = defineStore('dashboard', {
  state: (): DashboardState => ({
    team: 'ceva-logistics',
    period: null,
    aggregate: null,
    loading: false,
    error: null,
    pollTimer: null,
  }),

  actions: {
    async load(team: string): Promise<void> {
      this.team = team;
      this.loading = this.aggregate === null;
      this.error = null;
      try {
        const res = await api.getTeamDashboard(team);
        this.period = res.period;
        this.aggregate = res.aggregate;
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to load dashboard';
      } finally {
        this.loading = false;
      }
    },

    /** Polls the aggregate so the manager's view updates as members submit,
     * without needing a websocket for this first iteration. */
    startPolling(team: string): void {
      this.stopPolling();
      void this.load(team);
      this.pollTimer = setInterval(() => {
        void this.load(this.team);
      }, POLL_INTERVAL_MS);
    },

    stopPolling(): void {
      if (this.pollTimer) clearInterval(this.pollTimer);
      this.pollTimer = null;
    },
  },
});
