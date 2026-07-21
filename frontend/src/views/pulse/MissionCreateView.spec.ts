import { describe, expect, it, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MissionCreateView from './MissionCreateView.vue';

const push = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('../../api/pulse', async () => {
  const actual = await vi.importActual<typeof import('../../api/pulse')>('../../api/pulse');
  return { ...actual, getMe: vi.fn(), createMission: vi.fn() };
});

function mockMe(isGlobalAdmin: boolean) {
  return { id: 'user-1', email: 'admin@example.com', profile: null, isGlobalAdmin, teams: [] };
}

describe('MissionCreateView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('blocks non-admins with a not-authorized message', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe(false));

    const wrapper = mount(MissionCreateView);
    await flushPromises();

    expect(wrapper.text()).toContain('Not authorized');
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('requires a mission name before submitting', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe(true));
    const createSpy = api.createMission as unknown as ReturnType<typeof vi.fn>;

    const wrapper = mount(MissionCreateView);
    await flushPromises();

    await wrapper.find('form').trigger('submit');

    expect(wrapper.text()).toContain('Mission name is required.');
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('creates the mission and navigates to its detail page', async () => {
    const api = await import('../../api/pulse');
    (api.getMe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockMe(true));
    (api.createMission as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      mission: { slug: 'globex-corp', name: 'Globex Corp' },
    });

    const wrapper = mount(MissionCreateView);
    await flushPromises();

    await wrapper.find('input').setValue('Globex Corp');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(api.createMission).toHaveBeenCalledWith(expect.objectContaining({ name: 'Globex Corp' }));
    expect(push).toHaveBeenCalledWith({ name: 'mission-detail', params: { slug: 'globex-corp' } });
  });
});
