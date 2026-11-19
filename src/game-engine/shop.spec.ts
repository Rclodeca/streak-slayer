import { describe, expect, it } from 'vitest';
import { GEM_WARE_PRICES, restockFee, tonicPrice, warePrice } from './constants/economy';
import { resolvePlayerDeathIfDead } from './combat';
import { activeExpBoost, applyExpBoost, effectiveStat } from './leveling';
import { characterGold } from './gold';
import { addDaysToDayKey } from './time';
import { ITEM_CATALOG, dropRarityShares } from './items';
import { createRng } from './rng';
import { TONIC_DEFS, buyTonic, buyWare, headlineFloor, restockShop, shopRarityShares, stockShop, tonicEffect, tonicState, wareState } from './shop';
import { TUNING } from './constants/tuning';
import { formatCompact } from './format';
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

const RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, relic: 4 } as const;
/** Rolls an epic, turns it relic, then picks the last item: a relic headline. */
const relicRng = () => {
  let i = 0;
  const values = [0.99, 0.05];
  return () => values[i++ % 2];
};
const stocks = (level: number, count = 40) => Array.from({ length: count }, (_, seed) => stockShop(makeCharacter({ level }), 3, DAY, createRng(seed + 1)).shop!);

describe('stockShop', () => {
  it('stockShop draws once a day', () => {
    const stocked = stockShop(makeCharacter(), 3, DAY, createRng(1));
    expect(stocked.shop?.dayKey).toBe(DAY);
    expect(stockShop(stocked, 3, DAY, createRng(2))).toBe(stocked);
    const next = stockShop(stocked, 3, '2026-11-14', createRng(2));
    expect(next.shop?.dayKey).toBe('2026-11-14');
    expect(next.shop?.restocks).toBe(0);
  });

  it('holds seven items, the best of them the headline, in gold', () => {
    for (const shop of stocks(10)) {
      expect(shop.wares).toHaveLength(6);
      expect(shop.featured!.currency).toBeUndefined();
      for (const ware of shop.wares) expect(RANK[rarityOf(ware)]).toBeLessThanOrEqual(RANK[rarityOf(shop.featured!)]);
    }
  });

  it('the headline is at least uncommon below level 14, and at least rare from level 14', () => {
    for (const shop of stocks(1)) expect(RANK[rarityOf(shop.featured!)]).toBeGreaterThanOrEqual(RANK.uncommon);
    for (const shop of stocks(14)) expect(RANK[rarityOf(shop.featured!)]).toBeGreaterThanOrEqual(RANK.rare);
    expect(headlineFloor(13)).toBe('uncommon');
    expect(headlineFloor(14)).toBe('rare');
  });

  it("others of a rare-or-better headline's rarity cost gems, at most two, ahead of the gold rows", () => {
    let gemDays = 0;
    for (const shop of stocks(30)) {
      const headline = rarityOf(shop.featured!);
      const gems = shop.wares.filter((w) => w.currency === 'gems');
      expect(gems.length).toBeLessThanOrEqual(2);
      expect(shop.wares.slice(0, gems.length)).toEqual(gems);
      for (const ware of gems) {
        expect(rarityOf(ware)).toBe(headline);
        expect(ware.price).toBe(GEM_WARE_PRICES[headline as keyof typeof GEM_WARE_PRICES]);
      }
      for (const ware of shop.wares.filter((w) => w.currency !== 'gems')) expect(rarityOf(ware)).not.toBe(headline);
      if (gems.length > 0) gemDays++;
    }
    expect(gemDays).toBeGreaterThan(0);
  });

  it('an uncommon headline sells nothing for gems', () => {
    const plain = stocks(1).filter((shop) => rarityOf(shop.featured!) === 'uncommon');
    expect(plain.length).toBeGreaterThan(0);
    for (const shop of plain) expect(shop.wares.some((w) => w.currency === 'gems')).toBe(false);
  });

  it('the shop table is kinder than the drop table early, and the same from level 14', () => {
    expect(shopRarityShares(1).rare).toBeGreaterThan(dropRarityShares(1).rare);
    expect(shopRarityShares(1).epic).toBeGreaterThan(0);
    expect(shopRarityShares(14)).toEqual(dropRarityShares(14));
    expect(shopRarityShares(25)).toEqual(dropRarityShares(25));
  });

  it('stock never offers an owned item', () => {
    const owned = ITEM_CATALOG.filter((item) => item.rarity !== 'relic').slice(0, 60).map((item) => item.id);
    for (let seed = 1; seed <= 10; seed++) {
      const stocked = stockShop(makeCharacter({ ownedItemIds: owned }), 3, DAY, createRng(seed));
      for (const ware of allWares(stocked)) expect(owned).not.toContain(ware.itemId);
    }
  });

  it('offers no relic already earned this run', () => {
    const earned = ITEM_CATALOG.filter((item) => item.rarity === 'relic').map((item) => item.id);
    const stocked = stockShop(makeCharacter({ earnedRelicIds: earned }), 3, DAY, relicRng());
    expect(allWares(stocked).some((ware) => rarityOf(ware) === 'relic')).toBe(false);
  });

  it('gold prices lock at draw time (a hero with no prestige on the save pays rank 0)', () => {
    const stocked = stockShop(makeCharacter(), 3, DAY, createRng(4));
    for (const ware of allWares(stocked).filter((w) => w.currency !== 'gems')) expect(ware.price).toBe(warePrice(rarityOf(ware), 3, 0));
  });

  it("gold prices follow the hero's prestige rank", () => {
    const stocked = stockShop(makeCharacter({ prestige: 2 }), 3, DAY, createRng(4));
    for (const ware of allWares(stocked).filter((w) => w.currency !== 'gems')) expect(ware.price).toBe(warePrice(rarityOf(ware), 3, 2));
  });
});

