<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useReportStore } from '../../stores/report';
import { useSessionStore } from '../../stores/session';
import WorkloadSlider from '../../components/pulse/WorkloadSlider.vue';
import ProjectCard from '../../components/pulse/ProjectCard.vue';
import RepeatableList from '../../components/pulse/RepeatableList.vue';
import StreakBadge from '../../components/pulse/StreakBadge.vue';
import CompletionRing from '../../components/pulse/CompletionRing.vue';
import { PulseButton, PulseEmptyState, PulseErrorState, PulseSkeleton } from '../../components/ui';
import type { AlertDraft, AlertSeverity, OpportunityDraft, OpportunityType, ProjectCardDraft } from '../../api/pulse';

const OPPORTUNITY_TYPES: { value: OpportunityType; label: string }[] = [
  { value: 'open_position', label: 'Open position' },
  { value: 'new_project', label: 'New project' },
  { value: 'new_budget', label: 'New budget' },
  { value: 'new_team', label: 'New team' },
  { value: 'client_need', label: 'Client need' },
];
const SEVERITIES: AlertSeverity[] = ['info', 'warn', 'critical'];

const store = useReportStore();
const session = useSessionStore();

function load(): void {
  if (session.currentTeamSlug) void store.loadCurrentPeriod(session.currentTeamSlug);
}

onMounted(() => {
  // Loading the session (when not already loaded) sets currentTeamSlug reactively, which the
  // watch below picks up — calling load() here too would double-fetch the current period.
  if (session.loaded) load();
  else void session.load();
});

watch(() => session.currentTeamSlug, load);

function onFieldChange(): void {
  store.scheduleAutosave();
}

function newProjectCard(): ProjectCardDraft {
  return { title: '', description: '', status: 'good', sortOrder: store.draft.projectCards.length };
}

function newAlert(): AlertDraft {
  return { content: '', severity: 'info' };
}

function newOpportunity(): OpportunityDraft {
  return { type: 'new_project', content: '' };
}
</script>

