import { defineStore } from 'pinia';
import * as api from '../api/pulse';
import type { CurrentUser } from '../api/pulse';

const CURRENT_TEAM_STORAGE_KEY = 'pulse.currentTeamSlug';

interface SessionState {
  user: CurrentUser | null;
  currentTeamSlug: string | null;
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

export const useSessionStore = defineStore('session', {
  state: (): SessionState => ({
    user: null,
    currentTeamSlug: null,
    loading: false,
    loaded: false,
    error: null,
  }),

  getters: {
    currentMission(state): { id: string; name: string; slug: string } | null {
      if (!state.user) return null;
      const membership =
        state.user.teams.find((t) => t.team.slug === state.currentTeamSlug) ?? state.user.teams[0];
      return membership ? membership.team : null;
    },
  },

  actions: {
    async load(): Promise<void> {
      if (this.loading) return;
      this.loading = true;
      this.error = null;
      try {
        this.user = await api.getMe();
        const stored = localStorage.getItem(CURRENT_TEAM_STORAGE_KEY);
        const hasStored = stored && this.user.teams.some((t) => t.team.slug === stored);
        this.currentTeamSlug = hasStored ? stored : (this.user.teams[0]?.team.slug ?? null);
      } catch (err) {
        this.user = null;
        this.error = err instanceof Error ? err.message : 'Failed to load current user';
      } finally {
        this.loading = false;
        this.loaded = true;
      }
    },

    setCurrentMission(slug: string): void {
      this.currentTeamSlug = slug;
      localStorage.setItem(CURRENT_TEAM_STORAGE_KEY, slug);
    },

    async updateDisplayName(displayName: string): Promise<void> {
      const res = await api.updateMyDisplayName(displayName);
      if (this.user) this.user.displayName = res.displayName;
    },

    async logout(): Promise<void> {
      await api.logout();
      this.user = null;
      this.currentTeamSlug = null;
      this.loaded = false;
      localStorage.removeItem(CURRENT_TEAM_STORAGE_KEY);
    },
  },
});
