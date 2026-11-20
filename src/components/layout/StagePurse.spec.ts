// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import StagePurse from './StagePurse.vue';

enableAutoUnmount(afterEach);

describe('StagePurse', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, gold: 1540 });
    useAccountStore().initFromSave({ startingGemsPaid: true, gems: 94, highestLevel: 1 }, 1);
  });

  it('shows the gold and gems on one plate, in full', () => {
    const wrapper = mount(StagePurse);
    // The gems' count ends with the + key, which isn't part of the number.
    const counts = wrapper.findAll('.purse-plate .purse-count').map((c) => c.text().replace(/\s*\+$/, ''));
    expect(counts).toEqual(['1,540', '94']);
    expect(wrapper.find('.purse-plate').attributes('aria-label')).toBe('1,540 gold, 94 gems');
  });

  it('the + asks for gems', async () => {
    const wrapper = mount(StagePurse);
    const plus = wrapper.find('button.purse-plus');
    expect(plus.attributes('aria-label')).toBe('Get gems');
    await plus.trigger('click');
    expect(wrapper.emitted('get-gems')).toHaveLength(1);
  });
});
