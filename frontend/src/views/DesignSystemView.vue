<script setup lang="ts">
import { ref } from 'vue';
import PulseButton from '../components/ui/PulseButton.vue';
import PulseInput from '../components/ui/PulseInput.vue';
import PulseSelect from '../components/ui/PulseSelect.vue';
import PulseTextarea from '../components/ui/PulseTextarea.vue';
import PulseCard from '../components/ui/PulseCard.vue';
import PulseStatCard from '../components/ui/PulseStatCard.vue';
import PulseBadge from '../components/ui/PulseBadge.vue';
import PulseModal from '../components/ui/PulseModal.vue';
import PulseDrawer from '../components/ui/PulseDrawer.vue';
import PulseTabs from '../components/ui/PulseTabs.vue';
import PulseTable from '../components/ui/PulseTable.vue';
import PulseEmptyState from '../components/ui/PulseEmptyState.vue';
import PulseErrorState from '../components/ui/PulseErrorState.vue';
import PulseSkeleton from '../components/ui/PulseSkeleton.vue';
import PulseProgressRing from '../components/ui/PulseProgressRing.vue';
import { useToast } from '../composables/useToast';

const toast = useToast();

const textValue = ref('');
const textareaValue = ref('');
const selectValue = ref('');
const modalOpen = ref(false);
const drawerOpen = ref(false);
const activeTab = ref('overview');

const tableColumns = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' },
  { key: 'score', label: 'Score', align: 'right' as const },
];
const tableRows = [
  { id: 1, name: 'Aline Moreau', status: 'On track', score: 92 },
  { id: 2, name: 'Karim Belkacem', status: 'At risk', score: 61 },
  { id: 3, name: 'Julie Petit', status: 'Blocked', score: 34 },
];
</script>

