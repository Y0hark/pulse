import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import WorkloadSlider from './WorkloadSlider.vue';

describe('WorkloadSlider', () => {
  it.each([
    [0, 'Low'],
    [25, 'Low'],
    [26, 'Steady'],
    [60, 'Steady'],
    [61, 'High'],
    [85, 'High'],
    [86, 'Critical'],
    [100, 'Critical'],
  ])('labels %i as %s zone', (value, expectedZone) => {
    const wrapper = mount(WorkloadSlider, { props: { modelValue: value } });
    expect(wrapper.text()).toContain(expectedZone);
  });

  it('emits update:modelValue when the range input changes', async () => {
    const wrapper = mount(WorkloadSlider, { props: { modelValue: 10 } });
    const input = wrapper.find('input[type="range"]');
    await input.setValue('42');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([42]);
  });
});
