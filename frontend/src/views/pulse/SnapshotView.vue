<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import * as api from '../../api/pulse';
import type { AlertSeverity, DashboardAggregate, ReportPeriod } from '../../api/pulse';
import StatGauge from '../../components/pulse/StatGauge.vue';
import DistributionChart from '../../components/pulse/DistributionChart.vue';
import ProfileBreakdown from '../../components/pulse/ProfileBreakdown.vue';

const TEAM = 'ceva-logistics';

const SEVERITY_LABEL: Record<AlertSeverity, string> = { critical: '🔴 Critical', warn: '🟠 Warning', info: 'ℹ️ Info' };
const HEALTH_LABEL: Record<string, string> = { good: '🟢 Good', at_risk: '🟠 At risk', blocked: '🔴 Blocked' };

const route = useRoute();
const periodId = computed(() => Number(route.params.periodId));

const period = ref<ReportPeriod | null>(null);
const aggregate = ref<DashboardAggregate | null>(null);
const frozenAt = ref<string | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const notFrozen = ref(false);
const freezing = ref(false);
const exportingPng = ref(false);
const pageEl = ref<HTMLElement | null>(null);

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

function exportPdf(): void {
  window.print();
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
    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="snapshot__error">{{ error }}</p>

    <div v-else-if="notFrozen" class="snapshot__not-frozen">
      <p>This period hasn't been frozen yet.</p>
      <button type="button" :disabled="freezing" @click="freezeNow">
        {{ freezing ? 'Freezing…' : 'Freeze now' }}
      </button>
    </div>

    <template v-else-if="aggregate && period">
      <div class="snapshot__actions">
        <button type="button" @click="exportPdf">Export PDF</button>
        <button type="button" :disabled="exportingPng" @click="exportPng">
          {{ exportingPng ? 'Exporting…' : 'Export PNG' }}
        </button>
      </div>

      <div ref="pageEl" class="snapshot__page">
        <header class="snapshot__header">
          <h1>Team snapshot — {{ period.isoWeek }}</h1>
          <p class="snapshot__frozen-at">Frozen {{ frozenAt ? new Date(frozenAt).toLocaleString() : '' }}</p>
        </header>

        <section class="snapshot__workload">
          <h2>Workload</h2>
          <div class="snapshot__workload-stats">
            <StatGauge :value="aggregate.workload.mean" label="Mean" />
            <StatGauge :value="aggregate.workload.max" label="Max" />
            <StatGauge :value="aggregate.workload.min" label="Min" />
          </div>
          <DistributionChart :distribution="aggregate.workload.distribution" />
        </section>

        <section class="snapshot__totals">
          <div class="snapshot__stat">
            <span class="snapshot__stat-value">{{ aggregate.totalDelivered }}</span>
            <span class="snapshot__stat-label">Total delivered</span>
          </div>
          <div class="snapshot__stat">
            <span class="snapshot__stat-value">{{ aggregate.totalInFlight }}</span>
            <span class="snapshot__stat-label">Total in-flight</span>
          </div>
          <div class="snapshot__stat" v-for="(count, status) in aggregate.projectHealth" :key="status">
            <span class="snapshot__stat-value">{{ count }}</span>
            <span class="snapshot__stat-label">{{ HEALTH_LABEL[status] }}</span>
          </div>
        </section>

        <section>
          <h2>By profile</h2>
          <ProfileBreakdown :entries="aggregate.byProfile" />
        </section>

        <section v-if="aggregate.alerts.length" class="snapshot__alerts-section">
          <h2>Top alerts</h2>
          <ul class="snapshot__alerts">
            <li v-for="(alert, i) in aggregate.alerts.slice(0, 5)" :key="i" :class="`snapshot__alert--${alert.severity}`">
              <span class="snapshot__alert-severity">{{ SEVERITY_LABEL[alert.severity] }}</span>
              {{ alert.content }}
            </li>
          </ul>
        </section>

        <section v-if="aggregate.opportunities.length">
          <h2>Opportunities</h2>
          <ul>
            <li v-for="opp in aggregate.opportunities.slice(0, 5)" :key="opp.id">{{ opp.content }}</li>
          </ul>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.snapshot {
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem;
}
.snapshot__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.snapshot__page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: white;
  padding: 1.5rem;
}
.snapshot__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.snapshot__frozen-at {
  color: #666;
  font-size: 0.85rem;
}
.snapshot__workload-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.snapshot__totals {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}
.snapshot__stat {
  display: flex;
  flex-direction: column;
}
.snapshot__stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}
.snapshot__stat-label {
  color: #666;
  font-size: 0.85rem;
}
.snapshot__alerts {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  list-style: none;
  padding: 0;
}
.snapshot__alerts li {
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  border-left: 4px solid #ccc;
}
.snapshot__alert--critical {
  border-left-color: #ef4444;
  background: #fee2e2;
}
.snapshot__alert--warn {
  border-left-color: #f97316;
  background: #ffedd5;
}
.snapshot__alert--info {
  border-left-color: #3b82f6;
  background: #dbeafe;
}
.snapshot__alert-severity {
  font-weight: 600;
  margin-right: 0.5rem;
}
.snapshot__error {
  color: #991b1b;
}
.snapshot__not-frozen {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
}

@media print {
  .snapshot__actions {
    display: none;
  }
  .snapshot {
    max-width: none;
    padding: 0;
  }
  .snapshot__page {
    padding: 0;
  }
  section {
    break-inside: avoid;
  }
}
</style>
