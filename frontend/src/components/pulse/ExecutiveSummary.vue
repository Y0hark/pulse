<script setup lang="ts">
withDefaults(
  defineProps<{
    points: string[];
    title?: string;
  }>(),
  {
    title: 'Executive summary',
  },
);
</script>

<template>
  <section class="executive-summary">
    <h2 class="executive-summary__title">{{ title }}</h2>
    <ul v-if="points.length" class="executive-summary__list">
      <li v-for="(point, i) in points" :key="i">{{ point }}</li>
    </ul>
    <p v-else class="executive-summary__empty">Nothing notable to flag this period.</p>
  </section>
</template>

<style scoped>
.executive-summary {
  background: var(--color-accent-soft);
  border: 1px solid var(--color-accent-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
}
.executive-summary__title {
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
}
.executive-summary__list {
  margin: 0;
  padding-left: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  color: var(--color-text-primary);
}
.executive-summary__empty {
  margin: 0;
  color: var(--color-text-secondary);
}
</style>
