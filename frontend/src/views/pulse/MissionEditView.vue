<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '../../stores/session';
import * as api from '../../api/pulse';
import type { MissionDetail } from '../../api/pulse';
import MissionForm, { type MissionFormValues } from '../../components/pulse/MissionForm.vue';
import { PulseBadge, PulseButton, PulseErrorState, PulseInput, PulseSkeleton } from '../../components/ui';

const props = defineProps<{ slug: string }>();
const router = useRouter();
const session = useSessionStore();

const slug = computed(() => props.slug);
const isAdmin = computed(() => session.user?.isGlobalAdmin ?? false);

const mission = ref<MissionDetail | null>(null);
const loading = ref(false);
const loadError = ref<string | null>(null);
const submitting = ref(false);
const submitError = ref<string | null>(null);
const statusActionPending = ref(false);
const newMemberEmail = ref('');
const memberError = ref<string | null>(null);
const memberPending = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  loadError.value = null;
  try {
    const res = await api.getMission(slug.value);
    mission.value = res.mission;
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load this mission.';
  } finally {
    loading.value = false;
  }
}

async function onSubmit(values: MissionFormValues): Promise<void> {
  submitting.value = true;
  submitError.value = null;
  try {
    await api.updateMission(slug.value, {
      name: values.name,
      clientName: values.clientName.trim() || null,
      timezone: values.timezone,
      startsOn: values.startsOn || null,
      endsOn: values.endsOn || null,
      reportingFrequency: values.reportingFrequency,
      freezeDow: Number(values.freezeDow),
      freezeTime: values.freezeTime,
      freezeMode: values.freezeMode,
    });
    void router.push({ name: 'mission-detail', params: { slug: slug.value } });
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'Could not save the mission settings.';
  } finally {
    submitting.value = false;
  }
}

async function toggleStatus(): Promise<void> {
  if (!mission.value) return;
  statusActionPending.value = true;
  try {
    if (mission.value.status === 'active') {
      await api.archiveMission(slug.value);
    } else {
      await api.activateMission(slug.value);
    }
    await load();
  } finally {
    statusActionPending.value = false;
  }
}

async function addMember(): Promise<void> {
  if (newMemberEmail.value.trim() === '') return;
  memberPending.value = true;
  memberError.value = null;
  try {
    await api.addMissionMember(slug.value, newMemberEmail.value.trim());
    newMemberEmail.value = '';
    await load();
  } catch (err) {
    memberError.value = err instanceof Error ? err.message : 'Could not add this member.';
  } finally {
    memberPending.value = false;
  }
}

async function removeMember(userId: string): Promise<void> {
  memberPending.value = true;
  try {
    await api.removeMissionMember(slug.value, userId);
    await load();
  } finally {
    memberPending.value = false;
  }
}

onMounted(() => {
  if (!session.loaded) void session.load();
  void load();
});
</script>

<template>
  <section class="mission-edit">
    <PulseErrorState
      v-if="session.loaded && !isAdmin"
      title="Not authorized"
      description="Only global admins can edit mission settings."
    />

    <template v-else>
      <div v-if="loading" class="mission-edit__skeleton">
        <PulseSkeleton variant="block" height="2rem" />
        <PulseSkeleton variant="block" height="12rem" />
      </div>

      <PulseErrorState v-else-if="loadError" description="This mission could not be loaded." retryable @retry="load" />

      <template v-else-if="mission">
        <header class="mission-edit__header">
          <div>
            <h1>Edit mission — {{ mission.name }}</h1>
            <p class="mission-edit__subtitle">Update the mission's core settings and reporting cadence.</p>
          </div>
          <PulseButton
            :variant="mission.status === 'active' ? 'danger' : 'secondary'"
            :loading="statusActionPending"
            :disabled="statusActionPending"
            @click="toggleStatus"
          >
            {{ mission.status === 'active' ? 'Archive mission' : 'Reactivate mission' }}
          </PulseButton>
        </header>

        <MissionForm :mission="mission" submit-label="Save changes" :submitting="submitting" :error="submitError" @submit="onSubmit" />

        <section class="mission-edit__members">
          <h2>Team</h2>
          <ul class="mission-edit__member-list">
            <li v-for="member in mission.members" :key="member.userId" class="mission-edit__member">
              <span>{{ member.displayName ?? member.email }}</span>
              <PulseBadge variant="neutral">{{ member.role }}</PulseBadge>
              <PulseButton variant="ghost" size="sm" :disabled="memberPending" @click="removeMember(member.userId)">
                Remove
              </PulseButton>
            </li>
            <li v-if="mission.members.length === 0" class="mission-edit__member-empty">No one is staffed yet.</li>
          </ul>

          <form class="mission-edit__add-member" @submit.prevent="addMember">
            <PulseInput v-model="newMemberEmail" placeholder="teammate@company.com" :error="memberError ?? undefined" />
            <PulseButton type="submit" variant="secondary" :loading="memberPending" :disabled="memberPending">
              Add member
            </PulseButton>
          </form>
        </section>
      </template>
    </template>
  </section>
</template>

<style scoped>
.mission-edit {
  max-width: 720px;
}

.mission-edit__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.mission-edit__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.mission-edit__subtitle {
  margin: var(--space-1) 0 0;
  color: var(--color-text-secondary);
}

.mission-edit__members {
  margin-top: var(--space-8);
  padding-top: var(--space-6);
  border-top: 1px solid var(--color-border);
}

.mission-edit__member-list {
  list-style: none;
  margin: 0 0 var(--space-4);
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.mission-edit__member {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
}

.mission-edit__member span:first-child {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mission-edit__member-empty {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.mission-edit__add-member {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  flex-wrap: wrap;
}
</style>
