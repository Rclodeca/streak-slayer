// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import RankPips from './RankPips.vue';

describe('RankPips', () => {
  it('renders one pip per rank, labelled with the numeral', () => {
    const three = mount(RankPips, { props: { rank: 3 } });
    expect(three.findAll('.rank-pips i')).toHaveLength(3);
    expect(three.find('.rank-pips').attributes('aria-label')).toBe('Rank III');
    const eight = mount(RankPips, { props: { rank: 8 } });
    expect(eight.findAll('.rank-pips i')).toHaveLength(8);
    expect(eight.find('.rank-pips').attributes('aria-label')).toBe('Rank VIII');
  });

  it('renders nothing unranked', () => {
    const wrapper = mount(RankPips, { props: { rank: 0 } });
    expect(wrapper.find('.rank-pips').exists()).toBe(false);
    expect(wrapper.html()).toBe('<!--v-if-->');
  });
});
