// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { talentPointsUnspent, talentRank } from '../../game-engine';
import type { TalentId } from '../../game-engine';
import { useCharacterStore } from '../../store/characterStore';
import TalentSection from './TalentSection.vue';

enableAutoUnmount(afterEach);

// jsdom has no matchMedia, which usePhoneLayout reads as the desktop layout.
function layout(phone: boolean) {
  window.matchMedia = ((query: string) => ({ matches: phone, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  delete (window as { matchMedia?: unknown }).matchMedia;
});

describe('TalentSection', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    setActivePinia(createPinia());
    layout(true);
  });

  const q = (selector: string) => document.body.querySelector<HTMLElement>(selector);
  const mountSection = () => mount(TalentSection, { attachTo: document.body });
  const node = (wrapper: ReturnType<typeof mount>, name: string) => wrapper.findAll('.cell').find((cell) => cell.find('.nm').text() === name)!;
  const plinth = (wrapper: ReturnType<typeof mount>, name: string) => wrapper.findAll('.pl').find((pl) => pl.text().startsWith(name))!;

  function heroAt(level: number, talents?: Partial<Record<TalentId, number>>) {
    const store = useCharacterStore();
    store.setCharacter({ ...store.character, level, talents });
    return store;
  }

  it('is sealed under a lock before level 5, with no tree', () => {
    heroAt(4);
    const wrapper = mountSection();
    expect(wrapper.find('.talent-sealed').text()).toContain('Reach level 5');
    expect(wrapper.find('.cell').exists()).toBe(false);
  });

  it('shows the banner with the points to spend', () => {
    heroAt(9, { might: 2 });
    const wrapper = mountSection();
    expect(wrapper.find('.section-title').text()).toContain('Talents');
    expect(wrapper.find('.points .count').text()).toBe('6');
  });

  it('greys the points when none are left', () => {
    heroAt(5, { might: 3, precision: 1 });
    expect(mountSection().find('.points .count').classes()).toContain('zero');
  });

  it('shows the Damage shoot from its top node down, a node each with its name', () => {
    heroAt(9);
    const names = mountSection().findAll('.cell .nm').map((n) => n.text());
    expect(names[0]).toBe('Executioner');
    expect(names.at(-1)).toBe('Might');
    expect(names).toContain('Weekly Might');
    expect(names).not.toContain('Vigor');
  });

  it('marks a node open, ranked, full or locked', () => {
    heroAt(20, { might: 3, precision: 1 });
    const wrapper = mountSection();
    expect(node(wrapper, 'Might').classes()).toContain('full');
    expect(node(wrapper, 'Precision').classes()).toContain('has');
    expect(node(wrapper, 'Brawn').classes()).toContain('open');
    expect(node(wrapper, 'Arcana').classes()).toContain('locked');
    expect(node(wrapper, 'Executioner').classes()).toContain('locked');
  });

  it('lights one pip a rank learned', () => {
    heroAt(20, { might: 3, precision: 1 });
    const wrapper = mountSection();
    expect(node(wrapper, 'Might').findAll('.pip.lit')).toHaveLength(3);
    expect(node(wrapper, 'Precision').findAll('.pip.lit')).toHaveLength(1);
    expect(node(wrapper, 'Precision').findAll('.pip')).toHaveLength(3);
    expect(node(wrapper, 'Keen Edge').findAll('.pip')).toHaveLength(2);
  });

  it('puts a lone offshoot on the right, then the left, and a pair on both sides', () => {
    heroAt(20);
    const wrapper = mountSection();
    const side = (name: string) => ['lft', 'rgt'].find((cls) => node(wrapper, name).classes().includes(cls));
    expect(side('Keen Edge')).toBe('rgt');
    expect(side('Armor Break')).toBe('lft');
    expect(side('Spell Break')).toBe('rgt');
    expect(side('Truestrike')).toBe('rgt');
    expect(side('Weekly Might')).toBe('lft');
    expect(side('Armor Break II')).toBe('rgt');
    expect(side('Spell Break II')).toBe('lft');
  });

  it('opens on the plinth of the shoot with the most points, Damage on a tie', () => {
    heroAt(20);
    expect(mountSection().find('.pl.on').text()).toContain('Damage');
    heroAt(20, { vigor: 3 });
    expect(mountSection().find('.pl.on').text()).toContain('Tank');
  });

  it('counts each shoot’s spent points on its plinth', () => {
    heroAt(20, { might: 3, precision: 1, vigor: 2 });
    const wrapper = mountSection();
    expect(plinth(wrapper, 'Damage').text()).toContain('4 spent');
    expect(plinth(wrapper, 'Tank').text()).toContain('2 spent');
    expect(plinth(wrapper, 'Support').text()).toContain('0 spent');
  });

  it('swaps the tree when another plinth is picked', async () => {
    heroAt(9);
    const wrapper = mountSection();
    await plinth(wrapper, 'Support').trigger('click');
    const names = wrapper.findAll('.cell .nm').map((n) => n.text());
    expect(names[0]).toBe('Blessed');
    expect(names).toContain('Mending');
    expect(names).not.toContain('Might');
    expect(plinth(wrapper, 'Support').classes()).toContain('on');
  });

  describe('the node popup', () => {
    it('opens on a tap with the effect and the Now and Next plates', async () => {
      heroAt(9, { might: 3, precision: 1 });
      const wrapper = mountSection();
      await node(wrapper, 'Precision').find('button').trigger('click');
      expect(q('.talent-popup')).not.toBeNull();
      expect(q('.talent-popup .nm')?.textContent).toBe('Precision');
      expect(q('.talent-popup .desc')?.textContent).toBe('+1% crit chance per rank.');
      expect(q('.talent-popup .plate.now')?.textContent).toContain('Now · 1/3');
      expect(q('.talent-popup .plate.now')?.textContent).toContain('+1%');
      expect(q('.talent-popup .plate.next')?.textContent).toContain('Next · 2/3');
      expect(q('.talent-popup .plate.next')?.textContent).toContain('+2%');
    });

    it('spends a point with Learn, and shows the new rank', async () => {
      const store = heroAt(9);
      const wrapper = mountSection();
      await node(wrapper, 'Might').find('button').trigger('click');
      q('.talent-popup .learn')!.click();
      await wrapper.vm.$nextTick();
      expect(talentRank(store.character, 'might')).toBe(1);
      expect(talentPointsUnspent(store.character)).toBe(7);
      expect(q('.talent-popup .plate.now')?.textContent).toContain('Now · 1/3');
      expect(node(wrapper, 'Might').findAll('.pip.lit')).toHaveLength(1);
    });

    it('opens the next node once the one before has a rank', async () => {
      heroAt(9);
      const wrapper = mountSection();
      expect(node(wrapper, 'Precision').classes()).toContain('locked');
      await node(wrapper, 'Might').find('button').trigger('click');
      q('.talent-popup .learn')!.click();
      await wrapper.vm.$nextTick();
      expect(node(wrapper, 'Precision').classes()).toContain('open');
    });

    it('greys Learn out for a locked node', async () => {
      const store = heroAt(9);
      const wrapper = mountSection();
      await node(wrapper, 'Precision').find('button').trigger('click');
      const learn = q('.talent-popup .learn') as HTMLButtonElement;
      expect(learn.disabled).toBe(true);
      learn.click();
      expect(talentRank(store.character, 'precision')).toBe(0);
    });

    it('greys Learn out with no points left', async () => {
      heroAt(5, { might: 3, precision: 1 });
      const wrapper = mountSection();
      await node(wrapper, 'Precision').find('button').trigger('click');
      expect((q('.talent-popup .learn') as HTMLButtonElement).disabled).toBe(true);
    });

    it('says a full node is full', async () => {
      heroAt(9, { might: 3 });
      const wrapper = mountSection();
      await node(wrapper, 'Might').find('button').trigger('click');
      expect((q('.talent-popup .learn') as HTMLButtonElement).disabled).toBe(true);
      expect(q('.talent-popup .learn')?.textContent).toContain('Full');
    });

    it('has no line of small print under Learn, whatever the node’s state', async () => {
      heroAt(5, { might: 3, precision: 1 });
      const wrapper = mountSection();
      for (const name of ['Might', 'Precision', 'Brawn', 'Arcana']) {
        await node(wrapper, name).find('button').trigger('click');
        expect(q('.talent-popup .warn')).toBeNull();
        q('.modal-close')!.click();
        await wrapper.vm.$nextTick();
      }
    });
  });
});

