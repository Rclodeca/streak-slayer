// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { createRng, getChallengeDef } from '../../game-engine';
import { TUNING } from '../../game-engine/constants/tuning';
import { useEventChoice } from '../../composables/useEventChoice';
import { useItemDropQueue } from '../../composables/useItemDropQueue';
import { useCharacterStore } from '../../store/characterStore';
import { useHabitStore } from '../../store/habitStore';
import { useQuestStore } from '../../store/questStore';
import EventChoiceModal from './EventChoiceModal.vue';

enableAutoUnmount(afterEach);

describe('EventChoiceModal side-quest card', () => {
  let pinia: ReturnType<typeof createPinia>;
  const q = (selector: string) => document.body.querySelector<HTMLElement>(selector);

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    const characterStore = useCharacterStore();
    characterStore.setCharacter({
      ...characterStore.character,
      level: 3,
      questsUnlocked: true,
      pendingEventPicks: 1,
      takenEventIds: [],
      sideQuestPicksMissed: TUNING.SIDE_QUEST_GUARANTEE_LEVELS,
    });
    useHabitStore().addHabit('Daily good', 'daily', 'medium', false, createRng(1));
  });

  afterEach(() => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, pendingEventPicks: 0 });
    useEventChoice().ensureChoices();
    const drops = useItemDropQueue();
    while (drops.current.value) drops.dismiss();
  });

  async function mountModal() {
    const wrapper = mount(EventChoiceModal, { global: { plugins: [pinia] }, attachTo: document.body });
    await nextTick();
    return wrapper;
  }

  it('names the challenge, its deed and a gift "?" on the side card', async () => {
    await mountModal();
    const characterStore = useCharacterStore();
    const def = getChallengeDef(characterStore.character.offeredChallengeId!);

    const card = q('.card.side');
    expect(card).not.toBeNull();
    expect(card!.textContent).toContain(def.name);
    expect(card!.textContent).toContain(def.deed);
    expect(card!.textContent).toContain('Side quest');
    expect(card!.querySelector('.side-socket')).not.toBeNull();
    expect(card!.querySelector('.side-gift')?.textContent).toContain('?');
  });

  it('tapping it takes the challenge, with no form step', async () => {
    const wrapper = await mountModal();
    const characterStore = useCharacterStore();
    const id = characterStore.character.offeredChallengeId;

    q('.card.side')!.click();
    await wrapper.vm.$nextTick();

    expect(characterStore.character.challenges?.map((e) => e.id)).toEqual([id]);
    expect(characterStore.character.pendingEventPicks).toBe(0);
    expect(document.body.querySelector('input[type="text"]')).toBeNull();
    expect(useQuestStore().quests).toEqual([]);
  });

  it('leaves the other cards as plain event cards', async () => {
    await mountModal();
    const cards = [...document.body.querySelectorAll('.cards .card')];
    expect(cards.filter((c) => c.classList.contains('side'))).toHaveLength(1);
    for (const card of cards.filter((c) => !c.classList.contains('side'))) expect(card.querySelector('.side-gift')).toBeNull();
  });
});
