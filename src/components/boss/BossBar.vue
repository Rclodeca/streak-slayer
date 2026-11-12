<script setup lang="ts">
import { computed } from 'vue';
import { formatCompact } from '../../game-engine';
import type { HeroClass } from '../../game-engine';
import type { CelebrationPhase } from '../../composables/useCelebration';
import { useDamagePopup } from '../../composables/useDamagePopup';
import { HERO_STRIP } from '../character/heroArt';
import ExpBar from '../ui/ExpBar.vue';
import HealthBar from '../ui/HealthBar.vue';
import Sprite from '../ui/Sprite.vue';
import { spriteUrl } from '../ui/spriteUrl';

// Once the fight stage has scrolled off the top, on desktop and tablet, this
// strip drops in so every hit stays in view while ticking skills (FightStage
// decides when, see useScrolledPast). Phones pin the stage instead, so the bar
// never shows there. It is the phone's Focus strip, status only and not
// tappable (the details open from the stage), with the two HP bars side by
// side: the hero at the left, then the boss, whose HP drains toward its
// sprite at the right. A kill plays here in miniature (see useCelebration):
// the sprite sinks and "Slain" takes the name's place, then the next boss
// rises.
const props = defineProps<{
  sprite: string;
  name: string;
  bossIndex: number;
  current: number;
  max: number;
  heroClass: HeroClass;
  heroName: string;
  heroCurrent: number;
  heroMax: number;
  heroLevel: number;
  heroExp: number;
  heroExpMax: number;
  shown: boolean;
  phase?: CelebrationPhase;
  /** The boss's skill breakpoints (see bossSkillMarks); mirrored below, since this bar drains to the right. */
  marks?: { at: number; state: 'armed' | 'fired' | 'spent' }[];
}>();

// Below this share of HP the hero's bar pulses.
const LOW_HEALTH_SHARE = 0.25;

const mirroredMarks = computed(() => (props.marks ?? []).map((mark) => ({ ...mark, at: 1 - mark.at })));

const heroShare = computed(() => (props.heroMax > 0 ? Math.max(0, Math.min(1, props.heroCurrent / props.heroMax)) : 0));
const heroLow = computed(() => heroShare.value < LOW_HEALTH_SHARE);
// The canvas fitted to the strip's height.
const heroWidth = `${HERO_STRIP}px`;

const { popups, isHit } = useDamagePopup(() => props.current);
const { popups: heroPopups, isHit: heroHit } = useDamagePopup(() => props.heroCurrent);
</script>

<template>
  <div class="boss-bar" :class="{ shown }" :inert="!shown || undefined">
    <div class="strip">
      <span class="hero-fig" :class="{ hit: heroHit }" :style="{ width: heroWidth }">
        <img class="hero" :src="spriteUrl(`player/${heroClass}`)" alt="" />
      </span>
      <span class="side hero-side" :class="{ low: heroLow }">
        <span class="label">
          <span class="who-name">{{ heroName }}</span>
          <span class="level">{{ heroLevel }}</span>
        </span>
        <span class="bars">
          <HealthBar :current="heroCurrent" :max="heroMax" variant="player" />
          <ExpBar :current="heroExp" :max="heroExpMax" />
        </span>
        <span v-for="popup in heroPopups" :key="popup.id" class="damage-popup" aria-hidden="true">-{{ formatCompact(popup.amount) }}</span>
      </span>
      <span class="side boss-side" :class="{ slain: phase === 'dying' }">
        <span class="label">
          <span class="boss-number">#{{ bossIndex }}</span>
          <span v-if="phase === 'dying'" class="bar-slain">Slain</span>
          <span v-else class="who-name">{{ name }}</span>
        </span>
        <HealthBar :current="current" :max="max" variant="boss" :marks="mirroredMarks" />
        <span v-for="popup in popups" :key="popup.id" class="damage-popup" aria-hidden="true">-{{ formatCompact(popup.amount) }}</span>
      </span>
      <span class="portrait" :class="{ hit: isHit, dying: phase === 'dying', arriving: phase === 'arriving' }">
        <Sprite :image-name="sprite" alt="" />
      </span>
    </div>
  </div>
</template>

<style scoped>
/* Parked above the top edge, clear of its own shadow, until it drops in. */
.boss-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 14px 24px -14px rgba(0, 0, 0, 0.6);
  transform: translateY(calc(-100% - 24px));
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.3, 1);
}

.boss-bar.shown {
  transform: none;
}