describe('buyWare', () => {
  const stocked = (gold: number) => stockShop(makeCharacter({ gold }), 3, DAY, createRng(7));
  const gemStock = () => stocks(30).find((shop) => shop.wares[0]?.currency === 'gems')!;

  it('buyWare takes the gold and hands over the item', () => {
    const c = stocked(100000);
    const featured = c.shop!.featured!;
    const result = buyWare(c, featured.itemId, 0)!;
    expect(result.item.id).toBe(featured.itemId);
    expect(result.gemsSpent).toBe(0);
    expect(result.character.gold).toBe(100000 - featured.price);
    expect(result.character.ownedItemIds).toContain(featured.itemId);
    expect(result.character.shop!.featured!.sold).toBe(true);
    expect(wareState(result.character, result.character.shop!.featured!, 0)).toBe('sold');
  });

  it('a gem ware takes no gold and reports its gems', () => {
    const c = { ...makeCharacter({ level: 30, gold: 50 }), shop: gemStock() };
    const ware = c.shop.wares[0];
    expect(wareState(c, ware, ware.price - 1)).toBe('short');
    expect(buyWare(c, ware.itemId, ware.price - 1)).toBeNull();
    const result = buyWare(c, ware.itemId, ware.price)!;
    expect(result.gemsSpent).toBe(ware.price);
    expect(result.character.gold).toBe(50);
  });

  it('buyWare twice buys once', () => {
    const c = stocked(100000);
    const ware = c.shop!.wares.find((w) => w.currency !== 'gems')!;
    const once = buyWare(c, ware.itemId, 0)!.character;
    expect(buyWare(once, ware.itemId, 0)).toBeNull();
    expect(once.gold).toBe(100000 - ware.price);
  });

  it('short on gold buys nothing', () => {
    const c = stocked(0);
    expect(wareState(c, c.shop!.featured!, 0)).toBe('short');
    expect(buyWare(c, c.shop!.wares[0].itemId, 0)).toBeNull();
  });

  it('a stocked item that dropped meanwhile reads owned', () => {
    const c = stocked(100000);
    const ware = c.shop!.wares[0];
    const dropped = { ...c, ownedItemIds: [ware.itemId] };
    expect(wareState(dropped, ware, 0)).toBe('owned');
    expect(buyWare(dropped, ware.itemId, 0)).toBeNull();
  });

  it('an item not in stock is not for sale', () => {
    const c = stocked(100000);
    const elsewhere = ITEM_CATALOG.find((item) => !allWares(c).some((w) => w.itemId === item.id))!;
    expect(buyWare(c, elsewhere.id, 0)).toBeNull();
  });

  it('buying a relic records it earned', () => {
    const c = stockShop(makeCharacter({ gold: 100000 }), 3, DAY, relicRng());
    const relic = c.shop!.featured!;
    expect(rarityOf(relic)).toBe('relic');
    expect(buyWare(c, relic.itemId, 0)!.character.earnedRelicIds).toContain(relic.itemId);
  });
});

