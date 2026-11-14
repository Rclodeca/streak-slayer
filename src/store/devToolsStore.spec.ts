// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, useDevToolsStore } from './devToolsStore';

describe('devToolsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('is hidden with no saved choice', () => {
    expect(useDevToolsStore().on).toBe(false);
  });

  it('toggles, saves the choice and loads it back', () => {
    useDevToolsStore().toggle();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('on');
    setActivePinia(createPinia());
    expect(useDevToolsStore().on).toBe(true);
    useDevToolsStore().toggle();
    setActivePinia(createPinia());
    expect(useDevToolsStore().on).toBe(false);
  });
});
