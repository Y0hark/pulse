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
    <span v-if="loading" class="pulse-button__spinner" aria-hidden="true" />
    <span class="pulse-button__label"><slot /></span>
  </button>
</template>

<style scoped>
.pulse-button {
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
    transform var(--transition-fast);
  white-space: nowrap;
}

.pulse-button:active:not(:disabled) {
  transform: translateY(1px);
}

.pulse-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
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
}

.pulse-button--secondary {
  background: var(--color-surface-alt);
  border-color: var(--color-border-strong);
  color: var(--color-text-primary);
}
.pulse-button--secondary:hover:not(:disabled) {
  background: var(--color-surface-hover);
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
}

.pulse-button__spinner {
  width: 0.9em;
  height: 0.9em;
  border-radius: 50%;
  border: 2px solid currentColor;
  border-top-color: transparent;
  animation: pulse-button-spin 0.6s linear infinite;
}

@keyframes pulse-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
