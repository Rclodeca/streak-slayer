// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import { useTabStore } from '../../store/tabStore';
import ShopScene from './ShopScene.vue';

enableAutoUnmount(afterEach);

describe('ShopScene', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('draws the shop backdrop at its native 2x size with the shopkeeper speaking', () => {
    const wrapper = mount(ShopScene);
    expect(wrapper.find('img.shop-room').attributes('src')).toContain('sprites/home/shop.png');
    expect(wrapper.find('.shop-say .who').text()).toBe('Shopkeeper');
    expect(wrapper.find('.shop-say .line').text()).toBe('Back again? Still breathing, I see.');
    expect(wrapper.classes()).not.toContain('vaulted');
  });

  it('Vault cools the scene and changes his line', async () => {
    const wrapper = mount(ShopScene);
    useTabStore().selectShopSide('vault');
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain('vaulted');
    expect(wrapper.find('.shop-say .line').text()).toBe('Gems. Now we talk.');
  });

  it('the purse shows gold and gems', () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, gold: 340 });
    useAccountStore().initFromSave({ gems: 7, highestLevel: 1 }, 1);
    const text = mount(ShopScene).find('.shop-purse').text().replace(/\s+/g, ' ');
    expect(text).toContain('340');
    expect(text).toContain('7');
  });

  it('carries the menu in its corner', () => {
    const wrapper = mount(ShopScene, { slots: { default: '<button class="menu-probe" />' } });
    expect(wrapper.find('.stage-menu .menu-probe').exists()).toBe(true);
  });
});
