<script setup lang="ts">
import type { LeaderboardEntry } from '../../api/pulse';

defineProps<{
  entries: LeaderboardEntry[];
  optedIn: boolean;
}>();

defineEmits<{ 'toggle-opt-in': [optIn: boolean] }>();
</script>

<template>
  <div class="leaderboard">
    <header class="leaderboard__header">
      <h2>Team pulse</h2>
      <label class="leaderboard__opt-in">
        <input type="checkbox" :checked="optedIn" @change="$emit('toggle-opt-in', ($event.target as HTMLInputElement).checked)" />
        Show me on the leaderboard
      </label>
    </header>
    <p v-if="!optedIn" class="leaderboard__hint">
      You're not on the leaderboard — opt in above to see and be seen by your teammates.
    </p>
    <ol v-if="entries.length" class="leaderboard__list">
      <li v-for="(entry, i) in entries" :key="entry.userId" class="leaderboard__row">
        <span class="leaderboard__rank">{{ i + 1 }}</span>
        <span class="leaderboard__name">{{ entry.displayName ?? 'Unnamed member' }}</span>
        <span class="leaderboard__streak">🔥 {{ entry.streak }}</span>
        <span class="leaderboard__xp">{{ Math.round(entry.xp) }} XP</span>
      </li>
    </ol>
    <p v-else class="leaderboard__hint">No one has opted in yet.</p>
  </div>
</template>

<style scoped>
.leaderboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.leaderboard__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.leaderboard__opt-in {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.leaderboard__hint {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.leaderboard__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
  padding: 0;
  margin: 0;
}
.leaderboard__row {
  display: grid;
  grid-template-columns: 1.5rem minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-surface-alt);
}
.leaderboard__rank {
  font-weight: var(--font-weight-bold);
  color: var(--color-text-muted);
}
.leaderboard__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
}
.leaderboard__streak {
  color: var(--color-warning);
}
.leaderboard__xp {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}
</style>
