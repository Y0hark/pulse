<script setup lang="ts">
import { computed } from 'vue';
import type { AlertSeverity, ReportRecord } from '../../api/pulse';
import { metricGuidanceFor } from '../../utils/metricGuidance';
import { PulseCard, PulseStatCard } from '../ui';
import StatGauge from './StatGauge.vue';
import ProjectCard from './ProjectCard.vue';

const props = withDefaults(
  defineProps<{
    report: ReportRecord;
    profileCode?: string | null;
  }>(),
  { profileCode: null },
);

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, warn: 1, info: 2 };
const SEVERITY_LABEL: Record<AlertSeverity, string> = { critical: '🔴 Critical', warn: '🟠 Warning', info: 'ℹ️ Info' };

const sortedAlerts = computed(() =>
  [...props.report.alerts].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
);

const metricGuidance = computed(() => metricGuidanceFor(props.profileCode));
</script>

<template>
  <div class="report-renderer">
    <section class="report-renderer__hero">
      <PulseCard class="report-renderer__workload-card">
        <StatGauge :value="report.workload" label="Workload" />
      </PulseCard>
      <PulseStatCard :label="metricGuidance.deliveredLabel" :value="report.deliveredCnt" />
      <PulseStatCard :label="metricGuidance.inflightLabel" :value="report.inflightCnt" />
    </section>

    <section v-if="report.projectCards.length" class="report-renderer__section">
      <h2>Projects</h2>
      <div class="report-renderer__project-grid">
        <ProjectCard v-for="(card, i) in report.projectCards" :key="i" :model-value="card" readonly />
      </div>
    </section>

    <section v-if="report.majorTasksDid.length || report.majorTasksToDo.length" class="report-renderer__tasks">
      <PulseCard v-if="report.majorTasksDid.length" class="report-renderer__task-card">
        <h2>Did</h2>
        <ul>
          <li v-for="(task, i) in report.majorTasksDid" :key="i">{{ task }}</li>
        </ul>
      </PulseCard>
      <PulseCard v-if="report.majorTasksToDo.length" class="report-renderer__task-card">
        <h2>To do</h2>
        <ul>
          <li v-for="(task, i) in report.majorTasksToDo" :key="i">{{ task }}</li>
        </ul>
      </PulseCard>
    </section>

    <section v-if="sortedAlerts.length" class="report-renderer__section">
      <h2>Alerts</h2>
      <ul class="report-renderer__alerts">
        <li v-for="(alert, i) in sortedAlerts" :key="i" :class="`report-renderer__alert--${alert.severity}`">
          <span class="report-renderer__alert-severity">{{ SEVERITY_LABEL[alert.severity] }}</span>
          <span class="report-renderer__alert-content">{{ alert.content }}</span>
        </li>
      </ul>
    </section>

    <section v-if="report.opportunities.length" class="report-renderer__section">
      <h2>Opportunities</h2>
      <ul class="report-renderer__list">
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
  max-width: 100%;
}

.report-renderer__hero {
  display: grid;
  grid-template-columns: minmax(220px, 1.5fr) repeat(2, minmax(140px, 1fr));
  gap: var(--space-4);
}

@media (max-width: 640px) {
  .report-renderer__hero {
    grid-template-columns: 1fr;
  }
}

.report-renderer__workload-card {
  display: flex;
  align-items: center;
  min-width: 0;
}

.report-renderer__workload-card :deep(.pulse-card__body) {
  width: 100%;
}

.report-renderer__section h2,
.report-renderer__task-card h2 {
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-lg);
}

.report-renderer__project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-3);
}

.report-renderer__tasks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

@media (max-width: 640px) {
  .report-renderer__tasks {
    grid-template-columns: 1fr;
  }
}

.report-renderer__task-card ul,
.report-renderer__list {
  margin: 0;
  padding-left: var(--space-5);
  color: var(--color-text-primary);
  overflow-wrap: break-word;
}

.report-renderer__task-card li,
.report-renderer__list li {
  overflow-wrap: break-word;
}

.report-renderer__alerts {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
  padding: 0;
  margin: 0;
}
.report-renderer__alerts li {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  border-left: 4px solid var(--color-border-strong);
  color: var(--color-text-primary);
}
.report-renderer__alert-content {
  overflow-wrap: break-word;
  min-width: 0;
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
  white-space: nowrap;
}
</style>
