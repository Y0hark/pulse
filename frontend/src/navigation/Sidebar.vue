<script setup lang="ts">
import { navItems } from './navItems';
</script>

<template>
  <aside class="sidebar" aria-label="Main navigation">
    <div class="sidebar__brand">
      <span class="sidebar__brand-mark" aria-hidden="true">P</span>
      <span class="sidebar__brand-name">Pulse</span>
    </div>
    <nav class="sidebar__nav">
      <router-link
        v-for="item in navItems"
        :key="item.routeName"
        :to="{ name: item.routeName }"
        class="sidebar__link"
        active-class="sidebar__link--active"
      >
        <span class="sidebar__link-icon" aria-hidden="true">{{ item.icon }}</span>
        <span class="sidebar__link-label">{{ item.label }}</span>
      </router-link>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 220px;
  flex-shrink: 0;
  background: var(--color-bg-raised);
  border-right: 1px solid var(--color-border);
  height: 100vh;
  position: sticky;
  top: 0;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-5);
}

.sidebar__brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-md);
  background: var(--color-accent-soft);
  color: var(--color-accent);
  font-weight: var(--font-weight-bold);
}

.sidebar__brand-name {
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2);
  overflow-y: auto;
}

.sidebar__link {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}

.sidebar__link:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.sidebar__link:hover .sidebar__link-icon {
  transform: translateX(1px);
}

.sidebar__link--active {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.sidebar__link--active::before {
  content: '';
  position: absolute;
  left: -0.5rem;
  top: 20%;
  bottom: 20%;
  width: 3px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
}

.sidebar__link-icon {
  font-size: var(--font-size-md);
  line-height: 1;
  transition: transform var(--transition-fast);
}

@media (max-width: 1024px) {
  .sidebar {
    width: 64px;
  }

  .sidebar__brand-name,
  .sidebar__link-label {
    display: none;
  }

  .sidebar__link {
    justify-content: center;
  }

  .sidebar__brand {
    justify-content: center;
    padding: var(--space-5) var(--space-2);
  }
}
</style>
