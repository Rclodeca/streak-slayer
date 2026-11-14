// The gold shop's services (docs/ideas/2026-11-13-shop-economy.md §4): more
// item slots, a skill's damage-type reroll, Overdrive and enchanting an item.
// Each is bought with gold and used at once on a target the player picks. The
// price climbs with every one bought this run (the counters sit on the
// character, so a death resets them). Pure; composables/useServices.ts runs
// them against the stores.

import { servicePrice, slotPrice } from './constants/economy';
import { heroClassFor } from './character';
import { characterGold } from './gold';
import { healingAllowed, rerollDamageType } from './habits';
import { doublableItems, equippedDoubledItemIds, MAX_EQUIP_SLOTS, slotUpgradesOf } from './items';
import type { ItemDef } from './items';
import { TUNING } from './constants/tuning';
import type { Rng } from './rng';
import { standing } from './shop';
import type { Character, Habit } from './types';

export type ServiceId = 'reroll' | 'overdrive' | 'enchant' | 'slot';

/** The services, in shelf order. `icon` is a statIcons key. */
export const SERVICE_DEFS: readonly { id: ServiceId; name: string; effect: string; icon: string }[] = [
  { id: 'reroll', name: 'Reroll', effect: "Reroll one skill's damage type.", icon: 'reroll' },
  { id: 'overdrive', name: 'Overdrive', effect: `One skill can be used ${TUNING.OVERDRIVE_MAX_EXTRA_USES} extra times a period.`, icon: 'streak' },
  { id: 'enchant', name: 'Enchant', effect: `×${TUNING.DOUBLED_ITEM_MULTIPLIER} one worn item's bonuses.`, icon: 'itemDoubled' },
  { id: 'slot', name: 'Item slots', effect: 'Two more item slots.', icon: 'slots' },
];

/** Every skill can be rerolled. */
export function rerollTargets(habits: Habit[]): Habit[] {
  return habits;
}

/** Good skills that don't have Overdrive yet. */
export function overdriveTargets(habits: Habit[]): Habit[] {
  return habits.filter((habit) => !habit.isBad && !habit.isOverdrive);
}

/** Worn items with bonuses that aren't enchanted yet. */
export function enchantTargets(character: Character): ItemDef[] {
  return doublableItems(character);
}

function boughtOf(character: Character, id: ServiceId): number {
  return id === 'slot' ? slotUpgradesOf(character) : (character.serviceBuys?.[id] ?? 0);
}

/**
 * What a service's row shows: buyable, too dear, nothing to pick a target
 * from (`none`) or every slot step bought (`maxed`, slot only). `bought` is
 * how many were bought this run, which sets the price.
 */
export function serviceState(
  character: Character,
  habits: Habit[],
  id: ServiceId,
  bossIndex: number,
): { price: number; status: 'buy' | 'short' | 'none' | 'maxed'; bought: number } {
  const bought = boughtOf(character, id);
  if (id === 'slot') {
    const price = slotPrice(bought, bossIndex);
    if (price === null) return { price: 0, status: 'maxed', bought };
    return { price, status: characterGold(character) >= price ? 'buy' : 'short', bought };
  }
  const price = servicePrice(id, bought, bossIndex);
  const targets = id === 'reroll' ? rerollTargets(habits) : id === 'overdrive' ? overdriveTargets(habits) : enchantTargets(character);
  if (targets.length === 0) return { price, status: 'none', bought };
  return { price, status: characterGold(character) >= price ? 'buy' : 'short', bought };
}

/** The character with `price` taken off its gold and one more of `id` counted. */
function pay(character: Character, id: Exclude<ServiceId, 'slot'>, price: number): Character {
  return { ...character, gold: characterGold(character) - price, serviceBuys: { ...character.serviceBuys, [id]: boughtOf(character, id) + 1 } };
}

/** Whether `id` can be bought now at all: the hero stands and the row reads `buy`. */
function open(character: Character, habits: Habit[], id: ServiceId, bossIndex: number): { price: number } | null {
  const { price, status } = serviceState(character, habits, id, bossIndex);
  return status === 'buy' && standing(character) ? { price } : null;
}

/** Pays for and applies a reroll of `habitId`'s damage type, kept off healing past the cap. Null if it can't be bought. */
export function buyReroll(
  character: Character,
  habits: Habit[],
  habitId: string,
  bossIndex: number,
  rng: Rng,
): { character: Character; habits: Habit[]; habit: Habit } | null {
  const target = rerollTargets(habits).find((habit) => habit.id === habitId);
  const sale = target && open(character, habits, 'reroll', bossIndex);
  if (!target || !sale) return null;
  const excludeHealing = !healingAllowed(habits.filter((habit) => habit.id !== habitId), habits.length);
  const habit = rerollDamageType(target, rng, true, excludeHealing, heroClassFor(character));
  return { character: pay(character, 'reroll', sale.price), habits: habits.map((h) => (h.id === habitId ? habit : h)), habit };
}

/** Pays for and gives `habitId` Overdrive. Null if it can't be bought. */
export function buyOverdrive(
  character: Character,
  habits: Habit[],
  habitId: string,
  bossIndex: number,
): { character: Character; habits: Habit[]; habit: Habit } | null {
  const target = overdriveTargets(habits).find((habit) => habit.id === habitId);
  const sale = target && open(character, habits, 'overdrive', bossIndex);
  if (!target || !sale) return null;
  const habit = { ...target, isOverdrive: true };
  return { character: pay(character, 'overdrive', sale.price), habits: habits.map((h) => (h.id === habitId ? habit : h)), habit };
}

/** Pays for and enchants the worn item `itemId`. Null if it can't be bought. */
export function buyEnchant(character: Character, itemId: string, bossIndex: number): { character: Character; item: ItemDef } | null {
  const item = enchantTargets(character).find((candidate) => candidate.id === itemId);
  const sale = item && open(character, [], 'enchant', bossIndex);
  if (!item || !sale) return null;
  const paid = pay(character, 'enchant', sale.price);
  return { character: { ...paid, doubledItemIds: [...equippedDoubledItemIds(character), item.id] }, item };
}

/** Pays for the next slot step. `slots` is the new cap. Null if it can't be bought. */
export function buySlot(character: Character, bossIndex: number): { character: Character; slots: number } | null {
  const sale = open(character, [], 'slot', bossIndex);
  if (!sale) return null;
  const upgrades = slotUpgradesOf(character) + 1;
  return { character: { ...character, gold: characterGold(character) - sale.price, slotUpgrades: upgrades }, slots: Math.min(MAX_EQUIP_SLOTS, 4 + 2 * upgrades) };
}
