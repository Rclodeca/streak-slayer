// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, useFocusModeStore } from './focusModeStore';

describe('focusModeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('is off with no saved choice', () => {
    expect(useFocusModeStore().on).toBe(false);
  });

  it('saves the choice and loads it back', () => {
    useFocusModeStore().setOn(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('on');
    setActivePinia(createPinia());
    expect(useFocusModeStore().on).toBe(true);
  });

  it('turns off again', () => {
    const store = useFocusModeStore();
    store.setOn(true);
    store.setOn(false);
    setActivePinia(createPinia());
    expect(useFocusModeStore().on).toBe(false);
  });
});
