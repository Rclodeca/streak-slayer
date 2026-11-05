// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import Modal from './Modal.vue';

enableAutoUnmount(afterEach);

describe('Modal as a sheet', () => {
  const mountSheet = () => mount(Modal, { props: { modelValue: true, title: 'Log', sheet: true }, attachTo: document.body });
  const grab = () => document.body.querySelector<HTMLElement>('.sheet-grab')!;
  const pointer = (type: string, clientY: number) => grab().dispatchEvent(new MouseEvent(type, { clientY, bubbles: true }));

  it('docks to the bottom with a grab bar', () => {
    mountSheet();
    expect(document.body.querySelector('.modal-backdrop.sheet .modal-content.sheet')).not.toBeNull();
    expect(grab()).not.toBeNull();
  });

  it('closes on a long drag down the grab bar', async () => {
    const wrapper = mountSheet();
    pointer('pointerdown', 100);
    pointer('pointermove', 260);
    pointer('pointerup', 260);
    await nextTick();
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
  });

  it('springs back from a short drag, staying open', async () => {
    const wrapper = mountSheet();
    pointer('pointerdown', 100);
    pointer('pointermove', 140);
    await nextTick();
    expect(document.body.querySelector<HTMLElement>('.modal-content')!.style.getPropertyValue('--drag')).toBe('40px');
    pointer('pointerup', 140);
    await nextTick();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(document.body.querySelector<HTMLElement>('.modal-content')!.style.getPropertyValue('--drag')).toBe('0px');
  });
});
