import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAccountStore } from './accountStore';

describe('accountStore', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('keeps a saved account as it is', () => {
    const store = useAccountStore();
    store.initFromSave({ gems: 7, highestLevel: 12 }, 30);
    expect(store.account).toEqual({ gems: 7, highestLevel: 12 });
  });

  it('seeds a save from before accounts with the milestones it already passed', () => {
    const store = useAccountStore();
    store.initFromSave(null, 12);
    expect(store.account).toEqual({ gems: 2 + 3, highestLevel: 12 });
  });

  it('recordLevel returns the gems it paid', () => {
    const store = useAccountStore();
    store.initFromSave(null, 1);
    expect(store.recordLevel(5)).toBe(2);
    expect(store.recordLevel(5)).toBe(0);
    expect(store.account.gems).toBe(2);
  });

  it('spendGems takes nothing when short', () => {
    const store = useAccountStore();
    store.initFromSave({ gems: 1, highestLevel: 5 }, 1);
    expect(store.spendGems(2)).toBe(false);
    expect(store.account.gems).toBe(1);
    expect(store.spendGems(1)).toBe(true);
    expect(store.account.gems).toBe(0);
  });

  it('buyFreeze spends the gems and returns them, or null and nothing spent', () => {
    const store = useAccountStore();
    store.addGems(4);
    expect(store.buyFreeze('2026-11-14', '2026-11-15', 3)).toBeNull();
    expect(store.account.gems).toBe(4);
    expect(store.buyFreeze('2026-11-14', '2026-11-15', 2)).toBe(4);
    expect(store.account).toMatchObject({ gems: 0, frozenDayKeys: ['2026-11-15', '2026-11-16'] });
  });

  it('pruneFrozenDays leaves the account alone when nothing is old', () => {
    const store = useAccountStore();
    store.account = { gems: 0, highestLevel: 1, frozenDayKeys: ['2026-11-15'] };
    const before = store.account;
    store.pruneFrozenDays('2026-11-14');
    expect(store.account).toBe(before);
    store.pruneFrozenDays('2026-12-30');
    expect(store.account.frozenDayKeys).toEqual([]);
  });
});
