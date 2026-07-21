<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    retryable?: boolean;
  }>(),
  {
    title: 'Something went wrong',
    retryable: false,
  },
);

defineEmits<{
  retry: [];
}>();
</script>

<template>
  <div class="pulse-error-state">
    <span class="pulse-error-state__icon" aria-hidden="true">⚠️</span>
    <h4 class="pulse-error-state__title">{{ title }}</h4>
    <p v-if="description" class="pulse-error-state__description">{{ description }}</p>
    <button v-if="retryable" class="pulse-error-state__retry" type="button" @click="$emit('retry')">
      Retry
    </button>
    <slot />
  </div>
</template>

<style scoped>
.pulse-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-12) var(--space-6);
  color: var(--color-text-secondary);
}

.pulse-error-state__icon {
  font-size: 2rem;
  margin-bottom: var(--space-3);
}

.pulse-error-state__title {
  margin: 0 0 var(--space-1);
  color: var(--color-danger);
}

.pulse-error-state__description {
  margin: 0 0 var(--space-4);
  max-width: 36ch;
  font-size: var(--font-size-sm);
}

.pulse-error-state__retry {
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border-strong);
  color: var(--color-text-primary);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
}
.pulse-error-state__retry:hover {
  background: var(--color-surface-hover);
}
</style>
