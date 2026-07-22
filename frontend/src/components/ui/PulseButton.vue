<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    type: 'button',
  },
);
</script>

<template>
  <button
    class="pulse-button"
    :class="[`pulse-button--${variant}`, `pulse-button--${size}`, { 'pulse-button--loading': loading }]"
    :type="type"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="pulse-button__spinner motion-pop-in" aria-hidden="true" />
    <span class="pulse-button__label"><slot /></span>
  </button>
</template>

<style scoped>
.pulse-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--duration-instant) var(--ease-out);
  white-space: nowrap;
}

.pulse-button:active:not(:disabled) {
  transform: scale(0.97);
}

.pulse-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.pulse-button--loading {
  cursor: progress;
}

/* Sizes */
.pulse-button--sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-sm);
}
.pulse-button--md {
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-md);
}
.pulse-button--lg {
  padding: var(--space-3) var(--space-6);
  font-size: var(--font-size-lg);
}

/* Variants */
.pulse-button--primary {
  background: var(--color-accent);
  color: var(--color-text-inverse);
}
.pulse-button--primary:hover:not(:disabled) {
  background: var(--color-accent-strong);
  box-shadow: var(--shadow-accent-glow);
}

.pulse-button--secondary {
  background: var(--color-surface-alt);
  border-color: var(--color-border-strong);
  color: var(--color-text-primary);
}
.pulse-button--secondary:hover:not(:disabled) {
  background: var(--color-surface-hover);
  border-color: var(--color-text-muted);
}

.pulse-button--ghost {
  background: transparent;
  color: var(--color-text-secondary);
}
.pulse-button--ghost:hover:not(:disabled) {
  background: var(--color-surface-alt);
  color: var(--color-text-primary);
}

.pulse-button--danger {
  background: var(--color-danger);
  color: var(--color-text-inverse);
}
.pulse-button--danger:hover:not(:disabled) {
  filter: brightness(1.08);
  box-shadow: 0 4px 16px rgba(240, 85, 74, 0.25);
}

.pulse-button__spinner {
  width: 0.9em;
  height: 0.9em;
  border-radius: 50%;
  border: 2px solid currentColor;
  border-top-color: transparent;
  animation: motion-spin 0.6s linear infinite;
}
</style>
