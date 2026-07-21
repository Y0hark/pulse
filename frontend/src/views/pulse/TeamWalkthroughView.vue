<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import * as api from '../../api/pulse';
import type { ReportPeriod, ReportRecord, WalkthroughEntry } from '../../api/pulse';
import PresenterMode from '../../components/pulse/PresenterMode.vue';

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
    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="walkthrough__error">{{ error }}</p>

    <template v-else>
      <header class="walkthrough__header">
        <h1>Team walkthrough — {{ period?.isoWeek }}</h1>
        <button type="button" :disabled="!entries.length" @click="openPresenter(0)">Start walkthrough</button>
      </header>

      <ul class="walkthrough__list">
        <li v-for="(entry, i) in entries" :key="entry.user.id" class="walkthrough__item">
          <span class="walkthrough__status" :class="`walkthrough__status--${entry.status}`">
            {{ entry.status === 'submitted' ? '● Submitted' : '○ Not submitted' }}
          </span>
          <span class="walkthrough__name">{{ entry.user.displayName ?? 'Unnamed member' }}</span>
          <span v-if="entry.profile.label" class="walkthrough__profile">{{ entry.profile.label }}</span>
          <span v-if="entry.workload !== null" class="walkthrough__workload">Workload {{ entry.workload }}</span>
          <button type="button" @click="openPresenter(i)">Present from here</button>
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
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.walkthrough__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.walkthrough__list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.walkthrough__item {
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 0.6rem 1rem;
}
.walkthrough__status--submitted {
  color: #22c55e;
}
.walkthrough__status--not_submitted {
  color: #9ca3af;
}
.walkthrough__name {
  font-weight: 600;
}
.walkthrough__profile,
.walkthrough__workload {
  color: #666;
  font-size: 0.85rem;
}
.walkthrough__item button {
  margin-left: auto;
}
.walkthrough__error {
  color: #991b1b;
}
</style>
