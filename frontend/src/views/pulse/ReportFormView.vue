<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useReportStore } from '../../stores/report';
import WorkloadSlider from '../../components/pulse/WorkloadSlider.vue';
import ProjectCard from '../../components/pulse/ProjectCard.vue';
import RepeatableList from '../../components/pulse/RepeatableList.vue';
import StreakBadge from '../../components/pulse/StreakBadge.vue';
import CompletionRing from '../../components/pulse/CompletionRing.vue';
import type { AlertDraft, AlertSeverity, OpportunityDraft, OpportunityType, ProjectCardDraft } from '../../api/pulse';

const TEAMS = ['ceva-logistics'];
const OPPORTUNITY_TYPES: { value: OpportunityType; label: string }[] = [
  { value: 'open_position', label: 'Open position' },
  { value: 'new_project', label: 'New project' },
  { value: 'new_budget', label: 'New budget' },
  { value: 'new_team', label: 'New team' },
  { value: 'client_need', label: 'Client need' },
];
const SEVERITIES: AlertSeverity[] = ['info', 'warn', 'critical'];

const store = useReportStore();

onMounted(() => {
  void store.loadCurrentPeriod('ceva-logistics');
});

watch(
  () => store.team,
  (team) => {
    void store.loadCurrentPeriod(team);
  },
);

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
  <main class="report-form" v-if="store.period">
    <header class="report-form__header">
      <h1>Weekly check-in — {{ store.period.isoWeek }}</h1>
      <select v-model="store.team" :disabled="store.loading">
        <option v-for="t in TEAMS" :key="t" :value="t">{{ t }}</option>
      </select>
      <p v-if="store.isFrozen" class="report-form__frozen-banner">
        This period is frozen — changes can no longer be saved.
      </p>
      <p v-if="store.error" class="report-form__error">{{ store.error }}</p>
      <p v-if="store.saving" class="report-form__status">Saving…</p>
    </header>

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
      <button type="button" :disabled="store.isFrozen || store.submitting" @click="store.submit()">
        {{ store.submitting ? 'Submitting…' : 'Submit' }}
      </button>
    </footer>
  </main>
  <p v-else>Loading…</p>
</template>

<style scoped>
.report-form {
  max-width: 720px;
  margin: 0 auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.report-form__gamification {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
}
.report-form__tasks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.report-form__counters {
  display: flex;
  gap: 1rem;
}
.report-form__alert-row,
.report-form__opportunity-row {
  display: flex;
  gap: 0.5rem;
}
.report-form__frozen-banner {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.5rem;
  border-radius: 0.25rem;
}
.report-form__error {
  color: #991b1b;
}
</style>
