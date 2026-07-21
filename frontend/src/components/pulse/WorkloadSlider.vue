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
  gap: 0.5rem;
}
.workload-slider__label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}
.workload-slider__badge {
  color: white;
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  font-size: 0.85rem;
  font-weight: 500;
}
input[type='range'] {
  width: 100%;
}
</style>
