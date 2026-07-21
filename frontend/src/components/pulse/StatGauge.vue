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
  gap: 0.75rem;
}
.stat-gauge__label {
  font-weight: 600;
  min-width: 5.5rem;
}
.stat-gauge__track {
  flex: 1;
  height: 0.6rem;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}
.stat-gauge__fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.2s ease;
}
.stat-gauge__badge {
  color: white;
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
}
</style>
