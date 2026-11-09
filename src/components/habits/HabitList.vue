<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Plus, Shield, Sword } from 'lucide-vue-next';
import { isDueOn, periodKeyFor } from '../../game-engine';
import type { Habit } from '../../game-engine';
import { useDeathScreen } from '../../composables/useDeathScreen';
import { useItemDropQueue } from '../../composables/useItemDropQueue';
import { useMissedSkillsGate } from '../../composables/useMissedSkillsGate';
import { usePhoneLayout } from '../../composables/usePhoneLayout';
import { useModalPriority } from '../../composables/useModalPriority';
import { useQuestMissGate } from '../../composables/useQuestMissGate';
import { useDebugClockStore } from '../../store/debugClockStore';
import { useHabitStore } from '../../store/habitStore';
import { useHintStore } from '../../store/hintStore';
import type { HintId } from '../../store/hintStore';
import { useTabStore } from '../../store/tabStore';
import AddHabitModal from './AddHabitModal.vue';
import SectionTitle from '../ui/SectionTitle.vue';
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

// The hints wait while a phone shows another tab (TabBar).
const isPhone = usePhoneLayout();
const tabStore = useTabStore();
const offTab = computed(() => isPhone.value && tabStore.tab !== 'skills');

// A player with no habits yet is shown where to add one, until "Later".
const hintDismissed = ref(false);
const showHint = computed(() => !habitStore.habits.length && !hintDismissed.value && !showAddModal.value && !offTab.value);

// Good habits are the skills, by period. Bad ones wait apart in Resist,
// since there's nothing to tap there unless you give in.
const goodHabits = computed(() => habitStore.habits.filter((habit) => !habit.isBad));
const badHabits = computed(() => habitStore.habits.filter((habit) => habit.isBad));

const dailyHabits = computed(() => sortByDamageType(goodHabits.value.filter((habit) => habit.period === 'daily')));
// Set-day skills resting today stay at the bottom of Daily, greyed out.
const orderedDailyHabits = computed(() => {
  const now = debugClockStore.now();
  return [...dailyHabits.value.filter((habit) => isDueOn(habit, now)), ...dailyHabits.value.filter((habit) => !isDueOn(habit, now))];
});
const weeklyHabits = computed(() =>
  sortByDamageType(goodHabits.value.filter((habit) => habit.period === 'weekly')),
);

// Resist is split like Skills: daily (resting ones last, greyed), then weekly.
const resistDailyHabits = computed(() => {
  const now = debugClockStore.now();
  const daily = sortByDamageType(badHabits.value.filter((habit) => habit.period === 'daily'));
  return [...daily.filter((habit) => isDueOn(habit, now)), ...daily.filter((habit) => !isDueOn(habit, now))];
});
const resistWeeklyHabits = computed(() =>
  sortByDamageType(badHabits.value.filter((habit) => habit.period === 'weekly')),
);

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
  if (popupOpen.value || offTab.value) return null;
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
      <SectionTitle title="Skills"><Sword :size="18" class="section-icon" /></SectionTitle>
      <button ref="addButton" type="button" class="add-button" aria-label="Add habit" @click="openAdd(false)"><Plus :size="16" /></button>
    </div>

    <template v-if="!goodHabits.length">
      <div class="habit-group-head"><span class="habit-group-caption">Habits to keep</span></div>
      <p class="section-empty">Nothing forged yet. Tap +.</p>
    </template>
    <template v-else>
      <div class="habit-group">
        <div class="habit-group-head">
          <span class="habit-group-caption">Habits to keep</span>
          <h3 v-if="orderedDailyHabits.length" class="habit-group-label">Daily</h3>
        </div>
        <ul v-if="orderedDailyHabits.length">
          <HabitListItem v-for="habit in orderedDailyHabits" :key="habit.id" :habit="habit" @open="openHabitId = habit.id" />
        </ul>
        <p v-else class="habit-group-empty">No daily habits yet.</p>
      </div>

      <div v-if="weeklyHabits.length" class="habit-group">
        <div class="habit-group-head"><h3 class="habit-group-label">Weekly</h3></div>
        <ul>
          <HabitListItem v-for="habit in weeklyHabits" :key="habit.id" :habit="habit" @open="openHabitId = habit.id" />
        </ul>
      </div>
    </template>
  </section>

  <section ref="resistEl" class="habit-list resist-list">
    <div class="habit-list-header">
      <SectionTitle title="Resist"><Shield :size="18" class="section-icon" /></SectionTitle>
      <button type="button" class="add-button" aria-label="Add habit to resist" @click="openAdd(true)"><Plus :size="16" /></button>
    </div>
    <template v-if="!badHabits.length">
      <div class="habit-group-head"><span class="habit-group-caption">Habits to break</span></div>
      <p class="section-empty">Nothing to resist yet. Tap +.</p>
    </template>
    <template v-else>
      <div class="habit-group">
        <div class="habit-group-head">
          <span class="habit-group-caption">Habits to break</span>
          <h3 v-if="resistDailyHabits.length" class="habit-group-label">Daily</h3>
        </div>
        <ul v-if="resistDailyHabits.length">
          <HabitListItem v-for="habit in resistDailyHabits" :key="habit.id" :habit="habit" @open="openHabitId = habit.id" />
        </ul>
        <p v-else class="habit-group-empty">No daily habits yet.</p>
      </div>

      <div v-if="resistWeeklyHabits.length" class="habit-group">
        <div class="habit-group-head"><h3 class="habit-group-label">Weekly</h3></div>
        <ul>
          <HabitListItem v-for="habit in resistWeeklyHabits" :key="habit.id" :habit="habit" @open="openHabitId = habit.id" />
        </ul>
      </div>
    </template>
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

.habit-group-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin: 0 0 0.3rem;
  font-size: 0.7rem;
  color: var(--text);
}

.habit-group-label {
  margin: 0 0 0 auto;
  font-size: inherit;
}

.habit-group-empty {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text);
}
</style>
