import { describe, expect, it, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SnapshotView from './SnapshotView.vue';
import { ApiError } from '../../api/pulse';

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { periodId: '5' } }),
}));

vi.mock('../../api/pulse', async () => {
  const actual = await vi.importActual<typeof import('../../api/pulse')>('../../api/pulse');
  return { ...actual, getMe: vi.fn(), getPeriodSnapshot: vi.fn(), freezePeriod: vi.fn() };
});

function mockMe() {
  return {
    id: 'user-1',
    email: 'member@example.com',
    profile: null,
    isGlobalAdmin: false,
    teams: [{ team: { id: 't1', name: 'CEVA Logistics', slug: 'ceva-logistics' }, role: 'member' }],
  };
}

const aggregate = {
  workload: { mean: 42, max: 70, min: 10, distribution: [
    { bucket: 'low', count: 0 }, { bucket: 'steady', count: 1 }, { bucket: 'high', count: 0 }, { bucket: 'critical', count: 0 },
  ] },
  totalDelivered: 3,
  totalInFlight: 1,
  projectHealth: { good: 1, at_risk: 0, blocked: 0 },
  byProfile: [],
  alerts: [{ content: 'Vendor delay', severity: 'critical' }],
  opportunities: [],
  submissionStatus: { submitted: [], pending: [] },
};

describe('SnapshotView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('offers a manual freeze when the period is not yet frozen', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe());
    (api.getPeriodSnapshot as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new ApiError(404, { error: 'not_frozen' }));

    const wrapper = mount(SnapshotView);
    await flushPromises();

    expect(wrapper.text()).toContain("hasn't been frozen yet");
    expect(wrapper.find('button').text()).toBe('Freeze now');
  });

  it('renders the frozen snapshot payload', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe());
    (api.getPeriodSnapshot as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      period: { id: 5, isoWeek: '2026-W29', startsOn: '2026-07-13', endsOn: '2026-07-20' },
      snapshot: { teamId: 'team-1', periodId: 5, payload: aggregate, frozenAt: '2026-07-21T09:30:00.000Z' },
    });

    const wrapper = mount(SnapshotView);
    await flushPromises();

    expect(wrapper.text()).toContain('Team snapshot — 2026-W29');
    expect(wrapper.text()).toContain('Vendor delay');
    expect(wrapper.text()).toContain('Export PDF');
    expect(wrapper.text()).toContain('Export PNG');
  });
});
