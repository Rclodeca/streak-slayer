<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Plus, Shield, Sword } from 'lucide-vue-next';
import { isDueOn, msUntilRollover, periodKeyFor } from '../../game-engine';
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
// The popup opens set to Bad from Resist's own plus.
const addBad = ref(false);
const addButton = ref<HTMLElement | null>(null);

function openAdd(bad: boolean) {
  addBad.value = bad;
  showAddModal.value = true;
}

// A player with no habits yet is shown where to add one, until "Later".
const hintDismissed = ref(false);
const showHint = computed(() => !habitStore.habits.length && !hintDismissed.value && !showAddModal.value);

// Good habits are the skills, by period. Bad ones wait apart in Resist,
// since there's nothing to tap there unless you give in.
const goodHabits = computed(() => habitStore.habits.filter((habit) => !habit.isBad));
const badHabits = computed(() => habitStore.habits.filter((habit) => habit.isBad));

// When each period rolls over, kept fresh once a minute.
const clock = ref(debugClockStore.now());
let clockTimer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  clockTimer = setInterval(() => (clock.value = debugClockStore.now()), 60_000);
});
onUnmounted(() => clearInterval(clockTimer));

function resetLabel(period: 'daily' | 'weekly'): string {
  const hours = Math.max(1, Math.ceil(msUntilRollover(period, clock.value) / 3_600_000));
  const left = period === 'weekly' && hours > 24 ? `${Math.ceil(hours / 24)}d` : `${hours}h`;
  return period === 'weekly' ? `resets Mon · ${left}` : `resets ${left}`;
}

const dailyHabits = computed(() => sortByDamageType(goodHabits.value.filter((habit) => habit.period === 'daily')));
// Set-day skills resting today stay at the bottom of Daily, greyed out.
const orderedDailyHabits = computed(() => {
  const now = debugClockStore.now();
  return [...dailyHabits.value.filter((habit) => isDueOn(habit, now)), ...dailyHabits.value.filter((habit) => !isDueOn(habit, now))];
});
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
// skill's days moves its row down to the resting ones.
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
      <h2><Sword :size="16" class="section-icon" />Skills</h2>
      <button ref="addButton" type="button" class="add-button" aria-label="Add habit" @click="openAdd(false)"><Plus :size="16" /></button>
    </div>
    <p class="section-caption">Habits to keep</p>

    <p v-if="!goodHabits.length" class="section-empty">Nothing forged yet. Tap +.</p>
    <template v-else>
      <div class="habit-group">
        <h3 class="habit-group-title">Daily<span class="habit-group-reset">{{ resetLabel('daily') }}</span></h3>
        <ul v-if="orderedDailyHabits.length">
          <HabitListItem v-for="habit in orderedDailyHabits" :key="habit.id" :habit="habit" @open="openHabitId = habit.id" />
        </ul>
        <p v-else class="habit-group-empty">No daily habits yet.</p>
      </div>

      <div class="habit-group">
        <h3 class="habit-group-title">Weekly<span class="habit-group-reset">{{ resetLabel('weekly') }}</span></h3>
        <ul v-if="weeklyHabits.length">
          <HabitListItem v-for="habit in weeklyHabits" :key="habit.id" :habit="habit" @open="openHabitId = habit.id" />
        </ul>
        <p v-else class="habit-group-empty">No weekly habits yet.</p>
      </div>
    </template>
  </section>

  <section ref="resistEl" class="habit-list resist-list">
    <div class="habit-list-header">
      <h2><Shield :size="16" class="section-icon" />Resist</h2>
      <button type="button" class="add-button" aria-label="Add habit to resist" @click="openAdd(true)"><Plus :size="16" /></button>
    </div>
    <p class="section-caption">Habits to break</p>
    <p v-if="!resistHabits.length" class="section-empty">Nothing to resist yet. Tap +.</p>
    <ul v-else>
      <HabitListItem v-for="habit in resistHabits" :key="habit.id" :habit="habit" period-tag @open="openHabitId = habit.id" />
    </ul>
  </section>

  <AddHabitModal v-model="showAddModal" :bad="addBad" />
  <SpotlightHint
    v-if="showHint && addButton"
    :target="addButton"
    label="Add habit"
    title="Start here"
    text="Add a habit you want to keep."
    rules="Keep it, and you strike the boss. Miss it, and the boss strikes you."
    action="Later"
    @tap="openAdd(false)"
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
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin: 0 0 0.3rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text);
}

.habit-group-reset {
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  opacity: 0.75;
}

.habit-group-empty {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text);
}
</style>
