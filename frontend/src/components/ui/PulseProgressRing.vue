<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    percent: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
  }>(),
  {
    size: 48,
    strokeWidth: 4,
    color: 'var(--color-accent)',
  },
);

const radius = computed(() => props.size / 2 - props.strokeWidth);
const circumference = computed(() => 2 * Math.PI * radius.value);
const clampedPercent = computed(() => Math.min(100, Math.max(0, props.percent)));
const dashOffset = computed(() => circumference.value * (1 - clampedPercent.value / 100));
</script>

<template>
  <div class="pulse-progress-ring" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :viewBox="`0 0 ${size} ${size}`" class="pulse-progress-ring__svg">
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        class="pulse-progress-ring__track"
        :stroke-width="strokeWidth"
      />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        class="pulse-progress-ring__fill"
        :stroke-width="strokeWidth"
        :stroke="color"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
      />
    </svg>
    <span class="pulse-progress-ring__label"><slot>{{ Math.round(clampedPercent) }}%</slot></span>
  </div>
</template>

<style scoped>
.pulse-progress-ring {
  position: relative;
}

.pulse-progress-ring__svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.pulse-progress-ring__track {
  fill: none;
  stroke: var(--color-border);
}

.pulse-progress-ring__fill {
  fill: none;
  stroke-linecap: round;
  transition: stroke-dashoffset var(--transition-base);
}

.pulse-progress-ring__label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
</style>
