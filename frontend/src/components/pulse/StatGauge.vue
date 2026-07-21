<script setup lang="ts">
import { computed } from 'vue';
import { workloadZoneFor } from '../../utils/workloadZones';

const props = defineProps<{
  value: number;
  label?: string;
}>();

const zone = computed(() => workloadZoneFor(props.value));
</script>

<template>
  <div class="stat-gauge">
    <span class="stat-gauge__label">{{ label ?? 'Workload' }}</span>
    <div class="stat-gauge__track">
      <div class="stat-gauge__fill" :style="{ width: `${value}%`, backgroundColor: zone.color }" />
    </div>
    <span class="stat-gauge__badge" :style="{ backgroundColor: zone.color }">
      {{ zone.emoji }} {{ zone.label }} — {{ value }}
    </span>
  </div>
</template>

<style scoped>
.stat-gauge {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}
.stat-gauge__label {
  font-weight: var(--font-weight-semibold);
  min-width: 5.5rem;
  color: var(--color-text-primary);
}
.stat-gauge__track {
  flex: 1;
  height: 0.6rem;
  background: var(--color-surface-alt);
  border-radius: var(--radius-full);
  overflow: hidden;
  min-width: 0;
}
.stat-gauge__fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--transition-base);
}
.stat-gauge__badge {
  color: var(--color-text-inverse);
  border-radius: var(--radius-full);
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}
</style>
