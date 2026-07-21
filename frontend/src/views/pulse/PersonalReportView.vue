<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import * as api from '../../api/pulse';
import type { ReportViewResponse } from '../../api/pulse';
import ReportRenderer from '../../components/pulse/ReportRenderer.vue';
import { PulseBadge, PulseErrorState, PulseSkeleton } from '../../components/ui';

const TEAM = 'ceva-logistics';

const props = defineProps<{
  reportId: string;
}>();

const route = useRoute();

const data = ref<ReportViewResponse | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

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
    <div v-if="loading" class="personal-report__skeleton">
      <PulseSkeleton variant="block" height="2rem" />
      <PulseSkeleton variant="block" height="14rem" />
    </div>

    <PulseErrorState v-else-if="error" :description="error" retryable @retry="load" />

    <template v-else-if="data">
      <header class="personal-report__header">
        <div>
          <h1>{{ data.owner?.displayName ?? 'Weekly report' }}</h1>
          <p class="personal-report__meta">
            {{ data.period.isoWeek }}
            <PulseBadge :variant="data.report.submittedAt ? 'success' : 'neutral'">
              {{ data.report.submittedAt ? 'Submitted' : 'Draft' }}
            </PulseBadge>
          </p>
        </div>
        <router-link v-if="data.canEdit" class="personal-report__edit" :to="{ name: 'weekly-pulse' }">
          Edit
        </router-link>
      </header>

      <ReportRenderer :report="data.report" />
    </template>
  </main>
</template>

<style scoped>
.personal-report {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.personal-report__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.personal-report__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  flex-wrap: wrap;
}
.personal-report__meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  margin: 0;
}
.personal-report__edit {
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
  text-decoration: none;
  color: var(--color-text-primary);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}
.personal-report__edit:hover {
  background: var(--color-surface-hover);
}
</style>
