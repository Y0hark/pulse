<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useDashboardStore } from '../../stores/dashboard';
import StatGauge from '../../components/pulse/StatGauge.vue';
import DistributionChart from '../../components/pulse/DistributionChart.vue';
import ProfileBreakdown from '../../components/pulse/ProfileBreakdown.vue';
import Leaderboard from '../../components/pulse/Leaderboard.vue';
import ReportHeader from '../../components/pulse/ReportHeader.vue';
import ExecutiveSummary from '../../components/pulse/ExecutiveSummary.vue';
import { PulseBadge, PulseButton, PulseCard, PulseErrorState, PulseSkeleton, PulseStatCard, PulseTable } from '../../components/ui';
import { useReportActions } from '../../composables/useReportActions';
import { summarizeDashboard } from '../../utils/reportSummary';
import * as api from '../../api/pulse';
import type { AlertSeverity, LeaderboardEntry } from '../../api/pulse';

const TEAM = 'ceva-logistics';

const store = useDashboardStore();
const { exportPdf, copyLink } = useReportActions();

const SEVERITY_LABEL: Record<AlertSeverity, string> = { critical: '🔴 Critical', warn: '🟠 Warning', info: 'ℹ️ Info' };
const SEVERITY_VARIANT: Record<AlertSeverity, 'danger' | 'warning' | 'accent'> = { critical: 'danger', warn: 'warning', info: 'accent' };
const HEALTH_LABEL: Record<string, string> = { good: '🟢 Good', at_risk: '🟠 At risk', blocked: '🔴 Blocked' };

const aggregate = computed(() => store.aggregate);
const generatedAt = ref(new Date().toISOString());
const summaryPoints = computed(() => (aggregate.value ? summarizeDashboard(aggregate.value) : []));

const memberColumns = [
  { key: 'displayName', label: 'Member' },
  { key: 'status', label: 'Status', align: 'right' as const },
];
const memberRows = computed(() => {
  if (!aggregate.value) return [];
  const submitted = aggregate.value.submissionStatus.submitted.map((m) => ({
    id: m.userId,
    displayName: m.displayName ?? 'Unnamed member',
    status: 'submitted',
  }));
  const pending = aggregate.value.submissionStatus.pending.map((m) => ({
    id: m.userId,
    displayName: m.displayName ?? 'Unnamed member',
    status: 'pending',
  }));
  return [...pending, ...submitted];
});

const leaderboardEntries = ref<LeaderboardEntry[]>([]);
const leaderboardOptIn = ref(false);
const leaderboardError = ref<string | null>(null);

async function loadLeaderboard(): Promise<void> {
  try {
    const [{ entries }, { leaderboardOptIn: optedIn }] = await Promise.all([
      api.getTeamLeaderboard(TEAM),
      api.getMyGamification(TEAM),
    ]);
    leaderboardEntries.value = entries;
    leaderboardOptIn.value = optedIn;
    leaderboardError.value = null;
  } catch (err) {
    leaderboardError.value = err instanceof Error ? err.message : 'Failed to load leaderboard';
  }
}

async function onToggleOptIn(optIn: boolean): Promise<void> {
  await api.setLeaderboardOptIn(TEAM, optIn);
  await loadLeaderboard();
}

function retry(): void {
  generatedAt.value = new Date().toISOString();
  void store.load(TEAM);
}

onMounted(() => {
  store.startPolling(TEAM);
  void loadLeaderboard();
});
onUnmounted(() => {
  store.stopPolling();
});
</script>

