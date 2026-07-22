import { describe, expect, it, vi } from 'vitest';
import { staggerDelay, usePrefersReducedMotion } from './useMotion';

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(event: MediaQueryListEvent) => void> = [];
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.push(listener);
    },
    removeEventListener: vi.fn(),
  });
  return {
    trigger: (next: boolean) => listeners.forEach((listener) => listener({ matches: next } as MediaQueryListEvent)),
  };
}

describe('usePrefersReducedMotion', () => {
  it('reflects the initial media query state', () => {
    mockMatchMedia(true);
    const { prefersReducedMotion } = usePrefersReducedMotion();
    expect(prefersReducedMotion.value).toBe(true);
  });

  it('updates when the media query changes', () => {
    const { trigger } = mockMatchMedia(false);
    const { prefersReducedMotion } = usePrefersReducedMotion();
    expect(prefersReducedMotion.value).toBe(false);

    trigger(true);
    expect(prefersReducedMotion.value).toBe(true);
  });
});

describe('staggerDelay', () => {
  it('scales linearly with index', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(3, 40)).toBe(120);
  });

  it('caps the delay past maxSteps so long lists stay snappy', () => {
    expect(staggerDelay(50, 35, 12)).toBe(staggerDelay(12, 35, 12));
  });
});
