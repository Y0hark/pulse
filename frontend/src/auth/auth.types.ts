import * as api from '../api/pulse';

/**
 * Abstraction over "how a user gets into Pulse", so the login view never talks
 * to a concrete provider (magic-link today, SSO later) directly.
 */
export type AuthMethod = 'magic-link' | 'sso';

export interface AuthChallengeResult {
  ok: boolean;
}

export interface AuthProvider {
  method: AuthMethod;
  /** Kick off sign-in for the given identifier (email today). */
  requestAccess(identifier: string): Promise<AuthChallengeResult>;
}

export const magicLinkProvider: AuthProvider = {
  method: 'magic-link',
  requestAccess: (email: string) => api.requestMagicLink(email),
};

/**
 * Maps any error into copy safe to show a user — never surfaces raw
 * technical/API error details (status codes, stack traces, provider payloads).
 */
export function toFriendlyAuthError(_err: unknown): string {
  return "We couldn't send your sign-in link right now. Please try again in a moment.";
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
