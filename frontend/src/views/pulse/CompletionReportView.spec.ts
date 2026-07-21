import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import CompletionReportView from './CompletionReportView.vue';
import { ApiError } from '../../api/pulse';

vi.mock('../../api/pulse', async () => {
  const actual = await vi.importActual<typeof import('../../api/pulse')>('../../api/pulse');
  return { ...actual, getCompletionReport: vi.fn() };
});

describe('CompletionReportView', () => {
  it('shows an error state with retry when the request fails', async () => {
    const api = await import('../../api/pulse');
    (api.getCompletionReport as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new ApiError(500, null));

    const wrapper = mount(CompletionReportView);
    await flushPromises();

    expect(wrapper.text()).toContain('Failed to load completion report');
  });

  it('renders completion stats and per-member status', async () => {
    const api = await import('../../api/pulse');
    (api.getCompletionReport as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      period: { id: 1, isoWeek: '2026-W29', startsOn: '2026-07-13', endsOn: '2026-07-20' },
      completion: {
        deadline: '2026-07-21T07:30:00.000Z',
        rows: [
          { userId: 'u1', displayName: 'Ada Lovelace', profileCode: 'ba', profileLabel: 'BA', status: 'on_time', submittedAt: '2026-07-20T10:00:00.000Z' },
          { userId: 'u2', displayName: 'Grace Hopper', profileCode: 'pm', profileLabel: 'PM', status: 'late', submittedAt: '2026-07-21T10:00:00.000Z' },
          { userId: 'u3', displayName: 'Not Yet', profileCode: null, profileLabel: null, status: 'missing', submittedAt: null },
        ],
        summary: { onTime: 1, late: 1, missing: 1, completionPct: 67 },
      },
    });

    const wrapper = mount(CompletionReportView);
    await flushPromises();

    expect(wrapper.text()).toContain('Submission completion — 2026-W29');
    expect(wrapper.text()).toContain('67%');
    expect(wrapper.text()).toContain('Ada Lovelace');
    expect(wrapper.text()).toContain('Grace Hopper');
    expect(wrapper.text()).toContain('Not Yet');
    expect(wrapper.text()).toContain('Still missing');
  });
});
