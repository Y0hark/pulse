<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useSessionStore } from '../../stores/session';
import { PulseErrorState, PulseTabs } from '../../components/ui';
import UsersPanel from '../../components/settings/UsersPanel.vue';
import MissionsPanel from '../../components/settings/MissionsPanel.vue';

const session = useSessionStore();
const activeTab = ref<'users' | 'missions'>('users');

onMounted(() => {
  if (!session.loaded) void session.load();
});
</script>

<template>
  <section class="settings">
    <header class="settings__header">
      <h1>Settings</h1>
      <p class="settings__subtitle">Manage users and missions for the whole organization.</p>
    </header>

    <PulseErrorState
      v-if="session.loaded && !session.user?.isGlobalAdmin"
      title="Not authorized"
      description="Only global admins can access Settings."
    />

    <template v-else>
      <PulseTabs
        v-model="activeTab"
        :tabs="[
          { value: 'users', label: 'Users' },
          { value: 'missions', label: 'Missions' },
        ]"
      >
        <UsersPanel v-if="activeTab === 'users'" />
        <MissionsPanel v-else-if="activeTab === 'missions'" />
      </PulseTabs>
    </template>
  </section>
</template>

<style scoped>
.settings__header {
  margin-bottom: var(--space-5);
}

.settings__subtitle {
  margin: var(--space-1) 0 0;
  color: var(--color-text-secondary);
}
</style>
