<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '../../stores/session';
import * as api from '../../api/pulse';
import MissionForm, { type MissionFormValues } from '../../components/pulse/MissionForm.vue';
import { PulseErrorState } from '../../components/ui';

const session = useSessionStore();
const router = useRouter();

const submitting = ref(false);
const error = ref<string | null>(null);

const isAdmin = computed(() => session.user?.isGlobalAdmin ?? false);

onMounted(() => {
  if (!session.loaded) void session.load();
});

async function onSubmit(values: MissionFormValues): Promise<void> {
  submitting.value = true;
  error.value = null;
  try {
    const { mission } = await api.createMission({
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
    void router.push({ name: 'mission-detail', params: { slug: mission.slug } });
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not create the mission. Please try again.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="mission-create">
    <PulseErrorState
      v-if="session.loaded && !isAdmin"
      title="Not authorized"
      description="Only global admins can create missions."
    />
    <template v-else>
      <header class="mission-create__header">
        <h1>New mission</h1>
        <p class="mission-create__subtitle">
          Set up a mission's client, period and reporting cadence. You can invite the team afterwards.
        </p>
      </header>
      <MissionForm submit-label="Create mission" :submitting="submitting" :error="error" @submit="onSubmit" />
    </template>
  </section>
</template>

<style scoped>
.mission-create {
  max-width: 720px;
}

.mission-create__header {
  margin-bottom: var(--space-5);
}

.mission-create__subtitle {
  margin: var(--space-1) 0 0;
  color: var(--color-text-secondary);
}
</style>
