// The shop (docs/ideas/2026-11-13-shop-economy.md §4): a stock drawn once a
// day, rolled like boss drops (its headline in gold, others of its rarity in
// gems), one of each potion every POTION_STOCK_DAYS days (the EXP ones for
// gems, the rest for gold), all used at once,
// and restocked (potions too) for a climbing gold fee.
// The stock lives on Character.shop, so a death wipes it. Everything here is
// pure; composables/useShop.ts runs it against the stores.

import { GEM_POTION_PRICES, GEM_WARE_PRICES, POTION_STOCK_DAYS, SHOP_STOCK, restockFee, tonicPrice, warePrice } from './constants/economy';
import { TUNING } from './constants/tuning';
import { characterGold } from './gold';
import { DROP_RARITIES, ITEM_CATALOG, availableRelics, blendByLevel, normalizeShares, recordRelicEarned } from './items';
import type { DropRarity, ItemDef, ItemRarity } from './items';
import { activeCritBoost, activeExpBoost, activeHealBoost, applyCritBoostEffect, applyExpBoost, applyHealBoostEffect, effectiveStat } from './leveling';
import { pickRandom, pickWeighted, type Rng } from './rng';
import { daysBetweenDayKeys, windowStartKey } from './time';
import type { Character, ShopStock, ShopWare } from './types';

/** Whether the hero still stands: a fallen hero buys nothing, even with the death screen waiting behind a popup. */
export function standing(character: Character): boolean {
  return Math.round(character.currentHealth) > 0;
}

const RANK: Record<ItemRarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, relic: 4 };
const TIER_BELOW: Partial<Record<ItemRarity, ItemRarity>> = { uncommon: 'common', rare: 'uncommon', epic: 'rare', relic: 'epic' };

/** The shop's rarity shares at `level`, as fractions summing to 1: the drop table, kinder below level 10 (SHOP_EARLY_RARITY_SHARES). */
export function shopRarityShares(level: number): Record<DropRarity, number> {
  const early = TUNING.SHOP_EARLY_RARITY_SHARES;
  const late = TUNING.DROP_RARITY_SHARES_BY_LEVEL.filter(([rowLevel]) => rowLevel > early[early.length - 1][0]);
  return normalizeShares(blendByLevel([...early, ...late], level));
}

/** The lowest rarity the headline can be at `level` (SHOP_STOCK.headlineFloor). */
export function headlineFloor(level: number): ItemRarity {
  return SHOP_STOCK.headlineFloor.filter(([rowLevel]) => rowLevel <= level).at(-1)?.[1] ?? 'common';
}

/**
 * One item for the stock from `pool` (what's left to draw): a rarity, at least
 * `floor`, on `shares` among those with something left, then any item of it.
 * An epic turns relic SHOP_STOCK.relicShare of the time while a relic is
 * left (always, once no epic is). Null when nothing is left at `floor` or up.
 */
function drawOne(pool: ItemDef[], shares: Record<DropRarity, number>, floor: ItemRarity, rng: Rng): ItemDef | null {
  const of = (rarity: ItemRarity) => pool.filter((item) => item.rarity === rarity);
  const left = DROP_RARITIES.filter((rarity) => RANK[rarity] >= RANK[floor] && shares[rarity] > 0 && of(rarity).length + (rarity === 'epic' ? of('relic').length : 0) > 0);
  if (left.length === 0) return null;
  let rarity: ItemRarity = pickWeighted<DropRarity>(Object.fromEntries(left.map((r) => [r, shares[r]])), rng);
  if (rarity === 'epic' && of('relic').length > 0 && (of('epic').length === 0 || rng() < SHOP_STOCK.relicShare)) rarity = 'relic';
  return pickRandom(of(rarity), rng);
}

