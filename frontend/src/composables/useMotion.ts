import { onScopeDispose, ref } from 'vue';

/**
 * Reactive prefers-reduced-motion flag. CSS already collapses animations
 * globally (see styles/motion.css), but JS-driven timing — e.g. delaying a
 * state change until a transition finishes — needs this to skip the wait
 * instead of blocking on a transition that CSS just made instant.
 */
export function usePrefersReducedMotion() {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReducedMotion = ref(query.matches);

  function onChange(event: MediaQueryListEvent): void {
    prefersReducedMotion.value = event.matches;
  }

  query.addEventListener('change', onChange);
  onScopeDispose(() => query.removeEventListener('change', onChange));

  return { prefersReducedMotion };
}

/** Per-item stagger delay (ms) for the nth (0-based) element of a cascading list. */
export function staggerDelay(index: number, stepMs = 35, maxSteps = 12): number {
  return Math.min(index, maxSteps) * stepMs;
}
