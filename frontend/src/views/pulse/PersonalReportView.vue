<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import * as api from '../../api/pulse';
import type { ReportViewResponse } from '../../api/pulse';
import ReportRenderer from '../../components/pulse/ReportRenderer.vue';

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

      <ReportRenderer :report="data.report" />
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
.personal-report__error {
  color: #991b1b;
}
</style>
