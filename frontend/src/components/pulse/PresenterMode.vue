<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import type { ReportRecord, WalkthroughEntry } from '../../api/pulse';
import ReportRenderer from './ReportRenderer.vue';
import { PulseSkeleton } from '../ui';

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

const currentEntry = computed(() => props.entries[props.currentIndex] ?? null);
const progressPct = computed(() =>
  props.entries.length ? `${((props.currentIndex + 1) / props.entries.length) * 100}%` : '0%',
);

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowRight' || event.key === ' ') emit('next');
  else if (event.key === 'ArrowLeft') emit('prev');
  else if (event.key === 'Escape') emit('exit');
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="presenter">
    <div class="presenter__progress" :style="{ width: progressPct }" />

    <button type="button" class="presenter__close" @click="emit('exit')">Close ✕</button>

    <div class="presenter__stage">
      <div class="presenter__slide" :key="currentEntry?.user.id">
        <p class="presenter__eyebrow">
          Team walkthrough
          <span class="presenter__eyebrow-rule" />
        </p>

        <div class="presenter__identity">
          <h1 class="presenter__name">{{ currentEntry?.user.displayName ?? 'Unnamed member' }}</h1>
          <span
            class="presenter__status"
            :class="`presenter__status--${currentEntry?.status}`"
          >
            {{ currentEntry?.status === 'submitted' ? '● Submitted' : '○ Not submitted' }}
          </span>
        </div>
        <p v-if="currentEntry?.profile.label" class="presenter__profile">{{ currentEntry.profile.label }}</p>

        <div class="presenter__body">
          <div v-if="reportLoading" class="presenter__loading">
            <PulseSkeleton variant="block" height="2rem" />
            <PulseSkeleton variant="block" height="8rem" />
          </div>
          <p v-else-if="!report" class="presenter__placeholder">No report yet.</p>
          <ReportRenderer v-else :report="report" :profile-code="currentEntry?.profile.code" />
        </div>
      </div>
    </div>

    <p class="presenter__hint">← → to navigate · Esc to exit</p>

    <div class="presenter__bar">
      <button
        type="button"
        class="presenter__nav-btn"
        :disabled="currentIndex === 0"
        aria-label="Previous"
        @click="emit('prev')"
      >
        ←
      </button>

      <span class="presenter__counter">
        {{ pad(currentIndex + 1) }}<span class="presenter__counter-total"> / {{ pad(entries.length) }}</span>
      </span>

      <div class="presenter__dots">
        <button
          v-for="(entry, i) in entries"
          :key="entry.user.id"
          type="button"
          class="presenter__dot"
          :class="{
            'presenter__dot--active': i === currentIndex,
            'presenter__dot--submitted': entry.status === 'submitted',
          }"
          :aria-current="i === currentIndex ? 'true' : undefined"
          :title="entry.user.displayName ?? 'Unnamed member'"
          @click="emit('jump', i)"
        />
      </div>

      <button
        type="button"
        class="presenter__nav-btn"
        :disabled="currentIndex === entries.length - 1"
        aria-label="Next"
        @click="emit('next')"
      >
        →
      </button>
    </div>
  </div>
</template>

<style scoped>
.presenter {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--color-bg);
  color: var(--color-text-primary);
  overflow: hidden;
}

.presenter__progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 2px;
  background: var(--color-accent);
  transition: width var(--transition-slow);
  z-index: 3;
}

.presenter__close {
  position: absolute;
  top: var(--space-5);
  right: var(--space-6);
  z-index: 3;
  font-family: var(--font-family-base);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-inverse);
  background: color-mix(in srgb, var(--color-text-primary) 82%, transparent);
  backdrop-filter: blur(8px);
  border: 1px solid color-mix(in srgb, var(--color-text-inverse) 16%, transparent);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.presenter__close:hover {
  background: color-mix(in srgb, var(--color-text-primary) 100%, transparent);
}

.presenter__stage {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: clamp(4rem, 10vh, 7rem) var(--space-6) 8rem;
}

