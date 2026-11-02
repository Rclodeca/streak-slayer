// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, useLogVisibleStore } from './logVisibleStore';

describe('logVisibleStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('is hidden with no saved choice', () => {
    expect(useLogVisibleStore().on).toBe(false);
  });

  it('saves the choice and loads it back', () => {
    useLogVisibleStore().setOn(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('on');
    setActivePinia(createPinia());
    expect(useLogVisibleStore().on).toBe(true);
  });

  it('hides again', () => {
    const store = useLogVisibleStore();
    store.setOn(true);
    store.setOn(false);
    setActivePinia(createPinia());
    expect(useLogVisibleStore().on).toBe(false);
  });
});
