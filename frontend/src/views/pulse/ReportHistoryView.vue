<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import * as api from '../../api/pulse';
import type { FrozenPeriodEntry } from '../../api/pulse';
import ReportHeader from '../../components/pulse/ReportHeader.vue';
import { PulseCard, PulseEmptyState, PulseErrorState, PulseSkeleton, PulseTable } from '../../components/ui';
import { useSessionStore } from '../../stores/session';

const session = useSessionStore();

const history = ref<FrozenPeriodEntry[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const columns = [
  { key: 'isoWeek', label: 'Period' },
  { key: 'frozenAt', label: 'Frozen at' },
  { key: 'view', label: '', align: 'right' as const },
];

async function load(): Promise<void> {
  if (!session.currentTeamSlug) return;
  loading.value = true;
  error.value = null;
  try {
    const res = await api.getPeriodHistory(session.currentTeamSlug);
    history.value = res.history;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load report history';
  } finally {
    loading.value = false;
  }
}

const rows = () =>
  history.value.map((entry) => ({
    id: entry.period.id,
    isoWeek: entry.period.isoWeek,
    frozenAt: new Date(entry.frozenAt).toLocaleString(),
    periodId: entry.period.id,
  }));

onMounted(() => {
  if (session.loaded) void load();
  else void session.load();
});

watch(() => session.currentTeamSlug, load);
</script>

<template>
  <main class="report-history">
    <ReportHeader eyebrow="Historical report" title="Report history" subtitle="Every period this team has frozen, most recent first." />

    <div v-if="loading" class="report-history__skeleton">
      <PulseSkeleton variant="block" height="3rem" />
      <PulseSkeleton variant="block" height="3rem" />
      <PulseSkeleton variant="block" height="3rem" />
    </div>

    <PulseErrorState v-else-if="error" title="Failed to load report history" :description="error" retryable @retry="load" />

    <PulseCard v-else-if="history.length === 0" :padded="false">
      <PulseEmptyState
        icon="🗂️"
        title="No frozen periods yet"
        description="Freeze a period from the team dashboard to start building a historical record."
      />
    </PulseCard>

    <PulseCard v-else :padded="false">
      <PulseTable :columns="columns" :rows="rows()">
        <template #cell-view="{ row }">
          <router-link :to="`/periods/${row.periodId}/snapshot`">View report</router-link>
        </template>
      </PulseTable>
    </PulseCard>
  </main>
</template>

<style scoped>
.report-history {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.report-history__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
