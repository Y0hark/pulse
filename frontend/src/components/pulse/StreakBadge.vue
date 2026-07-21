<script setup lang="ts">
import { computed } from 'vue';
import type { Badge, StreakResult, XpResult } from '../../api/pulse';

const props = defineProps<{
  streak: StreakResult;
  xp: XpResult;
  badges: Badge[];
}>();

const flameCount = computed(() => Math.min(props.streak.current, 5));
</script>

<template>
  <div class="streak-badge">
    <div class="streak-badge__flame">
      <span v-for="i in Math.max(flameCount, 1)" :key="i" :class="{ 'streak-badge__flame-icon--dim': streak.current === 0 }">
        🔥
      </span>
      <span class="streak-badge__count">{{ streak.current }}-week streak</span>
    </div>
    <div class="streak-badge__xp">{{ Math.round(xp.total) }} XP</div>
    <ul v-if="badges.length" class="streak-badge__badges">
      <li v-for="badge in badges" :key="badge.code + (badge.threshold ?? '')" class="streak-badge__badge">
        {{ badge.label }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.streak-badge {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}
.streak-badge__flame {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  font-size: 1.1rem;
}
.streak-badge__flame-icon--dim {
  filter: grayscale(1);
  opacity: 0.5;
}
.streak-badge__count {
  margin-left: var(--space-2);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}
.streak-badge__xp {
  font-weight: var(--font-weight-semibold);
  color: var(--color-warning);
}
.streak-badge__badges {
  display: flex;
  gap: var(--space-2);
  list-style: none;
  padding: 0;
  margin: 0;
  flex-wrap: wrap;
}
.streak-badge__badge {
  background: var(--color-warning-soft);
  color: var(--color-warning);
  border-radius: var(--radius-full);
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}
</style>
