<script setup lang="ts">
withDefaults(
  defineProps<{
    padded?: boolean;
    interactive?: boolean;
  }>(),
  {
    padded: true,
    interactive: false,
  },
);
</script>

<template>
  <div class="pulse-card" :class="{ 'pulse-card--padded': padded, 'pulse-card--interactive': interactive }">
    <header v-if="$slots.header" class="pulse-card__header">
      <slot name="header" />
    </header>
    <div class="pulse-card__body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="pulse-card__footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<style scoped>
.pulse-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background-color var(--transition-base);
}

.pulse-card--interactive {
  cursor: pointer;
}

.pulse-card--interactive:hover {
  transform: translateY(-2px);
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
}

.pulse-card--interactive:active {
  transform: translateY(-1px);
}

.pulse-card--padded .pulse-card__body {
  padding: var(--space-5);
}

.pulse-card__header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
  font-weight: var(--font-weight-semibold);
}

.pulse-card__footer {
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border);
}
</style>
