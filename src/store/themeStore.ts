// Visual theme preference. A UI setting, not game state: it lives in its own
// localStorage key (like highScoreStore's) so it survives death resets and
// any SaveState schema bump. The active theme is stamped on
// `<html data-theme="...">`, which is what the theme's CSS keys off — see
// assets/scss/themes/. Moonlit (the dark theme, Pixel-cut) is the default;
// Light is its twin (a soft grey page, white cards with colour on them). The
// player picks Light, Dark or System; System follows the device's own setting
// (prefers-color-scheme), live, which a phone browser, an installed web app
// and a Capacitor web view all report. The retired themes (Crypt, Hellforge, Minimalist) live on in git tag ashen-classic.

import { defineStore } from 'pinia';

export type Theme = 'moonlit' | 'light';
export type ThemePreference = Theme | 'system';

/** The themes that exist: each one has a palette in assets/scss/themes/. */
export const THEMES: { id: Theme; label: string }[] = [
  { id: 'moonlit', label: 'Dark' },
  { id: 'light', label: 'Light' },
];

/** What the menu offers, in order. */
export const THEME_CHOICES: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'moonlit', label: 'Dark' },
];

export const STORAGE_KEY = 'streak-slayer:theme:v1';
const DEFAULT_PREFERENCE: ThemePreference = 'moonlit';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function loadPreference(): ThemePreference {
  // A retired theme ('ashen', 'crypt', 'hellforge', 'minimalist') loads as the default.
  // Parchment and Bright were folded into Light.
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'system') return 'system';
  if (saved === 'parchment' || saved === 'bright') return 'light';
  return THEMES.some((t) => t.id === saved) ? (saved as Theme) : DEFAULT_PREFERENCE;
}

/** The device's setting as a theme. Dark where the browser can't say. */
export function systemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'moonlit';
  return window.matchMedia(DARK_QUERY).matches ? 'moonlit' : 'light';
}

/** Puts `theme` on `<html data-theme>` without persisting it (main.ts calls this once before mount). */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export const useThemeStore = defineStore('theme', {
  state: () => ({ preference: loadPreference(), system: systemTheme() }),
  getters: {
    /** The theme in force: the pick, or the device's setting under System. */
    theme: (state): Theme => (state.preference === 'system' ? state.system : state.preference),
  },
  actions: {
    setTheme(preference: ThemePreference) {
      this.preference = preference;
      localStorage.setItem(STORAGE_KEY, preference);
      applyTheme(this.theme);
    },
    /** Re-applies the theme whenever the device flips between light and dark. */
    followSystem() {
      if (typeof window === 'undefined' || !window.matchMedia) return;
      window.matchMedia(DARK_QUERY).addEventListener('change', () => {
        this.system = systemTheme();
        applyTheme(this.theme);
      });
    },
  },
});
