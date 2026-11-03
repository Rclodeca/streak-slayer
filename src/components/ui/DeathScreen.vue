<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { Flame } from 'lucide-vue-next';
import { heroClassFor } from '../../game-engine';
import { lockBodyScroll } from '../../composables/useBodyScrollLock';
import { useCombatActions } from '../../composables/useCombatActions';
import { useDeathScreen } from '../../composables/useDeathScreen';
import { deathLines } from '../../composables/useHoodedFigure';
import { useBossStore } from '../../store/bossStore';
import { useCharacterStore } from '../../store/characterStore';
import { useHabitStore } from '../../store/habitStore';
import RankPips from '../habits/RankPips.vue';
import HoodedSpeech from './HoodedSpeech.vue';
import { baseSpriteUrl } from './spriteUrl';
import StatIcon from './StatIcon.vue';

// A death plays in two parts over the whole screen (docs/mockups/pixel-hooded-flow.html):
// the hooded figure's line over the fallen hero, then a bonfire where each
// skill that keeps its power burns on. "Rise again" there starts the reset.
const { isDead } = useDeathScreen();
const { restart } = useCombatActions();
const bossStore = useBossStore();
const characterStore = useCharacterStore();
const habitStore = useHabitStore();

const phase = ref<'speak' | 'fire'>('speak');
const lines = ref<string[]>([]);

const heroClass = computed(() => heroClassFor(characterStore.character));
const heroLabel = computed(() => heroClass.value.charAt(0).toUpperCase() + heroClass.value.slice(1));

let releaseScrollLock: (() => void) | null = null;
function unlock() {
  releaseScrollLock?.();
  releaseScrollLock = null;
}
watch(
  isDead,
  (dead) => {
    if (dead) {
      phase.value = 'speak';
      lines.value = deathLines({ level: characterStore.character.level, bossIndex: bossStore.boss.index });
      if (!releaseScrollLock) releaseScrollLock = lockBodyScroll();
    } else {
      unlock();
    }
  },
  { immediate: true },
);
onBeforeUnmount(unlock);

// What survives the death: every skill with a rank or a live streak, one
// flame each, strongest first. A skill whose streak just broke stays, cold.
const embers = computed(() =>
  habitStore.habits
    .filter((habit) => (habit.rank ?? 0) > 0 || habit.streakCount > 0)
    .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0) || b.streakCount - a.streakCount),
);

// The fire is two pixel-art frames, swapped as it flickers: each lit art pixel
// (6px square) one box-shadow on a single square.
const FLAME_FRAMES = [
  ['....r....', '...ror...', '..royor..', '..ryyyr..', '.roywyor.', '.rywwwyr.', 'roywwwyor', 'ryywwwyyr', 'royyyyyor', '.rooyoor.'],
  ['...r.....', '...ro....', '..roor...', '..royyr..', '.royyyor.', '.rywwwyr.', 'roywwwyor', 'ryywwwyyr', 'roywyyyor', '.rooooor.'],
];
const FLAME_COLORS: Record<string, string> = { r: '#b8402f', o: '#e08a3c', y: '#f2cf6a', w: '#fff3c4' };
const flames = FLAME_FRAMES.map((rows) =>
  rows
    .flatMap((row, y) => [...row].flatMap((c, x) => (c === '.' ? [] : [`${x * 6}px ${(y - rows.length) * 6}px 0 ${FLAME_COLORS[c]}`])))
    .join(','),
);

// A few sparks rising off it, each on its own path and beat. Only for show.
const between = (low: number, high: number) => low + Math.random() * (high - low);
const sparks = Array.from({ length: 14 }, () => ({
  '--x': `${Math.round(between(-24, 24))}px`,
  '--dx': `${Math.round(between(-30, 30))}px`,
  '--t': `${between(1.6, 3).toFixed(1)}s`,
  '--d': `${between(0, 3).toFixed(1)}s`,
}));
</script>

