<script setup lang="ts" generic="T">
const props = defineProps<{
  modelValue: T[];
  makeItem: () => T;
  disabled?: boolean;
  addLabel?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: T[]];
}>();

function add(): void {
  emit('update:modelValue', [...props.modelValue, props.makeItem()]);
}

function remove(index: number): void {
  const next = props.modelValue.slice();
  next.splice(index, 1);
  emit('update:modelValue', next);
}

function move(index: number, delta: number): void {
  const target = index + delta;
  if (target < 0 || target >= props.modelValue.length) return;
  const next = props.modelValue.slice();
  [next[index], next[target]] = [next[target], next[index]];
  emit('update:modelValue', next);
}

function updateAt(index: number, item: T): void {
  const next = props.modelValue.slice();
  next[index] = item;
  emit('update:modelValue', next);
}
</script>

<template>
  <div class="repeatable-list">
    <div v-for="(item, index) in modelValue" :key="index" class="repeatable-list__item">
      <div class="repeatable-list__content">
        <slot :item="item" :index="index" :update="(next: T) => updateAt(index, next)" />
      </div>
      <div class="repeatable-list__controls">
        <button type="button" :disabled="disabled || index === 0" @click="move(index, -1)" aria-label="Move up">
          ↑
        </button>
        <button
          type="button"
          :disabled="disabled || index === modelValue.length - 1"
          @click="move(index, 1)"
          aria-label="Move down"
        >
          ↓
        </button>
        <button type="button" :disabled="disabled" @click="remove(index)" aria-label="Remove">✕</button>
      </div>
    </div>
    <button type="button" class="repeatable-list__add" :disabled="disabled" @click="add">
      + {{ addLabel ?? 'Add' }}
    </button>
  </div>
</template>

<style scoped>
.repeatable-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.repeatable-list__item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
.repeatable-list__content {
  flex: 1;
}
.repeatable-list__controls {
  display: flex;
  gap: 0.25rem;
}
</style>
