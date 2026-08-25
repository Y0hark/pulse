import { describe, expect, it, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsView from './SettingsView.vue';

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../../api/pulse', async () => {
  const actual = await vi.importActual<typeof import('../../api/pulse')>('../../api/pulse');
  return { ...actual, getMe: vi.fn(), getUsers: vi.fn(), getMissions: vi.fn(), getProfiles: vi.fn() };
});

function mockMe(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-1',
    email: 'admin@example.com',
    profile: null,
    isGlobalAdmin: false,
    teams: [],
    ...overrides,
  };
}

describe('SettingsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('shows Not authorized for a non-admin', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe({ isGlobalAdmin: false }));

    const wrapper = mount(SettingsView);
    await flushPromises();

    expect(wrapper.text()).toContain('Not authorized');
    expect(wrapper.text()).not.toContain('New user');
  });

  it('shows the Users tab with a New user button for a global admin', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe({ isGlobalAdmin: true }));
    (api.getUsers as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ users: [] });
    (api.getMissions as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ missions: [] });
    (api.getProfiles as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ profiles: [] });

    const wrapper = mount(SettingsView);
    await flushPromises();

    expect(wrapper.text()).toContain('New user');
    expect(wrapper.text()).toContain('No users yet');
  });

  it('switches to the Missions tab and lists missions', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe({ isGlobalAdmin: true }));
    (api.getUsers as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ users: [] });
    (api.getMissions as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      missions: [
        { id: '1', name: 'CEVA Logistics', slug: 'ceva-logistics', clientName: 'CEVA', status: 'active', reportingFrequency: 'weekly', memberCount: 4 },
      ],
    });

    const wrapper = mount(SettingsView);
    await flushPromises();

    const missionsTab = wrapper.findAll('button').find((b) => b.text() === 'Missions');
    expect(missionsTab).toBeTruthy();
    await missionsTab!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('CEVA Logistics');
  });
});
