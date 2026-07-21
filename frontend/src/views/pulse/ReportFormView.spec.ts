import { describe, expect, it, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ReportFormView from './ReportFormView.vue';
import { ApiError } from '../../api/pulse';

vi.mock('../../api/pulse', async () => {
  const actual = await vi.importActual<typeof import('../../api/pulse')>('../../api/pulse');
  return {
    ...actual,
    getMe: vi.fn(),
    getCurrentPeriod: vi.fn(),
    getMyGamification: vi.fn(),
    putMyReport: vi.fn(),
    submitMyReport: vi.fn(),
  };
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

const emptyDraft = {
  workload: 0,
  deliveredCnt: 0,
  inflightCnt: 0,
  projectCards: [],
  majorTasksDid: [],
  majorTasksToDo: [],
  alerts: [],
  opportunities: [],
};

function mockGamification() {
  return {
    period: { id: 1, isoWeek: '2026-W29', startsOn: '2026-07-13', endsOn: '2026-07-20' },
    streak: { current: 2, longest: 4 },
    xp: { total: 20, periods: [] },
    completionRing: { percent: 50, filledFields: 4, totalFields: 8 },
    badges: [],
    leaderboardOptIn: false,
  };
}

describe('ReportFormView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const mountOptions = { global: { stubs: { RouterLink: true } } };

  it('shows an empty state when the user has no assigned mission', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe({ teams: [] }));

    const wrapper = mount(ReportFormView, mountOptions);
    await flushPromises();

    expect(wrapper.text()).toContain('No mission assigned');
  });

  it('shows an error state with retry when the period fails to load', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe());
    (api.getCurrentPeriod as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new ApiError(500, null));

    const wrapper = mount(ReportFormView, mountOptions);
    await flushPromises();

    expect(wrapper.text()).toContain("couldn't load this week's submission");
  });

  it('renders the form with gamification once the period loads, without disabling submit', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe());
    (api.getCurrentPeriod as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      period: { id: 1, isoWeek: '2026-W29', startsOn: '2026-07-13', endsOn: '2026-07-20' },
      status: 'open',
      draft: emptyDraft,
    });
    (api.getMyGamification as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('gamification down'));

    const wrapper = mount(ReportFormView, mountOptions);
    await flushPromises();

    expect(wrapper.text()).toContain('2026-W29');
    const submitButton = wrapper.findAll('button').find((b) => b.text().includes('Submit'));
    expect(submitButton?.attributes('disabled')).toBeFalsy();
  });

  it('shows a confirmation banner after a successful submit', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe());
    (api.getCurrentPeriod as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      period: { id: 1, isoWeek: '2026-W29', startsOn: '2026-07-13', endsOn: '2026-07-20' },
      status: 'open',
      draft: emptyDraft,
    });
    (api.getMyGamification as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockGamification());
    (api.putMyReport as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      period: { id: 1, isoWeek: '2026-W29', startsOn: '2026-07-13', endsOn: '2026-07-20' },
      report: { ...emptyDraft, id: 'r1', periodId: 1, submittedAt: null, updatedAt: '2026-07-14T00:00:00.000Z' },
    });
    (api.submitMyReport as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      period: { id: 1, isoWeek: '2026-W29', startsOn: '2026-07-13', endsOn: '2026-07-20' },
      report: {
        ...emptyDraft,
        id: 'r1',
        periodId: 1,
        submittedAt: '2026-07-14T00:00:00.000Z',
        updatedAt: '2026-07-14T00:00:00.000Z',
      },
    });

    const wrapper = mount(ReportFormView, mountOptions);
    await flushPromises();

    const submitButton = wrapper.findAll('button').find((b) => b.text().includes('Submit'));
    await submitButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('✓ Submitted');
  });
});
