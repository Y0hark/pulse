<script setup lang="ts">
import { ref } from 'vue';
import * as api from '../../api/pulse';

const email = ref('');
const submitting = ref(false);
const sent = ref(false);
const error = ref<string | null>(null);

async function onSubmit(): Promise<void> {
  if (submitting.value || email.value.trim() === '') return;
  submitting.value = true;
  error.value = null;
  try {
    await api.requestMagicLink(email.value.trim());
    sent.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to request magic link';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main class="login">
    <h1>Sign in to Pulse</h1>

    <p v-if="sent" class="login__sent">
      If that email is registered, a sign-in link has been sent. In local dev, check the backend
      server's console output for the link (emails aren't actually sent — <code>ConsoleMailer</code>
      prints them instead).
    </p>

    <form v-else class="login__form" @submit.prevent="onSubmit">
      <label for="login-email">Work email</label>
      <input id="login-email" v-model="email" type="email" required placeholder="you@example.com" />
      <button type="submit" :disabled="submitting">{{ submitting ? 'Sending…' : 'Send magic link' }}</button>
      <p v-if="error" class="login__error">{{ error }}</p>
    </form>
  </main>
</template>

<style scoped>
.login {
  max-width: 360px;
  margin: 4rem auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.login__form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.login__sent {
  color: #333;
}
.login__error {
  color: #991b1b;
}
</style>
