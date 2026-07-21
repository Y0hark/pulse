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
  gap: 0.75rem;
}
.leaderboard__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.leaderboard__opt-in {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: #444;
}
.leaderboard__hint {
  color: #666;
  font-size: 0.85rem;
}
.leaderboard__list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  list-style: none;
  padding: 0;
  margin: 0;
}
.leaderboard__row {
  display: grid;
  grid-template-columns: 1.5rem 1fr auto auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 0.6rem;
  border-radius: 0.375rem;
  background: #f9fafb;
}
.leaderboard__rank {
  font-weight: 700;
  color: #999;
}
.leaderboard__streak {
  color: #b45309;
}
.leaderboard__xp {
  font-weight: 600;
}
</style>
