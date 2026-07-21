<script setup lang="ts">
import StatusRadio from './StatusRadio.vue';
import type { ProjectCardDraft } from '../../api/pulse';

const props = defineProps<{
  modelValue: ProjectCardDraft;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ProjectCardDraft];
}>();

// Unique per-instance radio group name so multiple ProjectCards on one page don't cross-select.
const radioName = `project-status-${Math.random().toString(36).slice(2)}`;

function patch(partial: Partial<ProjectCardDraft>): void {
  emit('update:modelValue', { ...props.modelValue, ...partial });
}
</script>

<template>
  <fieldset class="project-card" :disabled="disabled">
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
</style>
