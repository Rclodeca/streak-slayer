// @vitest-environment jsdom
//
// Matches the jsdom convention used by other Pinia-store-touching specs in
// this project (characterStore.spec.ts, useCombatActions.spec.ts).

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Quest } from '../game-engine';
import { useQuestStore } from './questStore';

describe('questStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts empty', () => {
    const store = useQuestStore();
    expect(store.quests).toEqual([]);
  });

  it('initFromSave hydrates from a saved list', () => {
    const store = useQuestStore();
    const saved: Quest[] = [{ id: 'q1', description: 'Test', difficulty: 'easy', dueDateKey: '2026-01-01' }];
    store.initFromSave(saved);
    expect(store.quests).toEqual(saved);
  });

  it('initFromSave loads an old side quest as a regular one, overdue and done included', () => {
    const store = useQuestStore();
    const sides = [
      { id: 'a', kind: 'side', description: 'Open', difficulty: 'easy', dueDateKey: '2099-01-01', rewardItemId: 'dragons-heart' },
      { id: 'b', kind: 'side', description: 'Late', difficulty: 'hard', dueDateKey: '2026-01-01', overdue: true },
      { id: 'c', kind: 'side', description: 'Done', difficulty: 'medium', dueDateKey: '2026-01-01', doneDayKey: '2026-01-02', rewardItemId: 'ember-heart' },
    ] as unknown as Quest[];
    store.initFromSave(sides);
    expect(store.quests).toEqual([
      { id: 'a', description: 'Open', difficulty: 'easy', dueDateKey: '2099-01-01' },
      { id: 'b', description: 'Late', difficulty: 'hard', dueDateKey: '2026-01-01', overdue: true },
      { id: 'c', description: 'Done', difficulty: 'medium', dueDateKey: '2026-01-01', doneDayKey: '2026-01-02' },
    ]);
  });

  it('initFromSave migrates a pre-v2 quest to a regular quest without bossIndexAtOffer', () => {
    const store = useQuestStore();
    store.initFromSave([{ id: 'q1', description: 'Old', difficulty: 'easy', dueDateKey: '2026-01-01', bossIndexAtOffer: 3 } as unknown as Quest]);
    expect(store.quests).toEqual([{ id: 'q1', description: 'Old', difficulty: 'easy', dueDateKey: '2026-01-01' }]);
  });

  it('initFromSave stays empty when given null (old save with no quests field)', () => {
    const store = useQuestStore();
    store.initFromSave(null);
    expect(store.quests).toEqual([]);
  });

  it('addQuest creates and appends a quest via the engine', () => {
    const store = useQuestStore();
    const quest = store.addQuest('Clean garage', 'hard', '2026-02-01');
    expect(store.quests).toEqual([quest]);
    expect(quest).toMatchObject({ description: 'Clean garage', difficulty: 'hard', dueDateKey: '2026-02-01' });
  });

  it('addQuest records the day the quest was created when given one', () => {
    const store = useQuestStore();
    expect(store.addQuest('Clean garage', 'hard', '2026-02-01', '2026-01-30').createdDayKey).toBe('2026-01-30');
  });

  it('removeQuest removes by id and leaves others untouched', () => {
    const store = useQuestStore();
    const a = store.addQuest('A', 'easy', '2026-01-01');
    const b = store.addQuest('B', 'easy', '2026-01-01');
    store.removeQuest(a.id);
    expect(store.quests).toEqual([b]);
  });

  it('markDone stamps the day and keeps the quest', () => {
    const store = useQuestStore();
    const quest = store.addQuest('Clean garage', 'easy', '2026-02-01');
    store.markDone(quest.id, '2026-01-30');
    expect(store.quests).toEqual([{ ...quest, doneDayKey: '2026-01-30' }]);
  });

  it('markOverdue flags the quest', () => {
    const store = useQuestStore();
    const quest = store.addQuest('Slay it', 'medium', '2026-02-01');
    store.markOverdue(quest.id);
    expect(store.quests[0]).toMatchObject({ id: quest.id, overdue: true });
  });

  it('clearDone removes only quests checked off before today', () => {
    const store = useQuestStore();
    const past = store.addQuest('Past', 'easy', '2026-02-01');
    const today = store.addQuest('Today', 'easy', '2026-02-01');
    const open = store.addQuest('Open', 'easy', '2026-02-01');
    store.markDone(past.id, '2026-01-29');
    store.markDone(today.id, '2026-01-30');
    store.clearDone('2026-01-30');
    expect(store.quests.map((q) => q.id)).toEqual([today.id, open.id]);
  });
});
