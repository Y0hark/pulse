<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string;
    options: Array<{ value: string; label: string }>;
    label?: string;
    placeholder?: string;
    hint?: string;
    error?: string;
    disabled?: boolean;
  }>(),
  {},
);

defineEmits<{
  'update:modelValue': [value: string];
}>();

const id = `pulse-select-${Math.random().toString(36).slice(2)}`;
</script>

<template>
  <div class="pulse-field" :class="{ 'pulse-field--invalid': !!error }">
    <label v-if="label" class="pulse-field__label" :for="id">{{ label }}</label>
    <select
      :id="id"
      class="pulse-field__control"
      :disabled="disabled"
      :value="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <span v-if="error" class="pulse-field__error">{{ error }}</span>
    <span v-else-if="hint" class="pulse-field__hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.pulse-field__control {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23a3adc2' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--space-3) center;
  padding-right: var(--space-8);
}
</style>
