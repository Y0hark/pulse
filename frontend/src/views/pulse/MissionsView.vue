<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '../../stores/session';
import * as api from '../../api/pulse';
import type { MissionSummary } from '../../api/pulse';
import {
  PulseBadge,
  PulseButton,
  PulseCard,
  PulseEmptyState,
  PulseErrorState,
  PulseSkeleton,
  PulseTabs,
} from '../../components/ui';

const session = useSessionStore();
const router = useRouter();

const missions = ref<MissionSummary[] | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const statusFilter = ref<'all' | 'active' | 'archived'>('active');

const isAdmin = computed(() => session.user?.isGlobalAdmin ?? false);
const memberSlugs = computed(() => new Set(session.user?.teams.map((t) => t.team.slug) ?? []));

const filteredMissions = computed(() => {
  if (!missions.value) return [];
  if (statusFilter.value === 'all') return missions.value;
  return missions.value.filter((m) => m.status === statusFilter.value);
});

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const res = await api.getMissions();
    missions.value = res.missions;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load missions.';
  } finally {
    loading.value = false;
  }
}

function openMission(slug: string): void {
  void router.push({ name: 'mission-detail', params: { slug } });
}

function setCurrent(slug: string): void {
  session.setCurrentMission(slug);
}

onMounted(() => {
  if (!session.loaded) void session.load();
  void load();
});
</script>

<template>
  <section class="missions">
    <header class="missions__header">
      <div>
        <h1>Missions</h1>
        <p class="missions__subtitle">Every mission your organization is running, in one place.</p>
      </div>
      <PulseButton v-if="isAdmin" @click="router.push({ name: 'mission-create' })">New mission</PulseButton>
    </header>

    <PulseTabs
      v-model="statusFilter"
      :tabs="[
        { value: 'active', label: 'Active' },
        { value: 'archived', label: 'Archived' },
        { value: 'all', label: 'All' },
      ]"
    />

    <div v-if="loading" class="missions__grid">
      <PulseCard v-for="i in 3" :key="i">
        <PulseSkeleton variant="block" height="6rem" />
      </PulseCard>
    </div>

    <PulseErrorState
      v-else-if="error"
      description="We couldn't load your missions. Check your connection and try again."
      retryable
      @retry="load"
    />

    <PulseEmptyState
      v-else-if="filteredMissions.length === 0"
      icon="🧭"
      title="No missions yet"
      :description="isAdmin ? 'Create your first mission to get started.' : 'Ask an admin to create a mission and add your team.'"
    >
      <PulseButton v-if="isAdmin" @click="router.push({ name: 'mission-create' })">Create a mission</PulseButton>
    </PulseEmptyState>

    <div v-else class="missions__grid">
      <PulseCard
        v-for="mission in filteredMissions"
        :key="mission.id"
        class="missions__card"
        role="button"
        tabindex="0"
        @click="openMission(mission.slug)"
        @keydown.enter="openMission(mission.slug)"
        @keydown.space.prevent="openMission(mission.slug)"
      >
        <template #header>
          <div class="missions__card-header">
            <span class="missions__card-name">{{ mission.name }}</span>
            <PulseBadge :variant="mission.status === 'active' ? 'success' : 'neutral'">
              {{ mission.status === 'active' ? 'Active' : 'Archived' }}
            </PulseBadge>
          </div>
        </template>
        <p v-if="mission.clientName" class="missions__client">{{ mission.clientName }}</p>
        <p class="missions__meta">
          {{ mission.memberCount }} member{{ mission.memberCount === 1 ? '' : 's' }} ·
          {{ mission.reportingFrequency }}
        </p>
        <PulseBadge v-if="memberSlugs.has(mission.slug) && mission.slug === session.currentTeamSlug" variant="accent">
          Current
        </PulseBadge>
        <PulseButton
          v-else-if="memberSlugs.has(mission.slug)"
          variant="secondary"
          size="sm"
          @click.stop="setCurrent(mission.slug)"
        >
          Set as current mission
        </PulseButton>
      </PulseCard>
    </div>
  </section>
</template>

<style scoped>
.missions__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.missions__subtitle {
  margin: var(--space-1) 0 0;
  color: var(--color-text-secondary);
}

.missions__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-4);
}

.missions__card {
  cursor: pointer;
}

.missions__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.missions__card-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.missions__client {
  margin: 0 0 var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.missions__meta {
  margin: 0 0 var(--space-3);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  text-transform: capitalize;
}
</style>
