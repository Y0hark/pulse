<script setup lang="ts">
import { computed } from 'vue';
import type { WorkloadDistributionBucket } from '../../api/pulse';

const props = defineProps<{
  distribution: WorkloadDistributionBucket[];
}>();

const BUCKET_LABEL: Record<string, string> = { low: 'Low', steady: 'Steady', high: 'High', critical: 'Critical' };
const BUCKET_COLOR: Record<string, string> = {
  low: 'var(--color-info)',
  steady: 'var(--color-success)',
  high: 'var(--color-warning)',
  critical: 'var(--color-danger)',
};

const maxCount = computed(() => Math.max(1, ...props.distribution.map((d) => d.count)));
</script>

<template>
  <div class="distribution-chart">
    <div v-for="d in distribution" :key="d.bucket" class="distribution-chart__row">
      <span class="distribution-chart__label">{{ BUCKET_LABEL[d.bucket] }}</span>
      <div class="distribution-chart__track">
        <div
          class="distribution-chart__bar"
          :style="{ width: `${(d.count / maxCount) * 100}%`, backgroundColor: BUCKET_COLOR[d.bucket] }"
        />
      </div>
      <span class="distribution-chart__count">{{ d.count }}</span>
    </div>
  </div>
</template>

<style scoped>
.distribution-chart {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.distribution-chart__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.distribution-chart__label {
  min-width: 4.5rem;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}
.distribution-chart__track {
  flex: 1;
  height: 0.9rem;
  background: var(--color-surface-alt);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.distribution-chart__bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--transition-base);
}
.distribution-chart__count {
  min-width: 1.5rem;
  text-align: right;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
