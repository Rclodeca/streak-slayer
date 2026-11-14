// Drives the level-up event popup (EventChoiceModal). Each level gained adds
// one pending pick (see grantEventPicks in useCombatActions); this rolls up
// to 3 eligible events for the front pick, keeps them on the character
// (offeredEventIds) so a reload can't re-roll them, and applies whichever the
// player chooses. Module-scoped state for the same singleton reasoning as
// useItemDropQueue — the modal is mounted once in AppShell.

import { computed, ref } from 'vue';
import {
  applyCritBoostEvent,
  applyDoubleItemEvent,
  applyHealBoostEvent,
  applyHealEvent,
  applyOverdriveEvent,
  applyRerollSkillEvent,
  applySpecialEvent,
  applyUltEvent,
  consumeEventPick,
  createRng,
  dailyPeriodKey,
  eligibleEvents,
  EVENT_DEFS,
  heroClassFor,
  maxEquipSlots,
  rollEventChoices,
} from '../game-engine';
import type { ChallengeEvent, EventDef, EventId, ItemDef } from '../game-engine';
import { TUNING } from '../game-engine/constants/tuning';
import { useActivityLogStore } from '../store/activityLogStore';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';
import { useDebugClockStore } from '../store/debugClockStore';
import { useHabitStore } from '../store/habitStore';
import { useQuestStore } from '../store/questStore';
import { useCombatActions } from './useCombatActions';
import { useItemDropQueue } from './useItemDropQueue';

const rng = createRng();
// The item just enchanted, shown on its own screen until the player continues.
const revealed = ref<ItemDef | null>(null);

export function useEventChoice() {
  const characterStore = useCharacterStore();
  const habitStore = useHabitStore();
  const bossStore = useBossStore();
  const questStore = useQuestStore();
  const activityLogStore = useActivityLogStore();
  const debugClockStore = useDebugClockStore();
  const { enqueueDrops } = useItemDropQueue();
  const { reportChallenge } = useCombatActions();

  const pending = computed(() => characterStore.character.pendingEventPicks ?? 0);
  const choices = computed<EventDef[]>(() => (characterStore.character.offeredEventIds ?? []).flatMap((id) => EVENT_DEFS.find((e) => e.id === id) ?? []));

  /**
   * Rolls the cards for the front pick if none are kept yet (or a kept one is no
   * longer eligible), and clears them once no picks remain. Only writes when
   * something changed, since the modal runs it from an effect that reads the character.
   */
  function ensureChoices() {
    const character = characterStore.character;
    if (pending.value === 0) {
      if (character.offeredEventIds) characterStore.setCharacter({ ...character, offeredEventIds: undefined });
      return;
    }
    const todayKey = dailyPeriodKey(debugClockStore.now());
    const kept = character.offeredEventIds;
    const eligible = eligibleEvents(character, habitStore.habits, questStore.quests, todayKey);
    const stillValid = kept !== undefined && kept.every((id) => eligible.some((e) => e.id === id));
    const rolled = stillValid ? kept : rollEventChoices(character, habitStore.habits, rng, questStore.quests, undefined, todayKey).map((e) => e.id);
    if (stillValid) return;
    characterStore.setCharacter({ ...character, offeredEventIds: rolled });
  }

  function finish(id: EventId) {
    characterStore.setCharacter(consumeEventPick(characterStore.character, id));
  }

  /** Picks an event that needs no further input (everything except reroll-skill). */
  function choose(id: Exclude<EventId, 'reroll-skill'>) {
    const { level } = characterStore.character;
    // Reported once the pick is spent, so a challenge it finishes pays out on top of it.
    let happened: ChallengeEvent | null = null;
    if (id === 'special') {
      const before = habitStore.habits;
      const habits = applySpecialEvent(before, level, rng);
      const granted = habits.find((h, i) => h.isSpecial && !before[i]?.isSpecial);
      habitStore.setHabits(habits);
      if (granted) activityLogStore.addEntry({ kind: 'special-assigned', habitName: granted.name });
    } else if (id === 'ult') {
      const before = habitStore.habits;
      const habits = applyUltEvent(before, level, rng);
      const granted = habits.find((h, i) => h.isUlt && !before[i]?.isUlt);
      habitStore.setHabits(habits);
      if (granted) activityLogStore.addEntry({ kind: 'ult-assigned', habitName: granted.name });
    } else if (id === 'overdrive') {
      const { habits, granted } = applyOverdriveEvent(habitStore.habits, rng);
      habitStore.setHabits(habits);
      if (granted) activityLogStore.addEntry({ kind: 'overdrive-granted', habitName: granted.name });
    } else if (id === 'heal') {
      const { character, healed } = applyHealEvent(characterStore.character);
      characterStore.setCharacter(character);
      activityLogStore.addEntry({ kind: 'event-heal', amount: healed });
    } else if (id === 'heal-boost') {
      characterStore.setCharacter(applyHealBoostEvent(characterStore.character, dailyPeriodKey(debugClockStore.now())));
      activityLogStore.addEntry({ kind: 'heal-boost-gained', days: TUNING.HEAL_BOOST_DAYS });
    } else if (id === 'double-item') {
      const { character, item } = applyDoubleItemEvent(characterStore.character, rng);
      characterStore.setCharacter(character);
      if (item) {
        activityLogStore.addEntry({ kind: 'item-doubled', itemName: item.name });
        revealed.value = item;
        happened = { type: 'enchanted' };
      }
    } else if (id === 'crit-boost') {
      characterStore.setCharacter(applyCritBoostEvent(characterStore.character, dailyPeriodKey(debugClockStore.now())));
      activityLogStore.addEntry({ kind: 'crit-boost-gained', days: TUNING.CRIT_BOOST_DAYS });
    } else if (id === 'item-drop') {
      const dropped = characterStore.grantItemDrops(bossStore.boss.index, rng, 1);
      enqueueDrops(dropped);
      if (dropped.some((item) => item.rarity === 'epic')) happened = { type: 'epic-dropped' };
    } else if (id === 'item-slots' || id === 'item-slots-2') {
      // The cap once this pick is recorded.
      const takenEventIds = [...(characterStore.character.takenEventIds ?? []), id];
      activityLogStore.addEntry({ kind: 'item-slots-gained', slots: maxEquipSlots({ takenEventIds }) });
    } else {
      // Compile error here means a new event has no handler above.
      const unhandled: never = id;
      throw new Error(`Unhandled event: ${unhandled}`);
    }
    finish(id);
    if (happened) reportChallenge(happened);
  }

  function chooseReroll(habitId: string) {
    const habits = applyRerollSkillEvent(habitStore.habits, habitId, rng, heroClassFor(characterStore.character));
    habitStore.setHabits(habits);
    const rerolled = habits.find((h) => h.id === habitId);
    if (rerolled) activityLogStore.addEntry({ kind: 'skill-rerolled', habitName: rerolled.name, damageType: rerolled.damageType });
    finish('reroll-skill');
  }

  function dismissReveal() {
    revealed.value = null;
  }

  return { pending, choices, revealed, ensureChoices, choose, chooseReroll, dismissReveal };
}