<template>
  <Teleport to="body">
    <div v-if="isDead" class="death-layer">
      <HoodedSpeech v-if="phase === 'speak'" :lines="lines" kind="death" :hero-class="heroClass" @done="phase = 'fire'" />

      <div v-else class="bonfire">
        <p class="who">{{ characterStore.character.name }}</p>
        <p class="meta">Level {{ characterStore.character.level }} {{ heroLabel }} · Boss {{ bossStore.boss.index }}</p>

        <div class="fire-stage" aria-hidden="true">
          <span class="stars" />
          <div class="mound" />
          <span class="glow" />
          <img class="spirit" :src="baseSpriteUrl(`player/${heroClass}`)" alt="" />
          <span class="blade" />
          <span class="logs" />
          <span class="fire"><i v-for="(frame, n) in flames" :key="n" :style="{ boxShadow: frame }" /></span>
          <i v-for="(spark, n) in sparks" :key="n" class="spark" :style="spark" />
        </div>

        <template v-if="embers.length">
          <p class="kept">Your skills keep their power</p>
          <ul class="kindle">
            <li v-for="(habit, n) in embers" :key="habit.id" class="ember" :class="{ cold: habit.streakCount === 0 }">
              <span class="fl" :style="{ '--d': `${(n * 0.3).toFixed(1)}s` }"><Flame :size="22" :stroke-width="2" /></span>
              <span class="n">{{ habit.name }}</span>
              <RankPips :rank="habit.rank ?? 0" />
              <span class="streak">
                <template v-if="habit.streakCount > 0"><StatIcon name="streak" :size="12" />{{ habit.streakCount }}</template>
                <template v-else>—</template>
              </span>
            </li>
          </ul>
        </template>

        <button type="button" class="restart-button" @click="restart">Rise again</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Above every popup (Modal is 1000), and the only thing on screen. */
.death-layer {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: #050609;
}

.death-layer > * {
  flex: 1;
}

/* The bonfire: a calmer screen than the death line, no heading. */
.bonfire {
  position: relative;
  padding: calc(70px + env(safe-area-inset-top)) 12px calc(28px + env(safe-area-inset-bottom));
  background: radial-gradient(60% 34% at 50% 44%, rgba(224, 138, 60, 0.22), transparent 70%), #050609;
  overflow: hidden;
  text-align: center;
}

.who {
  margin: 0;
  color: var(--text-h);
  font: 600 18px 'Alegreya', Georgia, serif;
}

.meta {
  margin: 2px 0 0;
  font-size: 14px;
}

.fire-stage {
  position: relative;
  height: 250px;
  margin-top: 10px;
}

.stars {
  position: absolute;
  left: 0;
  top: 4px;
  width: 2px;
  height: 2px;
  background: transparent;
  box-shadow:
    40px 20px #3a4358,
    120px 12px #2c3446,
    230px 30px #3a4358,
    300px 10px #4a5470,
    352px 52px #2c3446,
    200px 60px #2c3446,
    70px 70px #232a39,
    330px 80px #3a4358,
    20px 50px #2c3446;
}

.mound {
  position: absolute;
  inset: auto -12px 0;
  height: 32px;
  background: #0c0e14;
  box-shadow: inset 0 3px 0 #171b25;
}

.glow {
  position: absolute;
  left: 50%;
  bottom: 18px;
  width: 220px;
  height: 30px;
  margin-left: -110px;
  background: radial-gradient(closest-side, rgba(224, 138, 60, 0.3), transparent);
  animation: breathe 2.4s ease-in-out infinite;
}

