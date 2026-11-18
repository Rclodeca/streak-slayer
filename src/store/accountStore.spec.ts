import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { SKIN_CATALOG, sceneArt } from '../game-engine';
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
    expect(store.account).toEqual({ gems: 4 + 4, highestLevel: 12 });
  });

  it('recordLevel returns the gems it paid', () => {
    const store = useAccountStore();
    store.initFromSave(null, 1);
    expect(store.recordLevel(5)).toBe(4);
    expect(store.recordLevel(5)).toBe(0);
    expect(store.account.gems).toBe(4);
  });

  it('spendGems takes nothing when short', () => {
    const store = useAccountStore();
    store.initFromSave({ gems: 1, highestLevel: 5 }, 1);
    expect(store.spendGems(2)).toBe(false);
    expect(store.account.gems).toBe(1);
    expect(store.spendGems(1)).toBe(true);
    expect(store.account.gems).toBe(0);
  });

  it('buySkin spends, owns and wears; wearSkin switches back', () => {
    const store = useAccountStore();
    const skin = SKIN_CATALOG.find((s) => s.kind === 'arena')!;
    store.initFromSave({ gems: skin.gems, highestLevel: 5 }, 1);
    expect(store.buySkin(skin.id)).toBe(skin);
    expect(store.account.gems).toBe(0);
    expect(sceneArt(store.account, 'arena')).toBe(skin.art);
    expect(store.buySkin(skin.id)).toBeNull();
    expect(store.wearSkin('arena', null)).toBe(true);
    expect(sceneArt(store.account, 'arena')).toBe('stage/arena6b');
    expect(store.wearSkin('home', skin.id)).toBe(false);
  });
});
