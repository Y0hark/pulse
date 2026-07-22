<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'flat';
    trendLabel?: string;
  }>(),
  {},
);

const TREND_SYMBOL: Record<'up' | 'down' | 'flat', string> = {
  up: '▲',
  down: '▼',
  flat: '—',
};
</script>

<template>
  <div class="pulse-stat-card">
    <span class="pulse-stat-card__label">{{ label }}</span>
    <div class="pulse-stat-card__row">
      <span class="pulse-stat-card__value">{{ value }}</span>
      <span v-if="trend" class="pulse-stat-card__trend" :class="`pulse-stat-card__trend--${trend}`">
        {{ TREND_SYMBOL[trend] }} <span v-if="trendLabel">{{ trendLabel }}</span>
      </span>
    </div>
    <div v-if="$slots.default" class="pulse-stat-card__extra">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.pulse-stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.pulse-stat-card:hover {
  border-color: var(--color-accent-border);
  box-shadow: var(--shadow-md);
}

.pulse-stat-card__label {
  display: block;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

.pulse-stat-card__row {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
}

.pulse-stat-card__value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.02em;
}

.pulse-stat-card__trend {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.pulse-stat-card__trend--up {
  color: var(--color-success);
}
.pulse-stat-card__trend--down {
  color: var(--color-danger);
}
.pulse-stat-card__trend--flat {
  color: var(--color-text-muted);
}

.pulse-stat-card__extra {
  margin-top: var(--space-3);
}
</style>
