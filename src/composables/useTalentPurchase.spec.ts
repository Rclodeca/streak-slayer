import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { effectiveStat, talentRank } from '../game-engine';
import type { Character } from '../game-engine';
import { useAccountStore } from '../store/accountStore';
import { useCharacterStore } from '../store/characterStore';
import { useTalentPurchase } from './useTalentPurchase';

describe('useTalentPurchase', () => {
  beforeEach(() => setActivePinia(createPinia()));

  function hero(overrides: Partial<Character>, gems = 0) {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 10, talentsUnlocked: true, ...overrides });
    useAccountStore().initFromSave({ gems, highestLevel: 10 }, 10);
    return characterStore;
  }

  it('takes gold from the character and gems from the account in one go', () => {
    const characterStore = hero({ gold: 1000, talents: { might: 3 } }, 2);
    const purchase = useTalentPurchase();
    expect(purchase.cost.value).toEqual({ gold: 20, gems: 2 }); // half a kill at boss 1, ×0.8
    expect(purchase.buy('precision')).toBe(true);
    expect(characterStore.character.gold).toBe(980);
    expect(talentRank(characterStore.character, 'precision')).toBe(1);
    expect(useAccountStore().account.gems).toBe(0);
  });

  it('buys one rank on a double tap with gold for one', () => {
    const characterStore = hero({ gold: 30 });
    const purchase = useTalentPurchase();
    expect(purchase.buy('might')).toBe(true);
    expect(purchase.buy('might')).toBe(false);
    expect(talentRank(characterStore.character, 'might')).toBe(1);
    expect(characterStore.character.gold).toBe(10);
  });

  it('changes nothing when short on gems', () => {
    const characterStore = hero({ gold: 1000, talents: { might: 3 } }, 0);
    const purchase = useTalentPurchase();
    expect(purchase.canBuy('precision')).toBe(false);
    expect(purchase.buy('precision')).toBe(false);
    expect(characterStore.character.gold).toBe(1000);
    expect(useAccountStore().account.gems).toBe(0);
  });

  it('does not heal when Vigor raises max health, as equipping a health item does not', () => {
    const characterStore = hero({ gold: 500, currentHealth: 5 });
    useTalentPurchase().buy('vigor');
    expect(characterStore.character.currentHealth).toBe(5);
    expect(effectiveStat(characterStore.character, 'health')).toBeGreaterThan(effectiveStat({ ...characterStore.character, talents: {} }, 'health'));
  });
});
