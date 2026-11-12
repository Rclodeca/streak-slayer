<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { heroClassFor } from '../../game-engine';
import type { Habit } from '../../game-engine';
import { useHeroStats } from '../../composables/useHeroStats';
import { useDebugBackdropStore } from '../../store/debugBackdropStore';
import { useHabitStore } from '../../store/habitStore';
import { baseSpriteUrl } from '../ui/spriteUrl';
import StatIcon from '../ui/StatIcon.vue';
import { HERO_STAGE_CANVAS } from './heroArt';

// The phone's Hero tab banner (docs/mockups/hero-armory.html, option B): the
// armory, pinned at the top of the screen where the fight stage's Focus strip
// would be, the hero stood on its clear floor, their name on a plate on the wall
// and their level and best streak on two plates at its foot. The page's menu rides
// in its corner through the default slot, as it does on the stage.
//
// The art is native pixel art at the standard backdrop size, 216 x 116, the fight
// stage's arena's too (docs/pixellab-scenes.md), drawn at 2 CSS px per art pixel
// (like the stage's hero), so it is 432 x 232 and wider than most phones. It sits centred
// and the page crops the sides evenly, so a narrow phone loses some rack and shield
// and keeps the hero. The offset is snapped to whole CSS px, so on a phone of an
// odd width the art pixels still land on whole device pixels.
const baseUrl = import.meta.env.BASE_URL;
const ART_W = 432;
const ART_H = 232;

const { character, heroName, displayLevel } = useHeroStats();
const habitStore = useHabitStore();
// Testing: the debug menu can swap the armory for one of the stage's arenas.
const debugBackdrop = useDebugBackdropStore();
const roomUrl = computed(() =>
  debugBackdrop.home === 'armory' ? `${baseUrl}sprites/home/armory.png` : `${baseUrl}sprites/stage/${debugBackdrop.home}.png`,
);
const heroClass = computed(() => heroClassFor(character.value));

// The longest streak running now, and whose it is.
const bestStreak = computed(() =>
  habitStore.habits.reduce<Habit | null>((best, habit) => (habit.streakCount > (best?.streakCount ?? 0) ? habit : best), null),
);
const streak = computed(() => bestStreak.value?.streakCount ?? 0);
const streakLabel = computed(() => `Best streak ${streak.value}${bestStreak.value ? `, ${bestStreak.value.name}` : ''}`);

const frame = ref<HTMLElement | null>(null);
const offset = ref(0);
let observer: ResizeObserver | null = null;

function place() {
  const width = frame.value?.clientWidth ?? ART_W;
  offset.value = Math.floor((width - ART_W) / 2);
}

onMounted(() => {
  place();
  if (typeof ResizeObserver === 'function' && frame.value) {
    observer = new ResizeObserver(place);
    observer.observe(frame.value);
  }
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <section class="home-base" aria-label="Home base">
    <div
      ref="frame"
      class="home-crop"
      :style="{ '--art-w': `${ART_W}px`, '--art-h': `${ART_H}px`, '--art-x': `${offset}px`, '--hero-size': `${HERO_STAGE_CANVAS}px` }"
    >
      <div class="home-art">
        <img class="home-room" :src="roomUrl" alt="" />
        <img class="home-hero" :src="baseSpriteUrl(`player/${heroClass}`)" alt="" />
      </div>
      <h2 class="home-name plate">{{ heroName }}</h2>
      <span class="home-stat plate level"><StatIcon name="levelUp" /><small>Level</small><b class="home-value">{{ displayLevel }}</b></span>
      <span class="home-stat plate streak" :aria-label="streakLabel">
        <StatIcon name="streak" /><small>Best streak</small><b class="home-value">{{ streak }}</b>
      </span>
    </div>
    <div class="stage-menu"><slot /></div>
  </section>
</template>

<style scoped>
/* Pinned like the stage: the top row of the phone's grid, above the lists and their
   buttons and below the popups. The dark behind the art also fills the status bar's
   inset. */
.home-base {
  grid-column: 1 / -1;
  position: relative;
  z-index: 8;
  padding-top: env(safe-area-inset-top, 0px);
  background: #07080c;
  border-bottom: 3px solid var(--card-lip, #05060a);
  box-shadow: 0 10px 18px -8px rgba(0, 0, 0, 0.7);
}

/* Clips the art's sides; the menu sits outside it so its panel can open past the edge. */
.home-crop {
  position: relative;
  height: var(--art-h);
  overflow: hidden;
}

/* The art's own box, centred by a whole-px offset so the sides crop evenly. */
.home-art {
  position: absolute;
  top: 0;
  left: var(--art-x);
  width: var(--art-w);
  height: var(--art-h);
}

.home-room,
.home-hero {
  position: absolute;
  max-width: none;
  image-rendering: pixelated;
}

.home-room {
  inset: 0;
  width: var(--art-w);
  height: var(--art-h);
  /* A backdrop of another size (the testing toggle's older arenas, 216 x 108 to
     216 x 148) keeps 2 CSS px per art pixel and shows its bottom. */
  object-fit: cover;
  object-position: bottom;
}

/* The base build (64px art) at the stage's size: 2 CSS px per art pixel, stood on
   the clear floor in the middle, its feet on art row 101 (the armory's 8 bottom
   rows are the floor added below it). */
.home-hero {
  left: calc((var(--art-w) - var(--hero-size)) / 2);
  bottom: 30px;
  width: var(--hero-size);
  height: var(--hero-size);
}

/* Dark plates, the same in every theme (the scene is always night): near-black
   with a 2px bevel, as in the mock. */
.plate {
  position: absolute;
  z-index: 1;
  margin: 0;
  padding: 5px 10px;
  background: rgba(7, 8, 12, 0.88);
  box-shadow:
    inset 2px 2px 0 #333c52,
    inset -2px -2px 0 #0c0f15;
  clip-path: var(--px2, none);
}

.home-name {
  left: 12px;
  top: 12px;
  font-family: var(--heading);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #f0f3f7;
}

.home-stat {
  bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1;
  color: #f0f3f7;
}

.home-stat.level {
  left: 12px;
}

.home-stat.streak {
  right: 12px;
}

.home-stat :deep(svg) {
  width: 14px;
  height: 14px;
}

.home-stat small {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #a9adb6;
}

.home-value {
  font-family: var(--serif);
  font-size: 1.05rem;
  font-weight: 700;
}

/* The page's menu, over the corner (as on the fight stage). */
.stage-menu {
  position: absolute;
  z-index: 7;
  top: calc(6px + env(safe-area-inset-top, 0px));
  right: 0;
  padding-right: calc(2px + env(safe-area-inset-right, 0px));
}
</style>