describe('restockShop', () => {
  it('restock doubles its fee and resets next day', () => {
    const c = stockShop(makeCharacter({ gold: 10000 }), 5, DAY, createRng(3));
    const first = restockShop(c, 5, createRng(4))!;
    expect(first.fee).toBe(restockFee(0, 5, 0));
    expect(first.character.gold).toBe(10000 - restockFee(0, 5, 0));
    expect(first.character.shop!.dayKey).toBe(DAY);
    const second = restockShop(first.character, 5, createRng(5))!;
    expect(second.fee).toBe(restockFee(1, 5, 0));
    expect(second.character.shop!.restocks).toBe(2);
    const nextDay = stockShop(second.character, 5, '2026-11-14', createRng(6));
    expect(restockShop(nextDay, 5, createRng(7))!.fee).toBe(restockFee(0, 5, 0));
  });

  it('restock with too little gold does nothing', () => {
    const c = stockShop(makeCharacter({ gold: 0 }), 5, DAY, createRng(3));
    expect(restockShop(c, 5, createRng(4))).toBeNull();
  });

  it('restock with no stock does nothing', () => {
    expect(restockShop(makeCharacter({ gold: 10000 }), 5, createRng(4))).toBeNull();
  });
});

describe('potions', () => {
  // DAY's 3-day window runs 2026-11-12 to 2026-11-14.
  const hurt = (gold = 1000) => {
    const c = stockShop(makeCharacter({ gold }), 4, DAY, createRng(3));
    return { ...c, currentHealth: effectiveStat(c, 'health') / 2 };
  };

  it('the Health Potion heals 25%, then is out of stock until the window turns', () => {
    const c = hurt();
    const max = effectiveStat(c, 'health');
    const drunk = buyTonic(c, 'draught', 4, DAY, 0)!;
    expect(drunk.character.currentHealth).toBeCloseTo(c.currentHealth + max * 0.25, 6);
    expect(drunk.healed).toBeCloseTo(max * 0.25, 6);
    expect(drunk.character.gold).toBe(1000 - tonicPrice(4, 0));
    expect(tonicState(drunk.character, 'draught', 4, DAY, 0).status).toBe('out');
    expect(buyTonic(drunk.character, 'draught', 4, DAY, 0)).toBeNull();
    expect(tonicState(drunk.character, 'draught', 4, '2026-11-14', 0).status).toBe('out');
    expect(tonicState(drunk.character, 'draught', 4, '2026-11-15', 0).status).toBe('buy');
  });

  it("the day's redraw keeps the potions bought, a restock puts them back", () => {
    const drunk = buyTonic(hurt(10000), 'draught', 4, DAY, 0)!.character;
    const nextDay = stockShop(drunk, 4, '2026-11-14', createRng(5));
    expect(tonicState(nextDay, 'draught', 4, '2026-11-14', 0).status).toBe('out');
    const restocked = restockShop(nextDay, 4, createRng(6))!.character;
    expect(tonicState(restocked, 'draught', 4, '2026-11-14', 0).status).toBe('buy');
  });

  it('no Health Potion at full health', () => {
    const base = stockShop(makeCharacter({ gold: 1000 }), 4, DAY, createRng(3));
    const c = { ...base, currentHealth: effectiveStat(base, 'health') };
    expect(tonicState(c, 'draught', 4, DAY, 0).status).toBe('full');
    expect(buyTonic(c, 'draught', 4, DAY, 0)).toBeNull();
  });

  it('a boost still running holds its potion back after a restock', () => {
    const c = buyTonic(hurt(10000), 'crit', 4, DAY, 0)!.character;
    expect(tonicState(c, 'crit', 4, DAY, 0).status).toBe('out');
    const restocked = restockShop(c, 4, createRng(6))!.character;
    expect(tonicState(restocked, 'crit', 4, DAY, 0)).toMatchObject({ status: 'active', daysLeft: 3 });
    expect(buyTonic(restocked, 'crit', 4, DAY, 0)).toBeNull();
    expect(tonicState(restocked, 'heal', 4, DAY, 0).status).toBe('buy');
  });

  it('the EXP Potion grants the EXP boost', () => {
    const c = buyTonic(hurt(), 'exp', 4, DAY, 99)!.character;
    expect(activeExpBoost(c, DAY)).toBeDefined();
  });

  it('short on gold buys no potion', () => {
    const c = hurt(0);
    expect(tonicState(c, 'heal', 4, DAY, 0).status).toBe('short');
    expect(buyTonic(c, 'heal', 4, DAY, 0)).toBeNull();
  });

  it('no stock, no potion', () => {
    expect(buyTonic(makeCharacter({ gold: 1000 }), 'exp', 4, DAY, 99)).toBeNull();
  });

  it('a death keeps the potions bought', () => {
    const drunk = buyTonic(hurt(), 'exp', 4, DAY, 99)!.character;
    const boss = { index: 1, personality: 'balanced', maxHealth: 100, health: 100, physicalAttack: 20, magicAttack: 20, armor: 10, magicResist: 10, lifestealPct: 0 } as const;
    expect(resolvePlayerDeathIfDead({ ...drunk, currentHealth: 0 }, { ...boss }, createRng(1)).character.shop).toEqual(drunk.shop);
  });
});

