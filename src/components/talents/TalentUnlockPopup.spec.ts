// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useCharacterStore } from '../../store/characterStore';
import TalentUnlockPopup from './TalentUnlockPopup.vue';

enableAutoUnmount(afterEach);

describe('TalentUnlockPopup', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    setActivePinia(createPinia());
  });

  const q = (selector: string) => document.body.querySelector<HTMLElement>(selector);

  function reachLevel5() {
    const store = useCharacterStore();
    store.setCharacter({ ...store.character, level: 5, questsUnlocked: true, trialsUnlocked: true });
    return store;
  }

  it('stays away before level 5', () => {
    const store = useCharacterStore();
    store.setCharacter({ ...store.character, level: 4, questsUnlocked: true, trialsUnlocked: true });
    mount(TalentUnlockPopup, { attachTo: document.body });
    expect(q('.talent-unlock')).toBeNull();
  });

  it('shows at level 5 with the points already waiting on the plate', () => {
    reachLevel5();
    mount(TalentUnlockPopup, { attachTo: document.body });
    expect(q('.talent-unlock')).not.toBeNull();
    expect(q('.talent-unlock .emblem .count')?.textContent).toBe('4');
    expect(q('.talent-unlock')?.textContent).toContain('Every level leaves its mark.');
  });

  it('wears the Talents anvil on its emblem, as the tab and banner do', () => {
    reachLevel5();
    mount(TalentUnlockPopup, { attachTo: document.body });
    expect(q('.talent-unlock .emblem svg')?.getAttribute('class')).toContain('anvil');
  });

  it('shows once to a save already past level 5, with every point it has earned', () => {
    const store = useCharacterStore();
    store.setCharacter({ ...store.character, level: 14, questsUnlocked: true, trialsUnlocked: true });
    mount(TalentUnlockPopup, { attachTo: document.body });
    expect(q('.talent-unlock .emblem .count')?.textContent).toBe('13');
  });

  it('opens the tab and goes away on Onward', async () => {
    const store = reachLevel5();
    const wrapper = mount(TalentUnlockPopup, { attachTo: document.body });
    q('.talent-unlock .onward')!.click();
    await wrapper.vm.$nextTick();
    expect(store.character.talentsUnlocked).toBe(true);
    expect(q('.talent-unlock')).toBeNull();
  });
});
