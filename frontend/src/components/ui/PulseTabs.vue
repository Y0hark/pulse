<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    tabs: Array<{ value: string; label: string }>;
  }>(),
  {},
);

defineEmits<{
  'update:modelValue': [value: string];
}>();

const tabRefs = ref<Record<string, HTMLButtonElement | undefined>>({});
const indicatorStyle = ref({ transform: 'translateX(0px)', width: '0px' });

function setTabRef(value: string, el: Element | null): void {
  tabRefs.value[value] = (el as HTMLButtonElement) ?? undefined;
}

function updateIndicator(): void {
  const el = tabRefs.value[props.modelValue];
  if (!el) return;
  indicatorStyle.value = { transform: `translateX(${el.offsetLeft}px)`, width: `${el.offsetWidth}px` };
}

watch(() => props.modelValue, () => void nextTick(updateIndicator));
watch(
  () => props.tabs,
  () => void nextTick(updateIndicator),
  { deep: true },
);
onMounted(() => void nextTick(updateIndicator));
</script>

<template>
  <div class="pulse-tabs">
    <div class="pulse-tabs__list" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        :ref="(el) => setTabRef(tab.value, el as Element | null)"
        type="button"
        role="tab"
        class="pulse-tabs__tab"
        :class="{ 'pulse-tabs__tab--active': tab.value === modelValue }"
        :aria-selected="tab.value === modelValue"
        @click="$emit('update:modelValue', tab.value)"
      >
        {{ tab.label }}
      </button>
      <span class="pulse-tabs__indicator" :style="indicatorStyle" aria-hidden="true" />
    </div>
    <div class="pulse-tabs__panel">
      <slot :active="modelValue" />
    </div>
  </div>
</template>

<style scoped>
.pulse-tabs__list {
  position: relative;
  display: flex;
  gap: var(--space-1);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-4);
}

.pulse-tabs__tab {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-secondary);
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: color var(--transition-fast);
  transform: translateY(1px);
}

.pulse-tabs__tab:hover {
  color: var(--color-text-primary);
}

.pulse-tabs__tab--active {
  color: var(--color-accent);
}

.pulse-tabs__indicator {
  position: absolute;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--color-accent);
  border-radius: var(--radius-full);
  transition:
    transform var(--transition-base),
    width var(--transition-base);
}
</style>
