<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string;
    tabs: Array<{ value: string; label: string }>;
  }>(),
  {},
);

defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<template>
  <div class="pulse-tabs">
    <div class="pulse-tabs__list" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        role="tab"
        class="pulse-tabs__tab"
        :class="{ 'pulse-tabs__tab--active': tab.value === modelValue }"
        :aria-selected="tab.value === modelValue"
        @click="$emit('update:modelValue', tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="pulse-tabs__panel">
      <slot :active="modelValue" />
    </div>
  </div>
</template>

<style scoped>
.pulse-tabs__list {
  display: flex;
  gap: var(--space-1);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-4);
}

.pulse-tabs__tab {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-secondary);
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast);
  transform: translateY(1px);
}

.pulse-tabs__tab:hover {
  color: var(--color-text-primary);
}

.pulse-tabs__tab--active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}
</style>
