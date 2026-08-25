<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import * as api from '../../api/pulse';
import type { MissionSummary, ProfileOption, UserAdminSummary } from '../../api/pulse';
import { useToast } from '../../composables/useToast';
import {
  PulseBadge,
  PulseButton,
  PulseEmptyState,
  PulseErrorState,
  PulseInput,
  PulseModal,
  PulseSelect,
  PulseSkeleton,
  PulseTable,
  PulseTextarea,
} from '../ui';

const toast = useToast();

const users = ref<UserAdminSummary[] | null>(null);
const missions = ref<MissionSummary[] | null>(null);
const profiles = ref<ProfileOption[] | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const profileOptions = computed(
  () => profiles.value?.map((p) => ({ value: String(p.id), label: p.label })) ?? [],
);

const createOpen = ref(false);
const createEmail = ref('');
const createDisplayName = ref('');
const createProfileId = ref('');
const createError = ref<string | null>(null);
const createSubmitting = ref(false);

const bulkOpen = ref(false);
const bulkEmails = ref('');
const bulkMissionSlug = ref('');
const bulkRole = ref<'member' | 'manager' | 'admin'>('member');
const bulkError = ref<string | null>(null);
const bulkSubmitting = ref(false);

const manageUser = ref<UserAdminSummary | null>(null);
const manageDisplayName = ref('');
const manageProfileId = ref('');
const manageBusy = ref(false);
const addMissionSlug = ref('');
const addMissionRole = ref<'member' | 'manager' | 'admin'>('member');

const roleLabels: Record<'member' | 'manager' | 'admin', string> = {
  member: 'Contributeur',
  manager: 'Manager',
  admin: 'Admin',
};

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'job', label: 'Job' },
  { key: 'status', label: 'Status' },
  { key: 'missions', label: 'Missions' },
  { key: 'actions', label: '', align: 'right' as const },
];

const rows = computed(
  () =>
    users.value?.map((u) => ({
      id: u.id,
      name: u.displayName ?? u.email,
      email: u.email,
      user: u,
    })) ?? [],
);

const availableMissionsForUser = computed(() => {
  if (!manageUser.value || !missions.value) return [];
  const assignedSlugs = new Set(manageUser.value.missions.map((m) => m.slug));
  return missions.value.filter((m) => !assignedSlugs.has(m.slug));
});

function userOf(row: Record<string, unknown>): UserAdminSummary {
  return row.user as UserAdminSummary;
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const [usersRes, missionsRes, profilesRes] = await Promise.all([
      api.getUsers(),
      api.getMissions(),
      api.getProfiles(),
    ]);
    users.value = usersRes.users;
    missions.value = missionsRes.missions;
    profiles.value = profilesRes.profiles;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load users.';
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  createEmail.value = '';
  createDisplayName.value = '';
  createProfileId.value = '';
  createError.value = null;
  createOpen.value = true;
}

async function submitCreate(): Promise<void> {
  if (createEmail.value.trim() === '') return;
  createSubmitting.value = true;
  createError.value = null;
  try {
    await api.createUser({
      email: createEmail.value.trim(),
      displayName: createDisplayName.value.trim() || null,
      profileId: createProfileId.value ? Number(createProfileId.value) : null,
    });
    createOpen.value = false;
    toast.success('User created.');
    await load();
  } catch (err) {
    createError.value =
      err instanceof api.ApiError && err.status === 409
        ? 'A user with this email already exists.'
        : 'Could not create this user.';
  } finally {
    createSubmitting.value = false;
  }
}

function openBulk(): void {
  bulkEmails.value = '';
  bulkMissionSlug.value = '';
  bulkRole.value = 'member';
  bulkError.value = null;
  bulkOpen.value = true;
}

async function submitBulk(): Promise<void> {
  const emails = bulkEmails.value
    .split('\n')
    .map((e) => e.trim())
    .filter((e) => e !== '');
  if (emails.length === 0) return;

  bulkSubmitting.value = true;
  bulkError.value = null;
  try {
    const res = await api.bulkCreateUsers({
      emails,
      missionSlug: bulkMissionSlug.value || null,
      role: bulkRole.value,
    });
    bulkOpen.value = false;
    const parts = [`${res.created.length} created`];
    if (res.skipped.length) parts.push(`${res.skipped.length} already existed`);
    toast.success(parts.join(', ') + '.');
    await load();
  } catch {
    bulkError.value = 'Could not add these users.';
  } finally {
    bulkSubmitting.value = false;
  }
}

