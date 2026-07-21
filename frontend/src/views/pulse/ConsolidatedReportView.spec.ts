import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ConsolidatedReportView from './ConsolidatedReportView.vue';
import { ApiError } from '../../api/pulse';

vi.mock('../../api/pulse', async () => {
  const actual = await vi.importActual<typeof import('../../api/pulse')>('../../api/pulse');
  return { ...actual, getConsolidatedReport: vi.fn() };
});

describe('ConsolidatedReportView', () => {
  it('shows an error state with retry when the request fails', async () => {
    const api = await import('../../api/pulse');
    (api.getConsolidatedReport as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new ApiError(500, null));

    const wrapper = mount(ConsolidatedReportView, { global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } } });
    await flushPromises();

    expect(wrapper.text()).toContain('Failed to load consolidated report');
  });

  it('shows an empty state when there are no active missions', async () => {
    const api = await import('../../api/pulse');
    (api.getConsolidatedReport as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      period: { id: 1, isoWeek: '2026-W29', startsOn: '2026-07-13', endsOn: '2026-07-20' },
      report: {
        missions: [],
        totals: { missionCount: 0, headcount: 0, totalDelivered: 0, totalInFlight: 0, meanWorkload: 0, completionPct: 0 },
        topAlerts: [],
      },
    });

    const wrapper = mount(ConsolidatedReportView, { global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } } });
    await flushPromises();

    expect(wrapper.text()).toContain('No active missions');
  });

  it('renders totals and per-mission rows', async () => {
    const api = await import('../../api/pulse');
    (api.getConsolidatedReport as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      period: { id: 1, isoWeek: '2026-W29', startsOn: '2026-07-13', endsOn: '2026-07-20' },
      report: {
        missions: [
          {
            missionId: 'm1',
            missionName: 'CEVA Logistics',
            missionSlug: 'ceva-logistics',
            headcount: 5,
            submitted: 2,
            meanWorkload: 55,
            totalDelivered: 8,
            totalInFlight: 3,
            completionPct: 40,
          },
        ],
        totals: { missionCount: 1, headcount: 5, totalDelivered: 8, totalInFlight: 3, meanWorkload: 55, completionPct: 40 },
        topAlerts: [{ content: 'Client escalation', severity: 'critical', missionName: 'CEVA Logistics' }],
      },
    });

    const wrapper = mount(ConsolidatedReportView, { global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } } });
    await flushPromises();

    expect(wrapper.text()).toContain('Across missions — 2026-W29');
    expect(wrapper.text()).toContain('CEVA Logistics');
    expect(wrapper.text()).toContain('40%');
    expect(wrapper.text()).toContain('Client escalation');
  });
});
