// @vitest-environment jsdom

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useItemDropQueue } from '../../composables/useItemDropQueue';
import { addDaysToDayKey, applyCritBoostEvent, dailyPeriodKey, ITEM_CATALOG, maxEquipSlots } from '../../game-engine';
import { useCharacterStore } from '../../store/characterStore';
import { useDebugClockStore } from '../../store/debugClockStore';
import ShopSection from './ShopSection.vue';

enableAutoUnmount(afterEach);

describe('ShopSection', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    const { current, dismiss } = useItemDropQueue();
    while (current.value) dismiss();
  });

  const stubPhone = () => vi.stubGlobal('matchMedia', (media: string) => ({ matches: true, media, addEventListener() {}, removeEventListener() {} }));

  function hero(gold: number, extra = {}) {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 10, gold, ...extra });
    return characterStore;
  }

  describe('on a phone', () => {
    beforeEach(stubPhone);

    it('the Shop opens on the featured piece, then wares, then tonics', () => {
      hero(1000);
      const wrapper = mount(ShopSection);
      const html = wrapper.html();
      expect(wrapper.find('.shop-featured').exists()).toBe(true);
      const order = ['shop-featured', 'Wares', 'Tonics', 'shop-restock'].map((mark) => html.indexOf(mark));
      expect(order.every((at) => at >= 0)).toBe(true);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
    });

    it('tapping Buy buys the ware and marks it Sold', async () => {
      const characterStore = hero(100000);
      const wrapper = mount(ShopSection);
      const price = characterStore.character.shop!.wares[0].price;
      const row = () => wrapper.findAll('.shop-ware-row.item')[0];
      await row().find('.shop-buy').trigger('click');
      expect(characterStore.character.gold).toBe(100000 - price);
      expect(row().find('.shop-buy').text()).toBe('Sold');
    });

    it('too little gold disables Buy', () => {
      hero(0);
      const wrapper = mount(ShopSection);
      const buttons = wrapper.findAll('.shop-buy');
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of buttons) expect(button.attributes('disabled')).toBeDefined();
    });

    it('full slots warn before buying', () => {
      const gear = ITEM_CATALOG.filter((item) => item.type === 'equipment').slice(0, 4).map((item) => item.id);
      const characterStore = hero(100000, { ownedItemIds: gear, equippedItemIds: gear });
      expect(gear.length).toBe(maxEquipSlots(characterStore.character));
      const wrapper = mount(ShopSection);
      for (const row of wrapper.findAll('.shop-ware-row.item')) expect(row.text()).toContain('Swaps one out');
      for (const row of wrapper.findAll('.shop-ware-row.tonic')) expect(row.text()).not.toContain('Swaps one out');
    });

    it('an active boost shows days left', () => {
      const today = dailyPeriodKey(useDebugClockStore().now());
      const characterStore = hero(100000);
      characterStore.setCharacter(applyCritBoostEvent(characterStore.character, today));
      const wrapper = mount(ShopSection);
      const hawk = wrapper.findAll('.shop-ware-row.tonic').find((row) => row.text().includes('Hawk Tonic'))!;
      expect(hawk.find('.shop-buy').text()).toBe('3d left');
      expect(hawk.find('.shop-buy').attributes('disabled')).toBeDefined();
    });

    it('the Vault side shows the shut vault', async () => {
      hero(1000);
      const wrapper = mount(ShopSection);
      await wrapper.find('.side-vault').trigger('click');
      expect(wrapper.text()).toContain('The vault is shut.');
      expect(wrapper.find('.shop-ware-row').exists()).toBe(false);
    });

    it('a day change redraws the stock', async () => {
      const characterStore = hero(1000);
      mount(ShopSection);
      const clock = useDebugClockStore();
      const today = dailyPeriodKey(clock.now());
      expect(characterStore.character.shop?.dayKey).toBe(today);
      clock.skipToNextDay();
      await flushPromises();
      expect(characterStore.character.shop?.dayKey).toBe(addDaysToDayKey(today, 1));
    });
  });

  it('desktop shows an Open shop button that opens the modal', async () => {
    hero(1000);
    const wrapper = mount(ShopSection, { attachTo: document.body });
    expect(wrapper.find('.shop-featured').exists()).toBe(false);
    await wrapper.find('.open-shop').trigger('click');
    await flushPromises();
    expect(document.querySelector('.shop-scene')).not.toBeNull();
    expect(document.querySelector('.shop-featured')).not.toBeNull();
  });

  it('on desktop, buying an item closes the shop so its popup is on top', async () => {
    hero(100000);
    const wrapper = mount(ShopSection, { attachTo: document.body });
    await wrapper.find('.open-shop').trigger('click');
    await flushPromises();
    document.querySelector<HTMLButtonElement>('.shop-ware-row.item .shop-buy')!.click();
    await flushPromises();
    expect(useItemDropQueue().current.value).not.toBeNull();
    expect(document.querySelector('.shop-scene')).toBeNull();
  });
});
