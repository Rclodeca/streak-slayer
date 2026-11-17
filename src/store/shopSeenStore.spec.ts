// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, useShopSeenStore } from './shopSeenStore';

describe('shopSeenStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('a brand-new player has seen nothing, and that sticks', () => {
    useShopSeenStore().settle(false);
    expect(useShopSeenStore().seen).toEqual({ itemsDay: '', servicesStart: '', looks: false });

    // Reloading once they've added habits doesn't count them as an old player.
    setActivePinia(createPinia());
    useShopSeenStore().settle(true);
    expect(useShopSeenStore().seen.looks).toBe(false);
  });

  it('a player who had habits before the dots existed has already seen Looks', () => {
    useShopSeenStore().settle(true);
    expect(useShopSeenStore().seen).toEqual({ itemsDay: '', servicesStart: '', looks: true });
  });

  it('keeps what was seen across a reload', () => {
    const store = useShopSeenStore();
    store.seeItems('2026-11-16');
    store.seeServices('2026-11-14');
    store.seeLooks();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ itemsDay: '2026-11-16', servicesStart: '2026-11-14', looks: true });

    setActivePinia(createPinia());
    expect(useShopSeenStore().seen).toEqual({ itemsDay: '2026-11-16', servicesStart: '2026-11-14', looks: true });
  });
});
