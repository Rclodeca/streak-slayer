// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SKIN_CATALOG, createCharacter, createRng } from '../../game-engine';
import { useAccountStore } from '../../store/accountStore';
import PlayerSprite from './PlayerSprite.vue';

enableAutoUnmount(afterEach);

describe('PlayerSprite', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("draws the class's own art, or its worn skin", async () => {
    const character = createCharacter(createRng(1), 'warrior');
    const wrapper = mount(PlayerSprite, { props: { character } });
    expect(wrapper.find('img.hero').attributes('src')).toContain('sprites/player/warrior.png');
    const skin = SKIN_CATALOG.find((s) => s.heroClass === 'warrior')!;
    useAccountStore().account.gems = skin.gems;
    useAccountStore().buySkin(skin.id);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('img.hero').attributes('src')).toContain(`sprites/${skin.art}.png`);
  });
});
