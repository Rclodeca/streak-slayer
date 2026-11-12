// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MenuCorner from './MenuCorner.vue';

describe('MenuCorner', () => {
  it('carries what it is given in the stage menu corner', () => {
    const wrapper = mount(MenuCorner, { slots: { default: '<button class="menu">Menu</button>' } });
    expect(wrapper.find('.stage-menu .menu').exists()).toBe(true);
  });
});
