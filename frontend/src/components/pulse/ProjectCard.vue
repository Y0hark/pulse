<script setup lang="ts">
import StatusRadio from './StatusRadio.vue';
import type { ProjectCardDraft } from '../../api/pulse';

const props = defineProps<{
  modelValue: ProjectCardDraft;
  disabled?: boolean;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ProjectCardDraft];
}>();

// Unique per-instance radio group name so multiple ProjectCards on one page don't cross-select.
const radioName = `project-status-${Math.random().toString(36).slice(2)}`;

const STATUS_LABEL: Record<ProjectCardDraft['status'], string> = {
  good: '🟢 Good',
  at_risk: '🟠 At risk',
  blocked: '🔴 Blocked',
};

function patch(partial: Partial<ProjectCardDraft>): void {
  emit('update:modelValue', { ...props.modelValue, ...partial });
}
</script>

<template>
  <article v-if="readonly" class="project-card project-card--readonly" :class="`project-card--${modelValue.status}`">
    <h3 class="project-card__title">{{ modelValue.title }}</h3>
    <p v-if="modelValue.description" class="project-card__description">{{ modelValue.description }}</p>
    <span class="project-card__status">{{ STATUS_LABEL[modelValue.status] }}</span>
  </article>
  <fieldset v-else class="project-card" :disabled="disabled">
    <input
      class="project-card__title"
      type="text"
      placeholder="Project title"
      :value="modelValue.title"
      @input="patch({ title: ($event.target as HTMLInputElement).value })"
    />
    <textarea
      class="project-card__description"
      placeholder="Description"
      :value="modelValue.description ?? ''"
      @input="patch({ description: ($event.target as HTMLTextAreaElement).value })"
    />
    <StatusRadio
      :name="radioName"
      :model-value="modelValue.status"
      :disabled="disabled"
      @update:model-value="(status) => patch({ status })"
    />
  </fieldset>
</template>

<style scoped>
.project-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  padding: 0.75rem;
}
.project-card__title {
  font-weight: 600;
}
.project-card--readonly {
  border-left-width: 4px;
}
.project-card--good {
  border-left-color: #22c55e;
}
.project-card--at_risk {
  border-left-color: #f97316;
}
.project-card--blocked {
  border-left-color: #ef4444;
}
.project-card--readonly .project-card__description {
  color: #555;
  white-space: pre-wrap;
}
.project-card__status {
  font-size: 0.85rem;
  font-weight: 500;
}
</style>
