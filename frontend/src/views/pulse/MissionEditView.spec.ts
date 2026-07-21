import { describe, expect, it, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MissionEditView from './MissionEditView.vue';

const push = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('../../api/pulse', async () => {
  const actual = await vi.importActual<typeof import('../../api/pulse')>('../../api/pulse');
  return {
    ...actual,
    getMe: vi.fn(),
    getMission: vi.fn(),
    updateMission: vi.fn(),
    archiveMission: vi.fn(),
    activateMission: vi.fn(),
    addMissionMember: vi.fn(),
    removeMissionMember: vi.fn(),
  };
});

function mockMe(isGlobalAdmin: boolean) {
  return { id: 'user-1', email: 'admin@example.com', profile: null, isGlobalAdmin, teams: [] };
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
  memberCount: 1,
  members: [{ userId: 'u1', email: 'a@example.com', displayName: 'A', role: 'member' as const }],
  recentReports: [],
  completion: null,
};

describe('MissionEditView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('blocks non-admins with a not-authorized message', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe(false));

    const wrapper = mount(MissionEditView, { props: { slug: 'ceva-logistics' } });
    await flushPromises();

    expect(wrapper.text()).toContain('Not authorized');
  });

  it('prefills the form with the mission being edited', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe(true));
    (api.getMission as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ mission: baseMission });

    const wrapper = mount(MissionEditView, { props: { slug: 'ceva-logistics' } });
    await flushPromises();

    const nameInput = wrapper.find('input').element as HTMLInputElement;
    expect(nameInput.value).toBe('CEVA Logistics');
    expect(wrapper.text()).toContain('Archive mission');
  });

  it('adds a new member and reloads the mission', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe(true));
    (api.getMission as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ mission: baseMission });
    (api.addMissionMember as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      member: { userId: 'u2', email: 'new@example.com', displayName: null, role: 'member' },
    });

    const wrapper = mount(MissionEditView, { props: { slug: 'ceva-logistics' } });
    await flushPromises();

    await wrapper.find('.mission-edit__add-member input').setValue('new@example.com');
    await wrapper.find('.mission-edit__add-member').trigger('submit');
    await flushPromises();

    expect(api.addMissionMember).toHaveBeenCalledWith('ceva-logistics', 'new@example.com');
    expect(api.getMission).toHaveBeenCalledTimes(2);
  });

  it('archives an active mission', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe(true));
    (api.getMission as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ mission: baseMission });
    (api.archiveMission as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      mission: { ...baseMission, status: 'archived' },
    });

    const wrapper = mount(MissionEditView, { props: { slug: 'ceva-logistics' } });
    await flushPromises();

    const buttons = wrapper.findAll('button').filter((b) => b.text().includes('Archive mission'));
    await buttons[0].trigger('click');
    await flushPromises();

    expect(api.archiveMission).toHaveBeenCalledWith('ceva-logistics');
  });
});
