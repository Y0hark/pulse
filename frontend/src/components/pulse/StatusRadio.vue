<script setup lang="ts">
const props = defineProps<{
  modelValue: 'good' | 'at_risk' | 'blocked';
  name: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': ['good' | 'at_risk' | 'blocked'];
}>();

const OPTIONS: { value: 'good' | 'at_risk' | 'blocked'; label: string; emoji: string }[] = [
  { value: 'good', label: 'Good', emoji: '🟢' },
  { value: 'at_risk', label: 'At risk', emoji: '🟠' },
  { value: 'blocked', label: 'Blocked', emoji: '🔴' },
];
</script>

<template>
  <div class="status-radio" role="radiogroup">
    <label v-for="opt in OPTIONS" :key="opt.value" class="status-radio__option">
      <input
        type="radio"
        :name="name"
        :value="opt.value"
        :checked="modelValue === opt.value"
        :disabled="disabled"
        @change="emit('update:modelValue', opt.value)"
      />
      {{ opt.emoji }} {{ opt.label }}
    </label>
  </div>
</template>

<style scoped>
.status-radio {
  display: flex;
  gap: 1rem;
}
.status-radio__option {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
}
</style>
