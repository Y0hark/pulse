<script setup lang="ts">
import { ref } from 'vue';
import { PulseButton, PulseInput } from '../../components/ui';
import { magicLinkProvider, toFriendlyAuthError, isValidEmail } from '../../auth/auth.types';

const email = ref('');
const touched = ref(false);
const submitting = ref(false);
const sent = ref(false);
const error = ref<string | null>(null);

function validationError(): string | undefined {
  if (!touched.value) return undefined;
  if (email.value.trim() === '') return 'Enter your work email to continue.';
  if (!isValidEmail(email.value)) return 'Enter a valid email address.';
  return undefined;
}

async function onSubmit(): Promise<void> {
  touched.value = true;
  if (submitting.value || validationError()) return;

  submitting.value = true;
  error.value = null;
  try {
    await magicLinkProvider.requestAccess(email.value.trim());
    sent.value = true;
  } catch (err) {
    error.value = toFriendlyAuthError(err);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-page__brand">
      <div class="auth-page__brand-inner">
        <span class="auth-page__wordmark">Pulse</span>
        <p class="auth-page__tagline">The weekly signal for how your team is really doing.</p>
        <p class="auth-page__context">
          Workload, deliveries and blockers, rolled up per team, per week &mdash; so managers spend
          less time chasing status and more time acting on it.
        </p>
      </div>
    </section>

    <section class="auth-page__form-side">
      <div class="auth-card">
        <header class="auth-card__header">
          <h1>Sign in</h1>
          <p v-if="!sent" class="auth-card__subtitle">Use your work email &mdash; we'll send you a secure link.</p>
        </header>

        <p v-if="sent" class="auth-card__sent" role="status">
          Check your inbox. If <strong>{{ email }}</strong> is registered, a sign-in link is on its way.
        </p>

        <form v-else class="auth-form" novalidate @submit.prevent="onSubmit">
          <PulseInput
            v-model="email"
            label="Work email"
            type="email"
            placeholder="you@company.com"
            :error="validationError()"
            :disabled="submitting"
          />

          <p v-if="error" class="auth-form__error" role="alert">{{ error }}</p>

          <PulseButton type="submit" size="lg" :loading="submitting" :disabled="submitting">
            {{ submitting ? 'Sending your link…' : 'Send sign-in link' }}
          </PulseButton>

          <p class="auth-form__note">
            No password to lose or forget &mdash; every sign-in starts with a fresh link sent to your inbox.
          </p>

          <div class="auth-form__divider"><span>or</span></div>

          <PulseButton type="button" variant="secondary" size="lg" disabled title="Coming soon">
            Continue with SSO
          </PulseButton>
        </form>

        <footer class="auth-card__footer">
          <p>Need access? Ask your team admin to add your email to Pulse.</p>
        </footer>
      </div>
    </section>
  </main>
</template>

<style scoped>
.auth-page {
  min-height: 100%;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  background: var(--color-bg);
}

.auth-page__brand {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-16) var(--space-8);
  background:
    radial-gradient(circle at 20% 20%, var(--color-accent-soft), transparent 55%),
    linear-gradient(160deg, var(--color-bg-raised), var(--color-bg));
  border-right: 1px solid var(--color-border);
}

.auth-page__brand-inner {
  max-width: 420px;
}

.auth-page__wordmark {
  display: inline-block;
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
  margin-bottom: var(--space-4);
}

.auth-page__wordmark::after {
  content: '';
  display: inline-block;
  width: 0.5em;
  height: 0.5em;
  margin-left: 0.35em;
  border-radius: 50%;
  background: var(--color-accent);
  vertical-align: middle;
}

.auth-page__tagline {
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--space-3);
}

.auth-page__context {
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
}

.auth-page__form-side {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
}

.auth-card {
  width: 100%;
  max-width: 380px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-8);
}

.auth-card__header {
  margin-bottom: var(--space-6);
}

.auth-card__subtitle {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin: 0;
}

.auth-card__sent {
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
}

.auth-card__sent strong {
  color: var(--color-text-primary);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth-form__error {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-danger);
}

.auth-form__note {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.auth-form__divider {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.auth-form__divider::before,
.auth-form__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.auth-card__footer {
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.auth-card__footer p {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

@media (max-width: 960px) {
  .auth-page {
    grid-template-columns: 1fr;
  }

  .auth-page__brand {
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    padding: var(--space-10) var(--space-6);
  }

  .auth-page__form-side {
    padding: var(--space-6);
  }
}
</style>