@media (max-width: 820px) {
  .boss-bar {
    display: none;
  }
}

/* The strip's row, held to the app's column (#app's 1280px less its 2rem
   padding each side): the hero at the far left, the boss at the far right,
   the two bars meeting between. */
.strip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  height: 76px;
  max-width: 1216px;
  margin-inline: auto;
  padding: 0 18px;
}

.hero-fig {
  flex-shrink: 0;
  align-self: flex-end;
  margin-bottom: 8px;
}

.hero {
  display: block;
  width: 100%;
  height: auto;
  image-rendering: pixelated;
}

.hero-fig.hit .hero {
  animation: bar-shake 0.32s ease;
}

.portrait {
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 6px;
}

.portrait :deep(.sprite) {
  width: 64px;
  height: 64px;
  object-fit: contain;
  object-position: center bottom;
  image-rendering: pixelated;
}

.portrait.hit :deep(.sprite) {
  animation: bar-shake 0.32s ease;
}

.portrait.dying :deep(.sprite) {
  transform-origin: 50% 100%;
  animation: bar-fall 1.1s cubic-bezier(0.5, 0, 0.8, 0.4) both;
}

.portrait.arriving :deep(.sprite) {
  animation: bar-arrive 0.8s cubic-bezier(0.2, 0.8, 0.3, 1) both;
}

.side {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

/* The name over its bar; the boss's sits at the right, by its sprite. */
.label {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.boss-side .label {
  justify-content: flex-end;
}

.who-name {
  min-width: 0;
  overflow: hidden;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-h);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.level,
.boss-number {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text);
}

/* The hero's EXP is a seam along the foot of the HP bar. */
.bars {
  position: relative;
}

.bars :deep(.exp-bar) {
  position: absolute;
  inset: auto 0 0;
  height: 3px;
  border-radius: 0;
  background: rgba(0, 0, 0, 0.45);
}

.bars :deep(.exp-bar-label) {
  display: none;
}

.hero-side.low :deep(.health-bar-fill) {
  animation: ring-low 1.1s ease-in-out infinite;
}

/* Drains toward the boss's sprite, its trail with it. */
.boss-side :deep(.health-bar-fill) {
  margin-left: auto;
}

.boss-side :deep(.health-bar-trail) {
  left: auto;
  right: 0;
}

.boss-side.slain :deep(.health-bar-label) {
  display: none;
}

.hero-side :deep(.health-bar-label) {
  justify-content: flex-end;
  padding-right: 7px;
}

.bar-slain {
  flex-shrink: 0;
  color: var(--text-h);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  text-shadow: 0 0 10px var(--accent);
  animation: bar-slain 0.3s ease-out;
}

/* Rises from the middle of its own bar. */
.damage-popup {
  position: absolute;
  bottom: -2px;
  left: 50%;
  color: var(--hp-color);
  font-weight: 700;
  font-size: 1.05rem;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
  text-shadow:
    0 0 10px #000,
    0 0 2px #000;
  animation: bar-hit 1s ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  .boss-bar {
    transition: none;
  }

  .portrait.dying :deep(.sprite) {
    animation: none;
    opacity: 0;
  }

  .portrait.arriving :deep(.sprite),
  .bar-slain {
    animation: none;
  }

  /* Still marked, just not pulsing. */
  .hero-side.low :deep(.health-bar-fill) {
    animation: none;
  }
}

@keyframes ring-low {
  50% {
    opacity: 0.35;
  }
}

@keyframes bar-fall {
  0% {
    transform: none;
    opacity: 1;
  }
  25% {
    transform: translateX(-2px) rotate(-3deg);
    opacity: 1;
  }
  100% {
    transform: translateY(18px) scaleY(0.7);
    opacity: 0;
  }
}

@keyframes bar-arrive {
  0% {
    opacity: 0;
    transform: translateY(12px);
  }
  100% {
    opacity: 1;
    transform: none;
  }
}

@keyframes bar-slain {
  0% {
    opacity: 0;
    transform: scale(1.3);
  }
}

@keyframes bar-shake {
  20% {
    transform: translateX(-3px);
  }
  40% {
    transform: translateX(4px);
  }
  60% {
    transform: translateX(-4px);
  }
  80% {
    transform: translateX(2px);
  }
}

@keyframes bar-hit {
  0% {
    opacity: 0;
    transform: translate(-50%, 6px) scale(0.9);
  }
  15% {
    opacity: 1;
    transform: translate(-50%, 0) scale(1.08);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -34px) scale(1);
  }
}
</style>
