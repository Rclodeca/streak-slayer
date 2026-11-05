// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ChallengeEntry } from '../game-engine';
import { STORAGE_KEY, useTrialSeenStore } from './trialSeenStore';

describe('trialSeenStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  const entry = (id: ChallengeEntry['id'], takenDayKey = '2026-11-01'): ChallengeEntry => ({ id, relicId: 'ember-heart', takenDayKey, progress: 0 });

  it('marks what a visit finds as seen, fresh for that visit only', () => {
    const store = useTrialSeenStore();
    const active = [entry('resist')];
    expect(store.unseen(active)).toBe(true);

    store.visit(active);
    expect(store.unseen(active)).toBe(false);
    expect(store.fresh).toEqual(['resist@2026-11-01']);

    store.leave();
    store.visit(active);
    expect(store.fresh).toEqual([]);
  });

  it('keeps a trial that arrives mid-visit fresh alongside the first', () => {
    const store = useTrialSeenStore();
    store.visit([entry('resist')]);
    store.visit([entry('resist'), entry('enchant')]);
    expect(store.fresh).toEqual(['resist@2026-11-01', 'enchant@2026-11-01']);
  });

  it('remembers what was seen across a reload', () => {
    useTrialSeenStore().visit([entry('resist')]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(['resist@2026-11-01']);
    setActivePinia(createPinia());
    expect(useTrialSeenStore().unseen([entry('resist')])).toBe(false);
  });

  it('treats the same challenge taken again later as new', () => {
    const store = useTrialSeenStore();
    store.visit([entry('resist')]);
    expect(store.unseen([entry('resist', '2026-12-01')])).toBe(true);
  });
});