/**
 * A fresh stock: SHOP_STOCK.size items, each rolled like a boss drop on
 * shopRarityShares, from what the character doesn't own (and, for relics,
 * hasn't earned or been promised by a challenge). The best is the headline,
 * in gold; below the level's headlineFloor it's redrawn from the floor up.
 * When the headline is rare or better, the other items of its rarity cost
 * gems and lead the rows, at most SHOP_STOCK.gemCap of them; any more are
 * redrawn a tier lower. The rest are gold, best first.
 */
function drawStock(character: Character, bossIndex: number, dayKey: string, restocks: number, rng: Rng): ShopStock {
  const shares = shopRarityShares(character.level);
  const pool = [...ITEM_CATALOG.filter((item) => item.rarity !== 'relic' && !character.ownedItemIds.includes(item.id)), ...availableRelics(character)];
  const take = (item: ItemDef | null | undefined) => {
    if (item) pool.splice(pool.indexOf(item), 1);
    return item ?? null;
  };

  const drawn: ItemDef[] = [];
  for (let i = 0; i < SHOP_STOCK.size; i++) {
    const item = take(drawOne(pool, shares, 'common', rng));
    if (item) drawn.push(item);
  }
  const byRank = (a: ItemDef, b: ItemDef) => RANK[b.rarity] - RANK[a.rarity];
  drawn.sort(byRank);
  const floor = headlineFloor(character.level);
  if (drawn.length > 0 && RANK[drawn[0].rarity] < RANK[floor]) drawn[0] = take(drawOne(pool, shares, floor, rng)) ?? drawn[0];

  const [headline, ...rest] = drawn;
  if (!headline) return { dayKey, featured: null, wares: [], restocks };
  const gemRarity = RANK[headline.rarity] >= RANK.rare ? headline.rarity : null;
  const same = rest.filter((item) => item.rarity === gemRarity);
  const gems = same.slice(0, SHOP_STOCK.gemCap);
  const lower = same.slice(SHOP_STOCK.gemCap).flatMap((item) => {
    const tier = TIER_BELOW[item.rarity];
    return take(tier && pickSome(pool.filter((candidate) => candidate.rarity === tier), rng)) ?? [];
  });
  const gold = [...rest.filter((item) => item.rarity !== gemRarity), ...lower].sort(byRank);

  const goldWare = (item: ItemDef): ShopWare => ({ itemId: item.id, price: warePrice(item.rarity, bossIndex, character.prestige ?? 0) });
  const gemWare = (item: ItemDef): ShopWare => ({ itemId: item.id, price: GEM_WARE_PRICES[item.rarity as keyof typeof GEM_WARE_PRICES], currency: 'gems' });
  return { dayKey, featured: goldWare(headline), wares: [...gems.map(gemWare), ...gold.map(goldWare)], restocks };
}

/** A random item from `items`, or undefined when there's none. */
function pickSome(items: ItemDef[], rng: Rng): ItemDef | undefined {
  return items.length > 0 ? pickRandom(items, rng) : undefined;
}

/** Today's stock: the same character when it already has one for `dayKey`, else a new draw. The potions bought keep their window. */
export function stockShop(character: Character, bossIndex: number, dayKey: string, rng: Rng): Character {
  const shop = character.shop;
  if (shop?.dayKey === dayKey) return character;
  const potions = shop?.potionsKey ? { potionsKey: shop.potionsKey, potionsSold: shop.potionsSold ?? [] } : {};
  return { ...character, shop: { ...drawStock(character, bossIndex, dayKey, 0, rng), ...potions } };
}

/** Pays restockFee, redraws today's stock and puts every potion back. Null with no stock or too little gold. */
export function restockShop(character: Character, bossIndex: number, rng: Rng): { character: Character; fee: number } | null {
  const shop = character.shop;
  if (!shop || !standing(character)) return null;
  const fee = restockFee(shop.restocks, bossIndex, character.prestige ?? 0);
  const gold = characterGold(character);
  if (gold < fee) return null;
  const paid = { ...character, gold: gold - fee };
  return { character: { ...paid, shop: drawStock(paid, bossIndex, shop.dayKey, shop.restocks + 1, rng) }, fee };
}

