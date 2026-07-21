import { describe, expect, it, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SubmissionHistoryView from './SubmissionHistoryView.vue';
import { ApiError } from '../../api/pulse';

vi.mock('../../api/pulse', async () => {
  const actual = await vi.importActual<typeof import('../../api/pulse')>('../../api/pulse');
  return { ...actual, getMe: vi.fn(), getSubmissionHistory: vi.fn(), getMyReport: vi.fn() };
});

function mockMe(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-1',
    email: 'member@example.com',
    profile: null,
    isGlobalAdmin: false,
    teams: [{ team: { id: 't1', name: 'CEVA Logistics', slug: 'ceva-logistics' }, role: 'member' }],
    ...overrides,
  };
}

describe('SubmissionHistoryView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('shows a loading state while history is being fetched', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe());
    let resolveHistory!: (v: { periods: unknown[] }) => void;
    (api.getSubmissionHistory as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolveHistory = resolve;
      }),
    );

    const wrapper = mount(SubmissionHistoryView);
    await flushPromises();
    expect(wrapper.findAll('.pulse-skeleton').length).toBeGreaterThan(0);

    resolveHistory({ periods: [] });
    await flushPromises();
  });

  it('shows an error state with retry when the request fails', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe());
    (api.getSubmissionHistory as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new ApiError(500, null));

    const wrapper = mount(SubmissionHistoryView);
    await flushPromises();

    expect(wrapper.text()).toContain("couldn't load your submission history");
  });

  it('shows an empty state when no periods exist yet', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe());
    (api.getSubmissionHistory as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ periods: [] });

    const wrapper = mount(SubmissionHistoryView);
    await flushPromises();

    expect(wrapper.text()).toContain('No periods yet');
  });

  it('lists periods with their status and expands a submitted one on click', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe());
    (api.getSubmissionHistory as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      periods: [
        { periodId: 3, isoWeek: '2026-W29', endsOn: '2026-07-27', submittedAt: null, status: 'open' },
        { periodId: 2, isoWeek: '2026-W28', endsOn: '2026-07-13', submittedAt: null, status: 'missed' },
        {
          periodId: 1,
          isoWeek: '2026-W27',
          endsOn: '2026-07-06',
          submittedAt: '2026-07-05T10:00:00.000Z',
          status: 'submitted',
        },
      ],
    });
    (api.getMyReport as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      period: { id: 1, isoWeek: '2026-W27', startsOn: '2026-06-29', endsOn: '2026-07-06' },
      report: {
        id: 'r1',
        periodId: 1,
        submittedAt: '2026-07-05T10:00:00.000Z',
        updatedAt: '2026-07-05T10:00:00.000Z',
        workload: 60,
        deliveredCnt: 2,
        inflightCnt: 1,
        projectCards: [],
        majorTasksDid: [],
        majorTasksToDo: [],
        alerts: [],
        opportunities: [],
      },
    });

    const wrapper = mount(SubmissionHistoryView);
    await flushPromises();

    expect(wrapper.text()).toContain('2026-W29');
    expect(wrapper.text()).toContain('Missed');
    expect(wrapper.text()).toContain('Submitted');

    const rows = wrapper.findAll('.submission-history__row');
    const submittedRow = rows.find((r) => r.text().includes('2026-W27'))!;
    await submittedRow.trigger('click');
    await flushPromises();

    expect(api.getMyReport).toHaveBeenCalledWith('ceva-logistics', '2026-W27');
    expect(wrapper.text()).toContain('Workload');
  });
});
