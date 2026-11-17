// Every gold and gem number in one place. Numbers are placeholders until
// playtested; the spec's budget rule is pinned in economy.spec.ts.

import type { ItemRarity } from '../items';

/** Gold a boss pays when slain: rises with the boss's place in the run. */
export function bossGold(bossIndex: number): number {
  return Math.round(40 + 10 * bossIndex);
}

/** A shop price: rounded to the nearest 5 gold, never under 5. */
export function roundPrice(gold: number): number {
  return Math.max(5, Math.round(gold / 5) * 5);
}

/** What a stocked item costs, as boss kills' worth of gold at the current boss: an epic or relic is a few bosses' worth. */
export const SHOP_PRICE_FACTOR: Record<ItemRarity, number> = { common: 1, uncommon: 1.5, rare: 2.5, epic: 4, relic: 6 };

/** The price of an item of `rarity` stocked while boss `bossIndex` is up. Locked into the stock when it's drawn. */
export function warePrice(rarity: ItemRarity, bossIndex: number): number {
  return roundPrice(SHOP_PRICE_FACTOR[rarity] * bossGold(bossIndex));
}

/** The fee for the next restock, after `restocksToday` already: half a boss's gold, doubling each time, back to the start with the next day's stock. */
export function restockFee(restocksToday: number, bossIndex: number): number {
  return roundPrice(0.5 * bossGold(bossIndex) * 2 ** restocksToday);
}

/** A tonic's price while boss `bossIndex` is up: one boss kill's gold. Cheap, to be bought again and again. */
export function tonicPrice(bossIndex: number): number {
  return roundPrice(bossGold(bossIndex));
}

/** The gold services' base price (as boss kills' worth of gold) and how much it climbs for each one held: skills with Overdrive, enchanted worn items, rerolls bought this turn. */
export const SERVICE_PRICES = {
  reroll: { base: 2, climb: 1.5 },
  overdrive: { base: 5, climb: 1.5 },
  enchant: { base: 10, climb: 2 },
} as const;

/** The price of a reroll, Overdrive or enchant while boss `bossIndex` is up, with `bought` held (see SERVICE_PRICES). Live, not locked. */
export function servicePrice(id: keyof typeof SERVICE_PRICES, bought: number, bossIndex: number): number {
  const { base, climb } = SERVICE_PRICES[id];
  return roundPrice(base * bossGold(bossIndex) * climb ** bought);
}

/** Boss kills' worth of gold for each slot bought: the 5th, 6th, 7th and 8th. */
export const SLOT_PRICE_FACTORS = [8, 10, 12, 15] as const;

/** The price of the next slot with `upgrades` bought this run, or null once all 8 are open. */
export function slotPrice(upgrades: number, bossIndex: number): number | null {
  const factor = SLOT_PRICE_FACTORS[upgrades];
  return factor === undefined ? null : roundPrice(factor * bossGold(bossIndex));
}

/**
 * Each day's stock: `size` items, each rolled like a boss drop on the shop's
 * rarity table (see shopRarityShares in shop.ts), an epic turning relic
 * `relicShare` of the time. The best is the headline, never below
 * `headlineFloor` at a level; other items of its rarity cost gems, at most
 * `gemCap` of them.
 */
export const SHOP_STOCK = {
  size: 7,
  relicShare: 0.1,
  gemCap: 2,
  headlineFloor: [
    [1, 'uncommon'],
    [10, 'rare'],
  ] as [number, 'uncommon' | 'rare'][],
};

/** Cost of the `n`th talent rank bought overall (1-based). Gold is the bulk; gems are the key that kicks in from rank 4. */
export function TALENT_COST(n: number): { gold: number; gems: number } {
  const gold = Math.min(2000, n <= 5 ? 100 * n : 500 + 25 * (n - 5));
  const gems = n <= 3 ? 0 : n <= 24 ? 1 : n <= 60 ? 2 : 3;
  return { gold, gems };
}

/** Gems paid once per account on first reaching each level. */
export const LEVEL_GEM_MILESTONES: readonly { level: number; gems: number }[] = [
  { level: 5, gems: 2 },
  { level: 10, gems: 3 },
  { level: 15, gems: 4 },
  { level: 20, gems: 5 },
  { level: 25, gems: 6 },
  { level: 30, gems: 7 },
  { level: 35, gems: 8 },
  { level: 40, gems: 9 },
  { level: 45, gems: 10 },
  { level: 50, gems: 10 },
];

/** Gems a finished trial pays when claimed. Flat until the new trial list (milestone B); 17 trials at 12 sit inside the 210 budget. */
export const TRIAL_GEMS = 12;

/** Every free gem an account can earn. `trials` and `dungeonFirstClears` are placeholders until milestones B and F. */
/** Gems paid at each prestige (placeholder, see the prestige design §4). */
export const PRESTIGE_GEMS = 50;

export const FREE_GEM_SOURCES = {
  levels: LEVEL_GEM_MILESTONES.reduce((sum, m) => sum + m.gems, 0),
  trials: 210,
  dungeonFirstClears: 0,
  prestige: PRESTIGE_GEMS * 5,
};

/** What a gem-priced shop item costs, by rarity. Flat, not by boss: gems don't grow with the run. */
export const GEM_WARE_PRICES = { rare: 5, epic: 10, relic: 15 } as const;

/** The shop's potions come back every this many days (and with a restock, and after a death): one of each. */
export const POTION_STOCK_DAYS = 3;

/** The Gold Pouch: `gems` for `bossKills` boss kills' worth of gold, once a day. A poor rate on purpose. */
export const GOLD_POUCH = { gems: 5, bossKills: 3 };

/** The gold the Gold Pouch pays while boss `bossIndex` is up. */
export function pouchGold(bossIndex: number): number {
  return roundPrice(GOLD_POUCH.bossKills * bossGold(bossIndex));
}

/** The daily purse: boss kills' worth of gold for the first open of each day. */
export const DAILY_PURSE_BOSS_KILLS = 0.5;

/** The gold the daily purse pays while boss `bossIndex` is up. */
export function purseGold(bossIndex: number): number {
  return roundPrice(DAILY_PURSE_BOSS_KILLS * bossGold(bossIndex));
}

/**
 * The streak freeze, bought for one skill: gems per frozen period (a daily's
 * day, a weekly's week), the most one buy covers, and how far ahead it may
 * start (in days for a daily, weeks for a weekly).
 */
export const FREEZE = { gemsPerPeriod: 2, maxDays: 7, maxLeadDays: 30, maxWeeks: 4, maxLeadWeeks: 4 };

/** A revive on the death screen: one fixed price that never climbs, once per boss. */
export const REVIVE_GEMS = 10;

/** Gem prices beyond the tree that the free budget must also cover: one hero skin. */
export const PLANNED_GEM_SINKS = { skin: 40 };

/** A skin's gem price by kind (placeholders, see skins.ts). */
export const SKIN_PRICES = { hero: PLANNED_GEM_SINKS.skin, home: 30, arena: 30 };