/* The hero's ghost, sitting by the fire; his blade stands in the ground. */
.spirit {
  position: absolute;
  left: 20px;
  bottom: 30px;
  width: 112px;
  height: 112px;
  image-rendering: pixelated;
  filter: grayscale(1) brightness(1.6) sepia(0.2) hue-rotate(180deg);
  opacity: 0.28;
  animation: drift 3.2s ease-in-out infinite;
  -webkit-mask-image: linear-gradient(#000 40%, transparent 95%);
  mask-image: linear-gradient(#000 40%, transparent 95%);
}

@keyframes drift {
  50% {
    transform: translateY(-6px);
    opacity: 0.38;
  }
}

.blade {
  position: absolute;
  right: 52px;
  bottom: 30px;
  width: 6px;
  height: 66px;
  background: linear-gradient(90deg, #8d96a8 50%, #5b6272 50%);
  clip-path: polygon(0 6px, 50% 0, 100% 6px, 100% 100%, 0 100%);
}

.blade::before {
  content: '';
  position: absolute;
  left: -9px;
  top: 14px;
  width: 24px;
  height: 5px;
  background: #6b5a3a;
}

.logs {
  position: absolute;
  left: 50%;
  bottom: 30px;
  width: 84px;
  height: 14px;
  margin-left: -42px;
}

.logs::before,
.logs::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 8px;
  background: #4a3020;
  box-shadow:
    inset 0 2px 0 #6b4630,
    inset 0 -2px 0 #24160e;
}

.logs::before {
  top: 0;
  transform: rotate(8deg);
}

.logs::after {
  bottom: 0;
  transform: rotate(-8deg);
}

.fire {
  position: absolute;
  left: 50%;
  bottom: 42px;
  width: 6px;
  height: 6px;
  margin-left: -30px;
}

.fire i {
  position: absolute;
  left: 0;
  top: 0;
  width: 6px;
  height: 6px;
  opacity: 0;
  animation: flick-b 0.6s steps(1) infinite;
}

.fire i:first-child {
  opacity: 1;
  animation-name: flick-a;
}

@keyframes flick-a {
  0%,
  49.9% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}

@keyframes flick-b {
  0%,
  49.9% {
    opacity: 0;
  }
  50%,
  100% {
    opacity: 1;
  }
}

@keyframes breathe {
  50% {
    opacity: 0.6;
  }
}

.spark {
  position: absolute;
  left: calc(50% + var(--x));
  bottom: 110px;
  width: 3px;
  height: 3px;
  background: #f2cf6a;
  box-shadow: 0 0 4px #e08a3c;
  opacity: 0;
  animation: rise var(--t) linear infinite;
  animation-delay: var(--d);
}

@keyframes rise {
  0% {
    opacity: 0;
    transform: translate(0, 0);
  }
  10% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(var(--dx), -150px);
  }
}

.kept {
  margin: 16px 2px 10px;
  color: var(--text);
  font: 600 10px 'Cinzel', serif;
  letter-spacing: 0.24em;
  text-indent: 0.24em;
  text-transform: uppercase;
}

/* One flame per surviving skill: its name, its rank in pips, its streak. */
.kindle {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ember {
  display: grid;
  justify-items: center;
  gap: 5px;
  width: 104px;
  padding: 10px 6px 8px;
  clip-path: var(--px3);
  background: #0e1017;
  box-shadow:
    inset 0 0 0 1px #2a2418,
    inset 0 -18px 24px -12px rgba(224, 138, 60, 0.18);
}

.fl {
  display: inline-flex;
  width: 22px;
  height: 22px;
  color: #e08a3c;
  filter: drop-shadow(0 0 5px rgba(224, 138, 60, 0.7));
  animation: breathe 1.8s ease-in-out infinite;
  animation-delay: var(--d);
}

.n {
  max-width: 100%;
  overflow: hidden;
  color: var(--text-h);
  font: 600 13.5px 'Alegreya', Georgia, serif;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.streak {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--text-h);
  font: 700 13px 'Alegreya Sans', sans-serif;
  line-height: 1;
}

.streak :deep(.stat-icon) {
  --k: currentColor;
}

/* A broken streak leaves the flame cold. */
.ember.cold {
  box-shadow: inset 0 0 0 1px #1b1f29;
}

.ember.cold .fl {
  color: #4a4f5a;
  filter: none;
  animation: none;
}

.ember.cold .n {
  color: var(--text);
}

.ember.cold .streak {
  color: var(--spent-text, var(--text));
  font-weight: 500;
}

.restart-button {
  display: block;
  width: 100%;
  margin-top: 1.4rem;
  font-weight: 700;
}

@media (prefers-reduced-motion: reduce) {
  .glow,
  .spirit,
  .fl,
  .fire i,
  .spark {
    animation: none;
  }

  .spark {
    display: none;
  }
}
</style>
