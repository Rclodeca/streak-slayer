// Buys talent ranks: the gold comes off the character and the gems off the
// account, together or not at all. Each buy reads the stores afresh, so a
// double tap with gold for one rank buys one.

import { computed } from 'vue';
import { buyTalent, canBuyTalent, clampHealthToMax, nextTalentCost } from '../game-engine';
import type { TalentId } from '../game-engine';
import { useAccountStore } from '../store/accountStore';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';

export function useTalentPurchase() {
  const characterStore = useCharacterStore();
  const accountStore = useAccountStore();
  const bossStore = useBossStore();

  const cost = computed(() => nextTalentCost(characterStore.character, bossStore.boss.index));

  function canBuy(id: TalentId): boolean {
    return canBuyTalent(characterStore.character, accountStore.account.gems, id, bossStore.boss.index);
  }

  /** Buys one rank of `id`; false (and nothing spent) if it can't be bought. Max health can change with a rank (Vigor), so health is clamped, as equipping an item does. */
  function buy(id: TalentId): boolean {
    const bought = buyTalent(characterStore.character, accountStore.account.gems, id, bossStore.boss.index);
    if (!bought || !accountStore.spendGems(bought.gemsSpent)) return false;
    characterStore.setCharacter(clampHealthToMax(bought.character));
    return true;
  }

  return { cost, canBuy, buy };
}
