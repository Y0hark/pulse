<script setup lang="ts">
import { onMounted } from 'vue';
import { useSessionStore } from '../../stores/session';
import { PulseBadge, PulseButton, PulseCard, PulseEmptyState } from '../../components/ui';

const session = useSessionStore();

onMounted(() => {
  if (!session.loaded) void session.load();
});
</script>

<template>
  <section class="missions">
    <p v-if="session.loading" class="missions__status">Loading missions…</p>
    <p v-else-if="session.error" class="missions__status missions__status--error">{{ session.error }}</p>

    <PulseEmptyState
      v-else-if="session.user && session.user.teams.length === 0"
      icon="🧭"
      title="No missions yet"
      description="You are not staffed on any mission. Ask your manager to add you to a team."
    />

    <div v-else-if="session.user" class="missions__grid">
      <PulseCard v-for="membership in session.user.teams" :key="membership.team.id">
        <template #header>
          <div class="missions__card-header">
            <span>{{ membership.team.name }}</span>
            <PulseBadge v-if="membership.team.slug === session.currentTeamSlug" variant="accent">
              Current
            </PulseBadge>
          </div>
        </template>
        <p class="missions__role">Role: {{ membership.role }}</p>
        <PulseButton
          v-if="membership.team.slug !== session.currentTeamSlug"
          variant="secondary"
          size="sm"
          @click="session.setCurrentMission(membership.team.slug)"
        >
          Set as current mission
        </PulseButton>
      </PulseCard>
    </div>
  </section>
</template>

<style scoped>
.missions__status {
  color: var(--color-text-secondary);
}

.missions__status--error {
  color: var(--color-danger);
}

.missions__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-4);
}

.missions__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.missions__role {
  margin: 0 0 var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-transform: capitalize;
}
</style>