/** What a stocked ware's row shows: buyable, too dear (in gold, or in the account's `gems` for a gem ware), bought, or already owned another way. */
export function wareState(character: Character, ware: ShopWare, gems: number): 'buy' | 'short' | 'sold' | 'owned' {
  if (ware.sold) return 'sold';
  if (character.ownedItemIds.includes(ware.itemId)) return 'owned';
  const purse = ware.currency === 'gems' ? gems : characterGold(character);
  return purse >= ware.price ? 'buy' : 'short';
}

/**
 * Buys a stocked item: takes its gold price (a gem ware's the caller spends,
 * as `gemsSpent`), marks it sold and adds it to the owned items (a relic is
 * recorded earned). Null if it isn't in stock or can't be bought (see wareState).
 */
export function buyWare(character: Character, itemId: string, gems: number): { character: Character; item: ItemDef; gemsSpent: number } | null {
  const shop = character.shop;
  const ware = shop && [shop.featured, ...shop.wares].find((w) => w?.itemId === itemId);
  const item = ITEM_CATALOG.find((candidate) => candidate.id === itemId);
  if (!shop || !ware || !item || !standing(character) || wareState(character, ware, gems) !== 'buy') return null;
  const sell = (w: ShopWare | null) => (w?.itemId === itemId ? { ...w, sold: true } : w);
  const inGems = ware.currency === 'gems';
  const bought: Character = {
    ...character,
    gold: characterGold(character) - (inGems ? 0 : ware.price),
    ownedItemIds: [...character.ownedItemIds, itemId],
    shop: { ...shop, featured: sell(shop.featured), wares: shop.wares.map((w) => sell(w)!) },
  };
  return { character: recordRelicEarned(bought, itemId), item, gemsSpent: inGems ? ware.price : 0 };
}

export type TonicId = 'draught' | 'crit' | 'heal' | 'exp' | 'double-exp';

const pct = (bonus: number) => Math.round(bonus * 100);

/** The potions, one of each in stock per POTION_STOCK_DAYS-day window. `art` is the sprite under public/sprites/. */
export const TONIC_DEFS: readonly { id: TonicId; name: string; effect: string; art: string }[] = [
  { id: 'draught', name: 'Health Potion', effect: `Heal ${TUNING.DRAUGHT_HEAL_PCT}% of max HP.`, art: 'potions/health' },
  { id: 'crit', name: 'Crit Potion', effect: `+${pct(TUNING.CRIT_BOOST_BONUS)}% crit chance for ${TUNING.CRIT_BOOST_DAYS} days.`, art: 'potions/crit' },
  { id: 'heal', name: 'Mending Potion', effect: `+${pct(TUNING.HEAL_BOOST_BONUS)}% healing for ${TUNING.HEAL_BOOST_DAYS} days.`, art: 'potions/mending' },
  { id: 'exp', name: 'EXP Potion', effect: `+${pct(TUNING.EXP_BOOST_BONUS)}% EXP for ${TUNING.EXP_BOOST_DAYS} days.`, art: 'potions/exp' },
  // Shares the EXP Potion's sprite until it has its own.
  { id: 'double-exp', name: 'Double EXP', effect: `+${pct(TUNING.DOUBLE_EXP_BONUS)}% EXP for ${TUNING.DOUBLE_EXP_DAYS} days.`, art: 'potions/exp' },
];

/** The two EXP potions share one boost: the one running is the row whose bonus it carries, so the other stays buyable and replaces it. */
const isDouble = (bonus: number) => bonus === TUNING.DOUBLE_EXP_BONUS;
const BOOSTS = {
  crit: activeCritBoost,
  heal: activeHealBoost,
  exp: (character: Character, dayKey: string) => {
    const boost = activeExpBoost(character, dayKey);
    return boost && !isDouble(boost.bonus) ? boost : undefined;
  },
  'double-exp': (character: Character, dayKey: string) => {
    const boost = activeExpBoost(character, dayKey);
    return boost && isDouble(boost.bonus) ? boost : undefined;
  },
} as const;