.presenter__slide {
  width: 100%;
  max-width: 760px;
  animation: presenter-fade-up var(--duration-slow) var(--ease-out);
}

@keyframes presenter-fade-up {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.presenter__eyebrow {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: 0 0 var(--space-5);
  font-family: var(--font-family-base);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-accent);
}
.presenter__eyebrow-rule {
  flex: 1;
  max-width: 6rem;
  height: 1px;
  background: var(--color-border);
}

.presenter__identity {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-4);
}

.presenter__name {
  margin: 0;
  font-family: var(--font-family-display);
  font-weight: var(--font-weight-medium);
  font-size: clamp(2rem, 4vw, var(--font-size-display));
  line-height: var(--line-height-tight);
  letter-spacing: -0.01em;
  overflow-wrap: break-word;
  min-width: 0;
}

.presenter__status {
  font-family: var(--font-family-base);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}
.presenter__status--submitted {
  color: var(--color-success);
}
.presenter__status--not_submitted {
  color: var(--color-text-muted);
}

.presenter__profile {
  margin: var(--space-2) 0 0;
  font-family: var(--font-family-display);
  font-style: italic;
  color: var(--color-text-secondary);
}

.presenter__body {
  margin-top: var(--space-8);
  padding-top: var(--space-8);
  border-top: 1px solid var(--color-border);
}

.presenter__loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.presenter__placeholder {
  color: var(--color-text-muted);
}

.presenter__hint {
  position: absolute;
  left: var(--space-6);
  bottom: var(--space-5);
  z-index: 3;
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.presenter__bar {
  position: absolute;
  left: 50%;
  bottom: var(--space-5);
  transform: translateX(-50%);
  z-index: 3;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  background: color-mix(in srgb, var(--color-text-primary) 85%, transparent);
  backdrop-filter: blur(10px);
  border: 1px solid color-mix(in srgb, var(--color-text-inverse) 14%, transparent);
  border-radius: var(--radius-full);
  padding: var(--space-1);
  max-width: calc(100vw - var(--space-6) * 2);
}

.presenter__nav-btn {
  font-family: var(--font-family-base);
  font-size: var(--font-size-md);
  color: var(--color-text-inverse);
  background: transparent;
  border: none;
  border-radius: var(--radius-full);
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  cursor: pointer;
  line-height: 1;
  transition:
    background var(--transition-fast),
    opacity var(--transition-fast);
}
.presenter__nav-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-text-inverse) 14%, transparent);
}
.presenter__nav-btn:disabled {
  opacity: 0.28;
  cursor: default;
}

.presenter__counter {
  font-family: var(--font-family-display);
  font-size: var(--font-size-sm);
  color: var(--color-text-inverse);
  padding: 0 var(--space-2);
  min-width: 4.5rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.presenter__counter-total {
  color: color-mix(in srgb, var(--color-text-inverse) 55%, transparent);
}

.presenter__dots {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  max-width: min(40vw, 22rem);
  overflow-x: auto;
  padding: 0 var(--space-2);
  margin-left: var(--space-1);
  border-left: 1px solid color-mix(in srgb, var(--color-text-inverse) 16%, transparent);
  scrollbar-width: none;
}
.presenter__dots::-webkit-scrollbar {
  display: none;
}

.presenter__dot {
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-text-inverse) 28%, transparent);
  border: none;
  padding: 0;
  cursor: pointer;
  transition:
    background var(--transition-fast),
    transform var(--transition-fast);
}
.presenter__dot:hover {
  background: color-mix(in srgb, var(--color-text-inverse) 60%, transparent);
}
.presenter__dot--submitted {
  background: color-mix(in srgb, var(--color-success) 70%, var(--color-text-inverse) 30%);
}
.presenter__dot--active {
  background: var(--color-accent);
  transform: scale(1.4);
}

@media (max-width: 768px) {
  .presenter__stage {
    padding: 4.5rem var(--space-4) 6.5rem;
  }
  .presenter__hint {
    display: none;
  }
  .presenter__dots {
    display: none;
  }
}
</style>