<template>
  <main class="team-dashboard">
    <div v-if="store.loading && !aggregate" class="team-dashboard__skeleton">
      <PulseSkeleton variant="block" height="4rem" />
      <PulseSkeleton variant="block" height="8rem" />
      <PulseSkeleton variant="block" height="12rem" />
    </div>

    <PulseErrorState
      v-else-if="store.error"
      title="Failed to load report"
      :description="store.error"
      retryable
      @retry="retry"
    />

    <template v-else-if="aggregate && store.period">
      <ReportHeader
        eyebrow="Weekly mission report"
        :title="`Team report — ${store.period.isoWeek}`"
        subtitle="Live view of this period's submissions, workload, and risks."
        :generated-at="generatedAt"
      >
        <template #actions>
          <PulseButton variant="secondary" size="sm" @click="copyLink">Copy link</PulseButton>
          <PulseButton variant="secondary" size="sm" @click="exportPdf">Export PDF</PulseButton>
          <router-link :to="`/periods/${store.period.id}/snapshot`">
            <PulseButton variant="ghost" size="sm">Freeze / snapshot</PulseButton>
          </router-link>
          <router-link :to="{ name: 'team', query: { period: store.period.isoWeek } }">
            <PulseButton variant="ghost" size="sm">Walkthrough</PulseButton>
          </router-link>
        </template>
      </ReportHeader>

      <ExecutiveSummary :points="summaryPoints" />

      <section class="team-dashboard__stats">
        <PulseStatCard label="Submitted" :value="`${aggregate.submissionStatus.submitted.length} / ${aggregate.submissionStatus.submitted.length + aggregate.submissionStatus.pending.length}`" />
        <PulseStatCard label="Mean workload" :value="aggregate.workload.mean" />
        <PulseStatCard label="Total delivered" :value="aggregate.totalDelivered" />
        <PulseStatCard label="Total in-flight" :value="aggregate.totalInFlight" />
      </section>

      <PulseCard>
        <template #header>Workload</template>
        <div class="team-dashboard__workload-stats">
          <StatGauge :value="aggregate.workload.mean" label="Mean" />
          <StatGauge :value="aggregate.workload.max" label="Max" />
          <StatGauge :value="aggregate.workload.min" label="Min" />
        </div>
        <DistributionChart :distribution="aggregate.workload.distribution" />
      </PulseCard>

      <PulseCard>
        <template #header>Project health</template>
        <div class="team-dashboard__health">
          <div class="team-dashboard__health-item" v-for="(count, status) in aggregate.projectHealth" :key="status">
            <span class="team-dashboard__health-value">{{ count }}</span>
            <span class="team-dashboard__health-label">{{ HEALTH_LABEL[status] }}</span>
          </div>
        </div>
      </PulseCard>

      <PulseCard>
        <template #header>By profile</template>
        <ProfileBreakdown :entries="aggregate.byProfile" />
      </PulseCard>

      <PulseCard v-if="aggregate.alerts.length">
        <template #header>Alerts</template>
        <ul class="team-dashboard__alerts">
          <li v-for="(alert, i) in aggregate.alerts" :key="i">
            <PulseBadge :variant="SEVERITY_VARIANT[alert.severity]">{{ SEVERITY_LABEL[alert.severity] }}</PulseBadge>
            {{ alert.content }}
          </li>
        </ul>
      </PulseCard>

      <PulseCard v-if="aggregate.opportunities.length">
        <template #header>Opportunities</template>
        <ul class="team-dashboard__opportunities">
          <li v-for="opp in aggregate.opportunities" :key="opp.id">{{ opp.content }}</li>
        </ul>
      </PulseCard>

      <PulseCard>
        <template #header>Submissions</template>
        <PulseTable :columns="memberColumns" :rows="memberRows">
          <template #cell-status="{ value }">
            <PulseBadge :variant="value === 'submitted' ? 'success' : 'warning'">
              {{ value === 'submitted' ? 'Submitted' : 'Pending' }}
            </PulseBadge>
          </template>
        </PulseTable>
      </PulseCard>

      <PulseCard>
        <p v-if="leaderboardError" class="team-dashboard__error">{{ leaderboardError }}</p>
        <Leaderboard v-else :entries="leaderboardEntries" :opted-in="leaderboardOptIn" @toggle-opt-in="onToggleOptIn" />
      </PulseCard>
    </template>
  </main>
</template>

<style scoped>
.team-dashboard {
  max-width: 960px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.team-dashboard__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.team-dashboard__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: var(--space-4);
}
.team-dashboard__workload-stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.team-dashboard__health {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
}
.team-dashboard__health-item {
  display: flex;
  flex-direction: column;
}
.team-dashboard__health-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}
.team-dashboard__health-label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.team-dashboard__alerts,
.team-dashboard__opportunities {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
  padding: 0;
  margin: 0;
}
.team-dashboard__alerts li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.team-dashboard__error {
  color: var(--color-danger);
}

@media print {
  .team-dashboard {
    max-width: none;
  }
}
</style>