const isGemPotion = (id: TonicId): id is keyof typeof GEM_POTION_PRICES => id in GEM_POTION_PRICES;

/** The first day of `dayKey`'s potion window. */
export function potionWindowKey(dayKey: string): string {
  return windowStartKey(dayKey, POTION_STOCK_DAYS);
}

/** The potions bought out of `dayKey`'s window: none once the window has turned. */
function potionsSold(shop: ShopStock | undefined, dayKey: string): string[] {
  return shop?.potionsKey === potionWindowKey(dayKey) ? (shop.potionsSold ?? []) : [];
}

/**
 * What a potion's row shows on `dayKey`: buyable, too dear, bought out of this
 * window (`out`, until the window turns or a restock), its boost still running
 * (`active`), or the hero at full health (`full`, Health Potion only).
 * `daysLeft` counts the running boost. The EXP potions are priced in the
 * account's `gems`, the rest in the hero's gold.
 */
export function tonicState(
  character: Character,
  id: TonicId,
  bossIndex: number,
  dayKey: string,
  gems: number,
): { price: number; currency: 'gold' | 'gems'; status: 'buy' | 'short' | 'out' | 'active' | 'full'; daysLeft: number } {
  const inGems = isGemPotion(id);
  const price = inGems ? GEM_POTION_PRICES[id] : tonicPrice(bossIndex, character.prestige ?? 0);
  const currency = inGems ? 'gems' : 'gold';
  const afford = (inGems ? gems : characterGold(character)) >= price ? 'buy' : 'short';
  if (potionsSold(character.shop, dayKey).includes(id)) return { price, currency, status: 'out', daysLeft: 0 };
  if (id === 'draught') {
    if (character.currentHealth >= effectiveStat(character, 'health')) return { price, currency, status: 'full', daysLeft: 0 };
    return { price, currency, status: afford, daysLeft: 0 };
  }
  const boost = BOOSTS[id](character, dayKey);
  if (boost) return { price, currency, status: 'active', daysLeft: boost.durationDays - daysBetweenDayKeys(boost.appliedDayKey, dayKey) };
  return { price, currency, status: afford, daysLeft: 0 };
}

/**
 * Buys and uses a potion at once, taking it out of the window's stock. Null
 * with no shop stock, or unless its row reads `buy`. `healed` is what the
 * Health Potion restored; the caller spends `gemsSpent` (an EXP potion's).
 */
export function buyTonic(
  character: Character,
  id: TonicId,
  bossIndex: number,
  dayKey: string,
  gems: number,
): { character: Character; healed?: number; gemsSpent: number } | null {
  const shop = character.shop;
  const { price, currency, status } = tonicState(character, id, bossIndex, dayKey, gems);
  if (!shop || status !== 'buy' || !standing(character)) return null;
  const sold: ShopStock = { ...shop, potionsKey: potionWindowKey(dayKey), potionsSold: [...potionsSold(shop, dayKey), id] };
  const gemsSpent = currency === 'gems' ? price : 0;
  const paid = { ...character, gold: characterGold(character) - (gemsSpent ? 0 : price), shop: sold };
  if (id === 'draught') {
    const max = effectiveStat(paid, 'health');
    const currentHealth = Math.min(paid.currentHealth + max * (TUNING.DRAUGHT_HEAL_PCT / 100), max);
    return { character: { ...paid, currentHealth }, healed: currentHealth - paid.currentHealth, gemsSpent };
  }
  if (id === 'crit') return { character: applyCritBoostEffect(paid, dayKey), gemsSpent };
  if (id === 'heal') return { character: applyHealBoostEffect(paid, dayKey), gemsSpent };
  if (id === 'double-exp') return { character: applyExpBoost(paid, dayKey, TUNING.DOUBLE_EXP_BONUS, TUNING.DOUBLE_EXP_DAYS), gemsSpent };
  return { character: applyExpBoost(paid, dayKey), gemsSpent };
}
