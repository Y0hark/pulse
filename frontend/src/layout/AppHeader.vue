<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '../stores/session';
import { useToast } from '../composables/useToast';
import { PulseBadge, PulseButton, PulseInput, PulseModal, PulseSelect } from '../components/ui';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const toast = useToast();

const pageTitle = computed(() => (route.meta.title as string | undefined) ?? 'Pulse');

const missionOptions = computed(
  () => session.user?.teams.map((t) => ({ value: t.team.slug, label: t.team.name })) ?? [],
);

const initials = computed(() => {
  const name = session.user?.displayName ?? session.user?.email ?? '';
  return name.slice(0, 2).toUpperCase() || '?';
});

function onMissionChange(slug: string): void {
  session.setCurrentMission(slug);
}

const editingName = ref(false);
const nameDraft = ref('');
const savingName = ref(false);

function openNameEditor(): void {
  nameDraft.value = session.user?.displayName ?? '';
  editingName.value = true;
}

async function saveName(): Promise<void> {
  const value = nameDraft.value.trim();
  if (!value) return;
  savingName.value = true;
  try {
    await session.updateDisplayName(value);
    editingName.value = false;
    toast.success('Display name updated');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to update display name');
  } finally {
    savingName.value = false;
  }
}

const menuOpen = ref(false);
const menuRoot = ref<HTMLElement | null>(null);
const loggingOut = ref(false);

function toggleMenu(): void {
  menuOpen.value = !menuOpen.value;
}

function onEditName(): void {
  menuOpen.value = false;
  openNameEditor();
}

async function onLogout(): Promise<void> {
  menuOpen.value = false;
  loggingOut.value = true;
  try {
    await session.logout();
    void router.push({ name: 'login' });
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to log out');
  } finally {
    loggingOut.value = false;
  }
}

function onClickOutside(event: MouseEvent): void {
  if (menuOpen.value && menuRoot.value && !menuRoot.value.contains(event.target as Node)) {
    menuOpen.value = false;
  }
}

onMounted(() => document.addEventListener('click', onClickOutside));
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside));
</script>

<template>
  <header class="app-header">
    <div class="app-header__title">
      <h1>{{ pageTitle }}</h1>
      <PulseBadge v-if="session.currentMission" variant="accent">{{ session.currentMission.name }}</PulseBadge>
    </div>

    <div class="app-header__actions">
      <PulseSelect
        v-if="missionOptions.length > 1"
        class="app-header__mission-select"
        :model-value="session.currentTeamSlug ?? ''"
        :options="missionOptions"
        @update:model-value="onMissionChange"
      />

      <router-link :to="{ name: 'weekly-pulse' }">
        <PulseButton size="sm">New submission</PulseButton>
      </router-link>

      <div v-if="session.user" ref="menuRoot" class="app-header__user-menu">
        <button
          type="button"
          class="app-header__user"
          :aria-expanded="menuOpen"
          :title="`${session.user.displayName ?? 'Set your display name'} — ${session.user.email}`"
          @click="toggleMenu"
        >
          <span class="app-header__avatar" aria-hidden="true">{{ initials }}</span>
          <span class="app-header__user-email">{{ session.user.displayName ?? session.user.email }}</span>
        </button>

        <Transition name="menu-pop">
          <div v-if="menuOpen" class="app-header__menu" role="menu">
            <div class="app-header__menu-identity">
              <span class="app-header__menu-name">{{ session.user.displayName ?? 'No display name set' }}</span>
              <span class="app-header__menu-email">{{ session.user.email }}</span>
            </div>
            <button type="button" class="app-header__menu-item" role="menuitem" @click="onEditName">
              Edit display name
            </button>
            <button
              type="button"
              class="app-header__menu-item app-header__menu-item--danger"
              role="menuitem"
              :disabled="loggingOut"
              @click="onLogout"
            >
              {{ loggingOut ? 'Logging out…' : 'Log out' }}
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <PulseModal v-model="editingName" title="Your display name">
      <PulseInput
        v-model="nameDraft"
        label="Display name"
        placeholder="e.g. Samuel Galiere"
        hint="Shown to your team in the walkthrough, leaderboard, and reports."
        @keyup.enter="saveName"
      />
      <template #footer>
        <PulseButton variant="secondary" @click="editingName = false">Cancel</PulseButton>
        <PulseButton :disabled="!nameDraft.trim() || savingName" @click="saveName">Save</PulseButton>
      </template>
    </PulseModal>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-raised);
  position: sticky;
  top: 0;
  z-index: 10;
}

.app-header__title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.app-header__title h1 {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
}

.app-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
  justify-content: flex-end;
}

.app-header__mission-select {
  min-width: 160px;
}

.app-header__user {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: none;
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-1) var(--space-2);
  cursor: pointer;
  font: inherit;
}
.app-header__user:hover {
  background: var(--color-surface-hover);
}

.app-header__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-full);
  background: var(--color-electric-soft);
  color: var(--color-electric);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.app-header__user-email {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.app-header__user-menu {
  position: relative;
}

.app-header__menu {
  position: absolute;
  top: calc(100% + var(--space-2));
  right: 0;
  min-width: 220px;
  background: var(--color-bg-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg, 0 12px 32px rgba(0, 0, 0, 0.24));
  padding: var(--space-2);
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  transform-origin: top right;
}

.app-header__menu-identity {
  padding: var(--space-2) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-1);
}

.app-header__menu-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-header__menu-email {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-header__menu-item {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  font: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.app-header__menu-item:hover:not(:disabled) {
  background: var(--color-surface-hover);
}

.app-header__menu-item:disabled {
  cursor: default;
  opacity: 0.6;
}

.app-header__menu-item--danger {
  color: var(--color-danger);
}

.menu-pop-enter-active,
.menu-pop-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

@media (max-width: 1024px) {
  .app-header__user-email {
    display: none;
  }
}
</style>
