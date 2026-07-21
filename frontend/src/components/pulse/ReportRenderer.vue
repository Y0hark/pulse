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
  gap: var(--space-6);
  min-width: 0;
}
.report-renderer__counters {
  display: flex;
  gap: var(--space-6);
}
.report-renderer__stat {
  display: flex;
  flex-direction: column;
}
.report-renderer__stat-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}
.report-renderer__stat-label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.report-renderer__cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.report-renderer__tasks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
.report-renderer__tasks ul {
  padding-left: var(--space-5);
  color: var(--color-text-primary);
}
@media (max-width: 640px) {
  .report-renderer__tasks {
    grid-template-columns: 1fr;
  }
}
.report-renderer__alerts {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
  padding: 0;
}
.report-renderer__alerts li {
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  border-left: 4px solid var(--color-border-strong);
  color: var(--color-text-primary);
  overflow-wrap: break-word;
}
.report-renderer__alert--critical {
  border-left-color: var(--color-danger);
  background: var(--color-danger-soft);
}
.report-renderer__alert--warn {
  border-left-color: var(--color-warning);
  background: var(--color-warning-soft);
}
.report-renderer__alert--info {
  border-left-color: var(--color-info);
  background: var(--color-info-soft);
}
.report-renderer__alert-severity {
  font-weight: var(--font-weight-semibold);
  margin-right: var(--space-2);
}
</style>
