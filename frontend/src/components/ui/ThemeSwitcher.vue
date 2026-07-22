<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { THEME_OPTIONS, useTheme } from '../../composables/useTheme';

const { theme, setTheme } = useTheme();

const THEME_GLYPH: Record<string, string> = {
  dimmed: '◐',
  light: '☀',
  midnight: '●',
  parchment: '▢',
};

const open = ref(false);
const root = ref<HTMLElement | null>(null);

function toggle(): void {
  open.value = !open.value;
}

function choose(value: (typeof THEME_OPTIONS)[number]['value']): void {
  setTheme(value);
  open.value = false;
}

function onClickOutside(event: MouseEvent): void {
  if (open.value && root.value && !root.value.contains(event.target as Node)) {
    open.value = false;
  }
}

onMounted(() => document.addEventListener('click', onClickOutside));
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside));
</script>

<template>
  <div ref="root" class="theme-switcher">
    <button
      type="button"
      class="theme-switcher__trigger"
      :aria-expanded="open"
      aria-label="Change theme"
      title="Change theme"
      @click="toggle"
    >
      <span aria-hidden="true">{{ THEME_GLYPH[theme] }}</span>
    </button>

    <Transition name="theme-switcher-pop">
      <div v-if="open" class="theme-switcher__menu" role="menu">
        <button
          v-for="opt in THEME_OPTIONS"
          :key="opt.value"
          type="button"
          role="menuitemradio"
          :aria-checked="opt.value === theme"
          class="theme-switcher__option"
          :class="{ 'theme-switcher__option--active': opt.value === theme }"
          @click="choose(opt.value)"
        >
          <span class="theme-switcher__glyph" aria-hidden="true">{{ THEME_GLYPH[opt.value] }}</span>
          <span class="theme-switcher__text">
            <span class="theme-switcher__label">{{ opt.label }}</span>
            <span class="theme-switcher__desc">{{ opt.description }}</span>
          </span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.theme-switcher {
  position: relative;
}

.theme-switcher__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface-alt);
  color: var(--color-text-secondary);
  font-size: var(--font-size-md);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast),
    background var(--transition-fast);
}

.theme-switcher__trigger:hover {
  border-color: var(--color-accent-border);
  color: var(--color-accent);
}

.theme-switcher__menu {
  position: absolute;
  top: calc(100% + var(--space-2));
  right: 0;
  min-width: 216px;
  background: var(--color-bg-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--space-2);
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transform-origin: top right;
}

.theme-switcher__option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  font: inherit;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.theme-switcher__option:hover {
  background: var(--color-surface-hover);
}

.theme-switcher__option--active {
  background: var(--color-accent-soft);
}

.theme-switcher__glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  color: var(--color-text-muted);
}

.theme-switcher__option--active .theme-switcher__glyph {
  color: var(--color-accent);
}

.theme-switcher__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.theme-switcher__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.theme-switcher__desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.theme-switcher-pop-enter-active,
.theme-switcher-pop-leave-active {
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
}

.theme-switcher-pop-enter-from,
.theme-switcher-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
