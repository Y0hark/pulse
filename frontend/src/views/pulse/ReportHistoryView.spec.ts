import { describe, expect, it, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ReportHistoryView from './ReportHistoryView.vue';
import { ApiError } from '../../api/pulse';

vi.mock('../../api/pulse', async () => {
  const actual = await vi.importActual<typeof import('../../api/pulse')>('../../api/pulse');
  return { ...actual, getMe: vi.fn(), getPeriodHistory: vi.fn() };
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

describe('ReportHistoryView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('shows an error state with retry when the request fails', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe());
    (api.getPeriodHistory as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new ApiError(500, null));

    const wrapper = mount(ReportHistoryView, { global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } } });
    await flushPromises();

    expect(wrapper.text()).toContain('Failed to load report history');
  });

  it('shows an empty state when nothing has been frozen yet', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe());
    (api.getPeriodHistory as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ history: [] });

    const wrapper = mount(ReportHistoryView, { global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } } });
    await flushPromises();

    expect(wrapper.text()).toContain('No frozen periods yet');
  });

  it('lists frozen periods most recent first', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe());
    (api.getPeriodHistory as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      history: [
        { period: { id: 2, isoWeek: '2026-W28', startsOn: '2026-07-06', endsOn: '2026-07-13' }, frozenAt: '2026-07-14T09:30:00.000Z' },
        { period: { id: 1, isoWeek: '2026-W27', startsOn: '2026-06-29', endsOn: '2026-07-06' }, frozenAt: '2026-07-07T09:30:00.000Z' },
      ],
    });

    const wrapper = mount(ReportHistoryView, { global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } } });
    await flushPromises();

    expect(wrapper.text()).toContain('2026-W28');
    expect(wrapper.text()).toContain('2026-W27');
    expect(wrapper.text()).toContain('View report');
  });
});
