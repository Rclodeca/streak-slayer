// Shared blocking-modal precedence for the popups that queue behind one another.
//
// Each of those is a full-screen, non-dismissible-by-backdrop-click Modal
// (same as DeathScreen/ItemDropPopup/MissedSkillsPopup), and more than one
// can become "wants to show" in the very same render — e.g. a single
// rollover-acknowledge pass that both kills the player and levels them up,
// or a quest-miss queued from the same rollover that also queued a
// habit-miss. Without an explicit arbiter, whichever Modal happens to mount
// later in AppShell.vue paints on top and permanently blocks the others'
// buttons (confirmed via manual testing — see the quests design spec's
// review notes). This centralizes the precedence order so it's declared
// once instead of re-derived pairwise per modal:
// death > item drop > habit miss > quest miss > boss skill > quest complete > level up > quest unlock > talent unlock > enchant reveal / service done.
// Boss skill, level up, quest unlock, talent unlock, the enchant reveal and service done also wait out a kill or level-up
// still playing on the panels (useCelebration), as does the item drop popup itself.

import { computed } from 'vue';
import { questUnlockPending, talentUnlockPending } from '../game-engine';
import { useBossSkillCard } from './useBossSkillCard';
import { useCelebration } from './useCelebration';
import { useDeathScreen } from './useDeathScreen';
import { useItemDropQueue } from './useItemDropQueue';
import { useLevelUp } from './useLevelUp';
import { useMissedSkillsGate } from './useMissedSkillsGate';
import { useQuestCompleteQueue } from './useQuestCompleteQueue';
import { useQuestMissGate } from './useQuestMissGate';
import { useCharacterStore } from '../store/characterStore';
import { useServices } from './useServices';

export function useModalPriority() {
  const { isDead } = useDeathScreen();
  const { current: itemDropCurrent } = useItemDropQueue();
  const { hasPending: habitMissPending } = useMissedSkillsGate();
  const { hasPending: questMissPending } = useQuestMissGate();
  const characterStore = useCharacterStore();
  const { revealed: enchantRevealed, done: serviceDone } = useServices();
  const { current: questCompleteCurrent } = useQuestCompleteQueue();
  const { celebrating } = useCelebration();
  const { current: bossSkillCurrent } = useBossSkillCard();
  const { current: levelUpCurrent } = useLevelUp();

  /**
   * True when a quest miss is pending and no habit miss is. It shows even after
   * a death: the death screen waits for it (DeathScreen), so every hit queued
   * that day lands before a gem revive is offered.
   */
  const questMissVisible = computed(() => questMissPending.value && !habitMissPending.value);

  /** True when a fired boss skill's card is queued and nothing higher-priority (death, item drop, habit miss, quest miss, a celebration) is. */
  const bossSkillVisible = computed(
    () =>
      bossSkillCurrent.value !== null &&
      !celebrating.value &&
      !isDead.value &&
      itemDropCurrent.value === null &&
      !habitMissPending.value &&
      !questMissPending.value,
  );

  /** True when a level-up's popup is waiting and nothing higher-priority (death, item drop, a miss, boss skill, quest complete, a celebration) is. */
  const levelUpVisible = computed(
    () =>
      levelUpCurrent.value !== null &&
      !celebrating.value &&
      !isDead.value &&
      itemDropCurrent.value === null &&
      !habitMissPending.value &&
      !questMissPending.value &&
      bossSkillCurrent.value === null &&
      questCompleteCurrent.value === null,
  );

  /**
   * True when the "Quests unlocked" popup is due with no level-up popup to
   * carry the news (whose Onward unlocks quests), and nothing higher-priority is up.
   */
  const questUnlockVisible = computed(
    () =>
      questUnlockPending(characterStore.character) &&
      levelUpCurrent.value === null &&
      !celebrating.value &&
      !isDead.value &&
      itemDropCurrent.value === null &&
      !habitMissPending.value &&
      !questMissPending.value &&
      bossSkillCurrent.value === null &&
      questCompleteCurrent.value === null,
  );

  /** True when the "Talents unlocked" popup is due with no level-up popup to carry the news, and nothing higher-priority is up (it follows the quest popup). */
  const talentUnlockVisible = computed(
    () =>
      talentUnlockPending(characterStore.character) &&
      levelUpCurrent.value === null &&
      !questUnlockPending(characterStore.character) &&
      !celebrating.value &&
      !isDead.value &&
      itemDropCurrent.value === null &&
      !habitMissPending.value &&
      !questMissPending.value &&
      bossSkillCurrent.value === null &&
      questCompleteCurrent.value === null,
  );

  /** Nothing above the shop's popups is up: no kill or level-up playing, no death, drop, miss, boss skill, level up or unlock. */
  const shopPopupClear = computed(
    () =>
      !celebrating.value &&
      levelUpCurrent.value === null &&
      !isDead.value &&
      itemDropCurrent.value === null &&
      !habitMissPending.value &&
      !questMissPending.value &&
      bossSkillCurrent.value === null &&
      questCompleteCurrent.value === null &&
      !questUnlockPending(characterStore.character) &&
      !talentUnlockPending(characterStore.character),
  );

  /** True while a shop-enchanted item is on show and nothing higher-priority is up. */
  const enchantRevealVisible = computed(() => enchantRevealed.value !== null && shopPopupClear.value);

  /** True while a reroll's popup is waiting and nothing higher-priority is up. */
  const serviceDoneVisible = computed(() => serviceDone.value !== null && shopPopupClear.value);

  /** True while a quest-completion celebration is queued — it shows before any level-up popup its EXP triggered. */
  const questCompleteVisible = computed(
    () =>
      questCompleteCurrent.value !== null &&
      !isDead.value &&
      !habitMissPending.value &&
      !questMissPending.value &&
      bossSkillCurrent.value === null,
  );

  return { bossSkillVisible, questMissVisible, levelUpVisible, questUnlockVisible, talentUnlockVisible, enchantRevealVisible, serviceDoneVisible, questCompleteVisible };
}
