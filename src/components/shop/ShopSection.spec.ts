// @vitest-environment jsdom

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useItemDropQueue } from '../../composables/useItemDropQueue';
import { SKIN_CATALOG, addDaysToDayKey, applyCritBoostEffect, createCharacter, createHabit, createRng, dailyPeriodKey, heroArt, GOLD_POUCH, ITEM_CATALOG, maxEquipSlots, pouchGold } from '../../game-engine';
import { useAccountStore } from '../../store/accountStore';
import { useBossStore } from '../../store/bossStore';
import { useCharacterStore } from '../../store/characterStore';
import { useDebugClockStore } from '../../store/debugClockStore';
import { useHabitStore } from '../../store/habitStore';
import ShopSection from './ShopSection.vue';

enableAutoUnmount(afterEach);

describe('ShopSection', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    useCharacterStore().setCharacter(createCharacter(createRng(1), 'warrior'));
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

    const goldRows = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('.shop-ware-row.item').filter((row) => row.find('.price').attributes('aria-label')?.endsWith('gold'));
    const itemRow = (wrapper: ReturnType<typeof mount>, itemId: string) => {
      const name = ITEM_CATALOG.find((item) => item.id === itemId)!.name;
      return wrapper.findAll('.shop-ware-row.item').find((row) => row.find('.shop-name').text() === name)!;
    };

    it('dots the sides with something new, and clears each one once it is shown', async () => {
      hero(1000);
      const wrapper = mount(ShopSection);
      const dotted = () => wrapper.findAll('.shop-side').filter((side) => side.find('.side-new').exists()).map((side) => side.text());
      // Items is showing, so it is already seen; Services and Looks wait.
      expect(dotted()).toEqual(['Services', 'Looks']);

      await wrapper.findAll('.shop-side')[1]!.trigger('click');
      expect(dotted()).toEqual(['Looks']);
      await wrapper.findAll('.shop-side')[2]!.trigger('click');
      expect(dotted()).toEqual([]);

      // A day on: Items is new again (Services keeps its turn for three days); Looks never comes back.
      useDebugClockStore().skipToNextDay();
      await wrapper.vm.$nextTick();
      expect(dotted()).toEqual(['Items']);
      await wrapper.findAll('.shop-side')[0]!.trigger('click');
      expect(dotted()).toEqual([]);
    });

    it('opens on Items: the featured piece, then wares, potions and the restock', () => {
      hero(1000);
      const wrapper = mount(ShopSection);
      expect(wrapper.findAll('.shop-side').map((side) => side.text())).toEqual(['Items', 'Services', 'Looks']);
      const html = wrapper.html();
      expect(wrapper.find('.shop-featured').exists()).toBe(true);
      const order = ['shop-featured', 'Wares', 'Potions', 'shop-restock'].map((mark) => html.indexOf(mark));
      expect(order.every((at) => at >= 0)).toBe(true);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
    });

    /** Today's stock set by hand: a rare headline in gold, another rare in gems, and a common in gold. */
    function gemDay(characterStore: ReturnType<typeof hero>) {
      const [headline, gem] = ITEM_CATALOG.filter((item) => item.rarity === 'rare');
      const common = ITEM_CATALOG.find((item) => item.rarity === 'common')!;
      const dayKey = dailyPeriodKey(useDebugClockStore().now());
      characterStore.setCharacter({
        ...characterStore.character,
        shop: { dayKey, restocks: 0, featured: { itemId: headline.id, price: 500 }, wares: [{ itemId: gem.id, price: 5, currency: 'gems' }, { itemId: common.id, price: 80 }] },
      });
      return { headline, gem, common };
    }

    it('the headline is in gold, and a gem ware sits right under it', () => {
      const characterStore = hero(1000);
      const { gem, common } = gemDay(characterStore);
      const wrapper = mount(ShopSection);
      expect(wrapper.find('.shop-featured .price').attributes('aria-label')).toBe('500 gold');
      expect(itemRow(wrapper, gem.id).find('.price').attributes('aria-label')).toBe('5 gems');
      expect(itemRow(wrapper, common.id).find('.price').attributes('aria-label')).toBe('80 gold');
      expect(wrapper.findAll('.shop-ware-row.item')[0].find('.shop-name').text()).toBe(gem.name);
    });

    it('tapping Buy buys the ware and marks it Out of stock', async () => {
      const characterStore = hero(100000);
      const wrapper = mount(ShopSection);
      const ware = characterStore.character.shop!.wares.find((w) => w.currency !== 'gems')!;
      await itemRow(wrapper, ware.itemId).find('.shop-buy').trigger('click');
      expect(characterStore.character.gold).toBe(100000);
      useItemDropQueue().accept();
      await flushPromises();
      expect(characterStore.character.gold).toBe(100000 - ware.price);
      expect(itemRow(wrapper, ware.itemId).find('.shop-buy').text()).toBe('Out of stock');
    });

    it('too little gold disables Buy', () => {
      hero(0);
      useAccountStore().account.gems = 0;
      const wrapper = mount(ShopSection);
      const buttons = wrapper.findAll('.shop-buy');
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of buttons) expect(button.attributes('disabled')).toBeDefined();
    });

    it('with full slots, Buy offers the swap and charges nothing yet', async () => {
      const gear = ITEM_CATALOG.filter((item) => item.type === 'equipment').slice(0, 4).map((item) => item.id);
      const characterStore = hero(100000, { ownedItemIds: gear, equippedItemIds: gear });
      expect(gear.length).toBe(maxEquipSlots(characterStore.character));
      const wrapper = mount(ShopSection);
      expect(wrapper.text()).not.toContain('Swaps one out');
      expect(wrapper.text()).not.toContain('Gone when you fall');
      await goldRows(wrapper)[0].find('.shop-buy').trigger('click');
      expect(useItemDropQueue().offer.value).not.toBeNull();
      expect(characterStore.character.gold).toBe(100000);
    });

    it('the EXP potions are priced in gems', () => {
      hero(100000);
      const wrapper = mount(ShopSection);
      const priceOf = (name: string) => wrapper.findAll('.shop-ware-row.tonic').find((row) => row.text().includes(name))!.find('.price').attributes('aria-label');
      expect(priceOf('EXP Potion')).toBe('5 gems');
      expect(priceOf('Double EXP')).toBe('25 gems');
    });

    it('an active boost shows days left', () => {
      const today = dailyPeriodKey(useDebugClockStore().now());
      const characterStore = hero(100000);
      characterStore.setCharacter(applyCritBoostEffect(characterStore.character, today));
      const wrapper = mount(ShopSection);
      const hawk = wrapper.findAll('.shop-ware-row.tonic').find((row) => row.text().includes('Crit Potion'))!;
      expect(hawk.find('.shop-buy').text()).toBe('3d left');
      expect(hawk.find('.shop-buy').attributes('disabled')).toBeDefined();
    });

    it('a bought potion reads Out of stock, and the restock key at the foot puts it back', async () => {
      const characterStore = hero(100000, { currentHealth: 1 });
      const wrapper = mount(ShopSection);
      const potion = () => wrapper.findAll('.shop-ware-row.tonic').find((row) => row.text().includes('Health Potion'))!;
      await potion().find('.shop-buy').trigger('click');
      expect(potion().find('.shop-buy').text()).toBe('Out of stock');
      expect(wrapper.find('.shop-restock .shop-note').text()).toBe('New stock every day.');
      const gold = characterStore.character.gold!;
      await wrapper.find('.shop-restock-key').trigger('click');
      expect(characterStore.character.gold).toBeLessThan(gold);
      expect(potion().find('.shop-buy').attributes('disabled')).toBeUndefined();
    });

    it('a gem ware bought with gems is marked Out of stock', async () => {
      const characterStore = hero(0);
      const { gem } = gemDay(characterStore);
      useAccountStore().account.gems = 999;
      const wrapper = mount(ShopSection);
      await itemRow(wrapper, gem.id).find('.shop-buy').trigger('click');
      useItemDropQueue().accept();
      await flushPromises();
      expect(useAccountStore().account.gems).toBe(999 - 5);
      expect(characterStore.character.gold).toBe(0);
      expect(itemRow(wrapper, gem.id).find('.shop-buy').text()).toBe('Out of stock');
    });

    describe('services', () => {
      const services = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('.shop-ware-row.service');
      const rowFor = (wrapper: ReturnType<typeof mount>, name: string) => services(wrapper).find((row) => row.find('.shop-name').text() === name)!;
      const card = (wrapper: ReturnType<typeof mount>) => wrapper.find('.service-turn');
      const today = () => dailyPeriodKey(useDebugClockStore().now());
      const onTurn = (id: 'slot' | 'overdrive' | 'reroll' | 'enchant', daysAgo = 0) => ({ serviceTurn: { id, startDayKey: addDaysToDayKey(today(), -daysAgo) } });
      const open = async () => {
        const wrapper = mount(ShopSection, { attachTo: document.body });
        await wrapper.find('.side-services').trigger('click');
        return wrapper;
      };

      it("a new run's first turn is Item slots on its card, the streak freeze and the Gold Pouch below", async () => {
        useHabitStore().setHabits([createHabit('Read', 'daily', 'easy', false, createRng(3))]);
        const characterStore = hero(100000);
        const wrapper = await open();
        expect(card(wrapper).find('.shop-name').text()).toBe('Item slots');
        expect(card(wrapper).find('.shop-text').text()).toBe('Increase item slots by one.');
        expect(card(wrapper).find('.service-change').text()).toBe('4 → 5 slots');
        expect(card(wrapper).find('.ribbon').text()).toBe('3d left');
        expect(card(wrapper).find('.service-scene').attributes('src')).toMatch(/sprites\/services\/slot-scene\.png$/);
        expect(card(wrapper).find('.service-next').text()).toContain('Overdrive');
        expect(characterStore.character.serviceTurn).toEqual({ id: 'slot', startDayKey: today() });
        expect(services(wrapper).map((row) => row.find('.shop-name').text())).toEqual(['Streak Freeze', 'Gold Pouch']);
        expect(rowFor(wrapper, 'Streak Freeze').find('.price').attributes('aria-label')).toMatch(/gems$/);
      });

      it('after 3 days the next one takes the card', async () => {
        useHabitStore().setHabits([createHabit('Read', 'daily', 'easy', false, createRng(3))]);
        const characterStore = hero(100000, onTurn('slot', 3));
        const wrapper = await open();
        expect(card(wrapper).find('.shop-name').text()).toBe('Overdrive');
        expect(card(wrapper).find('.ribbon').text()).toBe('3d left');
        expect(characterStore.character.serviceTurn).toEqual({ id: 'overdrive', startDayKey: today() });
      });

      it('reads what stands in the way', async () => {
        useHabitStore().setHabits([]);
        hero(100000, onTurn('enchant'));
        const wrapper = await open();
        expect(card(wrapper).find('.shop-buy').text()).toBe('Nothing worn');
        expect(card(wrapper).find('.shop-buy').attributes('disabled')).toBeDefined();
      });

      it('short on gold is disabled and slots at 8 read Full', async () => {
        hero(0, onTurn('slot'));
        const wrapper = await open();
        expect(card(wrapper).find('.shop-buy').attributes('disabled')).toBeDefined();
        wrapper.unmount();
        hero(100000, { slotUpgrades: 4, ...onTurn('slot') });
        const full = await open();
        expect(card(full).find('.shop-buy').text()).toBe('Full');
        expect(card(full).find('.service-change').exists()).toBe(false);
      });

      it('Item slots buys one slot in one tap', async () => {
        useHabitStore().setHabits([]);
        const characterStore = hero(100000, onTurn('slot'));
        const wrapper = await open();
        await card(wrapper).find('.shop-buy').trigger('click');
        expect(maxEquipSlots(characterStore.character)).toBe(5);
      });

      it('Reroll opens the picker instead of buying', async () => {
        useHabitStore().setHabits([createHabit('Read', 'daily', 'easy', false, createRng(3))]);
        const characterStore = hero(100000, onTurn('reroll'));
        const wrapper = await open();
        await card(wrapper).find('.shop-buy').trigger('click');
        await flushPromises();
        expect(characterStore.character.gold).toBe(100000);
        expect(document.querySelector('.reroll-row')).not.toBeNull();
        wrapper.unmount();
      });

      it("the Gold Pouch adds gold and takes the pouch's gems", async () => {
        const characterStore = hero(100);
        useAccountStore().account.gems = GOLD_POUCH.gems + 2;
        const wrapper = await open();
        await rowFor(wrapper, 'Gold Pouch').find('.shop-buy').trigger('click');
        expect(characterStore.character.gold).toBe(100 + pouchGold(useBossStore().boss.index, 0));
        expect(useAccountStore().account.gems).toBe(2);
      });
    });

    describe('the Vault', () => {
      const warrior = SKIN_CATALOG.filter((skin) => skin.heroClass === 'warrior');
      const mage = SKIN_CATALOG.find((skin) => skin.heroClass === 'cleric')!;
      const open = async () => {
        const wrapper = mount(ShopSection, { attachTo: document.body });
        await wrapper.find('.side-vault').trigger('click');
        return wrapper;
      };
      const card = (name: string, root: Document | HTMLElement = document) => [...root.querySelectorAll<HTMLElement>('.skin-card')].find((c) => c.querySelector('.shop-name')!.textContent === name)!;
      const tap = async (el: HTMLElement) => {
        el.click();
        await flushPromises();
      };

      it("shows the class being played under its name, Browse more, then the home base and arena", async () => {
        hero(0);
        const wrapper = await open();
        const html = wrapper.html();
        const order = ['Warrior', 'skin-more', 'Home base', 'Arena'].map((mark) => html.indexOf(mark));
        expect(order.every((at) => at >= 0)).toBe(true);
        expect([...order].sort((a, b) => a - b)).toEqual(order);
        expect(wrapper.find('.skin-more').text()).toContain('Mage · Ranger');
        expect(card('Starter').textContent).toContain('Current');
        expect(card(warrior[0].name).querySelector('.price')!.getAttribute('aria-label')).toBe(`${warrior[0].gems} gems`);
        expect(wrapper.text()).not.toContain(mage.name);
      });

      it('a card opens its popup, and Buy spends the gems and wears it', async () => {
        hero(0);
        useAccountStore().account.gems = warrior[0].gems;
        await open();
        await tap(card(warrior[0].name));
        const popup = document.querySelector<HTMLElement>('.skin-popup')!;
        expect(popup.textContent).toContain('Warrior skin.');
        expect(popup.querySelector('.skin-close')!.textContent).toBe('Cancel');
        await tap(popup.querySelector<HTMLElement>('.shop-buy')!);
        expect(useAccountStore().account.gems).toBe(0);
        expect(heroArt(useAccountStore().account, 'warrior')).toBe(warrior[0].art);
        expect(document.querySelector('.skin-popup')).toBeNull();
        expect(card(warrior[0].name).textContent).toContain('Current');
        expect(card('Starter').textContent).toContain('Owned');
      });

      it('too few gems grey out Buy and name the shortfall', async () => {
        hero(0);
        useAccountStore().account.gems = warrior[0].gems - 3;
        await open();
        await tap(card(warrior[0].name));
        const popup = document.querySelector<HTMLElement>('.skin-popup')!;
        expect(popup.querySelector<HTMLButtonElement>('.shop-buy')!.disabled).toBe(true);
        expect(popup.textContent).toContain('3 more gems needed.');
      });

      it('an owned look is worn from its popup', async () => {
        hero(0);
        useAccountStore().account.gems = warrior[0].gems;
        useAccountStore().buySkin(warrior[0].id);
        await open();
        await tap(card('Starter'));
        await tap(document.querySelector<HTMLElement>('.skin-popup .skin-wear')!);
        expect(heroArt(useAccountStore().account, 'warrior')).toBe('player/warrior');
        expect(card(warrior[0].name).textContent).toContain('Owned');
      });

      it("Browse more opens the other classes' skins, bought now and worn on their next run", async () => {
        hero(0);
        useAccountStore().account.gems = mage.gems;
        const wrapper = await open();
        await wrapper.find('.skin-more').trigger('click');
        await flushPromises();
        const sheet = document.querySelector<HTMLElement>('.modal-content.sheet')!;
        expect(sheet.textContent).toContain('More heroes');
        expect(sheet.textContent).toContain('Mage');
        expect(sheet.textContent).toContain('Ranger');
        await tap(card(mage.name, sheet));
        expect(document.querySelector('.skin-popup')!.textContent).toContain('Worn on your next Mage run.');
        await tap(document.querySelector<HTMLElement>('.skin-popup .shop-buy')!);
        expect(heroArt(useAccountStore().account, 'cleric')).toBe(mage.art);
        expect(heroArt(useAccountStore().account, 'warrior')).toBe('player/warrior');
        await tap(card(mage.name, sheet));
        const popup = document.querySelector<HTMLElement>('.skin-popup')!;
        expect(popup.querySelector('.skin-wear')).toBeNull();
        expect(popup.querySelector('.skin-close')!.textContent).toBe('Close');
      });
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
    document.querySelector<HTMLButtonElement>('.shop-featured .shop-buy')!.click();
    await flushPromises();
    expect(useItemDropQueue().current.value).not.toBeNull();
    expect(document.querySelector('.shop-scene')).toBeNull();
  });
});
