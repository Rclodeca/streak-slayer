// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useLevelUp } from '../../composables/useLevelUp';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import LevelUpPopup from './LevelUpPopup.vue';

enableAutoUnmount(afterEach);

describe('LevelUpPopup', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    setActivePinia(createPinia());
    useLevelUp().dismiss();
  });

  const q = (selector: string) => document.body.querySelector<HTMLElement>(selector);
  const all = (selector: string) => Array.from(document.body.querySelectorAll<HTMLElement>(selector));

  function reachLevel(level: number, extra = {}) {
    const store = useCharacterStore();
    store.setCharacter({ ...store.character, level, questsUnlocked: true, talentsUnlocked: true, shopUnlocked: true, servicesUnlocked: true, looksUnlocked: true, ...extra });
    return store;
  }

  it('stays away with no level-up waiting', () => {
    reachLevel(3);
    mount(LevelUpPopup, { attachTo: document.body });
    expect(q('.level-up')).toBeNull();
  });

  it('shows the new level, five stat tiles with their gains and the heal, and no unlocks', () => {
    reachLevel(7);
    useLevelUp().record(6, 7, 120);
    mount(LevelUpPopup, { attachTo: document.body });
    expect(q('.level-number b')?.textContent).toBe('7');
    expect(all('.level-stat')).toHaveLength(5);
    expect(all('.level-stat .gain').every((gain) => /^\+\d/.test(gain.textContent ?? ''))).toBe(true);
    expect(q('.level-heal')?.textContent).toContain('+120');
    expect(q('.level-unlocks')).toBeNull();
  });

  it('folds levels gained before Onward into one popup', () => {
    reachLevel(8);
    const levelUp = useLevelUp();
    levelUp.record(6, 7, 100);
    levelUp.record(7, 8, 50);
    expect(levelUp.current.value).toEqual({ fromLevel: 6, toLevel: 8, healed: 150 });
  });

  it('lists the Special and Ult handed out, side by side', () => {
    reachLevel(8);
    const levelUp = useLevelUp();
    levelUp.record(7, 8, 0);
    levelUp.noteReward('special', 'Morning run');
    levelUp.noteReward('ult', 'Long ride');
    mount(LevelUpPopup, { attachTo: document.body });
    expect(q('.level-unlocks')?.classList.contains('pair')).toBe(true);
    expect(all('.unlock-name').map((el) => el.textContent)).toEqual(['Special', 'Ult']);
    expect(q('.level-unlock.special')?.textContent).toContain('Morning run');
  });

  it('carries the Shop unlock at level 7, and opens it for good on Onward', async () => {
    const store = reachLevel(7, { shopUnlocked: false, servicesUnlocked: false, looksUnlocked: false });
    useLevelUp().record(6, 7, 0);
    const wrapper = mount(LevelUpPopup, { attachTo: document.body });
    expect(all('.unlock-name').map((el) => el.textContent)).toEqual(['Shop']);
    q('.level-up .onward')!.click();
    await wrapper.vm.$nextTick();
    expect(store.character.shopUnlocked).toBe(true);
    expect(store.character.servicesUnlocked).toBe(false);
    expect(store.character.looksUnlocked).toBe(false);
  });

  it('carries the Quests unlock, and opens quests on Onward', async () => {
    const store = reachLevel(2, { questsUnlocked: false, talentsUnlocked: false });
    useLevelUp().record(1, 2, 0);
    const wrapper = mount(LevelUpPopup, { attachTo: document.body });
    expect(all('.unlock-name').map((el) => el.textContent)).toEqual(['Quests']);
    q('.level-up .onward')!.click();
    await wrapper.vm.$nextTick();
    expect(store.character.questsUnlocked).toBe(true);
    expect(store.character.talentsUnlocked).toBe(false);
    expect(q('.level-up')).toBeNull();
  });

  describe('when prestige opens', () => {
    function climb(from: number, to: number, rank: number) {
      reachLevel(to, { heroPending: false, name: 'Aldric' });
      useAccountStore().setPrestige(rank);
      useLevelUp().record(from, to, 0);
      return mount(LevelUpPopup, { attachTo: document.body });
    }

    it('features the next rank when a level reaches its bar', () => {
      climb(29, 30, 0);
      const card = q('.level-prestige')!;
      expect(card.textContent).toContain('Prestige available');
      expect(card.textContent).toContain('Veteran I');
      expect(card.textContent).toContain('+20%');
      expect(card.textContent).toContain('Free dungeon');
      expect(card.classList.contains('rare')).toBe(true);
    });

    it('stays away past the bar', () => {
      climb(30, 31, 0);
      expect(q('.level-prestige')).toBeNull();
    });

    it('names the rank a jump over a bar opens, in its tier colour', () => {
      climb(38, 41, 1);
      expect(q('.level-prestige')!.textContent).toContain('Veteran II');
      document.body.innerHTML = '';
      useLevelUp().dismiss();
      climb(49, 50, 2);
      expect(q('.level-prestige')!.classList.contains('epic')).toBe(true);
    });

    it('its Prestige closes the level-up and opens the prestige popup', async () => {
      climb(29, 30, 0);
      q('.level-prestige .prestige-go')!.click();
      await nextTick();
      expect(useLevelUp().current.value).toBeNull();
      expect(q('.prestige-popup')).not.toBeNull();
    });
  });
});