<template>
  <PulseEmptyState
    v-if="session.loaded && !session.currentTeamSlug"
    icon="🧭"
    title="No mission assigned"
    description="Ask an admin to add you to a mission before submitting a weekly pulse."
  />

  <div v-else-if="!session.loaded || (store.loading && !store.period)" class="report-form">
    <PulseSkeleton variant="block" height="4rem" />
    <PulseSkeleton variant="block" height="8rem" />
    <PulseSkeleton variant="block" height="8rem" />
  </div>

  <PulseErrorState
    v-else-if="store.error && !store.period"
    description="We couldn't load this week's submission. Check your connection and try again."
    retryable
    @retry="load"
  />

  <main class="report-form" v-else-if="store.period">
    <header class="report-form__header">
      <div>
        <h1>Weekly check-in — {{ store.period.isoWeek }}</h1>
        <p v-if="session.currentMission" class="report-form__mission">{{ session.currentMission.name }}</p>
      </div>
      <router-link :to="{ name: 'submission-history' }">
        <PulseButton variant="secondary" size="sm">View history</PulseButton>
      </router-link>
    </header>

    <p v-if="store.isFrozen" class="report-form__frozen-banner">
      This period is frozen — changes can no longer be saved.
    </p>
    <p v-if="store.justSubmitted" class="report-form__success-banner">
      ✓ Submitted{{ store.lastSavedAt ? ` at ${new Date(store.lastSavedAt).toLocaleString()}` : '' }} — you can keep
      editing until the period is frozen.
    </p>
    <p v-if="store.error" class="report-form__error">{{ store.error }}</p>
    <p v-if="store.saving" class="report-form__status">Saving…</p>

    <section v-if="store.gamification" class="report-form__gamification">
      <StreakBadge :streak="store.gamification.streak" :xp="store.gamification.xp" :badges="store.gamification.badges" />
      <CompletionRing :completion="store.gamification.completionRing" />
    </section>

    <section>
      <WorkloadSlider v-model="store.draft.workload" :disabled="store.isFrozen" @update:model-value="onFieldChange" />
    </section>

    <section class="report-form__counters">
      <label>
        Delivered
        <input type="number" min="0" v-model.number="store.draft.deliveredCnt" :disabled="store.isFrozen" @change="onFieldChange" />
      </label>
      <label>
        In-flight
        <input type="number" min="0" v-model.number="store.draft.inflightCnt" :disabled="store.isFrozen" @change="onFieldChange" />
      </label>
    </section>

    <section>
      <h2>Project cards</h2>
      <RepeatableList
        v-model="store.draft.projectCards"
        :make-item="newProjectCard"
        :disabled="store.isFrozen"
        add-label="Add project"
        @update:model-value="onFieldChange"
      >
        <template #default="{ item, update }">
          <ProjectCard :model-value="item" :disabled="store.isFrozen" @update:model-value="(v) => { update(v); onFieldChange(); }" />
        </template>
      </RepeatableList>
    </section>

    <section class="report-form__tasks">
      <div>
        <h2>Major tasks — Did</h2>
        <RepeatableList
          v-model="store.draft.majorTasksDid"
          :make-item="() => ''"
          :disabled="store.isFrozen"
          add-label="Add"
          @update:model-value="onFieldChange"
        >
          <template #default="{ item, update }">
            <input
              type="text"
              :value="item"
              :disabled="store.isFrozen"
              @input="(e) => { update((e.target as HTMLInputElement).value); onFieldChange(); }"
            />
          </template>
        </RepeatableList>
      </div>
      <div>
        <h2>Major tasks — To do</h2>
        <RepeatableList
          v-model="store.draft.majorTasksToDo"
          :make-item="() => ''"
          :disabled="store.isFrozen"
          add-label="Add"
          @update:model-value="onFieldChange"
        >
          <template #default="{ item, update }">
            <input
              type="text"
              :value="item"
              :disabled="store.isFrozen"
              @input="(e) => { update((e.target as HTMLInputElement).value); onFieldChange(); }"
            />
          </template>
        </RepeatableList>
      </div>
    </section>

    <section>
      <h2>Alerts</h2>
      <RepeatableList
        v-model="store.draft.alerts"
        :make-item="newAlert"
        :disabled="store.isFrozen"
        add-label="Add alert"
        @update:model-value="onFieldChange"
      >
        <template #default="{ item, update }">
          <div class="report-form__alert-row">
            <input
              type="text"
              placeholder="Alert"
              :value="item.content"
              :disabled="store.isFrozen"
              @input="(e) => { update({ ...item, content: (e.target as HTMLInputElement).value }); onFieldChange(); }"
            />
            <select
              :value="item.severity"
              :disabled="store.isFrozen"
              @change="(e) => { update({ ...item, severity: (e.target as HTMLSelectElement).value as typeof item.severity }); onFieldChange(); }"
            >
              <option v-for="s in SEVERITIES" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
        </template>
      </RepeatableList>
    </section>

    <section>
      <h2>Opportunities</h2>
      <RepeatableList
        v-model="store.draft.opportunities"
        :make-item="newOpportunity"
        :disabled="store.isFrozen"
        add-label="Add opportunity"
        @update:model-value="onFieldChange"
      >
        <template #default="{ item, update }">
          <div class="report-form__opportunity-row">
            <select
              :value="item.type"
              :disabled="store.isFrozen"
              @change="(e) => { update({ ...item, type: (e.target as HTMLSelectElement).value as typeof item.type }); onFieldChange(); }"
            >
              <option v-for="opt in OPPORTUNITY_TYPES" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <input
              type="text"
              placeholder="Description"
              :value="item.content"
              :disabled="store.isFrozen"
              @input="(e) => { update({ ...item, content: (e.target as HTMLInputElement).value }); onFieldChange(); }"
            />
          </div>
        </template>
      </RepeatableList>
    </section>

    <footer>
      <PulseButton :disabled="store.isFrozen || store.submitting" @click="store.submit()">
        {{ store.submitting ? 'Submitting…' : 'Submit' }}
      </PulseButton>
    </footer>
  </main>
</template>

<style scoped>
.report-form {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.report-form__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}
.report-form__gamification {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-alt);
  border-radius: var(--radius-md);
}
.report-form__tasks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
@media (max-width: 640px) {
  .report-form__tasks {
    grid-template-columns: 1fr;
  }
}
.report-form__counters {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
}
.report-form__counters label {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}
.report-form__alert-row,
.report-form__opportunity-row {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.report-form__alert-row input,
.report-form__opportunity-row input {
  flex: 1;
  min-width: 10rem;
}
.report-form__frozen-banner {
  background: var(--color-danger-soft);
  color: var(--color-danger);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
}
.report-form__success-banner {
  background: var(--color-success-soft);
  color: var(--color-success);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
}
.report-form__mission {
  margin: var(--space-1) 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.report-form__error {
  color: var(--color-danger);
}

/* Native form controls in this view aren't wrapped by PulseInput/PulseSelect
   (they use custom change handlers), so apply the shared field look directly. */
.report-form input[type='text'],
.report-form input[type='number'],
.report-form select {
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}
.report-form input[type='number'] {
  width: 6rem;
}
.report-form input[type='text']:hover:not(:disabled),
.report-form input[type='number']:hover:not(:disabled),
.report-form select:hover:not(:disabled) {
  border-color: var(--color-border-strong);
}
.report-form input[type='text']:focus-visible,
.report-form input[type='number']:focus-visible,
.report-form select:focus-visible {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}
.report-form input:disabled,
.report-form select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
