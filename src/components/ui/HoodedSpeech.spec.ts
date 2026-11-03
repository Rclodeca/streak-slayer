// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HoodedSpeech from './HoodedSpeech.vue';

enableAutoUnmount(afterEach);

describe('HoodedSpeech', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const mountLines = (lines: string[], kind: 'intro' | 'death' | 'back' = 'intro') =>
    mount(HoodedSpeech, { props: { lines, kind, heroClass: 'warrior' } });

  it('types the line out letter by letter', async () => {
    const wrapper = mountLines(['Hello']);
    expect(wrapper.find('.line').text()).toBe('');
    await vi.advanceTimersByTimeAsync(42 * 3);
    expect(wrapper.find('.line').text()).toBe('Hel');
    await vi.advanceTimersByTimeAsync(42 * 5);
    expect(wrapper.find('.line').text()).toBe('Hello');
    expect(wrapper.find('.next').classes()).toContain('done');
  });

  it('a tap finishes the line, and the next tap moves to the next line', async () => {
    const wrapper = mountLines(['One', 'Two']);
    await wrapper.find('.figure').trigger('click');
    expect(wrapper.find('.line').text()).toBe('One');
    await wrapper.find('.figure').trigger('click');
    expect(wrapper.find('.line').text()).toBe('');
    await vi.advanceTimersByTimeAsync(42 * 3);
    expect(wrapper.find('.line').text()).toBe('Two');
    expect(wrapper.emitted('done')).toBeUndefined();
  });

  it('says done after a tap past the last line', async () => {
    const wrapper = mountLines(['Only']);
    await wrapper.find('.figure').trigger('click');
    expect(wrapper.emitted('done')).toBeUndefined();
    await wrapper.find('.figure').trigger('click');
    expect(wrapper.emitted('done')).toHaveLength(1);
  });

  it('marks which line of several this is, and nothing for a single line', async () => {
    const several = mountLines(['One', 'Two', 'Three']);
    expect(several.findAll('.dots i').map((dot) => dot.classes('on'))).toEqual([true, false, false]);
    await several.find('.figure').trigger('click');
    await several.find('.figure').trigger('click');
    expect(several.findAll('.dots i').map((dot) => dot.classes('on'))).toEqual([true, true, false]);
    expect(mountLines(['Only']).find('.dots').exists()).toBe(false);
  });

  it('reads the whole line to a screen reader at once', () => {
    const wrapper = mountLines(['Habits, is it?']);
    expect(wrapper.find('.whole').text()).toBe('Habits, is it?');
    expect(wrapper.find('.line').attributes('aria-hidden')).toBe('true');
  });

  it('only a death says "You died"', () => {
    expect(mountLines(['Line'], 'death').find('.died').text()).toBe('You died');
    expect(mountLines(['Line'], 'intro').find('.died').exists()).toBe(false);
    expect(mountLines(['Line'], 'back').find('.died').exists()).toBe(false);
  });
});
