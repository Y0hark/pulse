<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
  }>(),
  {},
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

function close(): void {
  emit('update:modelValue', false);
}
</script>

<template>
  <Teleport to="body">
    <Transition name="pulse-modal-fade">
      <div v-if="modelValue" class="pulse-modal-overlay" @click.self="close">
        <div class="pulse-modal" role="dialog" aria-modal="true">
          <header v-if="title || $slots.header" class="pulse-modal__header">
            <slot name="header">
              <h3 class="pulse-modal__title">{{ title }}</h3>
            </slot>
            <button class="pulse-modal__close" type="button" aria-label="Close" @click="close">✕</button>
          </header>
          <div class="pulse-modal__body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="pulse-modal__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pulse-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(8, 10, 14, 0.6);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  z-index: 100;
}

.pulse-modal {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.pulse-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.pulse-modal__title {
  margin: 0;
  font-size: var(--font-size-lg);
}

.pulse-modal__close {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--font-size-md);
  padding: var(--space-1);
  line-height: 1;
}
.pulse-modal__close:hover {
  color: var(--color-text-primary);
}

.pulse-modal__body {
  padding: var(--space-5);
}

.pulse-modal__footer {
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

.pulse-modal-fade-enter-active,
.pulse-modal-fade-leave-active {
  transition: opacity var(--transition-base);
}
.pulse-modal-fade-enter-from,
.pulse-modal-fade-leave-to {
  opacity: 0;
}
</style>
