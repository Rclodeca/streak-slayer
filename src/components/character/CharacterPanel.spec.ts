// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDaysToDayKey, createRng, dailyPeriodKey, effectiveStat, formatCompact, ITEM_CATALOG } from '../../game-engine';
import { useBossStore } from '../../store/bossStore';
import { useCharacterStore } from '../../store/characterStore';
import { useHabitStore } from '../../store/habitStore';
import { useTabStore } from '../../store/tabStore';
import Modal from '../ui/Modal.vue';
import StatIcon from '../ui/StatIcon.vue';
import CharacterPanel from './CharacterPanel.vue';

enableAutoUnmount(afterEach);

describe('CharacterPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // jsdom has no ResizeObserver; the stat line watches its own size.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // The hero art follows the run's rolled physical/magic split (heroClassFor).
  function setClass(physical: number, magic: number) {
    const { starterStats } = useCharacterStore().character;
    starterStats.physicalDamage = physical;
    starterStats.magicDamage = magic;
  }

  it('has no equipped-items grid, but keeps the gear in the details', async () => {
    const store = useCharacterStore();
    const item = ITEM_CATALOG[0];
    store.character.ownedItemIds = [item.id];
    store.character.equippedItemIds = [item.id];
    const wrapper = mount(CharacterPanel);
    expect(wrapper.find('.item-grid').exists()).toBe(false);
    await wrapper.find('button.tap-hero').trigger('click');
    expect(wrapper.findComponent(Modal).props('modelValue')).toBe(true);
  });

  it('opens the Hero tab instead of the popup on a phone', async () => {
    vi.stubGlobal('matchMedia', (media: string) => ({ matches: true, media, addEventListener() {}, removeEventListener() {} }));
    const wrapper = mount(CharacterPanel);
    await wrapper.find('button.tap-hero').trigger('click');
    expect(useTabStore().tab).toBe('hero');
    expect(wrapper.findComponent(Modal).props('modelValue')).toBe(false);
  });

  it('lights the hero while its tap area is held', async () => {
    const wrapper = mount(CharacterPanel);
    await wrapper.find('.tap-hero').trigger('pointerdown');
    expect(wrapper.find('.character-panel').classes()).toContain('pressed');
    await wrapper.find('.tap-hero').trigger('pointerup');
    expect(wrapper.find('.character-panel').classes()).not.toContain('pressed');
  });

  it('keeps the level outside the part of the name that gets cut', () => {
    useCharacterStore().character.name = 'Bartholomew Long';
    const wrapper = mount(CharacterPanel);
    expect(wrapper.find('.name-line .hero-name').text()).toBe('Bartholomew Long');
    expect(wrapper.find('.name-line > .level-number').text()).toBe(String(useCharacterStore().character.level));
  });

  it('shows the HP numbers inside the HP bar, with the EXP bar alongside it', () => {
    const store = useCharacterStore();
    store.character.currentHealth = 980.4;
    const wrapper = mount(CharacterPanel);
    const bars = wrapper.find('.hero-block .bars');
    expect(bars.find('.health-bar .health-bar-label').text()).toBe(`980 / ${formatCompact(effectiveStat(store.character, 'health'))}`);
    expect(bars.find('.exp-bar').exists()).toBe(true);
  });

  it('stands every hero on its plinth the same way, whatever its class', async () => {
    setClass(600, 300);
    const wrapper = mount(CharacterPanel);
    const style = () => wrapper.find('.hero-figure').attributes('style');
    // The canvas is drawn at its own size (96 CSS px) with the feet 8px below the plinth's top.
    expect(style()).toContain('--hero-pw: 96');
    expect(style()).toContain('--hero-py: 12');
    const warrior = style();
    setClass(300, 600);
    await nextTick();
    expect(style()).toBe(warrior);
  });

  it('shows a damage stat only while some skill uses its type', () => {
    const habitStore = useHabitStore();
    const icons = (type: 'physical' | 'trueDamage') => {
      habitStore.habits = [{ ...habitStore.addHabit('Read', 'daily', 'easy', false, createRng(1)), damageType: type }];
      return mount(CharacterPanel)
        .find('.stat-summary')
        .findAllComponents(StatIcon)
        .map((icon: { props: (key: string) => unknown }) => icon.props('name'));
    };
    expect(icons('physical')).toContain('physical');
    expect(icons('physical')).not.toContain('true');
    expect(icons('physical')).not.toContain('magic');
    expect(icons('trueDamage')).toContain('true');
    expect(icons('trueDamage')).not.toContain('physical');
  });

  describe('boss-skill effects', () => {
    const today = () => dailyPeriodKey(new Date());

    it('shows Blind on the stage line for the days it has left', () => {
      const store = useCharacterStore();
      store.setCharacter({ ...store.character, statusEffects: [{ type: 'blind', appliedDayKey: today(), durationDays: 2 }] });
      expect(mount(CharacterPanel).find('.stat-summary').text()).toContain('Blinded · 2d');
    });

    it('shows a counting-down Doom on the stage line', () => {
      const bossStore = useBossStore();
      bossStore.setBoss({ ...bossStore.boss, doomDueDayKey: addDaysToDayKey(today(), 3) });
      expect(mount(CharacterPanel).find('.stat-summary').text()).toContain('Doom · 3d');
    });

    it('shows Sever on the stage line for the days it has left', () => {
      const store = useCharacterStore();
      store.setCharacter({ ...store.character, statusEffects: [{ type: 'sever', appliedDayKey: today(), durationDays: 2 }] });
      expect(mount(CharacterPanel).find('.stat-summary').text()).toContain('Severed · 2d');
    });

    it('lists Blind, Sever, Sunder and Doom among the active effects in the details, with what each does', async () => {
      const store = useCharacterStore();
      const bossStore = useBossStore();
      store.setCharacter({
        ...store.character,
        statusEffects: [
          { type: 'blind', appliedDayKey: today(), durationDays: 2 },
          { type: 'sunder', appliedDayKey: today(), durationDays: 2 },
          { type: 'sever', appliedDayKey: today(), durationDays: 2 },
        ],
      });
      bossStore.setBoss({ ...bossStore.boss, doomDueDayKey: addDaysToDayKey(today(), 1) });
      const wrapper = mount(CharacterPanel);
      await wrapper.find('button.tap-hero').trigger('click');
      const effects = Array.from(document.body.querySelectorAll('.effect')).map((e) => e.textContent?.replace(/\s+/g, ' ').trim());
      expect(effects).toEqual(expect.arrayContaining(['Blinded · no crits · 2d', 'Sundered · armor & resist halved · 2d', 'Severed · no lifesteal · 2d', 'Doom · half your HP · 1d']));
      wrapper.unmount();
    });
  });
});

