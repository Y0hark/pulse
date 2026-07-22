<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  generatedAt?: string | null;
}>();

const generatedLabel = computed(() => {
  if (!props.generatedAt) return null;
  return new Date(props.generatedAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
});
</script>

<template>
  <header class="report-header">
    <div class="report-header__text">
      <span v-if="eyebrow" class="report-header__eyebrow">{{ eyebrow }}</span>
      <h1 class="report-header__title tnp-display">{{ title }}</h1>
      <p v-if="subtitle" class="report-header__subtitle">{{ subtitle }}</p>
      <p v-if="generatedLabel" class="report-header__freshness">Generated {{ generatedLabel }}</p>
    </div>
    <div v-if="$slots.actions" class="report-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-6);
  flex-wrap: wrap;
}
.report-header__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.report-header__eyebrow {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-accent);
}
.report-header__title {
  margin: 0;
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.01em;
}
.report-header__subtitle {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-md);
}
.report-header__freshness {
  margin: var(--space-1) 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}
.report-header__actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
</style>
