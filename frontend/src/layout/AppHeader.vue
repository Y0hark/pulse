<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useSessionStore } from '../stores/session';
import { PulseBadge, PulseButton, PulseSelect } from '../components/ui';

const route = useRoute();
const session = useSessionStore();

const pageTitle = computed(() => (route.meta.title as string | undefined) ?? 'Pulse');

const missionOptions = computed(
  () => session.user?.teams.map((t) => ({ value: t.team.slug, label: t.team.name })) ?? [],
);

const initials = computed(() => {
  const email = session.user?.email ?? '';
  return email.slice(0, 2).toUpperCase() || '?';
});

function onMissionChange(slug: string): void {
  session.setCurrentMission(slug);
}
</script>

<template>
  <header class="app-header">
    <div class="app-header__title">
      <h1>{{ pageTitle }}</h1>
      <PulseBadge v-if="session.currentMission" variant="accent">{{ session.currentMission.name }}</PulseBadge>
    </div>

    <div class="app-header__actions">
      <PulseSelect
        v-if="missionOptions.length > 1"
        class="app-header__mission-select"
        :model-value="session.currentTeamSlug ?? ''"
        :options="missionOptions"
        @update:model-value="onMissionChange"
      />

      <router-link :to="{ name: 'weekly-pulse' }">
        <PulseButton size="sm">New submission</PulseButton>
      </router-link>

      <div v-if="session.user" class="app-header__user" :title="session.user.email">
        <span class="app-header__avatar" aria-hidden="true">{{ initials }}</span>
        <span class="app-header__user-email">{{ session.user.email }}</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-raised);
  position: sticky;
  top: 0;
  z-index: 10;
}

.app-header__title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.app-header__title h1 {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
}

.app-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
  justify-content: flex-end;
}

.app-header__mission-select {
  min-width: 160px;
}

.app-header__user {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.app-header__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-full);
  background: var(--color-electric-soft);
  color: var(--color-electric);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.app-header__user-email {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

@media (max-width: 1024px) {
  .app-header__user-email {
    display: none;
  }
}
</style>
