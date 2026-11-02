// Visual theme preference. A UI setting, not game state: it lives in its own
// localStorage key (like highScoreStore's) so it survives death resets and
// any SaveState schema bump. The active theme is stamped on
// `<html data-theme="...">`, which is what the theme's CSS keys off — see
// assets/scss/themes/. Moonlit (Pixel-cut) is the only theme for now; the
// retired ones (Crypt, Hellforge, Minimalist) live on in git tag ashen-classic.

import { defineStore } from 'pinia';

export type Theme = 'moonlit';

export const THEMES: { id: Theme; label: string }[] = [{ id: 'moonlit', label: 'Moonlit' }];

export const STORAGE_KEY = 'streak-slayer:theme:v1';
const DEFAULT_THEME: Theme = 'moonlit';

function loadTheme(): Theme {
  // A retired theme ('ashen', 'crypt', 'hellforge', 'minimalist') loads as the default.
  const saved = localStorage.getItem(STORAGE_KEY);
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
