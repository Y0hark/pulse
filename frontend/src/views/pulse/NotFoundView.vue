<script setup lang="ts">
import { PulseButton, PulseEmptyState } from '../../components/ui';
</script>

<template>
  <section class="not-found">
    <PulseEmptyState icon="🚧" title="Page not found" description="This route doesn't exist.">
      <router-link :to="{ name: 'dashboard' }">
        <PulseButton variant="secondary" size="sm">Back to dashboard</PulseButton>
      </router-link>
    </PulseEmptyState>
  </section>
</template>
