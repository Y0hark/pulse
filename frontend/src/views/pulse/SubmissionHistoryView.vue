<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useSessionStore } from '../../stores/session';
import * as api from '../../api/pulse';
import type { ReportRecord, SubmissionHistoryEntry } from '../../api/pulse';
import ReportRenderer from '../../components/pulse/ReportRenderer.vue';
import { PulseBadge, PulseCard, PulseEmptyState, PulseErrorState, PulseSkeleton } from '../../components/ui';

const session = useSessionStore();

const periods = ref<SubmissionHistoryEntry[] | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const expandedIsoWeek = ref<string | null>(null);
const expandedReport = ref<ReportRecord | null>(null);
const expandLoading = ref(false);
const expandError = ref<string | null>(null);

const STATUS_LABEL: Record<SubmissionHistoryEntry['status'], string> = {
  submitted: 'Submitted',
  missed: 'Missed',
  open: 'Open',
};
const STATUS_VARIANT: Record<SubmissionHistoryEntry['status'], 'success' | 'danger' | 'neutral'> = {
  submitted: 'success',
  missed: 'danger',
  open: 'neutral',
};

async function load(): Promise<void> {
  if (!session.currentTeamSlug) return;
  loading.value = true;
  error.value = null;
  try {
    const res = await api.getSubmissionHistory(session.currentTeamSlug);
    periods.value = res.periods;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load submission history.';
  } finally {
    loading.value = false;
  }
}

async function toggle(entry: SubmissionHistoryEntry): Promise<void> {
  if (expandedIsoWeek.value === entry.isoWeek) {
    expandedIsoWeek.value = null;
    return;
  }
  expandedIsoWeek.value = entry.isoWeek;
  if (entry.status !== 'submitted' || !session.currentTeamSlug) return;

  expandLoading.value = true;
  expandError.value = null;
  expandedReport.value = null;
  try {
    const res = await api.getMyReport(session.currentTeamSlug, entry.isoWeek);
    expandedReport.value = res.report;
  } catch (err) {
    expandError.value = err instanceof Error ? err.message : 'Failed to load this submission.';
  } finally {
    expandLoading.value = false;
  }
}

onMounted(() => {
  // Loading the session (when not already loaded) sets currentTeamSlug reactively, which the
  // watch below picks up — calling load() here too would double-fetch the history.
  if (session.loaded) void load();
  else void session.load();
});

watch(() => session.currentTeamSlug, load);

const hasPeriods = computed(() => (periods.value?.length ?? 0) > 0);
</script>

<template>
  <section class="submission-history">
    <header class="submission-history__header">
      <h1>Submission history</h1>
      <p v-if="session.currentMission" class="submission-history__mission">{{ session.currentMission.name }}</p>
    </header>

    <div v-if="loading" class="submission-history__list">
      <PulseSkeleton v-for="i in 4" :key="i" variant="block" height="3.5rem" />
    </div>

    <PulseErrorState
      v-else-if="error"
      description="We couldn't load your submission history. Check your connection and try again."
      retryable
      @retry="load"
    />

    <PulseEmptyState
      v-else-if="!hasPeriods"
      icon="🗓️"
      title="No periods yet"
      description="Once weekly periods open for your mission, they'll show up here."
    />

    <div v-else class="submission-history__list">
      <PulseCard v-for="entry in periods" :key="entry.periodId" class="submission-history__row" @click="toggle(entry)">
        <div class="submission-history__row-summary">
          <span class="submission-history__week">{{ entry.isoWeek }}</span>
          <span class="submission-history__ends">ends {{ new Date(entry.endsOn).toLocaleDateString() }}</span>
          <PulseBadge :variant="STATUS_VARIANT[entry.status]">{{ STATUS_LABEL[entry.status] }}</PulseBadge>
        </div>

        <div v-if="expandedIsoWeek === entry.isoWeek" class="submission-history__detail" @click.stop>
          <p v-if="entry.status !== 'submitted'" class="submission-history__no-detail">
            {{ entry.status === 'missed' ? 'No submission was made for this period.' : 'This period is still open.' }}
          </p>
          <PulseSkeleton v-else-if="expandLoading" variant="block" height="6rem" />
          <PulseErrorState v-else-if="expandError" :description="expandError" />
          <ReportRenderer v-else-if="expandedReport" :report="expandedReport" />
        </div>
      </PulseCard>
    </div>
  </section>
</template>

<style scoped>
.submission-history {
  max-width: 720px;
  margin: 0 auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.submission-history__mission {
  margin: var(--space-1) 0 0;
  color: var(--color-text-secondary);
}
.submission-history__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.submission-history__row {
  cursor: pointer;
}
.submission-history__row-summary {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.submission-history__week {
  font-weight: var(--font-weight-semibold);
}
.submission-history__ends {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  flex: 1;
}
.submission-history__detail {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
  cursor: default;
}
.submission-history__no-detail {
  color: var(--color-text-secondary);
  margin: 0;
}
</style>
