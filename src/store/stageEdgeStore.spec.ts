// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, useStageEdgeStore } from './stageEdgeStore';

describe('stageEdgeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('is the hard edge with no saved choice', () => {
    expect(useStageEdgeStore().edge).toBe('hard');
  });

  it('saves the choice and loads it back', () => {
    useStageEdgeStore().setEdge('pixel');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('pixel');
    setActivePinia(createPinia());
    expect(useStageEdgeStore().edge).toBe('pixel');
  });

  it('loads anything else as the hard edge', () => {
    localStorage.setItem(STORAGE_KEY, 'soft');
    expect(useStageEdgeStore().edge).toBe('hard');
  });
});
