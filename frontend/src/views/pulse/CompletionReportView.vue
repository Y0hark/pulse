<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import * as api from '../../api/pulse';
import type { CompletionReport, CompletionStatus, ReportPeriod } from '../../api/pulse';
import ReportHeader from '../../components/pulse/ReportHeader.vue';
import ExecutiveSummary from '../../components/pulse/ExecutiveSummary.vue';
import { PulseBadge, PulseButton, PulseCard, PulseErrorState, PulseSkeleton, PulseStatCard, PulseTable } from '../../components/ui';
import { useReportActions } from '../../composables/useReportActions';
import { useSessionStore } from '../../stores/session';
import { summarizeCompletion } from '../../utils/reportSummary';

const session = useSessionStore();

const STATUS_LABEL: Record<CompletionStatus, string> = { on_time: 'On time', late: 'Late', missing: 'Missing' };
const STATUS_VARIANT: Record<CompletionStatus, 'success' | 'warning' | 'danger'> = {
  on_time: 'success',
  late: 'warning',
  missing: 'danger',
};

const { exportPdf, exportingPdf, copyLink } = useReportActions();

const period = ref<ReportPeriod | null>(null);
const completion = ref<CompletionReport | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const generatedAt = ref(new Date().toISOString());

const summaryPoints = computed(() => (completion.value ? summarizeCompletion(completion.value) : []));

const columns = [
  { key: 'displayName', label: 'Member' },
  { key: 'profileLabel', label: 'Profile' },
  { key: 'submittedAt', label: 'Submitted' },
  { key: 'status', label: 'Status', align: 'right' as const },
];

const rows = computed(
  () =>
    completion.value?.rows.map((row) => ({
      id: row.userId,
      displayName: row.displayName ?? 'Unnamed member',
      profileLabel: row.profileLabel ?? '—',
      submittedAt: row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '—',
      status: row.status,
    })) ?? [],
);

async function load(): Promise<void> {
  if (!session.currentTeamSlug) return;
  loading.value = true;
  error.value = null;
  generatedAt.value = new Date().toISOString();
  try {
    const res = await api.getCompletionReport(session.currentTeamSlug);
    period.value = res.period;
    completion.value = res.completion;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load completion report';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (session.loaded) void load();
  else void session.load();
});

watch(() => session.currentTeamSlug, load);
</script>

<template>
  <main class="completion-report">
    <div v-if="loading" class="completion-report__skeleton">
      <PulseSkeleton variant="block" height="4rem" />
      <PulseSkeleton variant="block" height="8rem" />
    </div>

    <PulseErrorState v-else-if="error" title="Failed to load completion report" :description="error" retryable @retry="load" />

    <template v-else-if="completion && period">
      <ReportHeader
        eyebrow="Delay / completion report"
        :title="`Submission completion — ${period.isoWeek}`"
        subtitle="Who submitted on time, who was late, and who's still missing."
        :generated-at="generatedAt"
      >
        <template #actions>
          <PulseButton variant="secondary" size="sm" @click="copyLink">Copy link</PulseButton>
          <PulseButton
            variant="secondary"
            size="sm"
            :loading="exportingPdf"
            @click="exportPdf(`/teams/${session.currentTeamSlug}/reports/completion/export.pdf?period=${period.isoWeek}`)"
            >Export PDF</PulseButton
          >
        </template>
      </ReportHeader>

      <ExecutiveSummary :points="summaryPoints" />

      <section class="completion-report__stats">
        <PulseStatCard label="Completion" :value="`${completion.summary.completionPct}%`" />
        <PulseStatCard label="On time" :value="completion.summary.onTime" />
        <PulseStatCard label="Late" :value="completion.summary.late" />
        <PulseStatCard label="Missing" :value="completion.summary.missing" />
      </section>

      <PulseCard :padded="false">
        <template #header>Submissions</template>
        <PulseTable :columns="columns" :rows="rows">
          <template #cell-status="{ value }">
            <PulseBadge :variant="STATUS_VARIANT[value as CompletionStatus]">{{ STATUS_LABEL[value as CompletionStatus] }}</PulseBadge>
          </template>
        </PulseTable>
      </PulseCard>
    </template>
  </main>
</template>

<style scoped>
.completion-report {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.completion-report__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.completion-report__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: var(--space-4);
}
</style>
