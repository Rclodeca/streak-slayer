<script setup lang="ts">
import { computed, watch } from 'vue';
import { Anvil, Gift, Lock, ScrollText, Sword, UserRound } from 'lucide-vue-next';
import { dailyPeriodKey, dayOfWeekIndex, isDueOn, periodKeyFor, questsOpen, talentPointsUnspent, talentsOpen, trialsOpen } from '../../game-engine';
import { useCharacterStore } from '../../store/characterStore';
import { useDebugClockStore } from '../../store/debugClockStore';
import { useHabitStore } from '../../store/habitStore';
import { useQuestStore } from '../../store/questStore';
import { useTabStore } from '../../store/tabStore';
import { useTrialsBadge } from '../../composables/useTrialsBadge';

// The phone's bottom bar (docs/mockups/pixel-tabs-final.html): which list
// shows under the stage. Quests counts what's due today or overdue; Trials
// counts the finished trials waiting to be claimed, or else wears a pip while a
// new trial waits unseen (a claim outranks a new trial). Talents counts the
// points still to spend. Skills counts the good skills still to do today: the
// dailies that are due and unchecked, and on a Sunday (the last day of the
// Monday-start week) the unchecked weeklies too. Sealed (before QUESTS_UNLOCK_LEVEL,
// TRIALS_UNLOCK_LEVEL and TALENTS_UNLOCK_LEVEL) Quests, Trials and Talents each
// grey out under a lock, with no badges, and can't be tapped.
const tabStore = useTabStore();
const characterStore = useCharacterStore();
const questStore = useQuestStore();
const habitStore = useHabitStore();
const debugClockStore = useDebugClockStore();
const { claimCount, newTrial } = useTrialsBadge();

const TABS = [
  { id: 'skills', label: 'Skills', icon: Sword },
  { id: 'quests', label: 'Quests', icon: ScrollText },
  { id: 'trials', label: 'Trials', icon: Gift },
  { id: 'talents', label: 'Talents', icon: Anvil },
  { id: 'hero', label: 'Hero', icon: UserRound },
] as const;

const questsSealed = computed(() => !questsOpen(characterStore.character));
const trialsSealed = computed(() => !trialsOpen(characterStore.character));
const talentsSealed = computed(() => !talentsOpen(characterStore.character));
/** Whether a tab is greyed out under its lock. */
function isSealed(id: (typeof TABS)[number]['id']): boolean {
  return (id === 'quests' && questsSealed.value) || (id === 'trials' && trialsSealed.value) || (id === 'talents' && talentsSealed.value);
}
// A death can seal the tab on show again (the run starts over at level 1), so it
// falls back to Skills rather than leaving its seal up with no way to tap it.
watch(
  () => TABS.find((tab) => tab.id === tabStore.tab && isSealed(tab.id)),
  (sealed) => {
    if (sealed) tabStore.select('skills');
  },
);
const todayKey = computed(() => dailyPeriodKey(debugClockStore.now()));
// dueDateKey is YYYY-MM-DD, so it compares as text.
const dueCount = computed(() => questStore.quests.filter((quest) => !quest.doneDayKey && (quest.overdue || quest.dueDateKey <= todayKey.value)).length);
const skillsLeft = computed(() => {
  const now = debugClockStore.now();
  const sunday = dayOfWeekIndex(now) === 6;
  return habitStore.habits.filter(
    (habit) =>
      !habit.isBad &&
      (habit.period === 'daily' ? isDueOn(habit, now) : sunday) &&
      habit.lastCompletedPeriodKey !== periodKeyFor(habit.period, now),
  ).length;
});
const points = computed(() => talentPointsUnspent(characterStore.character));
</script>

<template>
  <div class="tab-bar" role="tablist" aria-label="Lists">
    <button
      v-for="tab in TABS"
      :key="tab.id"
      type="button"
      role="tab"
      class="tab"
      :class="[`tab-${tab.id}`, { selected: tabStore.tab === tab.id, sealed: isSealed(tab.id) }]"
      :aria-selected="tabStore.tab === tab.id"
      :disabled="isSealed(tab.id)"
      @click="tabStore.select(tab.id)"
    >
      <component :is="tab.icon" :size="21" class="tab-icon" />
      <span class="tab-label">{{ tab.label }}</span>
      <Lock v-if="isSealed(tab.id)" :size="12" class="tab-lock" aria-hidden="true" />
      <span v-else-if="tab.id === 'skills' && skillsLeft" class="tab-count" aria-label="Left to do today"><span>{{ skillsLeft }}</span></span>
      <span v-else-if="tab.id === 'quests' && dueCount" class="tab-count"><span>{{ dueCount }}</span></span>
      <span v-else-if="tab.id === 'trials' && claimCount" class="tab-count" aria-label="Ready to claim"><span>{{ claimCount }}</span></span>
      <span v-else-if="tab.id === 'trials' && newTrial" class="tab-pip" role="img" aria-label="New" />
      <span v-else-if="tab.id === 'talents' && points" class="tab-count" aria-label="Points to spend"><span>{{ points }}</span></span>
    </button>
  </div>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. The bar runs
   under an iPhone's home bar, its tabs clear of it (the safe-area inset, real
   with index.html's viewport-fit=cover), and keeps a little air under its
   labels on phones without one. */
.tab-bar {
  display: flex;
  padding: 0 6px max(14px, env(safe-area-inset-bottom, 0px));
  background: var(--bg);
  border-top: 1px solid var(--border);
}

.tab {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 58px;
  padding: 3px 0 0;
  background: none;
  border: 0;
  border-radius: 0;
  color: var(--text);
  font-size: 0.7rem;
  -webkit-tap-highlight-color: transparent;
}

.tab.selected {
  color: var(--text-h);
}

/* The badges ride the icon's top-right corner. */
.tab-lock,
.tab-count,
.tab-pip {
  position: absolute;
  top: 6px;
  left: calc(50% + 7px);
}

.tab-count {
  min-width: 16px;
  font-size: 0.7rem;
  font-weight: 800;
  line-height: 16px;
}

.tab-pip {
  width: 8px;
  height: 8px;
  margin-top: 2px;
  background: var(--accent);
}
</style>
