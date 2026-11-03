<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue';
import { formatCompact } from '../../game-engine';
import type { EventId } from '../../game-engine';
import { useEventChoice } from '../../composables/useEventChoice';
import { useModalPriority } from '../../composables/useModalPriority';
import { TUNING } from '../../game-engine/constants/tuning';
import { useActivityLogStore } from '../../store/activityLogStore';
import type { ActivityLogEntry } from '../../store/activityLogStore';
import { useCharacterStore } from '../../store/characterStore';
import { useHabitStore } from '../../store/habitStore';
import RerollSkillRow from '../habits/RerollSkillRow.vue';
import { sortByDamageType } from '../habits/habitDisplay';
import { challengeIcon } from '../quests/challengeIcons';
import ItemHero from '../ui/ItemHero.vue';
import Modal from '../ui/Modal.vue';
import StatIcon from '../ui/StatIcon.vue';
import { BOOST_STAT_ICON, EVENT_ICON } from '../ui/statIcons';

const { pending, choices, revealed, offeredChallenge, ensureChoices, choose, chooseReroll, chooseSideQuest, dismissReveal } = useEventChoice();
const { eventChoiceVisible } = useModalPriority();
const habitStore = useHabitStore();
const characterStore = useCharacterStore();
const activityLogStore = useActivityLogStore();

// The pick leads with the level just reached and what it gave, read back
// from that level-up's log entry (left out if it has already scrolled off).
const level = computed(() => characterStore.character.level);
const levelUp = computed(() =>
  activityLogStore.entries.find(
    (entry): entry is Extract<ActivityLogEntry, { kind: 'level-up' }> => entry.kind === 'level-up' && entry.newLevel === level.value,
  ),
);
const GAIN_STATS = ['health', 'physicalDamage', 'magicDamage', 'trueDamage', 'healing'] as const;
const statGains = computed(() =>
  GAIN_STATS.map((stat) => ({ stat, amount: Math.round(levelUp.value?.statDeltas[stat] ?? 0) })).filter((gain) => gain.amount > 0),
);

watchEffect(ensureChoices);

const step = ref<'choose' | 'reroll'>('choose');
watch(choices, () => {
  step.value = 'choose';
});

// Reroll step: tap a row to pick it, then confirm.
const rerollPickId = ref<string | null>(null);
const dailyHabits = computed(() => sortByDamageType(habitStore.habits.filter((habit) => habit.period === 'daily')));
const weeklyHabits = computed(() => sortByDamageType(habitStore.habits.filter((habit) => habit.period === 'weekly')));
const rerollPick = computed(() => habitStore.habits.find((habit) => habit.id === rerollPickId.value));

function togglePick(id: string) {
  rerollPickId.value = rerollPickId.value === id ? null : id;
}

function confirmReroll() {
  if (!rerollPick.value) return;
  chooseReroll(rerollPick.value.id);
  rerollPickId.value = null;
}

const enchantFactor = TUNING.DOUBLED_ITEM_MULTIPLIER;

const subtitle = computed(() => {
  if (revealed.value) return '';
  if (step.value === 'reroll') return 'Pick a skill to re-roll. Its damage type changes; nothing else does.';
  return pending.value > 1 ? `Choose 1 event · ${pending.value} picks waiting` : 'Choose 1 event';
});

/** The deed follows "Name:" on the side card, so it starts lower case. */
function deedLower(deed: string) {
  return deed.charAt(0).toLowerCase() + deed.slice(1);
}

function onPick(id: EventId) {
  if (id === 'side-quest') chooseSideQuest();
  else if (id === 'reroll-skill') {
    rerollPickId.value = null;
    step.value = 'reroll';
  }
  else choose(id);
}
</script>

