<script setup lang="ts">
import { PulseCard } from '../../components/ui';
</script>

<template>
  <section class="help">
    <PulseCard>
      <template #header>Getting started with Pulse</template>
      <ul class="help__list">
        <li><strong>Weekly Pulse</strong> — submit your workload, delivered/in-flight work and blockers each week.</li>
        <li><strong>Missions</strong> — see the teams you are staffed on and switch your current mission context.</li>
        <li><strong>Dashboard</strong> — track team-wide workload and submission status for the current period.</li>
        <li><strong>Team & Users</strong> — check who has submitted for the current period.</li>
        <li><strong>Reports</strong> — open individual weekly reports and frozen period snapshots.</li>
      </ul>
    </PulseCard>
  </section>
</template>

<style scoped>
.help__list {
  margin: 0;
  padding-left: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
</style>
