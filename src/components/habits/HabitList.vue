<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { isDueOn, periodKeyFor } from '../../game-engine';
import type { Habit } from '../../game-engine';
import { useDeathScreen } from '../../composables/useDeathScreen';
import { useItemDropQueue } from '../../composables/useItemDropQueue';
import { useMissedSkillsGate } from '../../composables/useMissedSkillsGate';
import { useModalPriority } from '../../composables/useModalPriority';
import { useQuestMissGate } from '../../composables/useQuestMissGate';
import { useDebugClockStore } from '../../store/debugClockStore';
import { useHabitStore } from '../../store/habitStore';
import { useHintStore } from '../../store/hintStore';
import type { HintId } from '../../store/hintStore';
import AddHabitModal from './AddHabitModal.vue';
import SpotlightHint from '../ui/SpotlightHint.vue';
import HabitListItem from './HabitListItem.vue';
import HabitStatsModal from './HabitStatsModal.vue';
import { sortByDamageType } from './habitDisplay';

const habitStore = useHabitStore();
const debugClockStore = useDebugClockStore();
const showAddModal = ref(false);
const addButton = ref<HTMLElement | null>(null);

// A player with no habits yet is shown where to add one, until "Later".
const hintDismissed = ref(false);
const showHint = computed(() => !habitStore.habits.length && !hintDismissed.value && !showAddModal.value);

// Good habits are the skills, by period. Bad ones wait apart in Resist,
// since there's nothing to tap there unless you give in.
const goodHabits = computed(() => habitStore.habits.filter((habit) => !habit.isBad));
const badHabits = computed(() => habitStore.habits.filter((habit) => habit.isBad));

const dailyHabits = computed(() => sortByDamageType(goodHabits.value.filter((habit) => habit.period === 'daily')));
// Set-day skills resting today fold away at the bottom of Daily.
const dueDailyHabits = computed(() => dailyHabits.value.filter((habit) => isDueOn(habit, debugClockStore.now())));
const restingDailyHabits = computed(() => dailyHabits.value.filter((habit) => !isDueOn(habit, debugClockStore.now())));
const weeklyHabits = computed(() =>
  sortByDamageType(goodHabits.value.filter((habit) => habit.period === 'weekly')),
);

// One flat list: daily, then weekly, then any resting today.
const resistHabits = computed(() => {
  const now = debugClockStore.now();
  const daily = sortByDamageType(badHabits.value.filter((habit) => habit.period === 'daily'));
  const weekly = sortByDamageType(badHabits.value.filter((habit) => habit.period === 'weekly'));
  return [...daily.filter((habit) => isDueOn(habit, now)), ...weekly, ...daily.filter((habit) => !isDueOn(habit, now))];
});

// One popup for the whole list, by id, so it stays open when changing a
// skill's days moves its row in or out of the Resting fold.
const openHabitId = ref<string | null>(null);
const openHabit = computed(() => habitStore.habits.find((habit) => habit.id === openHabitId.value));

// A new player's first good habit, and first bad one, each get one
// hint pointing at its strike button, on the first day it can be checked. It waits for any
// popup to close first. See hintStore for who counts as new.
const hintStore = useHintStore();
const { isDead } = useDeathScreen();
const { current: itemDropCurrent } = useItemDropQueue();
const { hasPending: habitMissPending } = useMissedSkillsGate();
const { hasPending: questMissPending } = useQuestMissGate();
const { bossSkillVisible, questUnlockVisible, eventChoiceVisible, questCompleteVisible } = useModalPriority();
const popupOpen = computed(
  () =>
    showAddModal.value ||
    openHabitId.value !== null ||
    isDead.value ||
    itemDropCurrent.value !== null ||
    habitMissPending.value ||
    questMissPending.value ||
    bossSkillVisible.value ||
    questUnlockVisible.value ||
    eventChoiceVisible.value ||
    questCompleteVisible.value,
);

const checkHint = computed<{ id: HintId; habit: Habit } | null>(() => {
  if (popupOpen.value) return null;
  const now = debugClockStore.now();
  for (const id of ['checkGood', 'checkBad'] as const) {
    if (hintStore.seen[id]) continue;
    const habit = habitStore.habits.find(
      (h) => h.isBad === (id === 'checkBad') && isDueOn(h, now) && h.lastCompletedPeriodKey !== periodKeyFor(h.period, now),
    );
    if (habit) return { id, habit };
  }
  return null;
});

