// Drives the level-up event popup (EventChoiceModal). Each level gained adds
// one pending pick (see grantEventPicks in useCombatActions); this rolls up
// to 3 eligible events for the front pick and applies whichever the player
// chooses. Module-scoped options for the same singleton reasoning as
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
  drawChallenge,
  eligibleEvents,
  getChallengeDef,
  heroClassFor,
  maxEquipSlots,
  offerableChallenges,
  recordSideQuestOffer,
  rollEventChoices,
  takeChallenge,
} from '../game-engine';
import type { ChallengeDef, ChallengeEvent, ChallengeId, EventDef, EventId, ItemDef } from '../game-engine';
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
const options = ref<EventDef[] | null>(null);
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
  const choices = computed(() => options.value ?? []);

  /** The challenge the side-quest card names, once rolled. */
  const offeredChallenge = computed<ChallengeDef | null>(() => {
    const id = characterStore.character.offeredChallengeId;
    return id ? getChallengeDef(id) : null;
  });

  /**
   * Names the challenge the side-quest card will offer: the one already
   * persisted if it can still be offered (a reopened popup or a reload shows
   * the same one), otherwise a fresh draw. With no side-quest card rolled,
   * nothing is offered.
   */
  function settleOfferedChallenge(rolled: EventDef[]) {
    const character = characterStore.character;
    const current = character.offeredChallengeId;
    let next: ChallengeId | undefined;
    if (rolled.some((event) => event.id === 'side-quest')) {
      next = current && offerableChallenges(character).some((def) => def.id === current) ? current : (drawChallenge(character, rng) ?? undefined);
    }
    if (next !== current) characterStore.setCharacter({ ...character, offeredChallengeId: next });
  }

  /** Rolls the options for the front pick if none are rolled yet; clears them once no picks remain. */
  function ensureChoices() {
    if (pending.value === 0) options.value = null;
    else if (options.value === null) {
      options.value = rollEventChoices(characterStore.character, habitStore.habits, rng, questStore.quests);
      settleOfferedChallenge(options.value);
    }
  }

  function finish(id: EventId) {
    const character = characterStore.character;
    const offered = (options.value ?? []).map((e) => e.id);
    // Being offered already proves it was eligible; checking again only matters when it wasn't offered, because
    // the pick itself (e.g. promising the last available relic) can make it ineligible by now.
    const sideQuestEligible =
      offered.includes('side-quest') || eligibleEvents(character, habitStore.habits, questStore.quests).some((e) => e.id === 'side-quest');
    characterStore.setCharacter(recordSideQuestOffer(consumeEventPick(character, id), offered, sideQuestEligible));
    options.value = null;
  }

  /** Picks an event that needs no further input (everything except side-quest and reroll-skill). */
  function choose(id: Exclude<EventId, 'side-quest' | 'reroll-skill'>) {
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
    } else {
      // item-slots / item-slots-2: the cap once this pick is recorded.
      const takenEventIds = [...(characterStore.character.takenEventIds ?? []), id];
      activityLogStore.addEntry({ kind: 'item-slots-gained', slots: maxEquipSlots({ takenEventIds }) });
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

  /** Takes the challenge the side-quest card names: a relic is reserved for it, and nothing is typed. */
  function chooseSideQuest() {
    const character = characterStore.character;
    const id = character.offeredChallengeId;
    if (!id) return;
    const taken = takeChallenge(character, id, rng, dailyPeriodKey(debugClockStore.now()));
    if (taken === character) return;
    characterStore.setCharacter(taken);
    finish('side-quest');
    // Some challenges (Unbroken) are already true when taken.
    reportChallenge({ type: 'state-changed', habits: habitStore.habits });
  }

  function dismissReveal() {
    revealed.value = null;
  }

  return { pending, choices, revealed, offeredChallenge, ensureChoices, choose, chooseReroll, chooseSideQuest, dismissReveal };
}
