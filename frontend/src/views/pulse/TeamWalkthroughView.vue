<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import * as api from '../../api/pulse';
import type { ReportPeriod, ReportRecord, WalkthroughEntry } from '../../api/pulse';
import PresenterMode from '../../components/pulse/PresenterMode.vue';
import { PulseButton, PulseEmptyState, PulseErrorState, PulseSkeleton } from '../../components/ui';

const TEAM = 'ceva-logistics';

const route = useRoute();
const router = useRouter();

const period = ref<ReportPeriod | null>(null);
const entries = ref<WalkthroughEntry[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const presenting = ref(false);
const currentIndex = ref(0);

const reportCache = new Map<string, ReportRecord>();
const currentReport = ref<ReportRecord | null>(null);
const reportLoading = ref(false);

const currentEntry = computed(() => entries.value[currentIndex.value] ?? null);

async function loadEntries(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const isoWeek = typeof route.query.period === 'string' ? route.query.period : undefined;
    const res = await api.getTeamWalkthrough(TEAM, isoWeek);
    period.value = res.period;
    entries.value = res.entries;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load walkthrough';
  } finally {
    loading.value = false;
  }
}

async function loadCurrentReport(): Promise<void> {
  const entry = currentEntry.value;
  if (!entry || !entry.reportId) {
    currentReport.value = null;
    return;
  }
  const cached = reportCache.get(entry.reportId);
  if (cached) {
    currentReport.value = cached;
    return;
  }
  reportLoading.value = true;
  currentReport.value = null;
  try {
    const res = await api.getReport(TEAM, entry.reportId);
    reportCache.set(entry.reportId, res.report);
    currentReport.value = res.report;
  } catch {
    currentReport.value = null;
  } finally {
    reportLoading.value = false;
  }
}

function openPresenter(index: number): void {
  currentIndex.value = index;
  presenting.value = true;
  void loadCurrentReport();
}

function closePresenter(): void {
  presenting.value = false;
  const query = { ...route.query };
  delete query.at;
  void router.replace({ query });
}

function jumpTo(index: number): void {
  currentIndex.value = index;
}

function next(): void {
  if (currentIndex.value < entries.value.length - 1) currentIndex.value += 1;
}

function prev(): void {
  if (currentIndex.value > 0) currentIndex.value -= 1;
}

watch(currentIndex, () => {
  void loadCurrentReport();
});

onMounted(async () => {
  await loadEntries();
  const atUserId = typeof route.query.at === 'string' ? route.query.at : null;
  if (atUserId) {
    const index = entries.value.findIndex((e) => e.user.id === atUserId);
    openPresenter(index >= 0 ? index : 0);
  }
});
</script>

<template>
  <main v-if="!presenting" class="walkthrough">
    <div v-if="loading" class="walkthrough__skeleton">
      <PulseSkeleton variant="block" height="2rem" />
      <PulseSkeleton variant="block" height="3rem" />
      <PulseSkeleton variant="block" height="3rem" />
      <PulseSkeleton variant="block" height="3rem" />
    </div>

    <PulseErrorState v-else-if="error" :description="error" retryable @retry="loadEntries" />

    <template v-else>
      <header class="walkthrough__header">
        <h1>Team walkthrough — {{ period?.isoWeek }}</h1>
        <PulseButton :disabled="!entries.length" @click="openPresenter(0)">Start walkthrough</PulseButton>
      </header>

      <PulseEmptyState
        v-if="!entries.length"
        icon="🧭"
        title="No team members yet"
        description="Once teammates are staffed on this mission, they'll show up here."
      />

      <ul v-else class="walkthrough__list">
        <li v-for="(entry, i) in entries" :key="entry.user.id" class="walkthrough__item">
          <span class="walkthrough__status" :class="`walkthrough__status--${entry.status}`">
            {{ entry.status === 'submitted' ? '● Submitted' : '○ Not submitted' }}
          </span>
          <span class="walkthrough__name">{{ entry.user.displayName ?? 'Unnamed member' }}</span>
          <span v-if="entry.profile.label" class="walkthrough__profile">{{ entry.profile.label }}</span>
          <span v-if="entry.workload !== null" class="walkthrough__workload">Workload {{ entry.workload }}</span>
          <PulseButton variant="secondary" size="sm" @click="openPresenter(i)">Present from here</PulseButton>
        </li>
      </ul>
    </template>
  </main>

  <PresenterMode
    v-else
    :entries="entries"
    :current-index="currentIndex"
    :report="currentReport"
    :report-loading="reportLoading"
    @next="next"
    @prev="prev"
    @jump="jumpTo"
    @exit="closePresenter"
  />
</template>

<style scoped>
.walkthrough {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.walkthrough__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.walkthrough__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.walkthrough__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.walkthrough__item {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
}
.walkthrough__status {
  white-space: nowrap;
}
.walkthrough__status--submitted {
  color: var(--color-success);
}
.walkthrough__status--not_submitted {
  color: var(--color-text-muted);
}
.walkthrough__name {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
}
.walkthrough__profile,
.walkthrough__workload {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}
.walkthrough__item .pulse-button {
  margin-left: auto;
}
</style>
