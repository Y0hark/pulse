import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import AppShell from '../layout/AppShell.vue';
import Sidebar from './Sidebar.vue';
import { navItems } from './navItems';

function stub(name: string) {
  return defineComponent({ name, render: () => h('div', name) });
}

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      ...navItems.map((item) => ({
        path: `/${item.routeName}`,
        name: item.routeName,
        component: stub(item.routeName),
        meta: { title: item.label },
      })),
      { path: '/:pathMatch(.*)*', name: 'not-found', component: stub('not-found'), meta: { title: 'Not found' } },
    ],
  });
}

describe('Sidebar', () => {
  it('renders a link for every nav section', async () => {
    const router = buildRouter();
    await router.push('/dashboard');
    await router.isReady();

    const wrapper = mount(Sidebar, { global: { plugins: [router] } });

    expect(wrapper.findAll('a')).toHaveLength(navItems.length);
    navItems.forEach((item) => expect(wrapper.text()).toContain(item.label));
  });

  it('marks the link matching the current route as active', async () => {
    const router = buildRouter();
    await router.push('/missions');
    await router.isReady();

    const wrapper = mount(Sidebar, { global: { plugins: [router] } });

    const active = wrapper.find('.sidebar__link--active');
    expect(active.exists()).toBe(true);
    expect(active.text()).toContain('Missions');
  });
});

describe('AppShell', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve(null) } as Response)),
    );
  });

  it('renders the matched child route inside the shell', async () => {
    const router = buildRouter();
    await router.push('/dashboard');
    await router.isReady();

    const wrapper = mount(AppShell, { global: { plugins: [router] } });

    expect(wrapper.text()).toContain('dashboard');
  });

  it('shows the current page title in the header', async () => {
    const router = buildRouter();
    await router.push('/missions');
    await router.isReady();

    const wrapper = mount(AppShell, { global: { plugins: [router] } });

    expect(wrapper.find('h1').text()).toBe('Missions');
  });

  it('falls back to the not-found route for an unknown path', async () => {
    const router = buildRouter();
    await router.push('/this-route-does-not-exist');
    await router.isReady();

    const wrapper = mount(AppShell, { global: { plugins: [router] } });

    expect(wrapper.text()).toContain('not-found');
  });

  it('navigates between sections when a nav link is clicked', async () => {
    const router = buildRouter();
    await router.push('/dashboard');
    await router.isReady();

    const wrapper = mount(AppShell, { global: { plugins: [router] } });
    const teamLink = wrapper.findAll('a').find((a) => a.text().includes('Team & Users'));
    await teamLink?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('team');
    expect(wrapper.find('h1').text()).toBe('Team & Users');
  });
});
