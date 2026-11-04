<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { dailyPeriodKey, dayOfWeekIndex, formatCompact, habitDamageBreakdown, isDueOn, nextDueDay, overdriveUsesRemaining, periodKeyFor } from '../../game-engine';
import type { Habit } from '../../game-engine';
import { useCombatActions } from '../../composables/useCombatActions';
import { useItemDropQueue } from '../../composables/useItemDropQueue';
import { useBossStore } from '../../store/bossStore';
import { useCharacterStore } from '../../store/characterStore';
import { useDebugClockStore } from '../../store/debugClockStore';
import { useHabitStore } from '../../store/habitStore';
import { DAMAGE_TYPE_COLORS } from './damageTypeColors';
import StatIcon from '../ui/StatIcon.vue';
import { DAMAGE_TYPE_ICON } from '../ui/statIcons';
import { MIN_STREAK_SHOWN, rankNumeral, streakStyleFor } from './habitDisplay';
import RankPips from './RankPips.vue';
import SkillSigil from './SkillSigil.vue';
import StrikeButton from './StrikeButton.vue';
import { WEEKDAY_SHORT } from './weekdays';

const props = defineProps<{ habit: Habit }>();
// The skill popup lives in HabitList, so it stays open when this row moves
// down to the resting skills.
defineEmits<{ open: [] }>();

const { checkOffHabit, activateOverdrive } = useCombatActions();
const { enqueueDrops } = useItemDropQueue();
const debugClockStore = useDebugClockStore();
const characterStore = useCharacterStore();
const bossStore = useBossStore();
const habitStore = useHabitStore();

const currentPeriodKey = computed(() => periodKeyFor(props.habit.period, debugClockStore.now()));
const isCompletedThisPeriod = computed(() => props.habit.lastCompletedPeriodKey === currentPeriodKey.value);
// A set-day skill on one of its rest days: can't be struck or overdriven.
const isResting = computed(() => !isDueOn(props.habit, debugClockStore.now()));
const nextDayLabel = computed(() =>
  props.habit.days ? WEEKDAY_SHORT[nextDueDay(props.habit.days, dayOfWeekIndex(debugClockStore.now()))] : '',
);
// A struck Overdrive skill's button stays live, haloed, until its charges are spent.
const canOverdrive = computed(
  () => !isResting.value && isCompletedThisPeriod.value && overdriveUsesRemaining(props.habit, currentPeriodKey.value) > 0,
);
const strikeState = computed(() => (isResting.value ? 'resting' : isCompletedThisPeriod.value ? 'struck' : 'open'));

const breakdown = computed(() =>
  habitDamageBreakdown(characterStore.character, props.habit, habitStore.habits, bossStore.boss, dailyPeriodKey(debugClockStore.now())),
);

const effectiveDamage = computed(() => breakdown.value.effectiveDamage);

const damageTypeColor = computed(() => DAMAGE_TYPE_COLORS[props.habit.damageType]);

const showStreak = computed(() => props.habit.streakCount >= MIN_STREAK_SHOWN);
const streakStyle = computed(() => streakStyleFor(props.habit.streakCount));

// A rank-up flares the row once: a gold sweep and the new rank rising off
// it. Mounting with a rank, or a streak-only change, plays nothing.
const RANK_FLARE_MS = 2400;
const flareRank = ref(0);
let flareTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => props.habit.rank ?? 0,
  (rank, before) => {
    if (rank <= before) return;
    flareRank.value = rank;
    clearTimeout(flareTimer);
    flareTimer = setTimeout(() => (flareRank.value = 0), RANK_FLARE_MS);
  },
);
// Landing a skill flashes its button its type colour as it goes down, before
// it fades to grey. Mounting struck plays nothing.
const LAND_FLASH_MS = 600;
const landing = ref(false);
let litTimer: ReturnType<typeof setTimeout> | undefined;
watch(isCompletedThisPeriod, (done, before) => {
  if (!done || before) return;
  landing.value = true;
  clearTimeout(litTimer);
  litTimer = setTimeout(() => (landing.value = false), LAND_FLASH_MS);
});
onBeforeUnmount(() => {
  clearTimeout(flareTimer);
  clearTimeout(litTimer);
});

// A Special or Ult skill's sigil travels with the name's last word, so it
// never wraps onto a line alone.
const hasSigil = computed(() => !!(props.habit.isSpecial || props.habit.isUlt));
const nameHead = computed(() => props.habit.name.slice(0, props.habit.name.lastIndexOf(' ') + 1));
const nameTail = computed(() => props.habit.name.slice(nameHead.value.length));

