// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dailyPeriodKey, ITEM_CATALOG } from '../../game-engine';
import { useCharacterStore } from '../../store/characterStore';
import { useDebugClockStore } from '../../store/debugClockStore';
import HeroDetails from './HeroDetails.vue';

enableAutoUnmount(afterEach);

describe('HeroDetails', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useCharacterStore().character.name = 'Ash';
  });

  it('opens on the hero with their level and bars, in the popup', () => {
    const wrapper = mount(HeroDetails);
    expect(wrapper.find('.hero .hero-sprite').exists()).toBe(true);
    expect(wrapper.find('.hero .hero-level').text()).toBe(`Level ${useCharacterStore().character.level}`);
    expect(wrapper.find('.hero-page-header').exists()).toBe(false);
  });

  it('opens straight on the gear as the Hero tab, with no second hero (the home base above it has the name)', () => {
    const wrapper = mount(HeroDetails, { props: { page: true } });
    expect(wrapper.find('.hero').exists()).toBe(false);
    expect(wrapper.find('.home-name').exists()).toBe(false);
    expect(wrapper.find('.hero-page-header .cloth').element.firstChild?.textContent).toBe('Equipment');
  });

  describe('the gear', () => {
    const equip = (count: number, takenEventIds: string[] = []) => {
      const store = useCharacterStore();
      const items = ITEM_CATALOG.filter((item) => item.type === 'equipment').slice(0, count);
      store.character.ownedItemIds = items.map((item) => item.id);
      store.character.equippedItemIds = items.map((item) => item.id);
      store.character.takenEventIds = takenEventIds as typeof store.character.takenEventIds;
      return items;
    };

    it('lists every item and the empty slots in the popup', () => {
      const items = equip(2);
      const wrapper = mount(HeroDetails);
      expect(wrapper.findAll('.gear-row .gear-name').map((n) => n.text())).toEqual(items.map((item) => item.name));
      expect(wrapper.findAll('.gear-row.empty')).toHaveLength(2);
      expect(wrapper.find('.rack').exists()).toBe(false);
    });

    it('shows a rack of all eight slots beside the picked item card on the tab, the ones not unlocked locked, with a count in the banner', () => {
      equip(2);
      const wrapper = mount(HeroDetails, { props: { page: true } });
      expect(wrapper.findAll('.rack .rack-slot')).toHaveLength(8);
      expect(wrapper.findAll('button.rack-slot')).toHaveLength(2);
      expect(wrapper.findAll('.rack-slot.empty')).toHaveLength(2);
      expect(wrapper.findAll('.rack-slot.locked')).toHaveLength(4);
      expect(wrapper.find('.cloth-aside').text()).toBe('2 / 4');
      expect(wrapper.find('.gear-bay > .rack').exists()).toBe(true);
      expect(wrapper.find('.gear-bay > .gear-list.gear-detail').exists()).toBe(true);
    });

    it('lines the card\'s pointer up with the picked socket\'s row', async () => {
      equip(5, ['item-slots']);
      const wrapper = mount(HeroDetails, { props: { page: true } });
      const row = () => wrapper.find('.gear-detail').attributes('style');
      expect(row()).toContain('--row: 0');
      await wrapper.findAll('button.rack-slot')[3].trigger('click');
      expect(row()).toContain('--row: 1');
      await wrapper.findAll('button.rack-slot')[4].trigger('click');
      expect(row()).toContain('--row: 2');
    });

    it('unlocks sockets as the slot cap grows', () => {
      equip(2, ['item-slots']);
      expect(mount(HeroDetails, { props: { page: true } }).findAll('.rack-slot.locked')).toHaveLength(2);
      equip(2, ['item-slots', 'item-slots-2']);
      expect(mount(HeroDetails, { props: { page: true } }).findAll('.rack-slot.locked')).toHaveLength(0);
    });

    it('opens the card of the first item, then of the one tapped', async () => {
      const items = equip(3);
      const wrapper = mount(HeroDetails, { props: { page: true } });
      expect(wrapper.findAll('.gear-row')).toHaveLength(1);
      expect(wrapper.find('.gear-row .gear-name').text()).toBe(items[0].name);
      expect(wrapper.findAll('button.rack-slot')[0].attributes('aria-pressed')).toBe('true');

      await wrapper.findAll('button.rack-slot')[2].trigger('click');
      expect(wrapper.find('.gear-row .gear-name').text()).toBe(items[2].name);
      expect(wrapper.findAll('button.rack-slot')[2].attributes('aria-pressed')).toBe('true');
      expect(wrapper.findAll('button.rack-slot')[0].attributes('aria-pressed')).toBe('false');
    });

    it('shows no card when nothing is worn', () => {
      equip(0);
      const wrapper = mount(HeroDetails, { props: { page: true } });
      expect(wrapper.find('.gear-row').exists()).toBe(false);
      expect(wrapper.findAll('.rack-slot.empty')).toHaveLength(4);
    });
  });

  describe('a stat a boss skill is lowering', () => {
    const tile = (wrapper: ReturnType<typeof mount>, label: string) =>
      wrapper.findAll('.tiles .stat-tile').find((t) => t.find('.tile-label').text() === label)!;
    const afflict = (type: 'blind' | 'sunder') =>
      (useCharacterStore().character.statusEffects = [{ type, appliedDayKey: dailyPeriodKey(useDebugClockStore().now()), durationDays: 2 }]);

    it('shows crit crossed out with 0% beside it while Blind runs', () => {
      useCharacterStore().character.critChance = 0.2;
      afflict('blind');
      const crit = tile(mount(HeroDetails, { props: { page: true } }), 'Crit chance');
      expect(crit.classes()).toContain('reduced');
      expect(crit.find('s.tile-usual').text()).toBe('20%');
      expect(crit.find('.tile-now').text()).toBe('0%');
      expect(crit.find('.tile-note').text()).toBe('Blinded');
    });

    it('shows armor halved beside the usual value while Sunder runs', () => {
      const store = useCharacterStore();
      store.character.ownedItemIds = ['iron-buckler'];
      store.character.equippedItemIds = ['iron-buckler'];
      afflict('sunder');
      const armor = tile(mount(HeroDetails, { props: { page: true } }), 'Armor');
      expect(armor.find('s.tile-usual').text()).toBe('75');
      expect(armor.find('.tile-now').text()).toBe('38');
      expect(armor.find('.tile-note').text()).toBe('Sundered');
    });

    it('leaves the tile alone when nothing is lowering it', () => {
      const crit = tile(mount(HeroDetails, { props: { page: true } }), 'Crit chance');
      expect(crit.classes()).not.toContain('reduced');
      expect(crit.find('s').exists()).toBe(false);
    });
  });
});
