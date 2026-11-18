// @vitest-environment jsdom
//
// Needs a real localStorage and document, matching the convention used by
// `store/highScoreStore.spec.ts`.

import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyTheme, LIGHT_PARKED, THEME_CHOICES, THEMES, useThemeStore } from './themeStore';

const STORAGE_KEY = 'streak-slayer:theme:v1';

describe('themeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    setActivePinia(createPinia());
  });

  it('defaults to Moonlit with no saved choice', () => {
    expect(useThemeStore().theme).toBe('moonlit');
  });

  it('loads a saved Ashen choice as Moonlit', () => {
    localStorage.setItem(STORAGE_KEY, 'ashen');
    expect(useThemeStore().theme).toBe('moonlit');
  });

  it('calls the themes Dark and Light, but offers only Dark while Light is parked', () => {
    expect(THEMES).toEqual([
      { id: 'moonlit', label: 'Dark' },
      { id: 'light', label: 'Light' },
    ]);
    expect(LIGHT_PARKED).toBe(true);
    expect(THEME_CHOICES.map((c) => c.label)).toEqual(['Dark']);
  });

  // A tester who saved Light (or System, or a folded-in Light) must land on Dark.
  it.each(['light', 'system', 'parchment', 'bright'])('loads a saved %s choice as Dark while Light is parked', (saved) => {
    localStorage.setItem(STORAGE_KEY, saved);
    const store = useThemeStore();
    expect(store.preference).toBe('moonlit');
    expect(store.theme).toBe('moonlit');
  });

  it.each(['crypt', 'hellforge', 'minimalist'])('loads a saved %s choice as Moonlit', (old) => {
    localStorage.setItem(STORAGE_KEY, old);
    expect(useThemeStore().theme).toBe('moonlit');
  });

  it('falls back to the default for an unknown saved value', () => {
    localStorage.setItem(STORAGE_KEY, 'neon');
    expect(useThemeStore().theme).toBe('moonlit');
  });

  it('setTheme persists the choice and stamps it on <html>', () => {
    const store = useThemeStore();
    store.setTheme('moonlit');
    expect(store.theme).toBe('moonlit');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('moonlit');
    expect(document.documentElement.dataset.theme).toBe('moonlit');
  });

  it('applyTheme stamps the theme without persisting it', () => {
    applyTheme('moonlit');
    expect(document.documentElement.dataset.theme).toBe('moonlit');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  // Light is parked, so System is never loaded from storage; these cover the
  // machinery for when it returns (LIGHT_PARKED = false).
  describe.skipIf(LIGHT_PARKED)('System', () => {
    // jsdom has no matchMedia: a stand-in whose answer the test can flip.
    let dark: boolean;
    let listener: (() => void) | undefined;
    beforeEach(() => {
      dark = true;
      listener = undefined;
      window.matchMedia = ((query: string) => ({
        get matches() {
          return query.includes('dark') && dark;
        },
        addEventListener: (_type: string, fn: () => void) => {
          listener = fn;
        },
      })) as unknown as typeof window.matchMedia;
    });
    afterEach(() => {
      delete (window as { matchMedia?: unknown }).matchMedia;
    });

    it('loads a saved System choice', () => {
      localStorage.setItem(STORAGE_KEY, 'system');
      expect(useThemeStore().preference).toBe('system');
    });

    it('is Dark when the device is dark, Light when it is light', () => {
      localStorage.setItem(STORAGE_KEY, 'system');
      expect(useThemeStore().theme).toBe('moonlit');
      setActivePinia(createPinia());
      dark = false;
      expect(useThemeStore().theme).toBe('light');
    });

    it('persists System and stamps the device theme on <html>', () => {
      dark = false;
      const store = useThemeStore();
      store.setTheme('system');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('system');
      expect(document.documentElement.dataset.theme).toBe('light');
    });

    it('follows the device when it flips, but only under System', () => {
      const store = useThemeStore();
      store.setTheme('system');
      store.followSystem();
      dark = false;
      listener!();
      expect(store.theme).toBe('light');
      expect(document.documentElement.dataset.theme).toBe('light');

      store.setTheme('moonlit');
      dark = true;
      listener!();
      dark = false;
      listener!();
      expect(document.documentElement.dataset.theme).toBe('moonlit');
    });
  });
});
