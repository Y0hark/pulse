<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string;
    label?: string;
    placeholder?: string;
    type?: string;
    hint?: string;
    error?: string;
    disabled?: boolean;
  }>(),
  {
    type: 'text',
  },
);

defineEmits<{
  'update:modelValue': [value: string];
}>();

const id = `pulse-input-${Math.random().toString(36).slice(2)}`;
</script>

<template>
  <div class="pulse-field" :class="{ 'pulse-field--invalid': !!error }">
    <label v-if="label" class="pulse-field__label" :for="id">{{ label }}</label>
    <input
      :id="id"
      class="pulse-field__control"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="error" class="pulse-field__error">{{ error }}</span>
    <span v-else-if="hint" class="pulse-field__hint">{{ hint }}</span>
  </div>
</template>
