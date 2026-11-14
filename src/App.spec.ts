// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App.vue';
import { useDeathScreen } from './composables/useDeathScreen';
import { useCharacterStore } from './store/characterStore';

enableAutoUnmount(afterEach);

describe('App', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    localStorage.clear();
    pinia = createPinia();
    setActivePinia(pinia);
  });

  afterEach(() => useDeathScreen().dismiss());

  const mountApp = () => mount(App, { global: { plugins: [pinia], stubs: { AppShell: true } } });

  it('opens the death screen on load when the hero is at 0 HP', () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, currentHealth: 0 });
    mountApp();
    expect(useDeathScreen().isDead.value).toBe(true);
  });

  it('leaves it shut for a hero still standing', () => {
    mountApp();
    expect(useDeathScreen().isDead.value).toBe(false);
  });
});
