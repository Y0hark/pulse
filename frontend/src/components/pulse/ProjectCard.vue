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
  gap: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  margin: 0;
  min-width: 0;
}
.project-card__title {
  font-weight: var(--font-weight-semibold);
}
fieldset.project-card {
  background: var(--color-surface);
}
.project-card input.project-card__title,
.project-card textarea.project-card__description {
  width: 100%;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: var(--font-size-md);
}
.project-card input.project-card__title::placeholder,
.project-card textarea.project-card__description::placeholder {
  color: var(--color-text-muted);
}
.project-card input.project-card__title:focus-visible,
.project-card textarea.project-card__description:focus-visible {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}
.project-card--readonly {
  border-left-width: 4px;
  color: var(--color-text-primary);
}
.project-card--good {
  border-left-color: var(--color-success);
}
.project-card--at_risk {
  border-left-color: var(--color-warning);
}
.project-card--blocked {
  border-left-color: var(--color-danger);
}
.project-card--readonly .project-card__description {
  color: var(--color-text-secondary);
  white-space: pre-wrap;
  overflow-wrap: break-word;
}
.project-card__status {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
</style>
