<script setup lang="ts">
import { computed } from 'vue';
import type { CompletionRingResult } from '../../api/pulse';

const props = defineProps<{
  completion: CompletionRingResult;
}>();

const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const dashOffset = computed(() => CIRCUMFERENCE * (1 - props.completion.percent / 100));
</script>

<template>
  <div class="completion-ring" title="How much of this week's report is filled in — never blocks Submit">
    <svg viewBox="0 0 40 40" class="completion-ring__svg">
      <circle cx="20" cy="20" :r="RADIUS" class="completion-ring__track" />
      <circle
        cx="20"
        cy="20"
        :r="RADIUS"
        class="completion-ring__fill"
        :stroke-dasharray="CIRCUMFERENCE"
        :stroke-dashoffset="dashOffset"
      />
    </svg>
    <span class="completion-ring__label">{{ completion.percent }}%</span>
  </div>
</template>

<style scoped>
.completion-ring {
  position: relative;
  width: 3rem;
  height: 3rem;
}
.completion-ring__svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.completion-ring__track {
  fill: none;
  stroke: #e5e7eb;
  stroke-width: 4;
}
.completion-ring__fill {
  fill: none;
  stroke: #22c55e;
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.3s ease;
}
.completion-ring__label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
}
</style>
