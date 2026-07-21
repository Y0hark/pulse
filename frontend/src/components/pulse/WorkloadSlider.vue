<script setup lang="ts">
import { computed } from 'vue';
import { workloadZoneFor } from '../../utils/workloadZones';

const props = defineProps<{
  modelValue: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

const zone = computed(() => workloadZoneFor(props.modelValue));

function onInput(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value);
  emit('update:modelValue', value);
}
</script>

<template>
  <div class="workload-slider">
    <label class="workload-slider__label">
      Workload
      <span class="workload-slider__badge" :style="{ backgroundColor: zone.color }">
        {{ zone.emoji }} {{ zone.label }} — {{ modelValue }}
      </span>
    </label>
    <input
      type="range"
      min="0"
      max="100"
      :value="modelValue"
      :disabled="disabled"
      :style="{ accentColor: zone.color }"
      @input="onInput"
    />
  </div>
</template>

<style scoped>
.workload-slider {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.workload-slider__label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}
.workload-slider__badge {
  color: var(--color-text-inverse);
  border-radius: var(--radius-full);
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}
input[type='range'] {
  width: 100%;
}
</style>
