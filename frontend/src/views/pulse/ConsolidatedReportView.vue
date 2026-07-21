<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import * as api from '../../api/pulse';
import type { AlertSeverity, ConsolidatedReport, ReportPeriod } from '../../api/pulse';
import ReportHeader from '../../components/pulse/ReportHeader.vue';
import ExecutiveSummary from '../../components/pulse/ExecutiveSummary.vue';
import { PulseBadge, PulseButton, PulseCard, PulseEmptyState, PulseErrorState, PulseSkeleton, PulseStatCard, PulseTable } from '../../components/ui';
import { useReportActions } from '../../composables/useReportActions';
import { summarizeConsolidated } from '../../utils/reportSummary';

const SEVERITY_LABEL: Record<AlertSeverity, string> = { critical: '🔴 Critical', warn: '🟠 Warning', info: 'ℹ️ Info' };
const SEVERITY_VARIANT: Record<AlertSeverity, 'danger' | 'warning' | 'accent'> = { critical: 'danger', warn: 'warning', info: 'accent' };

const { exportPdf, copyLink } = useReportActions();

const period = ref<ReportPeriod | null>(null);
const report = ref<ConsolidatedReport | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const generatedAt = ref(new Date().toISOString());

const summaryPoints = computed(() => (report.value ? summarizeConsolidated(report.value) : []));

const columns = [
  { key: 'missionName', label: 'Mission' },
  { key: 'headcount', label: 'Headcount', align: 'right' as const },
  { key: 'completionPct', label: 'Completion', align: 'right' as const },
  { key: 'meanWorkload', label: 'Mean workload', align: 'right' as const },
  { key: 'totalDelivered', label: 'Delivered', align: 'right' as const },
  { key: 'totalInFlight', label: 'In-flight', align: 'right' as const },
];

const rows = computed(
  () =>
    report.value?.missions.map((m) => ({
      id: m.missionId,
      slug: m.missionSlug,
      missionName: m.missionName,
      headcount: m.headcount,
      completionPct: `${m.completionPct}%`,
      meanWorkload: m.meanWorkload,
      totalDelivered: m.totalDelivered,
      totalInFlight: m.totalInFlight,
    })) ?? [],
);

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  generatedAt.value = new Date().toISOString();
  try {
    const res = await api.getConsolidatedReport();
    period.value = res.period;
    report.value = res.report;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load consolidated report';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <main class="consolidated-report">
    <div v-if="loading" class="consolidated-report__skeleton">
      <PulseSkeleton variant="block" height="4rem" />
      <PulseSkeleton variant="block" height="8rem" />
      <PulseSkeleton variant="block" height="12rem" />
    </div>

    <PulseErrorState v-else-if="error" title="Failed to load consolidated report" :description="error" retryable @retry="load" />

    <template v-else-if="report && period">
      <ReportHeader
        eyebrow="Consolidated report"
        :title="`Across missions — ${period.isoWeek}`"
        subtitle="Rolled up across every active mission for this period."
        :generated-at="generatedAt"
      >
        <template #actions>
          <PulseButton variant="secondary" size="sm" @click="copyLink">Copy link</PulseButton>
          <PulseButton variant="secondary" size="sm" @click="exportPdf">Export PDF</PulseButton>
        </template>
      </ReportHeader>

      <PulseEmptyState
        v-if="report.missions.length === 0"
        icon="🧭"
        title="No active missions"
        description="Create or activate a mission to see it show up in the consolidated report."
      />

      <template v-else>
        <ExecutiveSummary :points="summaryPoints" />

        <section class="consolidated-report__stats">
          <PulseStatCard label="Active missions" :value="report.totals.missionCount" />
          <PulseStatCard label="Headcount" :value="report.totals.headcount" />
          <PulseStatCard label="Completion" :value="`${report.totals.completionPct}%`" />
          <PulseStatCard label="Mean workload" :value="report.totals.meanWorkload" />
          <PulseStatCard label="Delivered" :value="report.totals.totalDelivered" />
          <PulseStatCard label="In-flight" :value="report.totals.totalInFlight" />
        </section>

        <PulseCard :padded="false">
          <template #header>By mission</template>
          <PulseTable :columns="columns" :rows="rows">
            <template #cell-missionName="{ row }">
              <router-link :to="`/missions/${row.slug}`">{{ row.missionName }}</router-link>
            </template>
          </PulseTable>
        </PulseCard>

        <PulseCard v-if="report.topAlerts.length">
          <template #header>Top alerts</template>
          <ul class="consolidated-report__alerts">
            <li v-for="(alert, i) in report.topAlerts" :key="i">
              <PulseBadge :variant="SEVERITY_VARIANT[alert.severity]">{{ SEVERITY_LABEL[alert.severity] }}</PulseBadge>
              {{ alert.content }} <span class="consolidated-report__alert-mission">— {{ alert.missionName }}</span>
            </li>
          </ul>
        </PulseCard>
      </template>
    </template>
  </main>
</template>

<style scoped>
.consolidated-report {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.consolidated-report__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.consolidated-report__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: var(--space-4);
}
.consolidated-report__alerts {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
  padding: 0;
  margin: 0;
}
.consolidated-report__alerts li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.consolidated-report__alert-mission {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

@media print {
  .consolidated-report {
    max-width: none;
  }
}
</style>
