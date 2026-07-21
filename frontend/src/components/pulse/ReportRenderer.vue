<script setup lang="ts">
import { computed } from 'vue';
import type { AlertSeverity, ReportRecord } from '../../api/pulse';
import StatGauge from './StatGauge.vue';
import ProjectCard from './ProjectCard.vue';

const props = defineProps<{
  report: ReportRecord;
}>();

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, warn: 1, info: 2 };
const SEVERITY_LABEL: Record<AlertSeverity, string> = { critical: '🔴 Critical', warn: '🟠 Warning', info: 'ℹ️ Info' };

const sortedAlerts = computed(() =>
  [...props.report.alerts].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
);
</script>

<template>
  <div class="report-renderer">
    <section>
      <StatGauge :value="report.workload" label="Workload" />
    </section>

    <section class="report-renderer__counters">
      <div class="report-renderer__stat">
        <span class="report-renderer__stat-value">{{ report.deliveredCnt }}</span>
        <span class="report-renderer__stat-label">Delivered</span>
      </div>
      <div class="report-renderer__stat">
        <span class="report-renderer__stat-value">{{ report.inflightCnt }}</span>
        <span class="report-renderer__stat-label">In-flight</span>
      </div>
    </section>

    <section v-if="report.projectCards.length">
      <h2>Projects</h2>
      <div class="report-renderer__cards">
        <ProjectCard v-for="(card, i) in report.projectCards" :key="i" :model-value="card" readonly />
      </div>
    </section>

    <section class="report-renderer__tasks">
      <div v-if="report.majorTasksDid.length">
        <h2>Did</h2>
        <ul>
          <li v-for="(task, i) in report.majorTasksDid" :key="i">{{ task }}</li>
        </ul>
      </div>
      <div v-if="report.majorTasksToDo.length">
        <h2>To do</h2>
        <ul>
          <li v-for="(task, i) in report.majorTasksToDo" :key="i">{{ task }}</li>
        </ul>
      </div>
    </section>

    <section v-if="sortedAlerts.length">
      <h2>Alerts</h2>
      <ul class="report-renderer__alerts">
        <li v-for="(alert, i) in sortedAlerts" :key="i" :class="`report-renderer__alert--${alert.severity}`">
          <span class="report-renderer__alert-severity">{{ SEVERITY_LABEL[alert.severity] }}</span>
          {{ alert.content }}
        </li>
      </ul>
    </section>

    <section v-if="report.opportunities.length">
      <h2>Opportunities</h2>
      <ul>
        <li v-for="(opp, i) in report.opportunities" :key="i">{{ opp.content }}</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.report-renderer {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.report-renderer__counters {
  display: flex;
  gap: 1.5rem;
}
.report-renderer__stat {
  display: flex;
  flex-direction: column;
}
.report-renderer__stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}
.report-renderer__stat-label {
  color: #666;
  font-size: 0.85rem;
}
.report-renderer__cards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.report-renderer__tasks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.report-renderer__alerts {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  list-style: none;
  padding: 0;
}
.report-renderer__alerts li {
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  border-left: 4px solid #ccc;
}
.report-renderer__alert--critical {
  border-left-color: #ef4444;
  background: #fee2e2;
}
.report-renderer__alert--warn {
  border-left-color: #f97316;
  background: #ffedd5;
}
.report-renderer__alert--info {
  border-left-color: #3b82f6;
  background: #dbeafe;
}
.report-renderer__alert-severity {
  font-weight: 600;
  margin-right: 0.5rem;
}
</style>
