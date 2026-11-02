// @vitest-environment jsdom
//
// Needs a real localStorage and document, matching the convention used by
// `store/highScoreStore.spec.ts`.

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyTheme, THEMES, useThemeStore } from './themeStore';

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

  it('lists Moonlit as the only theme', () => {
    expect(THEMES).toEqual([{ id: 'moonlit', label: 'Moonlit' }]);
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
});
