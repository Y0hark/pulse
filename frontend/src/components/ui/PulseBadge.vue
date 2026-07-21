<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'electric';
  }>(),
  {
    variant: 'neutral',
  },
);
</script>

<template>
  <span class="pulse-badge" :class="`pulse-badge--${variant}`">
    <slot />
  </span>
</template>

<style scoped>
.pulse-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0.15rem var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-normal);
  white-space: nowrap;
}

.pulse-badge--neutral {
  background: var(--color-surface-alt);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.pulse-badge--accent {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.pulse-badge--success {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.pulse-badge--warning {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}

.pulse-badge--danger {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.pulse-badge--electric {
  background: var(--color-electric-soft);
  color: var(--color-electric);
}
</style>