<template>
  <Modal :model-value="eventChoiceVisible" :dismissible="false" :title="revealed ? 'Enchanted!' : 'Level up!'" max-width="640px">
    <template v-if="revealed">
      <ItemHero :item="revealed" :factor="enchantFactor" />
      <button type="button" class="ok primary-button" @click="dismissReveal">Nice!</button>
    </template>

    <template v-else>
    <template v-if="step === 'choose'">
      <div class="level-emblem">
        <StatIcon name="levelUp" :size="16" class="level-emblem-up" />
        <span class="level-emblem-number">{{ level }}</span>
        <span class="level-emblem-label">Level</span>
      </div>
      <p v-if="statGains.length" class="gains">
        <span v-for="gain in statGains" :key="gain.stat"><StatIcon :name="BOOST_STAT_ICON[gain.stat]" />+{{ formatCompact(gain.amount) }}</span>
      </p>
    </template>
    <p class="subtitle" :class="{ count: step === 'choose' && !revealed }">{{ subtitle }}</p>

    <div v-if="step === 'choose'" class="cards">
      <button
        v-for="event in choices"
        :key="event.id"
        type="button"
        class="card"
        :class="{ side: event.id === 'side-quest' && offeredChallenge }"
        @click="onPick(event.id)"
      >
        <template v-if="event.id === 'side-quest' && offeredChallenge">
          <span class="side-socket"><component :is="challengeIcon(offeredChallenge.icon)" :size="22" /></span>
          <span class="card-text">
            <small class="side-caption">Side quest</small>
            <strong class="card-title">Complete a challenge for a rare item</strong>
            <span class="card-desc"><b class="side-name">{{ offeredChallenge.name }}:</b> {{ deedLower(offeredChallenge.deed) }}</span>
          </span>
        </template>
        <template v-else>
          <StatIcon :name="EVENT_ICON[event.id]" :size="22" class="icon" />
          <span class="card-text">
            <strong class="card-title">{{ event.title }}</strong>
            <span v-if="event.description" class="card-desc">{{ event.description }}</span>
          </span>
        </template>
      </button>
    </div>

    <template v-else-if="step === 'reroll'">
      <div v-for="group in [{ label: 'Daily', habits: dailyHabits }, { label: 'Weekly', habits: weeklyHabits }]" :key="group.label" class="habit-group">
        <template v-if="group.habits.length">
          <h3 class="habit-group-title">{{ group.label }}</h3>
          <ul class="reroll-list">
            <RerollSkillRow
              v-for="habit in group.habits"
              :key="habit.id"
              :habit="habit"
              :selected="habit.id === rerollPickId"
              @pick="togglePick(habit.id)"
            />
          </ul>
        </template>
      </div>
      <button type="button" class="ok primary-button" :disabled="!rerollPick" @click="confirmReroll">
        {{ rerollPick ? `Reroll ${rerollPick.name}` : 'Pick a skill' }}
      </button>
      <button type="button" class="back" @click="step = 'choose'">← Back</button>
    </template>

    </template>
  </Modal>
</template>

<style scoped>
.level-emblem {
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  margin: 0.25rem auto 0.75rem;
  border: 2px solid var(--accent);
  border-radius: 50%;
  box-shadow: 0 0 24px -6px var(--accent);
  animation: emblem-in 0.5s cubic-bezier(0.2, 0.8, 0.3, 1);
}

.level-emblem-number {
  color: var(--text-h);
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
}

.gains {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem 0.7rem;
  margin: 0 0 1rem;
  padding: 0.5rem 0;
  border-block: 1px solid var(--border);
  color: var(--text-h);
  font-size: 0.9rem;
  font-weight: 700;
}

.gains > span {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

@keyframes emblem-in {
  0% {
    opacity: 0;
    transform: scale(0.6);
  }
}

@media (prefers-reduced-motion: reduce) {
  .level-emblem {
    animation: none;
  }
}

.subtitle {
  margin: 0 0 1rem;
  color: var(--text);
}

.cards {
  display: grid;
  gap: 0.5rem;
}

.card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 64px;
  padding: 0.75rem 0.9rem;
  text-align: left;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: border-color 0.15s, background-color 0.15s;
}

.card:hover,
.card:focus-visible {
  border-color: var(--accent);
  background: var(--accent-bg);
}

.card-text {
  display: grid;
  justify-items: start;
  gap: 0.2rem;
  min-width: 0;
}

.card-title {
  color: var(--text-h);
  font-size: 1.05rem;
}

.card-desc {
  color: var(--text);
  font-size: 0.85rem;
  line-height: 1.4;
}

/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.side-socket {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
}

.side-caption {
  color: var(--text);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.habit-group {
  margin-top: 0.75rem;
}

.reroll-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ok {
  display: block;
  width: 100%;
  margin-top: 0.75rem;
}

.back {
  margin-top: 0.75rem;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-h);
}
</style>
