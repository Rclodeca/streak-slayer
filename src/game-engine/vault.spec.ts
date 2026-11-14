import { describe, expect, it } from 'vitest';
import { GOLD_POUCH, VAULT_PRICES, pouchGold } from './constants/economy';
import { resolvePlayerDeathIfDead } from './combat';
import { ITEM_CATALOG } from './items';
import { createRng } from './rng';
import { stockShop } from './shop';
import type { Character, VaultWare } from './types';
import { buyPouch, buyVaultWare, pouchState, stockVault, vaultWareState, vaultWindowKey } from './vault';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  const starterStats = { physicalDamage: 10, magicDamage: 10, healing: 6, health: 50, trueDamage: 6 };
  return {
    level: 20,
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
const rarityOf = (ware: VaultWare) => ITEM_CATALOG.find((item) => item.id === ware.itemId)!.rarity;
const allWares = (c: Character) => [...(c.vault?.featured ? [c.vault.featured] : []), ...(c.vault?.wares ?? [])];

describe('vaultWindowKey', () => {
  it('groups days in threes', () => {
    expect(vaultWindowKey('2026-01-01')).toBe('2026-01-01');
    expect(vaultWindowKey('2026-01-03')).toBe('2026-01-01');
    expect(vaultWindowKey('2026-01-04')).toBe('2026-01-04');
  });
});

describe('stockVault', () => {
  it('keeps the stock inside a window and redraws in the next', () => {
    const stocked = stockVault(makeCharacter(), '2026-01-01', createRng(1));
    expect(stocked.vault?.windowKey).toBe('2026-01-01');
    expect(stockVault(stocked, '2026-01-03', createRng(2))).toBe(stocked);
    expect(stockVault(stocked, '2026-01-04', createRng(2)).vault?.windowKey).toBe('2026-01-04');
  });

  it('holds an epic or relic on velvet and a rare in the rows, at their gem prices', () => {
    const { vault } = stockVault(makeCharacter(), DAY, createRng(3));
    expect(['epic', 'relic']).toContain(rarityOf(vault!.featured!));
    expect(vault!.wares.map(rarityOf)).toEqual(['rare']);
    for (const ware of [vault!.featured!, ...vault!.wares]) {
      expect(ware.gems).toBe(VAULT_PRICES[rarityOf(ware) as keyof typeof VAULT_PRICES]);
    }
  });

  it('never stocks an owned item or one in the gold shop', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const withShop = stockShop(makeCharacter({ ownedItemIds: ['chaos-blade'] }), 3, DAY, createRng(seed));
      const shopIds = [withShop.shop!.featured, ...withShop.shop!.wares].flatMap((w) => (w ? [w.itemId] : []));
      const ids = allWares(stockVault(withShop, DAY, createRng(seed))).map((w) => w.itemId);
      expect(ids).not.toContain('chaos-blade');
      for (const id of shopIds) expect(ids).not.toContain(id);
    }
  });

  it('stocks no epic or relic at level 1', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { vault } = stockVault(makeCharacter({ level: 1 }), DAY, createRng(seed));
      expect(vault!.featured).toBeNull();
    }
  });
});

describe('buyVaultWare', () => {
  const stocked = () => stockVault(makeCharacter(), DAY, createRng(3));

  it('buys the velvet piece for its gems', () => {
    const character = stocked();
    const ware = character.vault!.featured!;
    expect(vaultWareState(character, ware.gems, ware)).toBe('buy');
    const result = buyVaultWare(character, ware.gems, ware.itemId)!;
    expect(result.gemsSpent).toBe(ware.gems);
    expect(result.character.ownedItemIds).toContain(ware.itemId);
    expect(result.character.vault!.featured!.sold).toBe(true);
  });

  it('short on gems buys nothing', () => {
    const character = stocked();
    const ware = character.vault!.featured!;
    expect(vaultWareState(character, ware.gems - 1, ware)).toBe('short');
    expect(buyVaultWare(character, ware.gems - 1, ware.itemId)).toBeNull();
  });

  it('a sold ware buys nothing', () => {
    const character = stocked();
    const ware = character.vault!.wares[0];
    const { character: after } = buyVaultWare(character, 99, ware.itemId)!;
    expect(vaultWareState(after, 99, after.vault!.wares[0])).toBe('sold');
    expect(buyVaultWare(after, 99, ware.itemId)).toBeNull();
  });

  it('a fallen hero buys nothing', () => {
    const character = { ...stocked(), currentHealth: 0 };
    expect(buyVaultWare(character, 99, character.vault!.wares[0].itemId)).toBeNull();
  });
});

describe('the Gold Pouch', () => {
  it('pays three kills of gold for its gems, once a day', () => {
    const character = makeCharacter({ gold: 50 });
    expect(pouchState(character, GOLD_POUCH.gems, 10, DAY)).toEqual({ gems: 5, gold: 420, status: 'buy' });
    const result = buyPouch(character, GOLD_POUCH.gems, 10, DAY)!;
    expect(pouchGold(10)).toBe(420);
    expect(result).toMatchObject({ gold: 420, gemsSpent: 5 });
    expect(result.character.gold).toBe(470);
    expect(pouchState(result.character, 99, 10, DAY).status).toBe('cooldown');
    expect(buyPouch(result.character, 99, 10, DAY)).toBeNull();
    expect(pouchState(result.character, 99, 10, '2026-11-14').status).toBe('buy');
  });

  it('short on gems buys nothing', () => {
    expect(pouchState(makeCharacter(), 4, 10, DAY).status).toBe('short');
    expect(buyPouch(makeCharacter(), 4, 10, DAY)).toBeNull();
  });

  it('a fallen hero buys nothing', () => {
    expect(buyPouch(makeCharacter({ currentHealth: 0 }), 99, 10, DAY)).toBeNull();
  });
});

describe('a death', () => {
  it('wipes the Vault stock and the pouch mark', () => {
    const fallen = { ...stockVault(makeCharacter(), DAY, createRng(1)), pouchDayKey: DAY, currentHealth: 0 };
    const boss = { index: 3, personality: 'balanced', maxHealth: 100, health: 100, physicalAttack: 20, magicAttack: 20, armor: 10, magicResist: 10, lifestealPct: 0 } as const;
    const { character } = resolvePlayerDeathIfDead(fallen, { ...boss }, [], createRng(1));
    expect(character.vault).toBeUndefined();
    expect(character.pouchDayKey).toBeUndefined();
  });
});
