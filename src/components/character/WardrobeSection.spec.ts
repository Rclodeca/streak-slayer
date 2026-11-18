// @vitest-environment jsdom

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SKIN_CATALOG, createCharacter, createRng, heroArt, sceneArt } from '../../game-engine';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import { useTabStore } from '../../store/tabStore';
import WardrobeSection from './WardrobeSection.vue';

enableAutoUnmount(afterEach);

describe('WardrobeSection', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    useCharacterStore().setCharacter(createCharacter(createRng(1), 'warrior'));
  });

  const warrior = SKIN_CATALOG.filter((skin) => skin.heroClass === 'warrior' && !skin.mythic);
  const mage = SKIN_CATALOG.find((skin) => skin.heroClass === 'cleric')!;
  const arena = SKIN_CATALOG.find((skin) => skin.kind === 'arena')!;
  const own = (...skins: typeof SKIN_CATALOG[number][]) => {
    const accountStore = useAccountStore();
    accountStore.account = { ...accountStore.account, ownedSkinIds: skins.map((skin) => skin.id) };
  };
  const names = (wrapper: ReturnType<typeof mount>, kind: string) => wrapper.findAll(`.wardrobe-${kind} .wardrobe-name`).map((n) => n.text());
  const tile = (wrapper: ReturnType<typeof mount>, name: string) => wrapper.findAll('.wardrobe-tile').find((t) => t.find('.wardrobe-name').text() === name)!;

  it('shows only the defaults, worn, before anything is bought', () => {
    const wrapper = mount(WardrobeSection);
    expect(names(wrapper, 'hero')).toEqual(['Starter']);
    expect(names(wrapper, 'home')).toEqual(['Armory']);
    expect(names(wrapper, 'arena')).toEqual(['Stone Hall']);
    expect(wrapper.findAll('.wardrobe-tile.worn')).toHaveLength(3);
    expect(wrapper.find('.section-title').text()).toContain('3 looks');
  });

  it("lists owned looks only, the hero's for the class being played", () => {
    own(warrior[0], mage);
    const wrapper = mount(WardrobeSection);
    expect(names(wrapper, 'hero')).toEqual(['Starter', warrior[0].name]);
    expect(wrapper.text()).not.toContain(warrior[1].name);
    expect(wrapper.text()).not.toContain(mage.name);
  });

  it('wears a look on a tap, and the default again', async () => {
    own(warrior[0], arena);
    const wrapper = mount(WardrobeSection);
    await tile(wrapper, warrior[0].name).trigger('click');
    const accountStore = useAccountStore();
    expect(heroArt(accountStore.account, 'warrior')).toBe(warrior[0].art);
    expect(tile(wrapper, warrior[0].name).classes()).toContain('worn');
    expect(tile(wrapper, warrior[0].name).find('.wardrobe-state').text()).toBe('Worn');
    expect(tile(wrapper, 'Starter').find('.wardrobe-state').text()).toBe('Wear');
    await tile(wrapper, 'Starter').trigger('click');
    expect(heroArt(accountStore.account, 'warrior')).toBe('player/warrior');
    await tile(wrapper, arena.name).trigger('click');
    expect(sceneArt(accountStore.account, 'arena')).toBe(arena.art);
  });

  it('marks the default worn when the worn skin left the catalog', () => {
    const accountStore = useAccountStore();
    accountStore.account = { ...accountStore.account, ownedSkinIds: ['gone'], wornSkins: { arena: 'gone' } };
    const wrapper = mount(WardrobeSection);
    expect(tile(wrapper, 'Stone Hall').classes()).toContain('worn');
  });

  it('has no Shop button while Looks is still sealed', () => {
    expect(mount(WardrobeSection).find('.wardrobe-more').exists()).toBe(false);
  });

  it("sends the Shop button to the Shop's Looks side", async () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 10 });
    const wrapper = mount(WardrobeSection);
    await wrapper.find('.wardrobe-more').trigger('click');
    await flushPromises();
    const tabStore = useTabStore();
    expect(tabStore.tab).toBe('shop');
    expect(tabStore.shopSide).toBe('vault');
  });
});
