// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRng, dailyPeriodKey } from '../game-engine';
import { useActivityLogStore } from '../store/activityLogStore';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';
import { useDebugClockStore } from '../store/debugClockStore';
import { useItemDropQueue } from './useItemDropQueue';
import { useMissedSkillsGate } from './useMissedSkillsGate';
import { useRolloverWatch } from './useRolloverWatch';
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

  it('follows a real day change once the rollover watch notices it', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-25T09:50:00Z')); // 2:50am PDT, still the 24th
    try {
      const { shop, characterStore } = stocked();
      const stop = useRolloverWatch();
      expect(shop.todayKey.value).toBe('2026-10-24');
      vi.setSystemTime(new Date('2026-10-25T10:05:00Z')); // 3:05am, the 25th
      vi.advanceTimersByTime(60_000);
      expect(shop.todayKey.value).toBe('2026-10-25');
      shop.ensureStock();
      expect(characterStore.character.shop?.dayKey).toBe('2026-10-25');
      stop();
    } finally {
      useMissedSkillsGate().acknowledge();
      vi.useRealTimers();
    }
  });

  it('stamps a tonic with the real day even before the watch has caught up', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-25T09:50:00Z'));
    try {
      const { shop, characterStore } = stocked();
      expect(shop.todayKey.value).toBe('2026-10-24');
      vi.setSystemTime(new Date('2026-10-25T10:05:00Z'));
      expect(shop.buyTonic('crit')).toBe(true);
      const boost = characterStore.character.statusEffects?.find((e) => e.type === 'critBoost');
      expect(boost?.appliedDayKey).toBe('2026-10-25');
    } finally {
      vi.useRealTimers();
    }
  });

  it('a double tap on Restock restocks once', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T12:00:00Z'));
    try {
      const { shop, characterStore } = stocked(10000);
      const fee = shop.restockPrice.value;
      expect(shop.restock()).toBe(true);
      expect(shop.restock()).toBe(false);
      expect(characterStore.character.gold).toBe(10000 - fee);
      vi.advanceTimersByTime(600);
      expect(shop.restock()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
