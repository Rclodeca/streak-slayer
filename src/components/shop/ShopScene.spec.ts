// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

  it('Services changes his line, and the Vault cools the scene too', async () => {
    const wrapper = mount(ShopScene);
    useTabStore().selectShopSide('services');
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).not.toContain('vaulted');
    expect(wrapper.find('.shop-say .line').text()).toBe('Something worth changing?');
    useTabStore().selectShopSide('vault');
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain('vaulted');
    expect(wrapper.find('.shop-say .line').text()).toBe('New looks. Same you.');
  });

  it('carries the menu in its corner', () => {
    const wrapper = mount(ShopScene, { slots: { default: '<button class="menu-probe" />' } });
    expect(wrapper.find('.stage-menu .menu-probe').exists()).toBe(true);
  });
});
