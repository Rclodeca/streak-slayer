// The Vault run against the stores (rules in game-engine/vault.ts and
// freeze.ts): draws the window's stock and buys its items, the Gold Pouch and
// a skill's streak freeze with the account's gems. A bought item goes through
// the drop popup like the gold shop's, so it's equipped, swapped in or dropped
// at once (there's no inventory).

import { computed } from 'vue';
import { buyFreeze as buyFreezeRule, buyPouch as buyPouchRule, buyVaultWare, createRng, dailyPeriodKey, pouchState, stockVault } from '../game-engine';
import type { VaultStock } from '../game-engine';
import { useAccountStore } from '../store/accountStore';
import { useActivityLogStore } from '../store/activityLogStore';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';
import { useDebugClockStore } from '../store/debugClockStore';
import { useHabitStore } from '../store/habitStore';
import { useItemDropQueue } from './useItemDropQueue';

const rng = createRng();

export function useVault() {
  const characterStore = useCharacterStore();
  const accountStore = useAccountStore();
  const bossStore = useBossStore();
  const debugClockStore = useDebugClockStore();
  const activityLogStore = useActivityLogStore();
  const habitStore = useHabitStore();
  const { enqueueDrops } = useItemDropQueue();

  /** Today's key, read fresh. `dayTick` makes a computed reading it follow a real day turnover. */
  function today(): string {
    void debugClockStore.dayTick;
    return dailyPeriodKey(debugClockStore.now());
  }
  const todayKey = computed(today);
  const stock = computed<VaultStock | null>(() => characterStore.character.vault ?? null);
  const pouch = computed(() => pouchState(characterStore.character, accountStore.account.gems, bossStore.boss.index, todayKey.value));

  /** Draws this window's stock if the character has none for it (first open, a new window, a new run). */
  function ensureStock(): void {
    const stocked = stockVault(characterStore.character, today(), rng);
    if (stocked !== characterStore.character) characterStore.setCharacter(stocked);
  }

  /** Buys a Vault item and hands it to the drop popup. False (nothing spent) if it can't be bought. */
  function buy(itemId: string): boolean {
    const result = buyVaultWare(characterStore.character, accountStore.account.gems, itemId);
    if (!result || !accountStore.spendGems(result.gemsSpent)) return false;
    characterStore.setCharacter(result.character);
    enqueueDrops([result.item], undefined, true);
    activityLogStore.addEntry({ kind: 'vault-bought', name: result.item.name, gems: result.gemsSpent });
    return true;
  }

  /** Buys the Gold Pouch. False (nothing spent) unless its row reads `buy`. */
  function buyPouch(): boolean {
    const result = buyPouchRule(characterStore.character, accountStore.account.gems, bossStore.boss.index, today());
    if (!result || !accountStore.spendGems(result.gemsSpent)) return false;
    characterStore.setCharacter(result.character);
    activityLogStore.addEntry({ kind: 'vault-bought', name: 'Gold Pouch', gems: result.gemsSpent, gold: result.gold });
    return true;
  }

  /** Freezes one skill for `count` periods from `fromDayKey` (see buyFreeze in freeze.ts). False (nothing spent) if it can't be bought or the skill is gone. */
  function buyFreeze(habitId: string, fromDayKey: string, count: number): boolean {
    const habit = habitStore.habits.find((h) => h.id === habitId);
    const result = habit && buyFreezeRule(habit, today(), fromDayKey, count, accountStore.account.gems);
    if (!habit || !result || !accountStore.spendGems(result.gemsSpent)) return false;
    habitStore.updateHabit(result.habit);
    activityLogStore.addEntry({ kind: 'freeze-bought', habitName: habit.name, fromDayKey, count, period: habit.period, gems: result.gemsSpent });
    return true;
  }

  return { stock, todayKey, ensureStock, buy, pouch, buyPouch, buyFreeze };
}