describe('TalentSection on desktop', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    setActivePinia(createPinia());
    layout(false);
  });

  const q = (selector: string) => document.body.querySelector<HTMLElement>(selector);
  const mountSection = () => mount(TalentSection, { attachTo: document.body });

  function heroAt(level: number, talents?: Partial<Record<TalentId, number>>) {
    const store = useCharacterStore();
    store.setCharacter({ ...store.character, level, talents });
    return store;
  }

  it('shows the banner, the points and an Open tree button, with no tree on the page', () => {
    heroAt(9, { might: 2 });
    const wrapper = mountSection();
    expect(wrapper.find('.section-title').text()).toContain('Talents');
    expect(wrapper.find('.points .count').text()).toBe('6');
    expect(wrapper.find('.open-tree').exists()).toBe(true);
    expect(wrapper.find('.cell').exists()).toBe(false);
    expect(q('.talent-tree-view')).toBeNull();
  });

  it('opens the tree in a modal on the button, with the points and the plinths', async () => {
    heroAt(9, { might: 2 });
    const wrapper = mountSection();
    await wrapper.find('.open-tree').trigger('click');
    expect(q('.talent-tree-view')).not.toBeNull();
    expect(q('.talent-tree-view .cell .nm')?.textContent).toBe('Executioner');
    expect(document.body.querySelectorAll('.talent-tree-view .pl')).toHaveLength(3);
    expect(q('.talent-modal-points .points .count')?.textContent).toBe('6');
  });

  it('is sealed under a lock before level 5, with no button', () => {
    heroAt(4);
    const wrapper = mountSection();
    expect(wrapper.find('.talent-sealed').text()).toContain('Reach level 5');
    expect(wrapper.find('.open-tree').exists()).toBe(false);
  });

  it('spends a point from a node popup opened over the tree', async () => {
    const store = heroAt(9);
    const wrapper = mountSection();
    await wrapper.find('.open-tree').trigger('click');
    const might = [...document.body.querySelectorAll<HTMLElement>('.talent-tree-view .cell')].find((cell) => cell.querySelector('.nm')?.textContent === 'Might')!;
    might.querySelector('button')!.click();
    await wrapper.vm.$nextTick();
    expect(q('.talent-popup .nm')?.textContent).toBe('Might');
    q('.talent-popup .learn')!.click();
    await wrapper.vm.$nextTick();
    expect(talentRank(store.character, 'might')).toBe(1);
    expect(talentPointsUnspent(store.character)).toBe(7);
  });
});
