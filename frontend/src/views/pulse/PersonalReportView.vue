<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import * as api from '../../api/pulse';
import type { AlertSeverity, ReportViewResponse } from '../../api/pulse';
import StatGauge from '../../components/pulse/StatGauge.vue';
import ProjectCard from '../../components/pulse/ProjectCard.vue';

const TEAM = 'ceva-logistics';

const props = defineProps<{
  reportId: string;
}>();

const route = useRoute();

const data = ref<ReportViewResponse | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, warn: 1, info: 2 };
const SEVERITY_LABEL: Record<AlertSeverity, string> = { critical: '🔴 Critical', warn: '🟠 Warning', info: 'ℹ️ Info' };

const sortedAlerts = computed(() => {
  if (!data.value) return [];
  return [...data.value.report.alerts].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
});

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    data.value = await api.getReport(TEAM, props.reportId);
  } catch (err) {
    data.value = null;
    error.value =
      err instanceof api.ApiError && err.status === 404
        ? 'This report is not available or you do not have access to it.'
        : 'Failed to load report.';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(
  () => route.params.reportId,
  () => {
    void load();
  },
);
</script>

<template>
  <main class="personal-report">
    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="personal-report__error">{{ error }}</p>

    <template v-else-if="data">
      <header class="personal-report__header">
        <div>
          <h1>{{ data.owner?.displayName ?? 'Weekly report' }}</h1>
          <p class="personal-report__meta">
            {{ data.period.isoWeek }}
            <span v-if="data.report.submittedAt">· Submitted</span>
            <span v-else>· Draft</span>
          </p>
        </div>
        <a v-if="data.canEdit" class="personal-report__edit" href="/">Edit</a>
      </header>

      <section>
        <StatGauge :value="data.report.workload" label="Workload" />
      </section>

      <section class="personal-report__counters">
        <div class="personal-report__stat">
          <span class="personal-report__stat-value">{{ data.report.deliveredCnt }}</span>
          <span class="personal-report__stat-label">Delivered</span>
        </div>
        <div class="personal-report__stat">
          <span class="personal-report__stat-value">{{ data.report.inflightCnt }}</span>
          <span class="personal-report__stat-label">In-flight</span>
        </div>
      </section>

      <section v-if="data.report.projectCards.length">
        <h2>Projects</h2>
        <div class="personal-report__cards">
          <ProjectCard
            v-for="(card, i) in data.report.projectCards"
            :key="i"
            :model-value="card"
            readonly
          />
        </div>
      </section>

      <section class="personal-report__tasks">
        <div v-if="data.report.majorTasksDid.length">
          <h2>Did</h2>
          <ul>
            <li v-for="(task, i) in data.report.majorTasksDid" :key="i">{{ task }}</li>
          </ul>
        </div>
        <div v-if="data.report.majorTasksToDo.length">
          <h2>To do</h2>
          <ul>
            <li v-for="(task, i) in data.report.majorTasksToDo" :key="i">{{ task }}</li>
          </ul>
        </div>
      </section>

      <section v-if="sortedAlerts.length">
        <h2>Alerts</h2>
        <ul class="personal-report__alerts">
          <li v-for="(alert, i) in sortedAlerts" :key="i" :class="`personal-report__alert--${alert.severity}`">
            <span class="personal-report__alert-severity">{{ SEVERITY_LABEL[alert.severity] }}</span>
            {{ alert.content }}
          </li>
        </ul>
      </section>

      <section v-if="data.report.opportunities.length">
        <h2>Opportunities</h2>
        <ul>
          <li v-for="(opp, i) in data.report.opportunities" :key="i">{{ opp.content }}</li>
        </ul>
      </section>
    </template>
  </main>
</template>

<style scoped>
.personal-report {
  max-width: 720px;
  margin: 0 auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.personal-report__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.personal-report__meta {
  color: #666;
}
.personal-report__edit {
  border: 1px solid #ddd;
  border-radius: 0.375rem;
  padding: 0.4rem 0.9rem;
  text-decoration: none;
  color: inherit;
  font-weight: 600;
}
.personal-report__counters {
  display: flex;
  gap: 1.5rem;
}
.personal-report__stat {
  display: flex;
  flex-direction: column;
}
.personal-report__stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}
.personal-report__stat-label {
  color: #666;
  font-size: 0.85rem;
}
.personal-report__cards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.personal-report__tasks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.personal-report__alerts {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  list-style: none;
  padding: 0;
}
.personal-report__alerts li {
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  border-left: 4px solid #ccc;
}
.personal-report__alert--critical {
  border-left-color: #ef4444;
  background: #fee2e2;
}
.personal-report__alert--warn {
  border-left-color: #f97316;
  background: #ffedd5;
}
.personal-report__alert--info {
  border-left-color: #3b82f6;
  background: #dbeafe;
}
.personal-report__alert-severity {
  font-weight: 600;
  margin-right: 0.5rem;
}
.personal-report__error {
  color: #991b1b;
}
</style>
