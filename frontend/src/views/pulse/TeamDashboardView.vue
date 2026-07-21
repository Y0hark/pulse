<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useDashboardStore } from '../../stores/dashboard';
import StatGauge from '../../components/pulse/StatGauge.vue';
import DistributionChart from '../../components/pulse/DistributionChart.vue';
import ProfileBreakdown from '../../components/pulse/ProfileBreakdown.vue';
import type { AlertSeverity } from '../../api/pulse';

const TEAM = 'ceva-logistics';

const store = useDashboardStore();

const SEVERITY_LABEL: Record<AlertSeverity, string> = { critical: '🔴 Critical', warn: '🟠 Warning', info: 'ℹ️ Info' };
const HEALTH_LABEL: Record<string, string> = { good: '🟢 Good', at_risk: '🟠 At risk', blocked: '🔴 Blocked' };

const aggregate = computed(() => store.aggregate);

onMounted(() => {
  store.startPolling(TEAM);
});
onUnmounted(() => {
  store.stopPolling();
});
</script>

<template>
  <main class="team-dashboard">
    <p v-if="store.loading">Loading…</p>
    <p v-else-if="store.error" class="team-dashboard__error">{{ store.error }}</p>

    <template v-else-if="aggregate && store.period">
      <header class="team-dashboard__header">
        <h1>Team dashboard — {{ store.period.isoWeek }}</h1>
        <div class="team-dashboard__header-right">
          <p class="team-dashboard__submission">
            {{ aggregate.submissionStatus.submitted.length }} submitted ·
            {{ aggregate.submissionStatus.pending.length }} pending
          </p>
          <router-link :to="`/periods/${store.period.id}/snapshot`">Freeze / view snapshot</router-link>
          <router-link :to="{ path: '/walkthrough', query: { period: store.period.isoWeek } }">Walkthrough</router-link>
        </div>
      </header>

      <section class="team-dashboard__workload">
        <h2>Workload</h2>
        <div class="team-dashboard__workload-stats">
          <StatGauge :value="aggregate.workload.mean" label="Mean" />
          <StatGauge :value="aggregate.workload.max" label="Max" />
          <StatGauge :value="aggregate.workload.min" label="Min" />
        </div>
        <DistributionChart :distribution="aggregate.workload.distribution" />
      </section>

      <section class="team-dashboard__totals">
        <div class="team-dashboard__stat">
          <span class="team-dashboard__stat-value">{{ aggregate.totalDelivered }}</span>
          <span class="team-dashboard__stat-label">Total delivered</span>
        </div>
        <div class="team-dashboard__stat">
          <span class="team-dashboard__stat-value">{{ aggregate.totalInFlight }}</span>
          <span class="team-dashboard__stat-label">Total in-flight</span>
        </div>
        <div class="team-dashboard__stat" v-for="(count, status) in aggregate.projectHealth" :key="status">
          <span class="team-dashboard__stat-value">{{ count }}</span>
          <span class="team-dashboard__stat-label">{{ HEALTH_LABEL[status] }}</span>
        </div>
      </section>

      <section>
        <h2>By profile</h2>
        <ProfileBreakdown :entries="aggregate.byProfile" />
      </section>

      <section v-if="aggregate.alerts.length">
        <h2>Alerts</h2>
        <ul class="team-dashboard__alerts">
          <li v-for="(alert, i) in aggregate.alerts" :key="i" :class="`team-dashboard__alert--${alert.severity}`">
            <span class="team-dashboard__alert-severity">{{ SEVERITY_LABEL[alert.severity] }}</span>
            {{ alert.content }}
          </li>
        </ul>
      </section>

      <section v-if="aggregate.opportunities.length">
        <h2>Opportunities</h2>
        <ul>
          <li v-for="opp in aggregate.opportunities" :key="opp.id">{{ opp.content }}</li>
        </ul>
      </section>

      <section v-if="aggregate.submissionStatus.pending.length">
        <h2>Pending</h2>
        <ul class="team-dashboard__pending">
          <li v-for="member in aggregate.submissionStatus.pending" :key="member.userId">
            {{ member.displayName ?? 'Unnamed member' }}
          </li>
        </ul>
      </section>
    </template>
  </main>
</template>

<style scoped>
.team-dashboard {
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.team-dashboard__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.team-dashboard__header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}
.team-dashboard__submission {
  color: #666;
}
.team-dashboard__workload-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.team-dashboard__totals {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}
.team-dashboard__stat {
  display: flex;
  flex-direction: column;
}
.team-dashboard__stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}
.team-dashboard__stat-label {
  color: #666;
  font-size: 0.85rem;
}
.team-dashboard__alerts,
.team-dashboard__pending {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  list-style: none;
  padding: 0;
}
.team-dashboard__alerts li {
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  border-left: 4px solid #ccc;
}
.team-dashboard__alert--critical {
  border-left-color: #ef4444;
  background: #fee2e2;
}
.team-dashboard__alert--warn {
  border-left-color: #f97316;
  background: #ffedd5;
}
.team-dashboard__alert--info {
  border-left-color: #3b82f6;
  background: #dbeafe;
}
.team-dashboard__alert-severity {
  font-weight: 600;
  margin-right: 0.5rem;
}
.team-dashboard__pending li {
  color: #666;
}
.team-dashboard__error {
  color: #991b1b;
}
</style>
