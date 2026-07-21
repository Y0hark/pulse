import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import LoginView from './LoginView.vue';
import * as api from '../../api/pulse';

describe('LoginView', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a validation error instead of submitting when the email is invalid', async () => {
    const spy = vi.spyOn(api, 'requestMagicLink');
    const wrapper = mount(LoginView);

    await wrapper.find('input[type="email"]').setValue('not-an-email');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.text()).toContain('Enter a valid email address.');
    expect(spy).not.toHaveBeenCalled();
  });

  it('shows a loading state while the request is in flight', async () => {
    let resolveRequest!: (v: { ok: boolean }) => void;
    vi.spyOn(api, 'requestMagicLink').mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const wrapper = mount(LoginView);

    await wrapper.find('input[type="email"]').setValue('person@company.com');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.text()).toContain('Sending your link…');
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();

    resolveRequest({ ok: true });
    await flushPromises();
    expect(wrapper.text()).toContain('Check your inbox');
  });

  it('shows a friendly error message, never the raw error, on failure', async () => {
    vi.spyOn(api, 'requestMagicLink').mockRejectedValue(new Error('500 Internal Server Error: db timeout'));
    const wrapper = mount(LoginView);

    await wrapper.find('input[type="email"]').setValue('person@company.com');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).not.toContain('db timeout');
    expect(wrapper.text()).toContain("couldn't send your sign-in link");
  });

  it('shows the sent confirmation on success', async () => {
    vi.spyOn(api, 'requestMagicLink').mockResolvedValue({ ok: true });
    const wrapper = mount(LoginView);

    await wrapper.find('input[type="email"]').setValue('person@company.com');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Check your inbox');
    expect(wrapper.text()).toContain('person@company.com');
  });
});
