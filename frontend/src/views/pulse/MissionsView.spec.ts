import { describe, expect, it, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MissionsView from './MissionsView.vue';
import { ApiError } from '../../api/pulse';

const push = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('../../api/pulse', async () => {
  const actual = await vi.importActual<typeof import('../../api/pulse')>('../../api/pulse');
  return { ...actual, getMe: vi.fn(), getMissions: vi.fn() };
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

describe('MissionsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('shows a loading state while missions are being fetched', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe());
    let resolveMissions!: (v: { missions: unknown[] }) => void;
    (api.getMissions as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolveMissions = resolve;
      }),
    );

    const wrapper = mount(MissionsView);
    await flushPromises();
    expect(wrapper.findAll('.pulse-skeleton').length).toBeGreaterThan(0);

    resolveMissions({ missions: [] });
    await flushPromises();
  });

  it('shows an error state with retry when the request fails', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe());
    (api.getMissions as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new ApiError(500, null));

    const wrapper = mount(MissionsView);
    await flushPromises();

    expect(wrapper.text()).toContain("couldn't load your missions");
  });

  it('shows an empty state without a create button for non-admins', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe({ isGlobalAdmin: false }));
    (api.getMissions as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ missions: [] });

    const wrapper = mount(MissionsView);
    await flushPromises();

    expect(wrapper.text()).toContain('No missions yet');
    expect(wrapper.text()).not.toContain('Create a mission');
    expect(wrapper.findAll('button').filter((b) => b.text() === 'New mission')).toHaveLength(0);
  });

  it('lists active missions and offers a New mission button for global admins', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe({ isGlobalAdmin: true }));
    (api.getMissions as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      missions: [
        { id: '1', name: 'CEVA Logistics', slug: 'ceva-logistics', clientName: 'CEVA', status: 'active', reportingFrequency: 'weekly', memberCount: 4 },
        { id: '2', name: 'Old Client', slug: 'old-client', clientName: null, status: 'archived', reportingFrequency: 'weekly', memberCount: 0 },
      ],
    });

    const wrapper = mount(MissionsView);
    await flushPromises();

    expect(wrapper.text()).toContain('CEVA Logistics');
    expect(wrapper.text()).not.toContain('Old Client');
    expect(wrapper.text()).toContain('New mission');
  });
});
