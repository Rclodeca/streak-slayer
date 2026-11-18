// The gold shop's services (docs/ideas/2026-11-13-shop-economy.md §4): more
// item slots, a skill's damage-type reroll, Overdrive and enchanting an item.
// Each is bought with gold and used at once on a target the player picks. One
// is on offer at a time, for a 3-day turn (Item slots → Overdrive → Reroll →
// Enchant, round again), kept on the character so a death starts the new run
// on Item slots. A price follows what the hero has now: the slots, the skills
// with Overdrive, the enchanted worn items; a reroll's climbs with each one
// bought this turn. Pure; composables/useServices.ts runs them against the
// stores.

import { servicePrice, slotPrice } from './constants/economy';
import { heroClassFor } from './character';
import { characterGold } from './gold';
import { healingAllowed, rerollDamageType } from './habits';
import { doublableItems, equippedDoubledItemIds, maxEquipSlots, slotUpgradesOf } from './items';
import type { ItemDef } from './items';
import { TUNING } from './constants/tuning';
import type { Rng } from './rng';
import { standing } from './shop';
import { addDaysToDayKey, daysBetweenDayKeys } from './time';
import type { Character, Habit, ServiceTurn } from './types';

export type ServiceId = 'reroll' | 'overdrive' | 'enchant' | 'slot';

/** The services, in turn order. Each one's seal is public/sprites/services/<id>.png (npm run service-art) and its card's scene <id>-scene.png. */
export const SERVICE_DEFS: readonly { id: ServiceId; name: string; effect: string }[] = [
  { id: 'slot', name: 'Item slots', effect: 'Increase item slots by one.' },
  { id: 'overdrive', name: 'Overdrive', effect: `One habit can be used ${TUNING.OVERDRIVE_MAX_EXTRA_USES} extra times a period.` },
  { id: 'reroll', name: 'Reroll', effect: "Reroll one habit's damage type." },
  { id: 'enchant', name: 'Enchant', effect: "Greatly increase one item's power." },
];

/** Days a service stays on offer before the next one's turn. */
export const SERVICE_TURN_DAYS = 3;

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

/** Whether `id` has anything to work on: a slot step left, or a target to pick. */
function usable(character: Character, habits: Habit[], id: ServiceId): boolean {
  if (id === 'slot') return slotPrice(slotUpgradesOf(character), 0, 0) !== null;
  const targets = id === 'reroll' ? rerollTargets(habits) : id === 'overdrive' ? overdriveTargets(habits) : enchantTargets(character);
  return targets.length > 0;
}

/**
 * The service whose turn follows `after` (null: a new run's first turn): the
 * next in order with something to work on, so slots drop out once full and a
 * service with no target is passed over. When none has, simply the next one.
 */
export function nextService(character: Character, habits: Habit[], after: ServiceId | null): ServiceId {
  const start = after === null ? 0 : SERVICE_DEFS.findIndex((def) => def.id === after) + 1;
  const order = SERVICE_DEFS.map((_, i) => SERVICE_DEFS[(start + i) % SERVICE_DEFS.length].id);
  return order.find((id) => usable(character, habits, id)) ?? order[0];
}

/**
 * The turn that holds on `todayKey`: the character's own while it lasts, a
 * new run's first (Item slots) when it has none, or the next ones in order
 * for every 3 days gone by. Persist it (syncServiceTurn) so a turn doesn't
 * change while it runs.
 */
export function serviceTurn(character: Character, habits: Habit[], todayKey: string): ServiceTurn {
  const turn = character.serviceTurn;
  if (!turn) return { id: nextService(character, habits, null), startDayKey: todayKey };
  const passed = Math.floor(daysBetweenDayKeys(turn.startDayKey, todayKey) / SERVICE_TURN_DAYS);
  if (passed <= 0) return turn;
  let id = turn.id;
  for (let i = 0; i < passed; i++) id = nextService(character, habits, id);
  return { id, startDayKey: addDaysToDayKey(turn.startDayKey, passed * SERVICE_TURN_DAYS) };
}

/** The character with today's turn on it; the same object while its turn still holds. */
export function syncServiceTurn(character: Character, habits: Habit[], todayKey: string): Character {
  const turn = serviceTurn(character, habits, todayKey);
  return turn === character.serviceTurn ? character : { ...character, serviceTurn: turn };
}

/** Whole days left in the turn, counting today (3, 2, 1). */
export function turnDaysLeft(turn: ServiceTurn, todayKey: string): number {
  return Math.max(1, SERVICE_TURN_DAYS - daysBetweenDayKeys(turn.startDayKey, todayKey));
}

/** What sets `id`'s price: the slot steps, skills with Overdrive, enchanted worn items, or this turn's rerolls. */
function heldOf(character: Character, habits: Habit[], id: ServiceId): number {
  if (id === 'slot') return slotUpgradesOf(character);
  if (id === 'overdrive') return habits.filter((habit) => habit.isOverdrive).length;
  if (id === 'enchant') return equippedDoubledItemIds(character).length;
  return character.serviceTurn?.id === 'reroll' ? (character.serviceTurn.rerolls ?? 0) : 0;
}

/**
 * What a service's card shows: buyable, too dear, nothing to pick a target
 * from (`none`) or every slot step bought (`maxed`, slot only). `bought` is
 * what sets the price (see heldOf).
 */
export function serviceState(
  character: Character,
  habits: Habit[],
  id: ServiceId,
  bossIndex: number,
): { price: number; status: 'buy' | 'short' | 'none' | 'maxed'; bought: number } {
  const bought = heldOf(character, habits, id);
  if (id === 'slot') {
    const price = slotPrice(bought, bossIndex, character.prestige ?? 0);
    if (price === null) return { price: 0, status: 'maxed', bought };
    return { price, status: characterGold(character) >= price ? 'buy' : 'short', bought };
  }
  const price = servicePrice(id, bought, bossIndex, character.prestige ?? 0);
  if (!usable(character, habits, id)) return { price, status: 'none', bought };
  return { price, status: characterGold(character) >= price ? 'buy' : 'short', bought };
}

/** The character with `price` taken off its gold, a reroll also counted on its turn. */
function pay(character: Character, id: ServiceId, price: number): Character {
  const paid = { ...character, gold: characterGold(character) - price };
  const turn = character.serviceTurn;
  if (id !== 'reroll' || !turn) return paid;
  return { ...paid, serviceTurn: { ...turn, rerolls: (turn.rerolls ?? 0) + 1 } };
}

/** Whether `id` can be bought now at all: it's the service on turn, the hero stands and it reads `buy`. */
function open(character: Character, habits: Habit[], id: ServiceId, bossIndex: number): { price: number } | null {
  if (character.serviceTurn?.id !== id) return null;
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

/** Pays for one more slot. `slots` is the new cap. Null if it can't be bought. */
export function buySlot(character: Character, bossIndex: number): { character: Character; slots: number } | null {
  const sale = open(character, [], 'slot', bossIndex);
  if (!sale) return null;
  const bought = { ...pay(character, 'slot', sale.price), slotUpgrades: slotUpgradesOf(character) + 1 };
  return { character: bought, slots: maxEquipSlots(bought) };
}
