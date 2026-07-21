<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string;
    label?: string;
    placeholder?: string;
    rows?: number;
    hint?: string;
    error?: string;
    disabled?: boolean;
  }>(),
  {
    rows: 4,
  },
);

defineEmits<{
  'update:modelValue': [value: string];
}>();

const id = `pulse-textarea-${Math.random().toString(36).slice(2)}`;
</script>

<template>
  <div class="pulse-field" :class="{ 'pulse-field--invalid': !!error }">
    <label v-if="label" class="pulse-field__label" :for="id">{{ label }}</label>
    <textarea
      :id="id"
      class="pulse-field__control"
      :rows="rows"
      :placeholder="placeholder"
      :disabled="disabled"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <span v-if="error" class="pulse-field__error">{{ error }}</span>
    <span v-else-if="hint" class="pulse-field__hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.pulse-field__control {
  resize: vertical;
  font-family: inherit;
}
</style>
