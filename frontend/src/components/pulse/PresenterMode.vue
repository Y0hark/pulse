<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import type { ReportRecord, WalkthroughEntry } from '../../api/pulse';
import ReportRenderer from './ReportRenderer.vue';

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
          @click="emit('jump', i)"
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
        <p v-if="reportLoading">Loading…</p>
        <p v-else-if="!report" class="presenter__placeholder">No report yet.</p>
        <ReportRenderer v-else :report="report" />
      </div>

      <footer class="presenter__nav">
        <button type="button" :disabled="currentIndex === 0" @click="emit('prev')">← Prev</button>
        <button type="button" :disabled="currentIndex === entries.length - 1" @click="emit('next')">Next →</button>
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
  background: white;
}
.presenter__sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 1rem;
  overflow-y: auto;
}
.presenter__exit {
  align-self: flex-start;
  border: 1px solid #ddd;
  border-radius: 0.375rem;
  padding: 0.3rem 0.7rem;
  background: none;
  cursor: pointer;
}
.presenter__jump-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.presenter__jump-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.9rem;
}
.presenter__jump-item:hover {
  background: #f3f4f6;
}
.presenter__jump-item--active {
  background: #eef2ff;
  font-weight: 600;
}
.presenter__jump-status--submitted {
  color: #22c55e;
}
.presenter__jump-status--not_submitted {
  color: #d1d5db;
}
.presenter__stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 2rem;
  overflow-y: auto;
}
.presenter__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 1.5rem;
}
.presenter__profile {
  color: #666;
}
.presenter__progress {
  color: #666;
  font-weight: 600;
}
.presenter__body {
  flex: 1;
  max-width: 720px;
}
.presenter__placeholder {
  color: #888;
}
.presenter__nav {
  display: flex;
  justify-content: space-between;
  padding-top: 1.5rem;
  max-width: 720px;
}
</style>