function openManage(user: UserAdminSummary): void {
  manageUser.value = user;
  manageDisplayName.value = user.displayName ?? '';
  manageProfileId.value = user.profile ? String(profiles.value?.find((p) => p.code === user.profile?.code)?.id ?? '') : '';
  addMissionSlug.value = '';
  addMissionRole.value = 'member';
}

function closeManage(): void {
  manageUser.value = null;
}

async function saveProfile(): Promise<void> {
  if (!manageUser.value) return;
  manageBusy.value = true;
  try {
    await api.updateUser(manageUser.value.id, {
      displayName: manageDisplayName.value.trim() || null,
      profileId: manageProfileId.value ? Number(manageProfileId.value) : null,
    });
    toast.success('User updated.');
    await load();
    manageUser.value = users.value?.find((u) => u.id === manageUser.value?.id) ?? null;
  } catch {
    toast.error('Could not update this user.');
  } finally {
    manageBusy.value = false;
  }
}

async function toggleActive(user: UserAdminSummary): Promise<void> {
  if (user.isActive && !window.confirm(`Deactivate ${user.displayName ?? user.email}? They will lose access immediately.`)) {
    return;
  }
  manageBusy.value = true;
  try {
    if (user.isActive) await api.deactivateUser(user.id);
    else await api.activateUser(user.id);
    toast.success(user.isActive ? 'User deactivated.' : 'User reactivated.');
    await load();
    manageUser.value = users.value?.find((u) => u.id === user.id) ?? null;
  } catch (err) {
    toast.error(
      err instanceof api.ApiError && err.body && (err.body as { error?: string }).error === 'last_admin'
        ? "Can't deactivate the only remaining admin."
        : 'Could not update this user.',
    );
  } finally {
    manageBusy.value = false;
  }
}

async function toggleGlobalAdmin(user: UserAdminSummary): Promise<void> {
  const next = !user.isGlobalAdmin;
  if (
    !next &&
    !window.confirm(`Remove global admin rights from ${user.displayName ?? user.email}?`)
  ) {
    return;
  }
  manageBusy.value = true;
  try {
    await api.setUserGlobalAdmin(user.id, next);
    toast.success(next ? 'Granted global admin.' : 'Removed global admin.');
    await load();
    manageUser.value = users.value?.find((u) => u.id === user.id) ?? null;
  } catch (err) {
    toast.error(
      err instanceof api.ApiError && err.body && (err.body as { error?: string }).error === 'last_admin'
        ? "Can't remove the only remaining admin."
        : 'Could not update this user.',
    );
  } finally {
    manageBusy.value = false;
  }
}

async function setMissionRole(user: UserAdminSummary, slug: string, role: 'member' | 'manager' | 'admin'): Promise<void> {
  manageBusy.value = true;
  try {
    await api.setUserMissionRole(user.id, slug, role);
    toast.success('Role updated.');
    await load();
    manageUser.value = users.value?.find((u) => u.id === user.id) ?? null;
  } catch {
    toast.error('Could not update this role.');
  } finally {
    manageBusy.value = false;
  }
}

async function removeFromMission(user: UserAdminSummary, slug: string): Promise<void> {
  if (!window.confirm('Remove this user from the mission?')) return;
  manageBusy.value = true;
  try {
    await api.removeUserFromMission(user.id, slug);
    toast.success('Removed from mission.');
    await load();
    manageUser.value = users.value?.find((u) => u.id === user.id) ?? null;
  } catch {
    toast.error('Could not remove this user from the mission.');
  } finally {
    manageBusy.value = false;
  }
}

