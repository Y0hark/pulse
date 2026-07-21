<script setup lang="ts">
import type { ProfileBreakdownEntry } from '../../api/pulse';

defineProps<{
  entries: ProfileBreakdownEntry[];
}>();
</script>

<template>
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
    </tbody>
  </table>
</template>

<style scoped>
.profile-breakdown {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.profile-breakdown th {
  text-align: left;
  color: #666;
  font-weight: 600;
  padding: 0.3rem 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}
.profile-breakdown td {
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid #f3f4f6;
}
</style>