const listEl = ref<HTMLElement | null>(null);
const resistEl = ref<HTMLElement | null>(null);
const strikeButton = ref<HTMLElement | null>(null);
watch(
  [() => checkHint.value?.habit, listEl, resistEl],
  ([habit, list, resist]) => {
    const panel = habit?.isBad ? resist : list;
    strikeButton.value = habit ? (panel?.querySelector<HTMLElement>(`[data-habit-id="${habit.id}"] button.strike`) ?? null) : null;
  },
  { flush: 'post', immediate: true },
);

const checkHintCopy = computed(() => {
  const habit = checkHint.value?.habit;
  if (!habit) return null;
  // A bad habit's press means giving in, so it isn't told to strike.
  return habit.isBad
    ? { title: 'If you give in', text: 'Tap it.', rules: `Resist it all ${habit.period === 'weekly' ? 'week' : 'day'}, and you strike the boss.` }
    : { title: 'When it’s done', text: 'Strike it.', rules: 'Each check strikes the boss.' };
});

function checkOffFromHint() {
  if (!checkHint.value) return;
  const { id } = checkHint.value;
  strikeButton.value?.click();
  hintStore.markSeen(id);
}
</script>

<template>
  <section ref="listEl" class="habit-list skill-list">
    <div class="habit-list-header">
      <h2>Skills</h2>
      <button ref="addButton" type="button" class="add-button" aria-label="Add habit" @click="showAddModal = true">+ New habit</button>
    </div>

    <p v-if="!habitStore.habits.length">No habits yet — tap + to add one.</p>
    <template v-else>
      <div class="habit-group">
        <h3 class="habit-group-title">Daily</h3>
        <ul v-if="dueDailyHabits.length">
          <HabitListItem v-for="habit in dueDailyHabits" :key="habit.id" :habit="habit" @open="openHabitId = habit.id" />
        </ul>
        <p v-else-if="!dailyHabits.length" class="habit-group-empty">No daily habits yet.</p>
        <details v-if="restingDailyHabits.length" class="rest-fold">
          <summary>Resting <span class="rest-count">{{ restingDailyHabits.length }}</span></summary>
          <ul>
            <HabitListItem v-for="habit in restingDailyHabits" :key="habit.id" :habit="habit" @open="openHabitId = habit.id" />
          </ul>
        </details>
      </div>

      <div class="habit-group">
        <h3 class="habit-group-title">Weekly</h3>
        <ul v-if="weeklyHabits.length">
          <HabitListItem v-for="habit in weeklyHabits" :key="habit.id" :habit="habit" @open="openHabitId = habit.id" />
        </ul>
        <p v-else class="habit-group-empty">No weekly habits yet.</p>
      </div>
    </template>
  </section>

  <section v-if="resistHabits.length" ref="resistEl" class="habit-list resist-list">
    <div class="habit-list-header">
      <h2>Resist</h2>
    </div>
    <ul>
      <HabitListItem v-for="habit in resistHabits" :key="habit.id" :habit="habit" period-tag @open="openHabitId = habit.id" />
    </ul>
  </section>

  <AddHabitModal v-model="showAddModal" />
  <SpotlightHint
    v-if="showHint && addButton"
    :target="addButton"
    label="Add habit"
    title="Start here"
    text="Add a habit you want to keep."
    rules="Keep it, and you strike the boss. Miss it, and the boss strikes you."
    action="Later"
    @tap="showAddModal = true"
    @dismiss="hintDismissed = true"
  />
  <SpotlightHint
    v-else-if="checkHint && checkHintCopy && strikeButton"
    :key="checkHint.id"
    :target="strikeButton"
    :label="`Complete ${checkHint.habit.name}`"
    :title="checkHintCopy.title"
    :text="checkHintCopy.text"
    :rules="checkHintCopy.rules"
    action="Got it"
    @tap="checkOffFromHint"
    @dismiss="hintStore.markSeen(checkHint.id)"
  />
  <HabitStatsModal
    v-if="openHabit"
    :model-value="true"
    :habit="openHabit"
    @update:model-value="(open) => !open && (openHabitId = null)"
  />
</template>

<style scoped>
.habit-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.habit-list-header h2 {
  margin: 0;
}

.add-button {
  padding: 0.35rem 0.9rem;
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  border-radius: 999px;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.habit-list ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.habit-group {
  margin-top: 1rem;
}

.resist-list ul {
  margin-top: 0.6rem;
}

.habit-group-title {
  margin: 0 0 0.3rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text);
}

.habit-group-empty {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text);
}

.rest-fold summary {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
  padding: 0 0.6rem;
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--text);
}

.rest-count {
  color: var(--text-h);
  font-weight: 600;
}
</style>