async function addToMission(user: UserAdminSummary): Promise<void> {
  if (addMissionSlug.value === '') return;
  manageBusy.value = true;
  try {
    await api.setUserMissionRole(user.id, addMissionSlug.value, addMissionRole.value);
    toast.success('Added to mission.');
    addMissionSlug.value = '';
    addMissionRole.value = 'member';
    await load();
    manageUser.value = users.value?.find((u) => u.id === user.id) ?? null;
  } catch {
    toast.error('Could not add this user to the mission.');
  } finally {
    manageBusy.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="users-panel">
    <header class="users-panel__header">
      <p class="users-panel__subtitle">Create, edit, and manage access for every user in the organization.</p>
      <div class="users-panel__header-actions">
        <PulseButton variant="secondary" @click="openBulk">Bulk add</PulseButton>
        <PulseButton @click="openCreate">New user</PulseButton>
      </div>
    </header>

    <div v-if="loading" class="users-panel__skeleton">
      <PulseSkeleton variant="block" height="2.5rem" />
      <PulseSkeleton variant="block" height="2.5rem" />
      <PulseSkeleton variant="block" height="2.5rem" />
    </div>

    <PulseErrorState
      v-else-if="error"
      :description="`We couldn't load users. (${error})`"
      retryable
      @retry="load"
    />

    <PulseEmptyState v-else-if="rows.length === 0" icon="👥" title="No users yet" description="Create your first user to get started.">
      <PulseButton @click="openCreate">New user</PulseButton>
    </PulseEmptyState>

    <PulseTable v-else :columns="columns" :rows="rows">
      <template #cell-job="{ row }">
        <span v-if="!userOf(row).profile" class="users-panel__muted">—</span>
        <span v-else>{{ userOf(row).profile!.label }}</span>
      </template>
      <template #cell-status="{ row }">
        <PulseBadge :variant="userOf(row).isActive ? 'success' : 'neutral'">
          {{ userOf(row).isActive ? 'Active' : 'Deactivated' }}
        </PulseBadge>
        <PulseBadge v-if="userOf(row).isGlobalAdmin" variant="accent">Admin</PulseBadge>
      </template>
      <template #cell-missions="{ row }">
        <span v-if="userOf(row).missions.length === 0" class="users-panel__muted">No missions</span>
        <span v-else>{{ userOf(row).missions.length }} mission{{ userOf(row).missions.length === 1 ? '' : 's' }}</span>
      </template>
      <template #cell-actions="{ row }">
        <PulseButton variant="ghost" size="sm" @click="openManage(userOf(row))">Manage</PulseButton>
      </template>
    </PulseTable>

    <PulseModal v-model="createOpen" title="New user">
      <form class="users-panel__form" @submit.prevent="submitCreate">
        <PulseInput v-model="createEmail" label="Email" placeholder="teammate@company.com" type="email" />
        <PulseInput v-model="createDisplayName" label="Name (optional)" placeholder="Jane Doe" />
        <PulseSelect
          v-model="createProfileId"
          label="Job (optional)"
          placeholder="No job set"
          :options="profileOptions"
        />
        <p v-if="createError" class="users-panel__error">{{ createError }}</p>
      </form>
      <template #footer>
        <PulseButton variant="secondary" @click="createOpen = false">Cancel</PulseButton>
        <PulseButton :loading="createSubmitting" :disabled="createSubmitting" @click="submitCreate">Create user</PulseButton>
      </template>
    </PulseModal>

    <PulseModal v-model="bulkOpen" title="Bulk add users">
      <form class="users-panel__form" @submit.prevent="submitBulk">
        <PulseTextarea
          v-model="bulkEmails"
          label="Emails"
          placeholder="jane@company.com&#10;john@company.com"
          hint="One email per line."
          :rows="6"
        />
        <PulseSelect
          v-model="bulkMissionSlug"
          label="Add to mission (optional)"
          placeholder="No mission"
          :options="missions?.map((m) => ({ value: m.slug, label: m.name })) ?? []"
        />
        <PulseSelect
          v-if="bulkMissionSlug"
          v-model="bulkRole"
          label="Role on that mission"
          :options="[
            { value: 'member', label: 'Contributeur' },
            { value: 'manager', label: 'Manager' },
            { value: 'admin', label: 'Admin' },
          ]"
        />
        <p v-if="bulkError" class="users-panel__error">{{ bulkError }}</p>
      </form>
      <template #footer>
        <PulseButton variant="secondary" @click="bulkOpen = false">Cancel</PulseButton>
        <PulseButton :loading="bulkSubmitting" :disabled="bulkSubmitting" @click="submitBulk">Add users</PulseButton>
      </template>
    </PulseModal>

    <PulseModal :model-value="manageUser !== null" :title="manageUser?.displayName ?? manageUser?.email" @update:model-value="closeManage">
      <div v-if="manageUser" class="users-panel__manage">
        <section class="users-panel__section">
          <h4>Profile</h4>
          <PulseInput v-model="manageDisplayName" label="Display name" />
          <PulseSelect v-model="manageProfileId" label="Job" placeholder="No job set" :options="profileOptions" />
          <PulseButton size="sm" variant="secondary" :disabled="manageBusy" @click="saveProfile">Save</PulseButton>
        </section>

        <section class="users-panel__section">
          <h4>Access</h4>
          <div class="users-panel__access-row">
            <span>Status</span>
            <PulseButton
              size="sm"
              :variant="manageUser.isActive ? 'danger' : 'secondary'"
              :disabled="manageBusy"
              @click="toggleActive(manageUser)"
            >
              {{ manageUser.isActive ? 'Deactivate' : 'Reactivate' }}
            </PulseButton>
          </div>
          <div class="users-panel__access-row">
            <span>Global admin</span>
            <PulseButton
              size="sm"
              :variant="manageUser.isGlobalAdmin ? 'danger' : 'secondary'"
              :disabled="manageBusy"
              @click="toggleGlobalAdmin(manageUser)"
            >
              {{ manageUser.isGlobalAdmin ? 'Remove admin' : 'Make admin' }}
            </PulseButton>
          </div>
        </section>

        <section class="users-panel__section">
          <h4>Missions</h4>
          <ul class="users-panel__mission-list">
            <li v-for="mission in manageUser.missions" :key="mission.id" class="users-panel__mission-row">
              <span class="users-panel__mission-name">{{ mission.name }}</span>
              <PulseSelect
                :model-value="mission.role"
                :options="[
                  { value: 'member', label: 'Contributeur' },
                  { value: 'manager', label: 'Manager' },
                  { value: 'admin', label: 'Admin' },
                ]"
                @update:model-value="(role) => setMissionRole(manageUser!, mission.slug, role as 'member' | 'manager' | 'admin')"
              />
              <PulseButton variant="ghost" size="sm" :disabled="manageBusy" @click="removeFromMission(manageUser!, mission.slug)">
                Remove
              </PulseButton>
            </li>
            <li v-if="manageUser.missions.length === 0" class="users-panel__muted">Not staffed on any mission.</li>
          </ul>

          <div v-if="availableMissionsForUser.length > 0" class="users-panel__add-mission">
            <PulseSelect
              v-model="addMissionSlug"
              placeholder="Add to mission..."
              :options="availableMissionsForUser.map((m) => ({ value: m.slug, label: m.name }))"
            />
            <PulseSelect
              v-model="addMissionRole"
              :options="[
                { value: 'member', label: 'Contributeur' },
                { value: 'manager', label: 'Manager' },
                { value: 'admin', label: 'Admin' },
              ]"
            />
            <PulseButton size="sm" variant="secondary" :disabled="manageBusy" @click="addToMission(manageUser)">Add</PulseButton>
          </div>
        </section>
      </div>
      <template #footer>
        <PulseButton variant="secondary" @click="closeManage">Close</PulseButton>
      </template>
    </PulseModal>
  </section>
</template>

<style scoped>
.users-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.users-panel__subtitle {
  margin: 0;
  color: var(--color-text-secondary);
}

.users-panel__header-actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.users-panel__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.users-panel__muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.users-panel__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.users-panel__error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin: 0;
}

.users-panel__manage {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.users-panel__section h4 {
  margin: 0 0 var(--space-3);
}

.users-panel__access-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) 0;
}

.users-panel__mission-list {
  list-style: none;
  margin: 0 0 var(--space-3);
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.users-panel__mission-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.users-panel__mission-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.users-panel__add-mission {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  flex-wrap: wrap;
}
</style>
