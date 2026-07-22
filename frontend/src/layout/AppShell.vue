<script setup lang="ts">
import { onMounted } from 'vue';
import Sidebar from '../navigation/Sidebar.vue';
import AppHeader from './AppHeader.vue';
import { useSessionStore } from '../stores/session';

const session = useSessionStore();

onMounted(() => {
  if (!session.loaded) void session.load();
});
</script>

<template>
  <div class="app-shell">
    <Sidebar />
    <div class="app-shell__main">
      <AppHeader />
      <main class="app-shell__content">
        <router-view v-slot="{ Component, route }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="route.path" />
          </Transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
}

.app-shell__main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.app-shell__content {
  flex: 1;
  padding: var(--space-6);
  max-width: var(--layout-max-width);
  width: 100%;
  margin: 0 auto;
}
</style>
