// The gold shop (docs/ideas/2026-11-13-shop-economy.md §4): a stock drawn once
// a day, bought with gold and used at once, and restocked for a climbing fee.
// The stock lives on Character.shop, so a death wipes it. Everything here is
// pure; composables/useShop.ts runs it against the stores.

import { SHOP_STOCK, restockFee, warePrice } from './constants/economy';
import { characterGold } from './gold';
import { ITEM_CATALOG, dropRarityShares, recordRelicEarned } from './items';
import type { DropRarity, ItemDef } from './items';
import { pickRandom, type Rng } from './rng';
import type { Character, ShopStock, ShopWare } from './types';

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
  if (!shop) return null;
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
  if (!shop || !ware || !item || wareState(character, ware) !== 'buy') return null;
  const sell = (w: ShopWare | null) => (w?.itemId === itemId ? { ...w, sold: true } : w);
  const bought: Character = {
    ...character,
    gold: characterGold(character) - ware.price,
    ownedItemIds: [...character.ownedItemIds, itemId],
    shop: { ...shop, featured: sell(shop.featured), wares: shop.wares.map((w) => sell(w)!) },
  };
  return { character: recordRelicEarned(bought, itemId), item };
}
