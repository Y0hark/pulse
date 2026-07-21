<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'text' | 'block' | 'circle';
    width?: string;
    height?: string;
  }>(),
  {
    variant: 'text',
  },
);
</script>

<template>
  <span
    class="pulse-skeleton"
    :class="`pulse-skeleton--${variant}`"
    :style="{ width, height }"
    aria-hidden="true"
  />
</template>

<style scoped>
.pulse-skeleton {
  display: block;
  background: linear-gradient(
    100deg,
    var(--color-surface-alt) 30%,
    var(--color-surface-hover) 50%,
    var(--color-surface-alt) 70%
  );
  background-size: 200% 100%;
  animation: pulse-skeleton-shimmer 1.4s ease-in-out infinite;
  border-radius: var(--radius-sm);
}

.pulse-skeleton--text {
  width: 100%;
  height: 0.9em;
}

.pulse-skeleton--block {
  width: 100%;
  height: 5rem;
  border-radius: var(--radius-md);
}

.pulse-skeleton--circle {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-full);
}

@keyframes pulse-skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
