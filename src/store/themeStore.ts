// Visual theme preference. A UI setting, not game state: it lives in its own
// localStorage key (like highScoreStore's) so it survives death resets and
// any SaveState schema bump. The active theme is stamped on
// `<html data-theme="...">`, which is what every theme's CSS keys off — see
// assets/scss/themes/.

import { defineStore } from 'pinia';

export type Theme = 'moonlit' | 'crypt' | 'hellforge' | 'minimalist';

export const THEMES: { id: Theme; label: string }[] = [
  { id: 'moonlit', label: 'Moonlit' },
  { id: 'crypt', label: 'Crypt' },
  { id: 'hellforge', label: 'Hellforge' },
  { id: 'minimalist', label: 'Minimalist' },
];

/** The themes that share Ashen's look (assets/scss/themes/ashen.scss) and differ in palette. */
export const ASHEN_FAMILY: Theme[] = ['moonlit', 'crypt', 'hellforge'];

export const STORAGE_KEY = 'streak-slayer:theme:v1';
const DEFAULT_THEME: Theme = 'moonlit';

function loadTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  // Moonlit used to be the one Ashen theme.
  const saved = stored === 'ashen' ? 'moonlit' : stored;
  return THEMES.some((t) => t.id === saved) ? (saved as Theme) : DEFAULT_THEME;
}

/** Puts `theme` on `<html data-theme>` without persisting it (main.ts calls this once before mount). */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export const useThemeStore = defineStore('theme', {
  state: () => ({ theme: loadTheme() }),
  actions: {
    setTheme(theme: Theme) {
      this.theme = theme;
      localStorage.setItem(STORAGE_KEY, theme);
      applyTheme(theme);
    },
  },
});
