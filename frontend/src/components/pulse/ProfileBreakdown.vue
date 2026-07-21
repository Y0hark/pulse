<script setup lang="ts">
import type { ProfileBreakdownEntry } from '../../api/pulse';

defineProps<{
  entries: ProfileBreakdownEntry[];
}>();
</script>

<template>
  <div class="profile-breakdown-wrap">
    <table class="profile-breakdown">
      <thead>
        <tr>
          <th>Profile</th>
          <th>Headcount</th>
          <th>Mean workload</th>
          <th>Delivered</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in entries" :key="entry.code">
          <td>{{ entry.label }}</td>
          <td>{{ entry.headcount }}</td>
          <td>{{ entry.headcount ? entry.meanWorkload : '—' }}</td>
          <td>{{ entry.delivered }}</td>
        </tr>
        <tr v-if="!entries.length">
          <td colspan="4" class="profile-breakdown__empty">No profile data yet.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.profile-breakdown-wrap {
  overflow-x: auto;
}
.profile-breakdown {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.profile-breakdown th {
  text-align: left;
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-semibold);
  padding: var(--space-2) var(--space-2);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}
.profile-breakdown td {
  padding: var(--space-2) var(--space-2);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
}
.profile-breakdown__empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: var(--space-6);
}
</style>
