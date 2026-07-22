<script setup lang="ts">
import ReportHeader from '../../components/pulse/ReportHeader.vue';
import { PulseCard } from '../../components/ui';

interface ReportLink {
  icon: string;
  title: string;
  description: string;
  to: string;
}

const REPORT_LINKS: ReportLink[] = [
  {
    icon: '📊',
    title: 'Weekly mission report',
    description: 'This period\'s live workload, deliveries, risks, and submission status.',
    to: '/dashboard',
  },
  {
    icon: '✅',
    title: 'Delay / completion report',
    description: 'Who submitted on time, who was late, and who is still missing.',
    to: '/reports/completion',
  },
  {
    icon: '🧭',
    title: 'Consolidated report',
    description: 'Rolled up across every active mission for the current period.',
    to: '/reports/consolidated',
  },
  {
    icon: '🗂️',
    title: 'Historical report',
    description: 'Browse frozen periods and reopen any past team snapshot.',
    to: '/reports/history',
  },
];
</script>

<template>
  <main class="reports-home">
    <ReportHeader
      eyebrow="Reports"
      title="Reports"
      subtitle="Client-ready reports for this mission — pick a type to open it."
    />

    <div class="reports-home__grid">
      <router-link v-for="link in REPORT_LINKS" :key="link.to" :to="link.to" class="reports-home__link">
        <PulseCard class="reports-home__card" interactive>
          <span class="reports-home__icon" aria-hidden="true">{{ link.icon }}</span>
          <h2 class="reports-home__title">{{ link.title }}</h2>
          <p class="reports-home__description">{{ link.description }}</p>
        </PulseCard>
      </router-link>
    </div>
  </main>
</template>

<style scoped>
.reports-home {
  max-width: 960px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.reports-home__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: var(--space-4);
}
.reports-home__link {
  text-decoration: none;
  color: inherit;
}
.reports-home__card {
  height: 100%;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}
.reports-home__link:hover .reports-home__card {
  border-color: var(--color-accent-border);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.reports-home__icon {
  font-size: 1.75rem;
}
.reports-home__title {
  margin: var(--space-3) 0 var(--space-1);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.reports-home__description {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
</style>
