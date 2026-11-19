// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import HowToPlayModal from './HowToPlayModal.vue';

enableAutoUnmount(afterEach);

describe('HowToPlayModal', () => {
  it('shows the six lines of the loop', () => {
    mount(HowToPlayModal, { attachTo: document.body, props: { modelValue: true } });
    const titles = [...document.body.querySelectorAll('.lines b')].map((el) => el.textContent);
    expect(titles).toEqual(['Check off a habit', 'Miss a habit', 'Keep a streak', 'Resist bad habits', 'Finish tasks', 'Grow stronger']);
  });

  it('closes on To battle', async () => {
    const wrapper = mount(HowToPlayModal, { attachTo: document.body, props: { modelValue: true } });
    (document.body.querySelector('.to-battle') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
  });
});
