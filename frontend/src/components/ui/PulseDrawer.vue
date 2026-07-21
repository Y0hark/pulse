<script setup lang="ts">
import { onUnmounted, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    side?: 'left' | 'right';
  }>(),
  {
    side: 'right',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

function close(): void {
  emit('update:modelValue', false);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close();
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) window.addEventListener('keydown', onKeydown);
    else window.removeEventListener('keydown', onKeydown);
  },
  { immediate: true },
);
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <Teleport to="body">
    <Transition name="pulse-drawer-fade">
      <div v-if="modelValue" class="pulse-drawer-overlay" @click.self="close">
        <Transition :name="`pulse-drawer-slide-${side}`">
          <aside v-if="modelValue" class="pulse-drawer" :class="`pulse-drawer--${side}`">
            <header v-if="title || $slots.header" class="pulse-drawer__header">
              <slot name="header">
                <h3 class="pulse-drawer__title">{{ title }}</h3>
              </slot>
              <button class="pulse-drawer__close" type="button" aria-label="Close" @click="close">✕</button>
            </header>
            <div class="pulse-drawer__body">
              <slot />
            </div>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pulse-drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(8, 10, 14, 0.6);
  display: flex;
  z-index: 100;
}

.pulse-drawer {
  width: 100%;
  max-width: 380px;
  height: 100%;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.pulse-drawer--right {
  margin-left: auto;
}
.pulse-drawer--left {
  margin-right: auto;
  border-left: none;
  border-right: 1px solid var(--color-border);
}

.pulse-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.pulse-drawer__title {
  margin: 0;
  font-size: var(--font-size-lg);
}

.pulse-drawer__close {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--font-size-md);
}
.pulse-drawer__close:hover {
  color: var(--color-text-primary);
}

.pulse-drawer__body {
  padding: var(--space-5);
  flex: 1;
}

.pulse-drawer-fade-enter-active,
.pulse-drawer-fade-leave-active {
  transition: opacity var(--transition-base);
}
.pulse-drawer-fade-enter-from,
.pulse-drawer-fade-leave-to {
  opacity: 0;
}

.pulse-drawer-slide-right-enter-active,
.pulse-drawer-slide-right-leave-active,
.pulse-drawer-slide-left-enter-active,
.pulse-drawer-slide-left-leave-active {
  transition: transform var(--transition-base);
}
.pulse-drawer-slide-right-enter-from,
.pulse-drawer-slide-right-leave-to {
  transform: translateX(100%);
}
.pulse-drawer-slide-left-enter-from,
.pulse-drawer-slide-left-leave-to {
  transform: translateX(-100%);
}
</style>
