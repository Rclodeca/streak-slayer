// @vitest-environment jsdom

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SKIN_CATALOG, createCharacter, createRng, heroArt, sceneArt } from '../../game-engine';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import WardrobeSheet from './WardrobeSheet.vue';

enableAutoUnmount(afterEach);

describe('WardrobeSheet', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    useCharacterStore().setCharacter(createCharacter(createRng(1), 'warrior'));
  });

  const open = async () => {
    mount(WardrobeSheet, { props: { modelValue: true }, attachTo: document.body });
    await flushPromises();
  };
  const tile = (name: string) => [...document.querySelectorAll<HTMLElement>('.wardrobe-tile')].find((t) => t.textContent!.includes(name))!;
  const button = (name: string) => tile(name).querySelector<HTMLButtonElement>('.shop-buy')!;
  const tap = async (el: HTMLElement) => {
    el.click();
    await flushPromises();
  };
  const warrior = SKIN_CATALOG.filter((skin) => skin.heroClass === 'warrior');
  const mage = SKIN_CATALOG.find((skin) => skin.heroClass === 'cleric')!;
  const arena = SKIN_CATALOG.find((skin) => skin.kind === 'arena')!;

  it("opens on the class being played, the default worn, each skin priced in gems", async () => {
    await open();
    const heroTiles = [...document.querySelectorAll('.wardrobe-hero .wardrobe-tile')].map((t) => t.textContent);
    expect(heroTiles).toEqual([expect.stringContaining('Starter'), ...warrior.map((skin) => expect.stringContaining(skin.name))]);
    expect(button('Starter').textContent).toBe('Worn');
    expect(button('Starter').disabled).toBe(true);
    expect(button(warrior[0].name).textContent).toContain(String(warrior[0].gems));
    expect(document.querySelector('.wardrobe-home')!.textContent).toContain('Armory');
    expect(document.querySelector('.wardrobe-arena')!.textContent).toContain(arena.name);
  });

  it('greys a skin out when the gems are short', async () => {
    useAccountStore().addGems(warrior[0].gems - 1);
    await open();
    expect(button(warrior[0].name).disabled).toBe(true);
    expect(button(warrior[0].name).classList).toContain('short');
  });

  it('buys a skin, wears it, and switches back to the default', async () => {
    useAccountStore().addGems(warrior[0].gems);
    await open();
    await tap(button(warrior[0].name));
    const accountStore = useAccountStore();
    expect(accountStore.account.gems).toBe(0);
    expect(heroArt(accountStore.account, 'warrior')).toBe(warrior[0].art);
    expect(button(warrior[0].name).textContent).toBe('Worn');
    expect(button('Starter').textContent).toBe('Wear');
    await tap(button('Starter'));
    expect(heroArt(accountStore.account, 'warrior')).toBe('player/warrior');
    expect(button(warrior[0].name).textContent).toBe('Wear');
  });

  it("shows another class's skins on the class switch", async () => {
    useAccountStore().addGems(mage.gems);
    await open();
    await tap([...document.querySelectorAll<HTMLButtonElement>('.wardrobe-classes button')].find((b) => b.textContent!.includes('Mage'))!);
    await tap(button(mage.name));
    expect(heroArt(useAccountStore().account, 'cleric')).toBe(mage.art);
    expect(heroArt(useAccountStore().account, 'warrior')).toBe('player/warrior');
  });

  it('marks the default worn when the worn skin left the catalog', async () => {
    const accountStore = useAccountStore();
    accountStore.account = { ...accountStore.account, ownedSkinIds: ['gone'], wornSkins: { arena: 'gone' } };
    await open();
    const stoneHall = document.querySelector<HTMLElement>('.wardrobe-arena .wardrobe-tile')!;
    expect(stoneHall.textContent).toContain('Stone Hall');
    expect(stoneHall.querySelector('.shop-buy')!.textContent).toBe('Worn');
  });

  it('buys and wears an arena', async () => {
    useAccountStore().addGems(arena.gems);
    await open();
    await tap(document.querySelector<HTMLElement>('.wardrobe-arena')!.querySelectorAll<HTMLElement>('.wardrobe-tile')[1].querySelector('.shop-buy')!);
    expect(sceneArt(useAccountStore().account, 'arena')).toBe(arena.art);
  });
});
