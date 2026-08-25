<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import type { ReportRecord, WalkthroughEntry } from '../../api/pulse';
import ReportRenderer from './ReportRenderer.vue';
import { PulseButton, PulseSkeleton } from '../ui';

const props = defineProps<{
  entries: WalkthroughEntry[];
  currentIndex: number;
  report: ReportRecord | null;
  reportLoading: boolean;
}>();

const emit = defineEmits<{
  next: [];
  prev: [];
  exit: [];
  jump: [index: number];
}>();

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowRight') emit('next');
  else if (event.key === 'ArrowLeft') emit('prev');
  else if (event.key === 'Escape') emit('exit');
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="presenter">
    <aside class="presenter__sidebar">
      <button type="button" class="presenter__exit" @click="emit('exit')">✕ Exit</button>
      <ol class="presenter__jump-list">
        <li
          v-for="(entry, i) in entries"
          :key="entry.user.id"
          :class="['presenter__jump-item', { 'presenter__jump-item--active': i === currentIndex }]"
          role="button"
          tabindex="0"
          :aria-current="i === currentIndex ? 'true' : undefined"
          @click="emit('jump', i)"
          @keydown.enter="emit('jump', i)"
          @keydown.space.prevent="emit('jump', i)"
        >
          <span class="presenter__jump-status" :class="`presenter__jump-status--${entry.status}`">
            {{ entry.status === 'submitted' ? '●' : '○' }}
          </span>
          {{ entry.user.displayName ?? 'Unnamed member' }}
        </li>
      </ol>
    </aside>

    <div class="presenter__stage">
      <header class="presenter__header">
        <div>
          <h1>{{ entries[currentIndex]?.user.displayName ?? 'Unnamed member' }}</h1>
          <p v-if="entries[currentIndex]?.profile.label" class="presenter__profile">
            {{ entries[currentIndex]?.profile.label }}
          </p>
        </div>
        <p class="presenter__progress">{{ currentIndex + 1 }} / {{ entries.length }}</p>
      </header>

      <div class="presenter__body">
        <div v-if="reportLoading" class="presenter__loading">
          <PulseSkeleton variant="block" height="2rem" />
          <PulseSkeleton variant="block" height="8rem" />
        </div>
        <p v-else-if="!report" class="presenter__placeholder">No report yet.</p>
        <ReportRenderer v-else :report="report" :profile-code="entries[currentIndex]?.profile.code" />
      </div>

      <footer class="presenter__nav">
        <PulseButton variant="secondary" :disabled="currentIndex === 0" @click="emit('prev')">← Prev</PulseButton>
        <PulseButton variant="secondary" :disabled="currentIndex === entries.length - 1" @click="emit('next')">
          Next →
        </PulseButton>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.presenter {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  background: var(--color-bg);
  color: var(--color-text-primary);
}
.presenter__sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  background: var(--color-bg-raised);
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
  gap: var(--space-4);
  overflow-y: auto;
}
.presenter__exit {
  align-self: flex-start;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-3);
  background: none;
  color: var(--color-text-primary);
  cursor: pointer;
}
.presenter__exit:hover {
  background: var(--color-surface-hover);
}
.presenter__jump-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.presenter__jump-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.presenter__jump-item:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}
.presenter__jump-item--active {
  background: var(--color-accent-soft);
  color: var(--color-accent);
  font-weight: var(--font-weight-semibold);
}
.presenter__jump-status--submitted {
  color: var(--color-success);
}
.presenter__jump-status--not_submitted {
  color: var(--color-text-muted);
}
.presenter__stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--space-6) var(--space-8);
  overflow-y: auto;
  min-width: 0;
}
.presenter__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-bottom: var(--space-6);
}
.presenter__profile {
  color: var(--color-text-secondary);
}
.presenter__progress {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}
.presenter__body {
  flex: 1;
  max-width: 720px;
}
.presenter__loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.presenter__placeholder {
  color: var(--color-text-muted);
}
.presenter__nav {
  display: flex;
  justify-content: space-between;
  padding-top: var(--space-6);
  max-width: 720px;
}

.presenter__header h1 {
  overflow-wrap: break-word;
  min-width: 0;
}

@media (max-width: 768px) {
  .presenter {
    flex-direction: column;
  }
  .presenter__sidebar {
    width: 100%;
    max-height: 40vh;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }
  .presenter__stage {
    padding: var(--space-4);
  }
}
</style>
