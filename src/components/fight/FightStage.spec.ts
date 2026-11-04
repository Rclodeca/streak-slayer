// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PERSONALITY_NAME } from '../../game-engine';
import { holdHp, playHit } from '../../composables/useHitFeed';
import { useBossStore } from '../../store/bossStore';
import { useCharacterStore } from '../../store/characterStore';
import { useFocusModeStore } from '../../store/focusModeStore';
import BossBar from '../boss/BossBar.vue';
import FightStage from './FightStage.vue';
import { IMPACT_MS } from './hitFx';

enableAutoUnmount(afterEach);

describe('FightStage', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    // jsdom has no ResizeObserver; the hero's stat line watches its own size.
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
    vi.restoreAllMocks();
  });

  const mountStage = () => mount(FightStage, { global: { stubs: { teleport: true } } });

  it('holds the boss and the hero on one stage', () => {
    const wrapper = mountStage();
    expect(wrapper.find('.stage-inner .boss-panel').exists()).toBe(true);
    expect(wrapper.find('.stage-inner .character-panel').exists()).toBe(true);
  });

  it('hands the stage where its blocks end, so the tap areas can step around text that grew', async () => {
    // jsdom has no layout: place the stage and its two blocks as larger
    // system text would, the hero's block reaching up past the 212px step.
    const rects: Record<string, Partial<DOMRect>> = {
      'stage-inner': { top: 100, bottom: 400, height: 300 },
      'boss-block': { top: 110, bottom: 233, height: 123 },
      'hero-block': { top: 305, bottom: 386, height: 81 },
    };
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const key = Object.keys(rects).find((k) => this.classList.contains(k));
      return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, ...(key ? rects[key] : {}) } as DOMRect;
    });
    const wrapper = mountStage();
    await nextTick();
    const style = wrapper.find('.stage-inner').attributes('style');
    expect(style).toContain('--boss-bottom: 133px');
    expect(style).toContain('--hero-top: 205px');
  });

  it('takes the page menu into its corner', () => {
    const wrapper = mount(FightStage, { slots: { default: '<span class="menu-stub" />' }, global: { stubs: { teleport: true } } });
    expect(wrapper.find('.stage-menu .menu-stub').exists()).toBe(true);
  });

  it('shrinks to the focus strip when Focus mode is on', async () => {
    const wrapper = mountStage();
    expect(wrapper.find('.fight-stage').classes()).not.toContain('focus');
    useFocusModeStore().setOn(true);
    await nextTick();
    expect(wrapper.find('.fight-stage').classes()).toContain('focus');
  });

  it('keeps the plain night in the focus strip: no scene, no day ink', async () => {
    useBossStore().boss.personality = 'tank';
    const wrapper = mountStage();
    expect(wrapper.find('.stage-bg .stage-scene').exists()).toBe(true);
    useFocusModeStore().setOn(true);
    await nextTick();
    const stage = wrapper.find('.fight-stage');
    expect(stage.find('.stage-bg .stage-scene').exists()).toBe(false);
    expect(stage.classes()).not.toContain('day-stage');
  });

  it("puts the boss's scene behind the fight: its stone on the plinths, dark ink on a day scene", async () => {
    const bossStore = useBossStore();
    bossStore.boss.personality = 'balanced';
    const wrapper = mountStage();
    const stage = () => wrapper.find('.fight-stage');
    expect(stage().find('.stage-bg .stage-scene').exists()).toBe(true);
    expect(stage().classes()).not.toContain('day-stage');
    expect(stage().attributes('style')).toContain('--plinth: #1f2534');

    bossStore.boss.personality = 'tank';
    await nextTick();
    expect(stage().classes()).toContain('day-stage');
    expect(stage().attributes('style')).toContain('--plinth: #a85e3a');
  });

  it('feeds the drop-down bar the boss and the hero, parked until the stage scrolls away', () => {
    const wrapper = mountStage();
    const bar = wrapper.findComponent(BossBar);
    const boss = useBossStore().boss;
    expect(bar.props('name')).toBe(PERSONALITY_NAME[boss.personality]);
    expect(bar.props('heroLevel')).toBe(useCharacterStore().character.level);
    expect(bar.props('shown')).toBe(false);
  });

  it('plays hits while it is up, and stops when it goes', () => {
    const hit = { kind: 'strike', by: 'hero', type: 'magic', amount: 74, crit: false, hp: -74, bossIndex: useBossStore().boss.index } as const;
    const wrapper = mountStage();
    expect(wrapper.find('.stage-inner .fx-layer').exists()).toBe(true);
    expect(playHit(hit)).toBe(IMPACT_MS.magic);
    wrapper.unmount();
    expect(playHit(hit)).toBe(0);
  });

  it('feeds the drop-down bar the HP as shown, held back while a blow is on its way', async () => {
    const boss = useBossStore().boss;
    const hero = useCharacterStore().character;
    const wrapper = mountStage();
    holdHp(boss.index, -40);
    holdHp('hero', -25);
    await nextTick();
    const bar = wrapper.findComponent(BossBar);
    expect(bar.props('current')).toBe(Math.min(boss.maxHealth, boss.health + 40));
    expect(bar.props('heroCurrent')).toBe(Math.min(bar.props('heroMax'), hero.currentHealth + 25));
  });
});
