import { readonly, ref } from 'vue';

export type PulseTheme = 'dimmed' | 'light' | 'midnight' | 'parchment';

export const THEME_OPTIONS: Array<{ value: PulseTheme; label: string; description: string }> = [
  { value: 'dimmed', label: 'Dimmed', description: 'Anthracite default' },
  { value: 'light', label: 'Light', description: 'Daylight & projectors' },
  { value: 'midnight', label: 'Midnight', description: 'Near-black OLED' },
  { value: 'parchment', label: 'Parchment', description: 'Warm editorial cream' },
];

const STORAGE_KEY = 'pulse-theme';
const THEME_VALUES = THEME_OPTIONS.map((t) => t.value);

function readStoredTheme(): PulseTheme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && (THEME_VALUES as string[]).includes(stored)) return stored as PulseTheme;
  return 'dimmed';
}

const theme = ref<PulseTheme>(readStoredTheme());

function apply(value: PulseTheme): void {
  document.documentElement.setAttribute('data-theme', value);
}

apply(theme.value);

function setTheme(value: PulseTheme): void {
  theme.value = value;
  apply(value);
  localStorage.setItem(STORAGE_KEY, value);
}

export function useTheme() {
  return {
    theme: readonly(theme),
    setTheme,
  };
}
