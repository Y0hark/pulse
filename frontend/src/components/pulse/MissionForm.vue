<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { FreezeMode, MissionRecord, ReportingFrequency } from '../../api/pulse';
import { PulseButton, PulseInput, PulseSelect } from '../ui';

export interface MissionFormValues {
  name: string;
  clientName: string;
  timezone: string;
  startsOn: string;
  endsOn: string;
  reportingFrequency: ReportingFrequency;
  freezeDow: string;
  freezeTime: string;
  freezeMode: FreezeMode;
}

const props = withDefaults(
  defineProps<{
    mission?: MissionRecord | null;
    submitLabel?: string;
    submitting?: boolean;
    error?: string | null;
  }>(),
  {
    mission: null,
    submitLabel: 'Save mission',
    submitting: false,
    error: null,
  },
);

const emit = defineEmits<{
  submit: [values: MissionFormValues];
}>();

const FREEZE_DOW_OPTIONS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '7', label: 'Sunday' },
];

const REPORTING_FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const FREEZE_MODE_OPTIONS = [
  { value: 'both', label: 'Automatic + manual freeze' },
  { value: 'auto', label: 'Automatic freeze only' },
  { value: 'manual', label: 'Manual freeze only' },
];

function initialValues(): MissionFormValues {
  const m = props.mission;
  return {
    name: m?.name ?? '',
    clientName: m?.clientName ?? '',
    timezone: m?.timezone ?? 'Europe/Paris',
    startsOn: m?.startsOn ?? '',
    endsOn: m?.endsOn ?? '',
    reportingFrequency: m?.reportingFrequency ?? 'weekly',
    freezeDow: String(m?.freezeDow ?? 2),
    freezeTime: m?.freezeTime?.slice(0, 5) ?? '09:30',
    freezeMode: m?.freezeMode ?? 'both',
  };
}

const values = reactive(initialValues());

watch(
  () => props.mission,
  () => Object.assign(values, initialValues()),
);

const nameError = () => (touched.name && values.name.trim() === '' ? 'Mission name is required.' : undefined);
const touched = reactive({ name: false });

function onSubmit(): void {
  touched.name = true;
  if (values.name.trim() === '') return;
  emit('submit', { ...values });
}
</script>

<template>
  <form class="mission-form" novalidate @submit.prevent="onSubmit">
    <div class="mission-form__grid">
      <PulseInput v-model="values.name" label="Mission name" placeholder="e.g. CEVA Logistics" :error="nameError()" />
      <PulseInput v-model="values.clientName" label="Client / entity" placeholder="e.g. CEVA Logistics SA" />
    </div>

    <div class="mission-form__grid">
      <PulseInput v-model="values.startsOn" label="Start date" type="date" />
      <PulseInput v-model="values.endsOn" label="End date" type="date" hint="Leave empty for an ongoing mission." />
    </div>

    <div class="mission-form__grid">
      <PulseSelect
        v-model="values.reportingFrequency"
        label="Reporting frequency"
        :options="REPORTING_FREQUENCY_OPTIONS"
      />
      <PulseInput v-model="values.timezone" label="Timezone" placeholder="Europe/Paris" />
    </div>

    <div class="mission-form__grid mission-form__grid--three">
      <PulseSelect v-model="values.freezeDow" label="Weekly deadline — day" :options="FREEZE_DOW_OPTIONS" />
      <PulseInput v-model="values.freezeTime" label="Weekly deadline — time" type="time" />
      <PulseSelect v-model="values.freezeMode" label="Reporting freeze mode" :options="FREEZE_MODE_OPTIONS" />
    </div>

    <p v-if="error" class="mission-form__error" role="alert">{{ error }}</p>

    <div class="mission-form__actions">
      <PulseButton type="submit" :loading="submitting" :disabled="submitting">{{ submitLabel }}</PulseButton>
      <slot name="actions" />
    </div>
  </form>
</template>

<style scoped>
.mission-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.mission-form__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.mission-form__grid--three {
  grid-template-columns: 1fr 1fr 1fr;
}

.mission-form__error {
  margin: 0;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

.mission-form__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

@media (max-width: 720px) {
  .mission-form__grid,
  .mission-form__grid--three {
    grid-template-columns: 1fr;
  }
}
</style>
