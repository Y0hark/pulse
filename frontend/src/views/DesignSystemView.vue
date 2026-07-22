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
import ThemeSwitcher from '../components/ui/ThemeSwitcher.vue';
import { THEME_OPTIONS, useTheme } from '../composables/useTheme';
import { useToast } from '../composables/useToast';

const toast = useToast();
const { theme, setTheme } = useTheme();

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
          <h1 class="tnp-display">Pulse Design System</h1>
          <p class="tnp-section__subtitle">TNP-inspired tokens and components — reference &amp; QA surface.</p>
        </div>
        <ThemeSwitcher />
      </div>
    </section>

    <hr class="tnp-hairline" />

    <section class="tnp-section">
      <h2 class="tnp-section__title">Themes</h2>
      <p class="tnp-section__subtitle">Four surfaces, one identity. Pick a working mode.</p>
      <div class="ds-themes">
        <button
          v-for="opt in THEME_OPTIONS"
          :key="opt.value"
          type="button"
          class="ds-theme-card"
          :class="{ 'ds-theme-card--active': opt.value === theme }"
          :data-theme="opt.value"
          @click="setTheme(opt.value)"
        >
          <span class="ds-theme-card__swatches">
            <span class="ds-theme-card__swatch" style="background: var(--color-bg)" />
            <span class="ds-theme-card__swatch" style="background: var(--color-surface)" />
            <span class="ds-theme-card__swatch" style="background: var(--color-accent)" />
            <span class="ds-theme-card__swatch" style="background: var(--color-electric)" />
          </span>
          <span class="ds-theme-card__label tnp-display">Aa</span>
          <span class="ds-theme-card__name">{{ opt.label }}</span>
          <span class="ds-theme-card__desc">{{ opt.description }}</span>
        </button>
      </div>
    </section>

    <hr class="tnp-hairline" />

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
.ds-themes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-4);
}

.ds-theme-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  cursor: pointer;
  text-align: left;
  font: inherit;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.ds-theme-card:hover {
  border-color: var(--color-accent-border);
}

.ds-theme-card--active {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-accent-glow);
}

.ds-theme-card__swatches {
  display: flex;
  gap: var(--space-1);
}

.ds-theme-card__swatch {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.ds-theme-card__label {
  font-size: var(--font-size-xl);
}

.ds-theme-card__name {
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
}

.ds-theme-card__desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-top: -0.35rem;
}

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
