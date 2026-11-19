// Every gold and gem number in one place, both balanced by time: gems in
// docs/superpowers/specs/2026-11-17-gem-economy-design.md, gold in
// docs/superpowers/specs/2026-11-17-gold-economy-design.md. Both budget rules
// are pinned in economy.spec.ts.

import type { ItemRarity } from '../items';
import { TRIAL_GEMS_TOTAL } from './trials';

/** Gold a boss pays when slain: rises with the boss's place in the run. */
export function bossGold(bossIndex: number): number {
  return Math.round(40 + 10 * bossIndex);
}

/** A shop price: rounded to the nearest 5 gold, never under 5. */
export function roundPrice(gold: number): number {
  return Math.max(5, Math.round(gold / 5) * 5);
}

/** Every gold price rises after each prestige: `base` before any, `perRank` more for each rank. Boss gold never drops. */
export const GOLD_PRICE_FACTOR = { base: 0.8, perRank: 0.1 } as const;

/** The gold price factor at prestige rank `prestige` (0–5, floored and clamped as prestigeRank is): ×0.8 to ×1.3. */
export function goldPriceFactor(prestige: number): number {
  const rank = Math.max(0, Math.min(5, Math.floor(prestige)));
  return Math.round((GOLD_PRICE_FACTOR.base + GOLD_PRICE_FACTOR.perRank * rank) * 100) / 100;
}

/** A gold price: `bossKills` of the current boss's gold, times the prestige factor, rounded. Every gold price goes through here. */
export function goldPrice(bossKills: number, bossIndex: number, prestige: number): number {
  return roundPrice(bossKills * bossGold(bossIndex) * goldPriceFactor(prestige));
}

/**
 * Every price a run pays and then loses at prestige (shop items, restocks,
 * potions, services, slots) is scaled by this. The 2026-11-18 EXP curve
 * ends a run about 30% sooner, with about 30% less gold, so these came down
 * to match: a run still affords what it did. Talent ranks, kept through
 * prestige, aren't scaled; gold per day is about what it was, so the tree
 * fills at the same pace.
 */
export const RUN_PRICE_FACTOR = 0.7;

/** What a stocked item costs, as boss kills' worth of gold at the current boss (before RUN_PRICE_FACTOR): an epic or relic is a few bosses' worth. */
export const SHOP_PRICE_FACTOR: Record<ItemRarity, number> = { common: 1, uncommon: 1.5, rare: 2.5, epic: 4, relic: 6 };

/** The price of an item of `rarity` stocked while boss `bossIndex` is up. Locked into the stock when it's drawn. */
export function warePrice(rarity: ItemRarity, bossIndex: number, prestige: number): number {
  return goldPrice(SHOP_PRICE_FACTOR[rarity] * RUN_PRICE_FACTOR, bossIndex, prestige);
}

/** The fee for the next restock, after `restocksToday` already: half a boss's gold, doubling each time, back to the start with the next day's stock. */
export function restockFee(restocksToday: number, bossIndex: number, prestige: number): number {
  return goldPrice(0.5 * 2 ** restocksToday * RUN_PRICE_FACTOR, bossIndex, prestige);
}

/** A tonic's price while boss `bossIndex` is up: one boss kill's gold (before RUN_PRICE_FACTOR). Cheap, to be bought again and again. */
export function tonicPrice(bossIndex: number, prestige: number): number {
  return goldPrice(RUN_PRICE_FACTOR, bossIndex, prestige);
}

/** The gold services' base price (as boss kills' worth of gold) and how much it climbs for each one held: skills with Overdrive, enchanted worn items, rerolls bought this turn. Steep, so the last climbs always have somewhere to put their gold. */
export const SERVICE_PRICES = {
  reroll: { base: 2, climb: 2 },
  overdrive: { base: 5, climb: 2 },
  enchant: { base: 3, climb: 2 },
} as const;

/** The price of a reroll, Overdrive or enchant while boss `bossIndex` is up, with `bought` held (see SERVICE_PRICES). Live, not locked. */
export function servicePrice(id: keyof typeof SERVICE_PRICES, bought: number, bossIndex: number, prestige: number): number {
  const { base, climb } = SERVICE_PRICES[id];
  return goldPrice(base * climb ** bought * RUN_PRICE_FACTOR, bossIndex, prestige);
}

/** Boss kills' worth of gold for each slot bought: the 5th, 6th, 7th and 8th. */
export const SLOT_PRICE_FACTORS = [2, 4, 6, 8] as const;

/** The price of the next slot with `upgrades` bought this run, or null once all 8 are open. */
export function slotPrice(upgrades: number, bossIndex: number, prestige: number): number | null {
  const factor = SLOT_PRICE_FACTORS[upgrades];
  return factor === undefined ? null : goldPrice(factor * RUN_PRICE_FACTOR, bossIndex, prestige);
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
    [14, 'rare'],
  ] as [number, 'uncommon' | 'rare'][],
};

/** Boss kills' worth of gold for every talent rank, whatever came before: gems carry the tree's climb across the account. */
export const TALENT_RANK_BOSS_KILLS = 0.5;

