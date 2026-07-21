import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import DesignSystemView from './DesignSystemView.vue';

describe('DesignSystemView', () => {
  it('renders every component category as a reference/QA surface', () => {
    const wrapper = mount(DesignSystemView);

    expect(wrapper.text()).toContain('Pulse Design System');
    expect(wrapper.text()).toContain('Buttons');
    expect(wrapper.text()).toContain('Form controls');
    expect(wrapper.text()).toContain('Cards');
    expect(wrapper.text()).toContain('Overlays');
    expect(wrapper.text()).toContain('States');
    expect(wrapper.findAll('button').length).toBeGreaterThan(0);
  });

  it('opens the modal when its trigger button is clicked', async () => {
    const wrapper = mount(DesignSystemView, { attachTo: document.body });

    const trigger = wrapper.findAll('button').find((button) => button.text() === 'Open modal');
    await trigger?.trigger('click');

    expect(document.body.textContent).toContain('Confirm action');
    wrapper.unmount();
  });
});
