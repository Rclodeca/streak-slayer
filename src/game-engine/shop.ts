// The gold shop (docs/ideas/2026-11-13-shop-economy.md §4): a stock drawn once
// a day, bought with gold and used at once, and restocked for a climbing fee.
// The stock lives on Character.shop, so a death wipes it. Everything here is
// pure; composables/useShop.ts runs it against the stores.

import { SHOP_STOCK, restockFee, tonicPrice, warePrice } from './constants/economy';
import { TUNING } from './constants/tuning';
import { characterGold } from './gold';
import { ITEM_CATALOG, dropRarityShares, recordRelicEarned } from './items';
import type { DropRarity, ItemDef } from './items';
import { activeCritBoost, activeExpBoost, activeHealBoost, applyCritBoostEffect, applyExpBoost, applyHealBoostEffect, effectiveStat } from './leveling';
import { pickRandom, type Rng } from './rng';
import { daysBetweenDayKeys } from './time';
import type { Character, ShopStock, ShopWare } from './types';

/** Whether the hero still stands: a reload can leave the death screen down at 0 HP, and a fallen hero buys nothing. */
export function standing(character: Character): boolean {
  return Math.round(character.currentHealth) > 0;
}

/** Up to `count` distinct random items from `pool`. */
function pickSome(pool: ItemDef[], count: number, rng: Rng): ItemDef[] {
  const left = [...pool];
  const picked: ItemDef[] = [];
  while (picked.length < count && left.length > 0) {
    const item = pickRandom(left, rng);
    picked.push(item);
    left.splice(left.indexOf(item), 1);
  }
  return picked;
}

/**
 * A fresh stock: up to SHOP_STOCK.basics commons and uncommons, one rare, and
 * on some days an epic or relic. Only items the character doesn't own, and only
 * rarities that drop at its level (relics go with epics). The special takes the
 * velvet and the rare drops into the rows; otherwise the rare is featured.
 */
function drawStock(character: Character, bossIndex: number, dayKey: string, restocks: number, rng: Rng): ShopStock {
  const shares = dropRarityShares(character.level);
  const pool = ITEM_CATALOG.filter((item) => !character.ownedItemIds.includes(item.id));
  const allowed = (item: ItemDef) => (item.rarity === 'relic' ? shares.epic > 0 : shares[item.rarity as DropRarity] > 0);
  const of = (...rarities: string[]) => pool.filter((item) => rarities.includes(item.rarity) && allowed(item));

  const basics = pickSome(of('common', 'uncommon'), SHOP_STOCK.basics, rng);
  const rare = pickSome(of('rare'), 1, rng)[0] ?? null;
  let special: ItemDef | null = null;
  if (shares.epic > 0 && rng() < SHOP_STOCK.featuredChance) {
    const relics = of('relic');
    special = pickSome(relics.length > 0 && rng() < SHOP_STOCK.relicShare ? relics : of('epic'), 1, rng)[0] ?? null;
  }

  const ware = (item: ItemDef): ShopWare => ({ itemId: item.id, price: warePrice(item.rarity, bossIndex) });
  const featured = special ?? rare;
  const rows = special && rare ? [...basics, rare] : basics;
  return { dayKey, featured: featured ? ware(featured) : null, wares: rows.map(ware), restocks };
}

/** Today's stock: the same character when it already has one for `dayKey`, else a new draw. */
export function stockShop(character: Character, bossIndex: number, dayKey: string, rng: Rng): Character {
  if (character.shop?.dayKey === dayKey) return character;
  return { ...character, shop: drawStock(character, bossIndex, dayKey, 0, rng) };
}

/** Pays restockFee and redraws today's stock. Null with no stock or too little gold. */
export function restockShop(character: Character, bossIndex: number, rng: Rng): { character: Character; fee: number } | null {
  const shop = character.shop;
  if (!shop || !standing(character)) return null;
  const fee = restockFee(shop.restocks, bossIndex);
  const gold = characterGold(character);
  if (gold < fee) return null;
  const paid = { ...character, gold: gold - fee };
  return { character: { ...paid, shop: drawStock(paid, bossIndex, shop.dayKey, shop.restocks + 1, rng) }, fee };
}

/** What a stocked ware's row shows: buyable, too dear, bought, or already owned another way. */
export function wareState(character: Character, ware: ShopWare): 'buy' | 'short' | 'sold' | 'owned' {
  if (ware.sold) return 'sold';
  if (character.ownedItemIds.includes(ware.itemId)) return 'owned';
  return characterGold(character) >= ware.price ? 'buy' : 'short';
}

/**
 * Buys a stocked item: takes its price, marks it sold and adds it to the owned
 * items (a relic is recorded earned). Null if it isn't in stock or can't be
 * bought (see wareState).
 */
