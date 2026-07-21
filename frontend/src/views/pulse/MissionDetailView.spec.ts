import { describe, expect, it, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MissionDetailView from './MissionDetailView.vue';
import { ApiError } from '../../api/pulse';

const push = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('../../api/pulse', async () => {
  const actual = await vi.importActual<typeof import('../../api/pulse')>('../../api/pulse');
  return { ...actual, getMe: vi.fn(), getMission: vi.fn() };
});

function mockMe(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-1',
    email: 'member@example.com',
    profile: null,
    isGlobalAdmin: false,
    teams: [],
    ...overrides,
  };
}

const baseMission = {
  id: 'team-1',
  name: 'CEVA Logistics',
  slug: 'ceva-logistics',
  clientName: 'CEVA',
  status: 'active' as const,
  reportingFrequency: 'weekly' as const,
  timezone: 'Europe/Paris',
  startsOn: null,
  endsOn: null,
  freezeDow: 2,
  freezeTime: '09:30:00',
  freezeMode: 'both' as const,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  memberCount: 2,
  members: [{ userId: 'u1', email: 'a@example.com', displayName: 'A', role: 'member' as const }],
  recentReports: [
    {
      id: 'r1',
      periodId: 5,
      isoWeek: '2026-W29',
      ownerDisplayName: 'A',
      ownerEmail: 'a@example.com',
      submittedAt: '2026-07-15T00:00:00.000Z',
      updatedAt: '2026-07-15T00:00:00.000Z',
    },
  ],
  completion: { submitted: 1, total: 2 },
};

describe('MissionDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('shows an error state with retry when the mission fails to load', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe());
    (api.getMission as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new ApiError(500, null));

    const wrapper = mount(MissionDetailView, { props: { slug: 'ceva-logistics' } });
    await flushPromises();

    expect(wrapper.text()).toContain('could not be loaded');
  });

  it('renders status, completion rate and recent reports on success', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe());
    (api.getMission as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ mission: baseMission });

    const wrapper = mount(MissionDetailView, { props: { slug: 'ceva-logistics' } });
    await flushPromises();

    expect(wrapper.text()).toContain('CEVA Logistics');
    expect(wrapper.text()).toContain('Active');
    expect(wrapper.text()).toContain('1 / 2 submitted this period');
    expect(wrapper.text()).toContain('2026-W29');
  });

  it('only shows the Edit settings action to global admins', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe({ isGlobalAdmin: false }));
    (api.getMission as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ mission: baseMission });

    const wrapper = mount(MissionDetailView, { props: { slug: 'ceva-logistics' } });
    await flushPromises();

    expect(wrapper.text()).not.toContain('Edit settings');
  });
});
