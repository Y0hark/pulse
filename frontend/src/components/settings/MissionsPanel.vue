<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import * as api from '../../api/pulse';
import type { MissionSummary } from '../../api/pulse';
import { useToast } from '../../composables/useToast';
import { PulseBadge, PulseButton, PulseEmptyState, PulseErrorState, PulseSkeleton, PulseTable, PulseTabs } from '../ui';

const router = useRouter();
const toast = useToast();

const missions = ref<MissionSummary[] | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const statusFilter = ref<'active' | 'archived' | 'all'>('active');
const busySlug = ref<string | null>(null);

const columns = [
  { key: 'name', label: 'Mission' },
  { key: 'client', label: 'Client' },
  { key: 'status', label: 'Status' },
  { key: 'members', label: 'Team' },
  { key: 'actions', label: '', align: 'right' as const },
];

const filteredMissions = computed(() => {
  if (!missions.value) return [];
  if (statusFilter.value === 'all') return missions.value;
  return missions.value.filter((m) => m.status === statusFilter.value);
});

const rows = computed(() =>
  filteredMissions.value.map((m) => ({
    id: m.id,
    name: m.name,
    client: m.clientName ?? '—',
    mission: m,
  })),
);

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

function missionOf(row: Record<string, unknown>): MissionSummary {
  return row.mission as MissionSummary;
}

async function toggleStatus(mission: MissionSummary): Promise<void> {
  const willArchive = mission.status === 'active';
  if (willArchive && !window.confirm(`Archive ${mission.name}? Reporting stops until it's reactivated.`)) return;
  busySlug.value = mission.slug;
  try {
    if (willArchive) await api.archiveMission(mission.slug);
    else await api.activateMission(mission.slug);
    toast.success(willArchive ? 'Mission archived.' : 'Mission reactivated.');
    await load();
  } catch {
    toast.error('Could not update this mission.');
  } finally {
    busySlug.value = null;
  }
}

onMounted(load);
</script>

<template>
  <section class="missions-panel">
    <header class="missions-panel__header">
      <p class="missions-panel__subtitle">Create missions, edit their settings, and archive or reactivate them.</p>
      <PulseButton @click="router.push({ name: 'mission-create' })">New mission</PulseButton>
    </header>

    <PulseTabs
      v-model="statusFilter"
      :tabs="[
        { value: 'active', label: 'Active' },
        { value: 'archived', label: 'Archived' },
        { value: 'all', label: 'All' },
      ]"
    />

    <div v-if="loading" class="missions-panel__skeleton">
      <PulseSkeleton variant="block" height="2.5rem" />
      <PulseSkeleton variant="block" height="2.5rem" />
    </div>

    <PulseErrorState
      v-else-if="error"
      :description="`We couldn't load missions. (${error})`"
      retryable
      @retry="load"
    />

    <PulseEmptyState
      v-else-if="filteredMissions.length === 0"
      icon="🧭"
      title="No missions"
      description="Create your first mission to get started."
    >
      <PulseButton @click="router.push({ name: 'mission-create' })">Create a mission</PulseButton>
    </PulseEmptyState>

    <PulseTable v-else :columns="columns" :rows="rows">
      <template #cell-status="{ row }">
        <PulseBadge :variant="missionOf(row).status === 'active' ? 'success' : 'neutral'">
          {{ missionOf(row).status === 'active' ? 'Active' : 'Archived' }}
        </PulseBadge>
      </template>
      <template #cell-members="{ row }">
        {{ missionOf(row).memberCount }} member{{ missionOf(row).memberCount === 1 ? '' : 's' }}
      </template>
      <template #cell-actions="{ row }">
        <div class="missions-panel__actions">
          <PulseButton
            variant="ghost"
            size="sm"
            @click="router.push({ name: 'mission-edit', params: { slug: missionOf(row).slug } })"
          >
            Edit
          </PulseButton>
          <PulseButton
            variant="ghost"
            size="sm"
            :loading="busySlug === missionOf(row).slug"
            :disabled="busySlug !== null"
            @click="toggleStatus(missionOf(row))"
          >
            {{ missionOf(row).status === 'active' ? 'Archive' : 'Reactivate' }}
          </PulseButton>
        </div>
      </template>
    </PulseTable>
  </section>
</template>

<style scoped>
.missions-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.missions-panel__subtitle {
  margin: 0;
  color: var(--color-text-secondary);
}

.missions-panel__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.missions-panel__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>
