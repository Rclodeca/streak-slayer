// Visual theme preference. A UI setting, not game state: it lives in its own
// localStorage key (like highScoreStore's) so it survives death resets and
// any SaveState schema bump. The active theme is stamped on
// `<html data-theme="...">`, which is what the theme's CSS keys off — see
// assets/scss/themes/. Moonlit (the dark theme, Pixel-cut) is the default;
// Parchment is its light twin, and Bright a second light look on trial (a
// white page, colour on the cards). The player picks Light, Bright, Dark or
// System; System follows the device's own setting (prefers-color-scheme),
// live, which a phone browser, an installed web app and a Capacitor web view
// all report, and its light is Parchment. The
// retired themes (Crypt, Hellforge, Minimalist) live on in git tag ashen-classic.

import { defineStore } from 'pinia';

export type Theme = 'moonlit' | 'parchment' | 'bright';
export type ThemePreference = Theme | 'system';

/** The themes that exist: each one has a palette in assets/scss/themes/. */
export const THEMES: { id: Theme; label: string }[] = [
  { id: 'moonlit', label: 'Dark' },
  { id: 'parchment', label: 'Light' },
  { id: 'bright', label: 'Bright' },
];

/** What the menu offers, in order. */
export const THEME_CHOICES: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'parchment', label: 'Light' },
  { id: 'bright', label: 'Bright' },
  { id: 'moonlit', label: 'Dark' },
];

export const STORAGE_KEY = 'streak-slayer:theme:v1';
const DEFAULT_PREFERENCE: ThemePreference = 'moonlit';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function loadPreference(): ThemePreference {
  // A retired theme ('ashen', 'crypt', 'hellforge', 'minimalist') loads as the default.
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'system') return 'system';
  return THEMES.some((t) => t.id === saved) ? (saved as Theme) : DEFAULT_PREFERENCE;
}

/** The device's setting as a theme. Dark where the browser can't say. */
export function systemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'moonlit';
  return window.matchMedia(DARK_QUERY).matches ? 'moonlit' : 'parchment';
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
