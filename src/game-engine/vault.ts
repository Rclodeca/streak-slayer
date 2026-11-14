// The Vault (docs/ideas/2026-11-13-shop-economy.md §3): a few named items for
// gems, drawn every VAULT_STOCK_DAYS days, and the Gold Pouch, gems for gold
// at a poor rate once a day. Both are for this run: the stock and the pouch's
// day live on Character, so a death wipes them. Gems live on the account, so
// every rule takes the balance and returns what to spend; composables/useVault.ts
// runs them against the stores.

import { GOLD_POUCH, VAULT_PRICES, VAULT_STOCK_DAYS, pouchGold } from './constants/economy';
import { characterGold } from './gold';
import { ITEM_CATALOG, recordRelicEarned } from './items';
import type { ItemDef } from './items';
import type { Rng } from './rng';
import { pickSome, standing, stockPool } from './shop';
import { addDaysToDayKey, daysBetweenDayKeys } from './time';
import type { Character, VaultStock, VaultWare } from './types';

/** Windows are counted from this day, so every player's windows line up. */
const WINDOW_EPOCH = '2026-01-01';

/** The first day of `dayKey`'s VAULT_STOCK_DAYS-day window. */
export function vaultWindowKey(dayKey: string): string {
  const days = daysBetweenDayKeys(WINDOW_EPOCH, dayKey);
  return addDaysToDayKey(WINDOW_EPOCH, Math.floor(days / VAULT_STOCK_DAYS) * VAULT_STOCK_DAYS);
}

/** A relic takes the velvet this share of the time, when one is left. */
const RELIC_SHARE = 1 / 3;

/**
 * A fresh stock: an epic or relic on velvet and one rare in the rows, from the
 * same pool as the gold shop's (unowned, dropping at this level), leaving out
 * anything the gold shop has in stock now.
 */
function drawVault(character: Character, windowKey: string, rng: Rng): VaultStock {
  const inShop = new Set([character.shop?.featured, ...(character.shop?.wares ?? [])].flatMap((w) => (w ? [w.itemId] : [])));
  const pool = stockPool(character);
  const of = (...rarities: Parameters<typeof pool>) => pool(...rarities).filter((item) => !inShop.has(item.id));
  const relics = of('relic');
  const special = pickSome(relics.length > 0 && rng() < RELIC_SHARE ? relics : of('epic'), 1, rng)[0] ?? null;
  const rare = pickSome(of('rare'), 1, rng)[0] ?? null;
  const ware = (item: ItemDef): VaultWare => ({ itemId: item.id, gems: VAULT_PRICES[item.rarity as keyof typeof VAULT_PRICES] });
  return { windowKey, featured: special ? ware(special) : null, wares: rare ? [ware(rare)] : [] };
}

/** This window's stock: the same character when it already has one for `dayKey`'s window, else a new draw. */
export function stockVault(character: Character, dayKey: string, rng: Rng): Character {
  const windowKey = vaultWindowKey(dayKey);
  if (character.vault?.windowKey === windowKey) return character;
  return { ...character, vault: drawVault(character, windowKey, rng) };
}

/** What a Vault ware's row shows: buyable, too dear, bought, or already owned another way. */
export function vaultWareState(character: Character, gems: number, ware: VaultWare): 'buy' | 'short' | 'sold' | 'owned' {
  if (ware.sold) return 'sold';
  if (character.ownedItemIds.includes(ware.itemId)) return 'owned';
  return gems >= ware.gems ? 'buy' : 'short';
}

/**
 * Buys a Vault item: marks it sold and adds it to the owned items (a relic is
 * recorded earned). The caller spends `gemsSpent`. Null if it isn't in stock
 * or can't be bought (see vaultWareState), or the hero has fallen.
 */
export function buyVaultWare(character: Character, gems: number, itemId: string): { character: Character; item: ItemDef; gemsSpent: number } | null {
  const vault = character.vault;
  const ware = vault && [vault.featured, ...vault.wares].find((w) => w?.itemId === itemId);
  const item = ITEM_CATALOG.find((candidate) => candidate.id === itemId);
  if (!vault || !ware || !item || !standing(character) || vaultWareState(character, gems, ware) !== 'buy') return null;
  const sell = (w: VaultWare | null) => (w?.itemId === itemId ? { ...w, sold: true } : w);
  const bought: Character = {
    ...character,
    ownedItemIds: [...character.ownedItemIds, itemId],
    vault: { ...vault, featured: sell(vault.featured), wares: vault.wares.map((w) => sell(w)!) },
  };
  return { character: recordRelicEarned(bought, itemId), item, gemsSpent: ware.gems };
}

/** The Gold Pouch's row on `dayKey`: its gem price, the gold it pays, and whether it can be bought or was bought today. */
export function pouchState(
  character: Character,
  gems: number,
  bossIndex: number,
  dayKey: string,
): { gems: number; gold: number; status: 'buy' | 'short' | 'cooldown' } {
  const row = { gems: GOLD_POUCH.gems, gold: pouchGold(bossIndex) };
  if (character.pouchDayKey === dayKey) return { ...row, status: 'cooldown' };
  return { ...row, status: gems >= GOLD_POUCH.gems ? 'buy' : 'short' };
}

/** Buys the Gold Pouch: adds its gold and marks today. The caller spends `gemsSpent`. Null unless its row reads `buy`. */
export function buyPouch(
  character: Character,
  gems: number,
  bossIndex: number,
  dayKey: string,
): { character: Character; gold: number; gemsSpent: number } | null {
  const state = pouchState(character, gems, bossIndex, dayKey);
  if (state.status !== 'buy' || !standing(character)) return null;
  return {
    character: { ...character, gold: characterGold(character) + state.gold, pouchDayKey: dayKey },
    gold: state.gold,
    gemsSpent: state.gems,
  };
}
