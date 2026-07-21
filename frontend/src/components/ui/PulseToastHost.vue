<script setup lang="ts">
import { useToast } from '../../composables/useToast';

const { toasts, dismiss } = useToast();
</script>

<template>
  <Teleport to="body">
    <div class="pulse-toast-host">
      <TransitionGroup name="pulse-toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pulse-toast"
          :class="`pulse-toast--${toast.variant}`"
          role="status"
        >
          <span class="pulse-toast__message">{{ toast.message }}</span>
          <button class="pulse-toast__close" type="button" aria-label="Dismiss" @click="dismiss(toast.id)">
            ✕
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.pulse-toast-host {
  position: fixed;
  bottom: var(--space-5);
  right: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  z-index: 200;
  max-width: 360px;
}

.pulse-toast {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-left: 3px solid var(--color-text-muted);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  box-shadow: var(--shadow-md);
  font-size: var(--font-size-sm);
}

.pulse-toast--success {
  border-left-color: var(--color-success);
}
.pulse-toast--warning {
  border-left-color: var(--color-warning);
}
.pulse-toast--danger {
  border-left-color: var(--color-danger);
}

.pulse-toast__message {
  flex: 1;
  color: var(--color-text-primary);
}

.pulse-toast__close {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  line-height: 1;
}
.pulse-toast__close:hover {
  color: var(--color-text-primary);
}

.pulse-toast-enter-active,
.pulse-toast-leave-active {
  transition:
    opacity var(--transition-base),
    transform var(--transition-base);
}
.pulse-toast-enter-from,
.pulse-toast-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>
