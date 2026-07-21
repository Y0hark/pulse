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
  gap: 1rem;
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
  margin-left: 0.4rem;
  font-weight: 600;
}
.streak-badge__xp {
  font-weight: 600;
  color: #b45309;
}
.streak-badge__badges {
  display: flex;
  gap: 0.4rem;
  list-style: none;
  padding: 0;
  margin: 0;
  flex-wrap: wrap;
}
.streak-badge__badge {
  background: #fef3c7;
  color: #92400e;
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  font-size: 0.8rem;
  font-weight: 500;
}
</style>
