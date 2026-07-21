<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string;
    title: string;
    description?: string;
  }>(),
  {
    icon: '📭',
  },
);
</script>

<template>
  <div class="pulse-empty-state">
    <span class="pulse-empty-state__icon" aria-hidden="true">{{ icon }}</span>
    <h4 class="pulse-empty-state__title">{{ title }}</h4>
    <p v-if="description" class="pulse-empty-state__description">{{ description }}</p>
    <div v-if="$slots.default" class="pulse-empty-state__action">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.pulse-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-12) var(--space-6);
  color: var(--color-text-secondary);
}

.pulse-empty-state__icon {
  font-size: 2rem;
  margin-bottom: var(--space-3);
}

.pulse-empty-state__title {
  margin: 0 0 var(--space-1);
  color: var(--color-text-primary);
}

.pulse-empty-state__description {
  margin: 0;
  max-width: 32ch;
  font-size: var(--font-size-sm);
}

.pulse-empty-state__action {
  margin-top: var(--space-4);
}
</style>