/** Cost of the `n`th talent rank bought overall (1-based), boss `bossIndex` up. Gold is half a kill; gems kick in from rank 4 and climb in bands to 5 from rank 61 (689 for all 163). */
export function TALENT_COST(n: number, bossIndex: number, prestige: number): { gold: number; gems: number } {
  const gold = goldPrice(TALENT_RANK_BOSS_KILLS, bossIndex, prestige);
  const gems = n <= 3 ? 0 : n <= 20 ? 2 : n <= 40 ? 3 : n <= 60 ? 4 : 5;
  return { gold, gems };
}

/** Gems paid once per account on first reaching each level: 4 to L20, 8 to L40, then 12 every 5 levels to L70. */
export const LEVEL_GEM_MILESTONES: readonly { level: number; gems: number }[] = [
  { level: 5, gems: 4 },
  { level: 10, gems: 4 },
  { level: 15, gems: 4 },
  { level: 20, gems: 4 },
  { level: 25, gems: 8 },
  { level: 30, gems: 8 },
  { level: 35, gems: 8 },
  { level: 40, gems: 8 },
  { level: 45, gems: 12 },
  { level: 50, gems: 12 },
  { level: 55, gems: 12 },
  { level: 60, gems: 12 },
  { level: 65, gems: 12 },
  { level: 70, gems: 12 },
];

/** Gems a new account starts with, so the first revive and gem-priced talent ranks are in reach from day one. */
export const STARTING_GEMS = 30;

/** Gold every new hero starts with: the first launch and every prestige (createCharacter). */
export const STARTING_GOLD = 200;

/** Gems paid at each prestige. */
export const PRESTIGE_GEMS = 80;

/** The free dungeons (unlocked by prestige), and what each of a dungeon's six bosses pays on its first clear. Dungeons come later. */
export const FREE_DUNGEONS = 2;
export const FREE_DUNGEON_BOSS_GEMS = [4, 5, 7, 9, 11, 14] as const;

/** Every one-time free gem an account can earn (the perfect week repeats, so it isn't here). */
export const FREE_GEM_SOURCES = {
  start: STARTING_GEMS,
  levels: LEVEL_GEM_MILESTONES.reduce((sum, m) => sum + m.gems, 0),
  trials: TRIAL_GEMS_TOTAL,
  dungeonFirstClears: FREE_DUNGEONS * FREE_DUNGEON_BOSS_GEMS.reduce((sum, gems) => sum + gems, 0),
  prestige: PRESTIGE_GEMS * 5,
};

/** What a gem-priced shop item costs, by rarity. Flat, not by boss: gems don't grow with the run. */
export const GEM_WARE_PRICES = { rare: 6, epic: 12, relic: 20 } as const;

/** The EXP potions' gem prices: EXP is the speed knob, so gold can't buy it. The other potions cost gold (tonicPrice). */
export const GEM_POTION_PRICES = { exp: 5, 'double-exp': 25 } as const;

/** The shop's potions come back every this many days (and with a restock, and after a death): one of each. */
export const POTION_STOCK_DAYS = 3;

/** The Gold Pouch: `gems` for `bossKills` boss kills' worth of gold, once a day. A poor rate on purpose. */
export const GOLD_POUCH = { gems: 15, bossKills: 3 };

/** The gold the Gold Pouch pays while boss `bossIndex` is up: it rises with the prestige factor, so a gem buys the same share of the shop on every climb. */
export function pouchGold(bossIndex: number, prestige: number): number {
  return goldPrice(GOLD_POUCH.bossKills, bossIndex, prestige);
}

/** The daily purse: boss kills' worth of gold for the first open of each day. Small: about a fifth of a climb's gold. */
export const DAILY_PURSE_BOSS_KILLS = 0.2;

/** The gold the daily purse pays while boss `bossIndex` is up. */
export function purseGold(bossIndex: number): number {
  return roundPrice(DAILY_PURSE_BOSS_KILLS * bossGold(bossIndex));
}

/**
 * The streak freeze, bought for one skill: gems per frozen day (a daily) or
 * week (a weekly), the most one buy covers, and how far ahead it may start
 * (in days for a daily, weeks for a weekly).
 */
export const FREEZE = { gemsPerDay: 2, gemsPerWeek: 5, maxDays: 7, maxLeadDays: 30, maxWeeks: 4, maxLeadWeeks: 4 };

/** The perfect week: gems for a calendar week with every due skill checked (see perfectWeek.ts). The one free source that never runs out. */
export const PERFECT_WEEK_GEMS = 2;

/** A revive on the death screen: one fixed price that never climbs, once per boss. */
export const REVIVE_GEMS = 15;

/** What a death takes (the prestige design §3): levels, a share of carried gold, equipped items, and boss power. */
export const DEATH_SETBACK = { levels: 1, goldPct: 10, items: 1, bossPower: 3 } as const;

/** A skin's gem price by kind (see skins.ts). */
export const SKIN_PRICES = { hero: 120, home: 90, arena: 90 };
