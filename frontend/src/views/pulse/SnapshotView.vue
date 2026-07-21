<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import * as api from '../../api/pulse';
import type { AlertSeverity, DashboardAggregate, ReportPeriod } from '../../api/pulse';
import StatGauge from '../../components/pulse/StatGauge.vue';
import DistributionChart from '../../components/pulse/DistributionChart.vue';
import ProfileBreakdown from '../../components/pulse/ProfileBreakdown.vue';
import ReportHeader from '../../components/pulse/ReportHeader.vue';
import ExecutiveSummary from '../../components/pulse/ExecutiveSummary.vue';
import { PulseBadge, PulseButton, PulseCard, PulseErrorState, PulseSkeleton, PulseStatCard } from '../../components/ui';
import { useReportActions } from '../../composables/useReportActions';
import { summarizeDashboard } from '../../utils/reportSummary';

const TEAM = 'ceva-logistics';

const SEVERITY_LABEL: Record<AlertSeverity, string> = { critical: '🔴 Critical', warn: '🟠 Warning', info: 'ℹ️ Info' };
const SEVERITY_VARIANT: Record<AlertSeverity, 'danger' | 'warning' | 'accent'> = { critical: 'danger', warn: 'warning', info: 'accent' };
const HEALTH_LABEL: Record<string, string> = { good: '🟢 Good', at_risk: '🟠 At risk', blocked: '🔴 Blocked' };

const route = useRoute();
const periodId = computed(() => Number(route.params.periodId));
const { exportPdf, copyLink } = useReportActions();

const period = ref<ReportPeriod | null>(null);
const aggregate = ref<DashboardAggregate | null>(null);
const frozenAt = ref<string | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const notFrozen = ref(false);
const freezing = ref(false);
const exportingPng = ref(false);
const pageEl = ref<HTMLElement | null>(null);

const summaryPoints = computed(() => (aggregate.value ? summarizeDashboard(aggregate.value) : []));

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  notFrozen.value = false;
  try {
    const res = await api.getPeriodSnapshot(TEAM, periodId.value);
    period.value = res.period;
    aggregate.value = res.snapshot.payload;
    frozenAt.value = res.snapshot.frozenAt;
  } catch (err) {
    if (err instanceof api.ApiError && err.status === 404) {
      notFrozen.value = true;
    } else {
      error.value = err instanceof Error ? err.message : 'Failed to load snapshot';
    }
  } finally {
    loading.value = false;
  }
}

async function freezeNow(): Promise<void> {
  freezing.value = true;
  error.value = null;
  try {
    const res = await api.freezePeriod(TEAM, periodId.value);
    period.value = res.period;
    aggregate.value = res.snapshot.payload;
    frozenAt.value = res.snapshot.frozenAt;
    notFrozen.value = false;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to freeze period';
  } finally {
    freezing.value = false;
  }
}

async function exportPng(): Promise<void> {
  if (!pageEl.value) return;
  exportingPng.value = true;
  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(pageEl.value, { backgroundColor: '#ffffff', scale: 2 });
    const link = document.createElement('a');
    link.download = `pulse-snapshot-${period.value?.isoWeek ?? periodId.value}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } finally {
    exportingPng.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <main class="snapshot">
    <div v-if="loading" class="snapshot__skeleton">
      <PulseSkeleton variant="block" height="4rem" />
      <PulseSkeleton variant="block" height="8rem" />
      <PulseSkeleton variant="block" height="12rem" />
    </div>

    <PulseErrorState v-else-if="error" title="Failed to load snapshot" :description="error" retryable @retry="load" />

    <PulseCard v-else-if="notFrozen">
      <div class="snapshot__not-frozen">
        <p>This period hasn't been frozen yet — historical reports are only available once frozen.</p>
        <PulseButton :loading="freezing" @click="freezeNow">Freeze now</PulseButton>
      </div>
    </PulseCard>

    <template v-else-if="aggregate && period">
      <div ref="pageEl" class="snapshot__page">
        <ReportHeader
          eyebrow="Historical report"
          :title="`Team snapshot — ${period.isoWeek}`"
          :subtitle="frozenAt ? `Frozen ${new Date(frozenAt).toLocaleString()} · data is immutable` : undefined"
        >
          <template #actions>
            <PulseButton variant="secondary" size="sm" @click="copyLink">Copy link</PulseButton>
            <PulseButton variant="secondary" size="sm" @click="exportPdf">Export PDF</PulseButton>
            <PulseButton variant="secondary" size="sm" :loading="exportingPng" @click="exportPng">Export PNG</PulseButton>
          </template>
        </ReportHeader>

        <ExecutiveSummary :points="summaryPoints" />

        <section class="snapshot__stats">
          <PulseStatCard label="Submitted" :value="`${aggregate.submissionStatus.submitted.length} / ${aggregate.submissionStatus.submitted.length + aggregate.submissionStatus.pending.length}`" />
          <PulseStatCard label="Mean workload" :value="aggregate.workload.mean" />
          <PulseStatCard label="Total delivered" :value="aggregate.totalDelivered" />
          <PulseStatCard label="Total in-flight" :value="aggregate.totalInFlight" />
        </section>

        <PulseCard>
          <template #header>Workload</template>
          <div class="snapshot__workload-stats">
            <StatGauge :value="aggregate.workload.mean" label="Mean" />
            <StatGauge :value="aggregate.workload.max" label="Max" />
            <StatGauge :value="aggregate.workload.min" label="Min" />
          </div>
          <DistributionChart :distribution="aggregate.workload.distribution" />
        </PulseCard>

        <PulseCard>
          <template #header>Project health</template>
          <div class="snapshot__health">
            <div class="snapshot__health-item" v-for="(count, status) in aggregate.projectHealth" :key="status">
              <span class="snapshot__health-value">{{ count }}</span>
              <span class="snapshot__health-label">{{ HEALTH_LABEL[status] }}</span>
            </div>
          </div>
        </PulseCard>

        <PulseCard>
          <template #header>By profile</template>
          <ProfileBreakdown :entries="aggregate.byProfile" />
        </PulseCard>

        <PulseCard v-if="aggregate.alerts.length">
          <template #header>Top alerts</template>
          <ul class="snapshot__alerts">
            <li v-for="(alert, i) in aggregate.alerts.slice(0, 5)" :key="i">
              <PulseBadge :variant="SEVERITY_VARIANT[alert.severity]">{{ SEVERITY_LABEL[alert.severity] }}</PulseBadge>
              {{ alert.content }}
            </li>
          </ul>
        </PulseCard>

        <PulseCard v-if="aggregate.opportunities.length">
          <template #header>Opportunities</template>
          <ul class="snapshot__opportunities">
            <li v-for="opp in aggregate.opportunities.slice(0, 5)" :key="opp.id">{{ opp.content }}</li>
          </ul>
        </PulseCard>
      </div>
    </template>
  </main>
</template>

<style scoped>
.snapshot {
  max-width: 960px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
}
.snapshot__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.snapshot__page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.snapshot__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: var(--space-4);
}
.snapshot__workload-stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.snapshot__health {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
}
.snapshot__health-item {
  display: flex;
  flex-direction: column;
}
.snapshot__health-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}
.snapshot__health-label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.snapshot__alerts,
.snapshot__opportunities {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
  padding: 0;
  margin: 0;
}
.snapshot__alerts li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.snapshot__not-frozen {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: flex-start;
}

@media print {
  .snapshot {
    max-width: none;
    padding: 0;
  }
  section,
  .pulse-card {
    break-inside: avoid;
  }
}
</style>
