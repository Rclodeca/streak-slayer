import { describe, expect, it } from 'vitest';
import { restockFee, warePrice } from './constants/economy';
import { ITEM_CATALOG, dropRarityShares } from './items';
import { createRng } from './rng';
import { buyWare, restockShop, stockShop, wareState } from './shop';
import type { Character, ShopWare } from './types';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  const starterStats = { physicalDamage: 10, magicDamage: 10, healing: 6, health: 50, trueDamage: 6 };
  return {
    level: 10,
    exp: 0,
    starterStats,
    currentHealth: starterStats.health,
    ownedItemIds: [],
    equippedItemIds: [],
    critChance: 0.01,
    ...overrides,
  };
}

const DAY = '2026-11-13';
const rarityOf = (ware: ShopWare) => ITEM_CATALOG.find((item) => item.id === ware.itemId)!.rarity;
const allWares = (c: Character) => [...(c.shop?.featured ? [c.shop.featured] : []), ...(c.shop?.wares ?? [])];
/** Always rolls the special and picks the first of everything. */
const lowRng = () => 0;
/** Never rolls the special. */
const highRng = () => 0.99;

describe('stockShop', () => {
  it('stockShop draws once a day', () => {
    const stocked = stockShop(makeCharacter(), 3, DAY, createRng(1));
    expect(stocked.shop?.dayKey).toBe(DAY);
    expect(stockShop(stocked, 3, DAY, createRng(2))).toBe(stocked);
    const next = stockShop(stocked, 3, '2026-11-14', createRng(2));
    expect(next.shop?.dayKey).toBe('2026-11-14');
    expect(next.shop?.restocks).toBe(0);
  });

  it('a level 1 stock holds only what drops at level 1', () => {
    const shares = dropRarityShares(1);
    for (let seed = 1; seed <= 20; seed++) {
      const stocked = stockShop(makeCharacter({ level: 1 }), 1, DAY, createRng(seed));
      for (const ware of allWares(stocked)) {
        const rarity = rarityOf(ware);
        expect(rarity).not.toBe('relic');
        expect(shares[rarity as keyof typeof shares]).toBeGreaterThan(0);
      }
      expect(['epic', 'relic']).not.toContain(stocked.shop?.featured && rarityOf(stocked.shop.featured));
    }
  });

  it('a featured epic or relic leaves the rare in the rows', () => {
    const stocked = stockShop(makeCharacter(), 3, DAY, lowRng);
    expect(['epic', 'relic']).toContain(rarityOf(stocked.shop!.featured!));
    expect(stocked.shop!.wares.filter((w) => rarityOf(w) === 'rare')).toHaveLength(1);
  });

  it('without the special, the rare takes the velvet and the rows are basics', () => {
    const stocked = stockShop(makeCharacter(), 3, DAY, highRng);
    expect(rarityOf(stocked.shop!.featured!)).toBe('rare');
    expect(stocked.shop!.wares).toHaveLength(3);
    for (const ware of stocked.shop!.wares) expect(['common', 'uncommon']).toContain(rarityOf(ware));
  });

  it('stock never offers an owned item', () => {
    const owned = ITEM_CATALOG.filter((item) => item.rarity !== 'relic').slice(0, 60).map((item) => item.id);
    for (let seed = 1; seed <= 10; seed++) {
      const stocked = stockShop(makeCharacter({ ownedItemIds: owned }), 3, DAY, createRng(seed));
      for (const ware of allWares(stocked)) expect(owned).not.toContain(ware.itemId);
    }
  });

  it('prices lock at draw time', () => {
    const stocked = stockShop(makeCharacter(), 3, DAY, createRng(4));
    for (const ware of allWares(stocked)) expect(ware.price).toBe(warePrice(rarityOf(ware), 3));
  });
});

describe('buyWare', () => {
  const stocked = (gold: number) => stockShop(makeCharacter({ gold }), 3, DAY, createRng(7));

  it('buyWare takes the gold and hands over the item', () => {
    const c = stocked(1000);
    const featured = c.shop!.featured!;
    const result = buyWare(c, featured.itemId)!;
    expect(result.item.id).toBe(featured.itemId);
    expect(result.character.gold).toBe(1000 - featured.price);
    expect(result.character.ownedItemIds).toContain(featured.itemId);
    expect(result.character.shop!.featured!.sold).toBe(true);
    expect(wareState(result.character, result.character.shop!.featured!)).toBe('sold');
  });

  it('buyWare twice buys once', () => {
    const c = stocked(1000);
    const id = c.shop!.wares[0].itemId;
    const once = buyWare(c, id)!.character;
    expect(buyWare(once, id)).toBeNull();
    expect(once.gold).toBe(1000 - c.shop!.wares[0].price);
  });

  it('short on gold buys nothing', () => {
    const c = stocked(0);
    expect(wareState(c, c.shop!.wares[0])).toBe('short');
    expect(buyWare(c, c.shop!.wares[0].itemId)).toBeNull();
  });

  it('a stocked item that dropped meanwhile reads owned', () => {
    const c = stocked(1000);
    const ware = c.shop!.wares[0];
    const dropped = { ...c, ownedItemIds: [ware.itemId] };
    expect(wareState(dropped, ware)).toBe('owned');
    expect(buyWare(dropped, ware.itemId)).toBeNull();
  });

  it('an item not in stock is not for sale', () => {
    const c = stocked(1000);
    const elsewhere = ITEM_CATALOG.find((item) => !allWares(c).some((w) => w.itemId === item.id))!;
    expect(buyWare(c, elsewhere.id)).toBeNull();
  });

  it('buying a relic records it earned', () => {
    const c = stockShop(makeCharacter({ gold: 100000 }), 3, DAY, lowRng);
    const relic = c.shop!.featured!;
    expect(rarityOf(relic)).toBe('relic');
    expect(buyWare(c, relic.itemId)!.character.earnedRelicIds).toContain(relic.itemId);
  });
});

describe('restockShop', () => {
  it('restock doubles its fee and resets next day', () => {
    const c = stockShop(makeCharacter({ gold: 10000 }), 5, DAY, createRng(3));
    const first = restockShop(c, 5, createRng(4))!;
    expect(first.fee).toBe(restockFee(0, 5));
    expect(first.character.gold).toBe(10000 - restockFee(0, 5));
    expect(first.character.shop!.dayKey).toBe(DAY);
    const second = restockShop(first.character, 5, createRng(5))!;
    expect(second.fee).toBe(restockFee(1, 5));
    expect(second.character.shop!.restocks).toBe(2);
    const nextDay = stockShop(second.character, 5, '2026-11-14', createRng(6));
    expect(restockShop(nextDay, 5, createRng(7))!.fee).toBe(restockFee(0, 5));
  });

  it('restock with too little gold does nothing', () => {
    const c = stockShop(makeCharacter({ gold: 0 }), 5, DAY, createRng(3));
    expect(restockShop(c, 5, createRng(4))).toBeNull();
  });

  it('restock with no stock does nothing', () => {
    expect(restockShop(makeCharacter({ gold: 10000 }), 5, createRng(4))).toBeNull();
  });
});
