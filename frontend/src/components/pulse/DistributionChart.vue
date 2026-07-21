<script setup lang="ts">
import { computed } from 'vue';
import type { WorkloadDistributionBucket } from '../../api/pulse';

const props = defineProps<{
  distribution: WorkloadDistributionBucket[];
}>();

const BUCKET_LABEL: Record<string, string> = { low: 'Low', steady: 'Steady', high: 'High', critical: 'Critical' };
const BUCKET_COLOR: Record<string, string> = { low: '#3b82f6', steady: '#22c55e', high: '#f97316', critical: '#ef4444' };

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
  gap: 0.4rem;
}
.distribution-chart__row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.distribution-chart__label {
  min-width: 4.5rem;
  font-size: 0.85rem;
  font-weight: 600;
}
.distribution-chart__track {
  flex: 1;
  height: 0.9rem;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}
.distribution-chart__bar {
  height: 100%;
  border-radius: 999px;
  transition: width 0.2s ease;
}
.distribution-chart__count {
  min-width: 1.5rem;
  text-align: right;
  font-size: 0.85rem;
  color: #666;
}
</style>
