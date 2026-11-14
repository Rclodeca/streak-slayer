import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRng, dailyPeriodKey } from '../game-engine';
import { useActivityLogStore } from '../store/activityLogStore';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';
import { useDebugClockStore } from '../store/debugClockStore';
import { useItemDropQueue } from './useItemDropQueue';
import { useShop } from './useShop';

describe('useShop', () => {
  beforeEach(() => setActivePinia(createPinia()));

  // The drop queue is a module-scope singleton, so drain it between tests.
  afterEach(() => {
    const { current, dismiss } = useItemDropQueue();
    while (current.value) dismiss();
  });

  function stocked(gold = 100000) {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 10, gold });
    const shop = useShop();
    shop.ensureStock();
    return { characterStore, shop };
  }

  it('buying an item queues it as bought and logs it', () => {
    const { shop } = stocked();
    const ware = shop.stock.value!.wares[0];
    expect(shop.buy(ware.itemId)).toBe(true);
    const queue = useItemDropQueue();
    expect(queue.current.value?.id).toBe(ware.itemId);
    expect(queue.bought.value).toBe(true);
    expect(useActivityLogStore().entries[0]).toMatchObject({ kind: 'shop-bought', gold: ware.price });
  });

  it('a quick double tap buys once', () => {
    const { characterStore, shop } = stocked(100000);
    const ware = shop.stock.value!.wares[0];
    expect(shop.buy(ware.itemId)).toBe(true);
    expect(shop.buy(ware.itemId)).toBe(false);
    expect(characterStore.character.gold).toBe(100000 - ware.price);
    expect(useActivityLogStore().entries.filter((e) => e.kind === 'shop-bought')).toHaveLength(1);
  });

  it('a tonic is used at once and logged', () => {
    const { characterStore, shop } = stocked();
    expect(shop.buyTonic('crit')).toBe(true);
    expect(characterStore.character.statusEffects?.some((e) => e.type === 'critBoost')).toBe(true);
    expect(shop.tonic('crit').status).toBe('active');
    expect(useActivityLogStore().entries[0]).toMatchObject({ kind: 'shop-bought', name: 'Hawk Tonic' });
  });

  it('restock charges its fee and logs it', () => {
    const { characterStore, shop } = stocked(10000);
    const fee = shop.restockPrice.value;
    expect(shop.restock()).toBe(true);
    expect(characterStore.character.gold).toBe(10000 - fee);
    expect(useActivityLogStore().entries[0]).toMatchObject({ kind: 'shop-restocked', gold: fee });
  });

  it('a fresh run gets a fresh stock the same day', () => {
    const { characterStore, shop } = stocked();
    characterStore.setCharacter({ ...characterStore.character, currentHealth: 0 });
    characterStore.resolvePlayerDeathIfDead(useBossStore().boss, [], createRng(1));
    expect(characterStore.character.shop).toBeUndefined();
    shop.ensureStock();
    expect(shop.stock.value?.dayKey).toBe(dailyPeriodKey(useDebugClockStore().now()));
  });
});