describe('EXP potions for gems', () => {
  const c = stockShop(makeCharacter({ gold: 1000 }), 4, DAY, createRng(3));

  it('the EXP Potion costs 5 gems and leaves gold alone', () => {
    expect(tonicState(c, 'exp', 4, DAY, 5)).toMatchObject({ price: 5, currency: 'gems', status: 'buy' });
    const bought = buyTonic(c, 'exp', 4, DAY, 5)!;
    expect(bought.gemsSpent).toBe(5);
    expect(characterGold(bought.character)).toBe(characterGold(c));
    expect(activeExpBoost(bought.character, DAY)).toMatchObject({ bonus: 0.25, durationDays: 3 });
  });

  it('Double EXP costs 25 gems for +100% EXP over 3 days', () => {
    expect(tonicState(c, 'double-exp', 4, DAY, 24).status).toBe('short');
    expect(buyTonic(c, 'double-exp', 4, DAY, 24)).toBeNull();
    const bought = buyTonic(c, 'double-exp', 4, DAY, 25)!;
    expect(bought.gemsSpent).toBe(25);
    expect(activeExpBoost(bought.character, DAY)).toMatchObject({ bonus: 1, durationDays: 3 });
  });

  it('buying one EXP potion replaces the other', () => {
    const single = buyTonic(c, 'exp', 4, DAY, 99)!.character;
    expect(tonicState(single, 'double-exp', 4, DAY, 99).status).toBe('buy');
    const doubled = buyTonic(single, 'double-exp', 4, DAY, 99)!.character;
    expect(doubled.statusEffects!.filter((e) => e.type === 'expBoost')).toHaveLength(1);
    expect(activeExpBoost(doubled, DAY)!.bonus).toBe(1);
  });

  it('an old gold EXP Potion runs out as it was', () => {
    const old = applyExpBoost(c, addDaysToDayKey(DAY, -1)); // bought yesterday, under the old gold price
    expect(tonicState(old, 'exp', 4, DAY, 0)).toMatchObject({ status: 'active', daysLeft: 2 });
    expect(tonicState(old, 'double-exp', 4, DAY, 25).status).toBe('buy');
  });

  it('crit and mending stay on gold', () => {
    expect(tonicState(c, 'crit', 4, DAY, 0)).toMatchObject({ currency: 'gold', price: tonicPrice(4, 0) });
    expect(tonicState({ ...c, prestige: 3 }, 'crit', 4, DAY, 0).price).toBe(tonicPrice(4, 3));
    expect(buyTonic(c, 'heal', 4, DAY, 0)!.gemsSpent).toBe(0);
  });
});

describe('a fallen hero', () => {
  // A reload can leave the death screen down with the hero at 0 HP.
  const fallen = () => ({ ...stockShop(makeCharacter({ gold: 100000 }), 3, DAY, createRng(7)), currentHealth: 0 });

  it('buys no draught, ware or restock', () => {
    const c = fallen();
    expect(buyTonic(c, 'draught', 3, DAY, 0)).toBeNull();
    expect(buyTonic(c, 'crit', 3, DAY, 0)).toBeNull();
    expect(buyWare(c, c.shop!.wares[0].itemId, 0)).toBeNull();
    expect(restockShop(c, 3, createRng(1))).toBeNull();
  });
});

describe('tonicEffect', () => {
  it('the Health Potion names its heal in HP', () => {
    const hero = makeCharacter();
    const heal = (effectiveStat(hero, 'health') * TUNING.DRAUGHT_HEAL_PCT) / 100;
    expect(tonicEffect(hero, 'draught')).toBe(`Heal ${formatCompact(heal)} HP.`);
  });

  it('still names it at full health', () => {
    const hero = makeCharacter();
    expect(tonicEffect({ ...hero, currentHealth: effectiveStat(hero, 'health') }, 'draught')).toMatch(/^Heal \d[\d.]*K? HP\.$/);
  });

  it('other potions keep their line', () => {
    expect(tonicEffect(makeCharacter(), 'crit')).toBe(TONIC_DEFS.find((d) => d.id === 'crit')!.effect);
  });
});
