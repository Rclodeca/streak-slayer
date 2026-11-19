// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useRetiredHero } from '../../composables/useRetiredHero';
import { PRESTIGE_GEMS, createCharacter, createRng } from '../../game-engine';
import { useAccountStore } from '../../store/accountStore';
import { useBossStore } from '../../store/bossStore';
import { useCharacterStore } from '../../store/characterStore';
import PrestigePopup from './PrestigePopup.vue';

enableAutoUnmount(afterEach);

describe('PrestigePopup', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    setActivePinia(createPinia());
  });

  const q = (selector: string) => document.body.querySelector<HTMLElement>(selector);
  const text = () => q('.prestige-popup')!.textContent!.replace(/\s+/g, ' ');

  function hero(level: number, rank: number) {
    useCharacterStore().setCharacter({ ...createCharacter(createRng(1), 'warrior'), heroPending: false, name: 'Aldric', level });
    useAccountStore().initFromSave({ startingGemsPaid: true, gems: 0, highestLevel: level }, level);
    useAccountStore().setPrestige(rank);
    useBossStore().setBoss({ ...useBossStore().boss, index: 30, shownIndex: 38 });
  }
  const open = () => mount(PrestigePopup, { props: { modelValue: true }, attachTo: document.body });

  it('shows the statue, the rank, its gains, the special and what it costs', () => {
    hero(31, 0);
    open();
    const t = text();
    for (const part of ['Aldric', 'Warrior · Lv 31 · Boss 38', 'Retired', 'Prestige I', 'Veteran', '+20%', '+10%', '+5%', String(PRESTIGE_GEMS), 'Free dungeon', 'Aldric begins again at level 1.']) expect(t).toContain(part);
    expect(q('.prestige-warn b')!.textContent).toBe('level 1');
  });

  it('Cancel closes it and changes nothing', async () => {
    hero(31, 0);
    const wrapper = open();
    q('.prestige-cancel')!.click();
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
    expect(useAccountStore().account.prestige).toBe(0);
  });

  it('Prestige takes the rank once, then closes', async () => {
    hero(31, 0);
    const wrapper = open();
    const go = q('.prestige-confirm')!;
    go.click();
    go.click();
    expect(useAccountStore().account.prestige).toBe(1);
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
    useRetiredHero().clearRetired();
  });

  it('at V shows the Mythic skin in the socket', () => {
    hero(90, 4);
    open();
    expect(text()).toContain('Mythic skin');
    expect(q('.prestige-special .sock img')).not.toBeNull();
  });
});
