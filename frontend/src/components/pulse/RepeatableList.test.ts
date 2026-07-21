import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import RepeatableList from './RepeatableList.vue';

describe('RepeatableList', () => {
  it('adds a new item via makeItem', async () => {
    const wrapper = mount(RepeatableList<string>, {
      props: { modelValue: ['a'], makeItem: () => 'new' },
      slots: { default: '<template #default="{ item }">{{ item }}</template>' },
    });

    await wrapper.find('.repeatable-list__add').trigger('click');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['a', 'new']]);
  });

  it('removes an item at the given index', async () => {
    const wrapper = mount(RepeatableList<string>, {
      props: { modelValue: ['a', 'b', 'c'], makeItem: () => 'new' },
      slots: { default: '<template #default="{ item }">{{ item }}</template>' },
    });

    const removeButtons = wrapper.findAll('button[aria-label="Remove"]');
    await removeButtons[1].trigger('click');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['a', 'c']]);
  });

  it('moves an item down and up via reorder controls', async () => {
    const wrapper = mount(RepeatableList<string>, {
      props: { modelValue: ['a', 'b', 'c'], makeItem: () => 'new' },
      slots: { default: '<template #default="{ item }">{{ item }}</template>' },
    });

    const downButtons = wrapper.findAll('button[aria-label="Move down"]');
    await downButtons[0].trigger('click');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['b', 'a', 'c']]);
  });
});
