<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '../../stores/session';
import * as api from '../../api/pulse';
import type { MissionDetail } from '../../api/pulse';
import {
  PulseBadge,
  PulseButton,
  PulseCard,
  PulseEmptyState,
  PulseErrorState,
  PulseProgressRing,
  PulseSkeleton,
  PulseTable,
} from '../../components/ui';

const DOW_LABELS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const props = defineProps<{ slug: string }>();
const router = useRouter();
const session = useSessionStore();

const slug = computed(() => props.slug);
const mission = ref<MissionDetail | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const isAdmin = computed(() => session.user?.isGlobalAdmin ?? false);
const isMember = computed(() => session.user?.teams.some((t) => t.team.slug === slug.value) ?? false);
const isCurrent = computed(() => slug.value === session.currentTeamSlug);

const completionPercent = computed(() => {
  const c = mission.value?.completion;
  if (!c || c.total === 0) return 0;
  return Math.round((c.submitted / c.total) * 100);
});

const nextDeadlineLabel = computed(() => {
  if (!mission.value) return '';
  return `${DOW_LABELS[mission.value.freezeDow]} at ${mission.value.freezeTime.slice(0, 5)} (${mission.value.timezone})`;
});

const memberRows = computed(
  () =>
    mission.value?.members.map((m) => ({
      id: m.userId,
      name: m.displayName ?? m.email,
      email: m.email,
      role: m.role,
      job: m.profile?.label ?? '—',
    })) ?? [],
);

const recentReportsRows = computed(
  () =>
    mission.value?.recentReports.map((r) => ({
      id: r.id,
      week: r.isoWeek,
      owner: r.ownerDisplayName ?? r.ownerEmail,
      status: r.submittedAt ? 'Submitted' : 'Draft',
    })) ?? [],
);

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const res = await api.getMission(slug.value);
    mission.value = res.mission;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load this mission.';
  } finally {
    loading.value = false;
  }
}

function setCurrent(): void {
  session.setCurrentMission(slug.value);
}

onMounted(() => {
  if (!session.loaded) void session.load();
  void load();
});
</script>

<template>
  <section class="mission-detail">
    <div v-if="loading" class="mission-detail__skeleton">
      <PulseSkeleton variant="block" height="2rem" />
      <PulseSkeleton variant="block" height="10rem" />
    </div>

    <PulseErrorState v-else-if="error" description="This mission could not be loaded." retryable @retry="load" />

    <PulseEmptyState v-else-if="!mission" icon="🧭" title="Mission not found" description="It may have been removed." />

    <template v-else>
      <header class="mission-detail__header">
        <div>
          <div class="mission-detail__title-row">
            <h1>{{ mission.name }}</h1>
            <PulseBadge :variant="mission.status === 'active' ? 'success' : 'neutral'">
              {{ mission.status === 'active' ? 'Active' : 'Archived' }}
            </PulseBadge>
          </div>
          <p v-if="mission.clientName" class="mission-detail__client">{{ mission.clientName }}</p>
        </div>
        <div class="mission-detail__actions">
          <PulseBadge v-if="isCurrent" variant="accent">Current mission</PulseBadge>
          <PulseButton v-else-if="isMember" variant="secondary" @click="setCurrent">Set as current mission</PulseButton>
          <PulseButton v-if="isAdmin" variant="secondary" @click="router.push({ name: 'mission-edit', params: { slug } })">
            Edit settings
          </PulseButton>
        </div>
      </header>

      <div class="mission-detail__grid">
        <PulseCard>
          <template #header>Team</template>
          <p class="mission-detail__stat">{{ mission.memberCount }}</p>
          <p class="mission-detail__stat-label">member{{ mission.memberCount === 1 ? '' : 's' }}</p>
        </PulseCard>

        <PulseCard>
          <template #header>Next deadline</template>
          <p class="mission-detail__deadline">{{ nextDeadlineLabel }}</p>
          <p class="mission-detail__stat-label">{{ mission.reportingFrequency }} reporting</p>
        </PulseCard>

        <PulseCard v-if="mission.completion">
          <template #header>Completion rate</template>
          <div class="mission-detail__completion">
            <PulseProgressRing :percent="completionPercent" />
            <p class="mission-detail__stat-label">
              {{ mission.completion.submitted }} / {{ mission.completion.total }} submitted this period
            </p>
          </div>
        </PulseCard>
      </div>

      <section class="mission-detail__reports">
        <div class="mission-detail__section-header">
          <h2>Members</h2>
          <button v-if="isAdmin" type="button" class="mission-detail__manage-link" @click="router.push({ name: 'settings' })">
            Manage job &amp; roles in Settings
          </button>
        </div>
        <PulseTable
          :columns="[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'job', label: 'Job' },
            { key: 'role', label: 'Role' },
          ]"
          :rows="memberRows"
        >
          <template #empty>No one is staffed on this mission yet.</template>
        </PulseTable>
      </section>

      <section class="mission-detail__reports">
        <h2>Recent reports</h2>
        <PulseTable
          :columns="[
            { key: 'week', label: 'Period' },
            { key: 'owner', label: 'Owner' },
            { key: 'status', label: 'Status' },
          ]"
          :rows="recentReportsRows"
        >
          <template #empty>No reports have been submitted for this mission yet.</template>
        </PulseTable>
      </section>
    </template>
  </section>
</template>

<style scoped>
.mission-detail__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.mission-detail__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.mission-detail__title-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.mission-detail__title-row h1 {
  margin: 0;
}

.mission-detail__client {
  margin: var(--space-1) 0 0;
  color: var(--color-text-secondary);
}

.mission-detail__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.mission-detail__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.mission-detail__stat {
  margin: 0;
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
}

.mission-detail__stat-label {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-transform: capitalize;
}

.mission-detail__deadline {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
}

.mission-detail__completion {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.mission-detail__section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.mission-detail__manage-link {
  font-size: var(--font-size-sm);
  color: var(--color-accent);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
}
</style>