// Pressing a struck Overdrive skill's button overdrives it; otherwise it
// strikes (for a bad habit, gives in).
function onStrike() {
  const result = canOverdrive.value ? activateOverdrive(props.habit.id) : checkOffHabit(props.habit.id);
  if (result.itemsDropped.length > 0) enqueueDrops(result.itemsDropped, result.droppedBy);
}
</script>

<template>
  <li class="habit-item" :class="{ bad: habit.isBad, resting: isResting, struck: isCompletedThisPeriod, flare: flareRank > 0 }" :data-habit-id="habit.id" :style="{ '--c': damageTypeColor }" @click="$emit('open')">
    <span class="title">
      <span v-if="hasSigil" class="name">{{ nameHead }}<span class="name-end">{{ nameTail }}<SkillSigil :habit="habit" /></span></span>
      <span v-else class="name">{{ habit.name }}</span>
      <RankPips :rank="habit.rank ?? 0" />
    </span>
    <span class="meta">
      <span v-if="isResting" class="next-day">{{ nextDayLabel }}</span>
      <!-- A bad habit's reward, what holding out deals, sunk into the card so it reads as a number to wait for, not a key. -->
      <span v-if="habit.isBad" class="reward-plate"><StatIcon :name="DAMAGE_TYPE_ICON[habit.damageType]" :size="12" /><b>{{ formatCompact(effectiveDamage) }}</b></span>
      <span class="streak" :style="streakStyle" :title="showStreak ? `${habit.streakCount} streak` : undefined">
        <template v-if="showStreak"><StatIcon name="streak" :size="12" />{{ habit.streakCount }}</template>
      </span>
    </span>
    <StrikeButton
      :damage-type="habit.damageType"
      :damage="effectiveDamage"
      :state="strikeState"
      :resist="habit.isBad"
      :overdrive="canOverdrive"
      :lit="landing"
      :label="habit.isBad ? `Give in to ${habit.name}` : canOverdrive ? `Overdrive ${habit.name}` : `Complete ${habit.name}`"
      @strike="onStrike"
    />
    <span v-if="flareRank > 0" class="rank-ghost" aria-hidden="true">Rank {{ rankNumeral(flareRank) }}</span>
  </li>
</template>

<style scoped>
.habit-item {
  --row-pad: 0.6rem;
  --row-gap: 0.8rem;
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--row-gap);
  box-sizing: border-box;
  min-height: 44px;
  padding: var(--row-pad);
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}

.habit-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

/* A skill resting today: dimmed. */
.habit-item.resting {
  opacity: 0.45;
}

/* The name with the rank pips under it. */
.title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.name {
  flex: 1;
  min-width: 0;
  text-align: left;
  color: var(--text-h);
  overflow-wrap: break-word;
}

/* A bad habit rests quiet: there's nothing to do unless you give in. */
.bad .name {
  color: var(--text);
}

/* One unit, so the last word and its sigil wrap together. */
.name-end {
  display: inline-block;
}

.sigil {
  margin-left: 0.4em;
}

.meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
  font-size: 0.75rem;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.streak {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
  min-width: 3.5rem;
}

.next-day {
  padding: 0.1rem 0.35rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 0.7rem;
}

/* The rank-up flare: one sweep across the row, and the new rank rising off
   it. transform/opacity only. */
.habit-item.flare {
  overflow: hidden;
}

.habit-item.flare::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 20%, color-mix(in srgb, var(--accent) 28%, transparent) 50%, transparent 80%);
  transform: translateX(-100%);
  animation: rank-sweep 1.1s ease-out forwards;
  pointer-events: none;
}

.rank-ghost {
  position: absolute;
  right: 4rem;
  top: 50%;
  color: var(--accent);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  pointer-events: none;
  animation: rank-rise 2.4s ease-out forwards;
}

@keyframes rank-sweep {
  to {
    transform: translateX(100%);
  }
}

@keyframes rank-rise {
  0% {
    opacity: 0;
    transform: translateY(-20%);
  }
  15% {
    opacity: 1;
  }
  55% {
    opacity: 1;
    transform: translateY(-150%);
  }
  100% {
    opacity: 0;
    transform: translateY(-180%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .habit-item.flare::after {
    display: none;
  }

  .rank-ghost {
    animation: none;
    transform: translateY(-50%);
  }
}

@media (max-width: 560px) {
  .habit-item {
    --row-gap: 0.6rem;
  }

  .meta {
    gap: 0.5rem;
  }
}
</style>