export function buyWare(character: Character, itemId: string): { character: Character; item: ItemDef } | null {
  const shop = character.shop;
  const ware = shop && [shop.featured, ...shop.wares].find((w) => w?.itemId === itemId);
  const item = ITEM_CATALOG.find((candidate) => candidate.id === itemId);
  if (!shop || !ware || !item || !standing(character) || wareState(character, ware) !== 'buy') return null;
  const sell = (w: ShopWare | null) => (w?.itemId === itemId ? { ...w, sold: true } : w);
  const bought: Character = {
    ...character,
    gold: characterGold(character) - ware.price,
    ownedItemIds: [...character.ownedItemIds, itemId],
    shop: { ...shop, featured: sell(shop.featured), wares: shop.wares.map((w) => sell(w)!) },
  };
  return { character: recordRelicEarned(bought, itemId), item };
}

export type TonicId = 'draught' | 'crit' | 'heal' | 'exp';

const pct = (bonus: number) => Math.round(bonus * 100);

/** The tonics, always on the shelf. `icon` is a statIcons key. */
export const TONIC_DEFS: readonly { id: TonicId; name: string; effect: string; icon: string }[] = [
  { id: 'draught', name: 'Healing Draught', effect: `Heal ${TUNING.DRAUGHT_HEAL_PCT}% of max HP.`, icon: 'healing' },
  { id: 'crit', name: 'Hawk Tonic', effect: `+${pct(TUNING.CRIT_BOOST_BONUS)}% crit chance for ${TUNING.CRIT_BOOST_DAYS} days.`, icon: 'critBoost' },
  { id: 'heal', name: 'Verdant Tonic', effect: `+${pct(TUNING.HEAL_BOOST_BONUS)}% healing for ${TUNING.HEAL_BOOST_DAYS} days.`, icon: 'healBoost' },
  { id: 'exp', name: "Scholar's Tonic", effect: `+${pct(TUNING.EXP_BOOST_BONUS)}% EXP for ${TUNING.EXP_BOOST_DAYS} days.`, icon: 'expBoost' },
];

const BOOSTS = { crit: activeCritBoost, heal: activeHealBoost, exp: activeExpBoost } as const;

/**
 * What a tonic's row shows on `dayKey`: buyable, too dear, its boost still
 * running (`active`), the draught resting (`cooldown`), or the hero at full
 * health (`full`, draught only). `daysLeft` counts the running boost or the rest.
 */
export function tonicState(
  character: Character,
  id: TonicId,
  bossIndex: number,
  dayKey: string,
): { price: number; status: 'buy' | 'short' | 'active' | 'cooldown' | 'full'; daysLeft: number } {
  const price = tonicPrice(bossIndex);
  const afford = characterGold(character) >= price ? 'buy' : 'short';
  if (id === 'draught') {
    const rested = character.draughtDayKey === undefined ? Infinity : daysBetweenDayKeys(character.draughtDayKey, dayKey);
    if (rested < TUNING.DRAUGHT_COOLDOWN_DAYS) return { price, status: 'cooldown', daysLeft: TUNING.DRAUGHT_COOLDOWN_DAYS - rested };
    if (character.currentHealth >= effectiveStat(character, 'health')) return { price, status: 'full', daysLeft: 0 };
    return { price, status: afford, daysLeft: 0 };
  }
  const boost = BOOSTS[id](character, dayKey);
  if (boost) return { price, status: 'active', daysLeft: boost.durationDays - daysBetweenDayKeys(boost.appliedDayKey, dayKey) };
  return { price, status: afford, daysLeft: 0 };
}

/** Buys and uses a tonic at once. Null unless its row reads `buy`. `healed` is what the draught restored. */
export function buyTonic(character: Character, id: TonicId, bossIndex: number, dayKey: string): { character: Character; healed?: number } | null {
  const { price, status } = tonicState(character, id, bossIndex, dayKey);
  if (status !== 'buy' || !standing(character)) return null;
  const paid = { ...character, gold: characterGold(character) - price };
  if (id === 'draught') {
    const max = effectiveStat(paid, 'health');
    const currentHealth = Math.min(paid.currentHealth + max * (TUNING.DRAUGHT_HEAL_PCT / 100), max);
    return { character: { ...paid, currentHealth, draughtDayKey: dayKey }, healed: currentHealth - paid.currentHealth };
  }
  if (id === 'crit') return { character: applyCritBoostEffect(paid, dayKey) };
  if (id === 'heal') return { character: applyHealBoostEffect(paid, dayKey) };
  return { character: applyExpBoost(paid, dayKey) };
}
