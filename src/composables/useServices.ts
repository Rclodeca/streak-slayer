// The gold shop's services run against the stores (rules in
// game-engine/services.ts): item slots, a skill's reroll, Overdrive and
// enchanting a worn item. Each buy pays at once, logs what it cost and returns
// false (nothing spent) when it can't go through. An enchant also shows the
// item on its own screen (the reveal) and counts for the Enchanted trial.

import { ref } from 'vue';
import {
  buyEnchant as buyEnchantRule,
  buyOverdrive as buyOverdriveRule,
  buyReroll as buyRerollRule,
  buySlot as buySlotRule,
  createRng,
  serviceState,
} from '../game-engine';
import type { ItemDef, ServiceId } from '../game-engine';
import { useActivityLogStore } from '../store/activityLogStore';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';
import { useHabitStore } from '../store/habitStore';
import { useCombatActions } from './useCombatActions';

const rng = createRng();
// The item just enchanted, shown on its own screen until the player continues.
// Module-scoped because the reveal is mounted once, like the item drop queue.
const revealed = ref<ItemDef | null>(null);

export function useServices() {
  const characterStore = useCharacterStore();
  const habitStore = useHabitStore();
  const bossStore = useBossStore();
  const activityLogStore = useActivityLogStore();
  const { reportChallenge } = useCombatActions();

  /** A service's row: price, status and how many were bought this run. */
  function state(id: ServiceId) {
    return serviceState(characterStore.character, habitStore.habits, id, bossStore.boss.index);
  }

  /** The gold the next buy of `id` costs, read before the buy changes it. */
  const priceOf = (id: ServiceId) => state(id).price;

  function buyReroll(habitId: string): boolean {
    const price = priceOf('reroll');
    const result = buyRerollRule(characterStore.character, habitStore.habits, habitId, bossStore.boss.index, rng);
    if (!result) return false;
    characterStore.setCharacter(result.character);
    habitStore.setHabits(result.habits);
    activityLogStore.addEntry({ kind: 'skill-rerolled', habitName: result.habit.name, damageType: result.habit.damageType, gold: price });
    return true;
  }

  function buyOverdrive(habitId: string): boolean {
    const price = priceOf('overdrive');
    const result = buyOverdriveRule(characterStore.character, habitStore.habits, habitId, bossStore.boss.index);
    if (!result) return false;
    characterStore.setCharacter(result.character);
    habitStore.setHabits(result.habits);
    activityLogStore.addEntry({ kind: 'overdrive-granted', habitName: result.habit.name, gold: price });
    return true;
  }

  function buyEnchant(itemId: string): boolean {
    const price = priceOf('enchant');
    const result = buyEnchantRule(characterStore.character, itemId, bossStore.boss.index);
    if (!result) return false;
    characterStore.setCharacter(result.character);
    activityLogStore.addEntry({ kind: 'item-doubled', itemName: result.item.name, gold: price });
    revealed.value = result.item;
    reportChallenge({ type: 'enchanted' });
    return true;
  }

  function buySlot(): boolean {
    const price = priceOf('slot');
    const result = buySlotRule(characterStore.character, bossStore.boss.index);
    if (!result) return false;
    characterStore.setCharacter(result.character);
    activityLogStore.addEntry({ kind: 'item-slots-gained', slots: result.slots, gold: price });
    return true;
  }

  function dismissReveal() {
    revealed.value = null;
  }

  return { state, buyReroll, buyOverdrive, buyEnchant, buySlot, revealed, dismissReveal };
}