<template>
  <div class="tnp-page">
    <section class="tnp-section">
      <div class="tnp-section__header">
        <div>
          <h1>Pulse Design System</h1>
          <p class="tnp-section__subtitle">TNP-inspired tokens and components — reference &amp; QA surface.</p>
        </div>
      </div>
    </section>

    <section class="tnp-section">
      <h2 class="tnp-section__title">Colors</h2>
      <div class="ds-swatches">
        <div
          v-for="swatch in [
            ['bg', 'var(--color-bg)'],
            ['surface', 'var(--color-surface)'],
            ['surface-alt', 'var(--color-surface-alt)'],
            ['accent', 'var(--color-accent)'],
            ['electric', 'var(--color-electric)'],
            ['success', 'var(--color-success)'],
            ['warning', 'var(--color-warning)'],
            ['danger', 'var(--color-danger)'],
          ]"
          :key="swatch[0]"
          class="ds-swatch"
        >
          <span class="ds-swatch__color" :style="{ background: swatch[1] }" />
          <span class="ds-swatch__label">{{ swatch[0] }}</span>
        </div>
      </div>
    </section>

    <section class="tnp-section">
      <h2 class="tnp-section__title">Buttons</h2>
      <div class="ds-row">
        <PulseButton variant="primary">Primary</PulseButton>
        <PulseButton variant="secondary">Secondary</PulseButton>
        <PulseButton variant="ghost">Ghost</PulseButton>
        <PulseButton variant="danger">Danger</PulseButton>
        <PulseButton variant="primary" loading>Loading</PulseButton>
        <PulseButton variant="primary" disabled>Disabled</PulseButton>
      </div>
    </section>

    <section class="tnp-section">
      <h2 class="tnp-section__title">Form controls</h2>
      <div class="tnp-grid">
        <PulseInput v-model="textValue" label="Team name" placeholder="e.g. Platform" hint="Visible to your manager" />
        <PulseSelect
          v-model="selectValue"
          label="Period"
          placeholder="Select a period"
          :options="[
            { value: 'w1', label: 'Week 1' },
            { value: 'w2', label: 'Week 2' },
          ]"
        />
        <PulseInput v-model="textValue" label="Invalid example" error="This field is required" />
        <PulseTextarea v-model="textareaValue" label="Notes" placeholder="Add context…" />
      </div>
    </section>

    <section class="tnp-section">
      <h2 class="tnp-section__title">Cards &amp; stats</h2>
      <div class="tnp-grid">
        <PulseStatCard label="Completion" value="87%" trend="up" trend-label="+4pts" />
        <PulseStatCard label="Streak" value="6 weeks" trend="flat" />
        <PulseStatCard label="At risk projects" value="2" trend="down" trend-label="-1" />
        <PulseCard>
          <template #header>Card header</template>
          Card body content goes here.
          <template #footer>
            <PulseButton size="sm" variant="ghost">Cancel</PulseButton>
            <PulseButton size="sm">Confirm</PulseButton>
          </template>
        </PulseCard>
      </div>
    </section>

    <section class="tnp-section">
      <h2 class="tnp-section__title">Badges</h2>
      <div class="ds-row">
        <PulseBadge variant="neutral">Neutral</PulseBadge>
        <PulseBadge variant="accent">Accent</PulseBadge>
        <PulseBadge variant="success">Good</PulseBadge>
        <PulseBadge variant="warning">At risk</PulseBadge>
        <PulseBadge variant="danger">Blocked</PulseBadge>
        <PulseBadge variant="electric">New</PulseBadge>
      </div>
    </section>

    <section class="tnp-section">
      <h2 class="tnp-section__title">Tabs</h2>
      <PulseTabs
        v-model="activeTab"
        :tabs="[
          { value: 'overview', label: 'Overview' },
          { value: 'details', label: 'Details' },
        ]"
      >
        <template #default="{ active }">
          <p v-if="active === 'overview'">Overview panel content.</p>
          <p v-else>Details panel content.</p>
        </template>
      </PulseTabs>
    </section>

    <section class="tnp-section">
      <h2 class="tnp-section__title">Table</h2>
      <PulseTable :columns="tableColumns" :rows="tableRows">
        <template #cell-status="{ value }">
          <PulseBadge
            :variant="value === 'On track' ? 'success' : value === 'At risk' ? 'warning' : 'danger'"
          >
            {{ value }}
          </PulseBadge>
        </template>
      </PulseTable>
    </section>

    <section class="tnp-section">
      <h2 class="tnp-section__title">Progress ring</h2>
      <div class="ds-row">
        <PulseProgressRing :percent="25" />
        <PulseProgressRing :percent="60" color="var(--color-electric)" />
        <PulseProgressRing :percent="100" color="var(--color-success)" />
      </div>
    </section>

    <section class="tnp-section">
      <h2 class="tnp-section__title">Overlays</h2>
      <div class="ds-row">
        <PulseButton @click="modalOpen = true">Open modal</PulseButton>
        <PulseButton variant="secondary" @click="drawerOpen = true">Open drawer</PulseButton>
      </div>
      <PulseModal v-model="modalOpen" title="Confirm action">
        <p>Are you sure you want to continue?</p>
        <template #footer>
          <PulseButton variant="ghost" @click="modalOpen = false">Cancel</PulseButton>
          <PulseButton @click="modalOpen = false">Confirm</PulseButton>
        </template>
      </PulseModal>
      <PulseDrawer v-model="drawerOpen" title="Filters">
        <p>Drawer content goes here.</p>
      </PulseDrawer>
    </section>

    <section class="tnp-section">
      <h2 class="tnp-section__title">Toasts</h2>
      <div class="ds-row">
        <PulseButton variant="secondary" @click="toast.success('Report submitted')">Success toast</PulseButton>
        <PulseButton variant="secondary" @click="toast.warning('Missing 2 fields')">Warning toast</PulseButton>
        <PulseButton variant="secondary" @click="toast.error('Failed to save')">Error toast</PulseButton>
      </div>
    </section>

    <section class="tnp-section">
      <h2 class="tnp-section__title">States</h2>
      <div class="tnp-grid">
        <PulseCard>
          <PulseSkeleton variant="text" style="margin-bottom: 0.5rem" />
          <PulseSkeleton variant="text" width="70%" style="margin-bottom: 0.5rem" />
          <PulseSkeleton variant="block" />
        </PulseCard>
        <PulseCard :padded="false">
          <PulseEmptyState title="No reports yet" description="Submit your first weekly report to see it here." />
        </PulseCard>
        <PulseCard :padded="false">
          <PulseErrorState
            title="Couldn't load dashboard"
            description="Check your connection and try again."
            retryable
          />
        </PulseCard>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ds-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.ds-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.ds-swatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.ds-swatch__color {
  width: 3rem;
  height: 3rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
</style>
