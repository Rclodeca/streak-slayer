<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue';
import { formatCompact, heroClassFor, type DamageType } from '../../game-engine';
import { useCelebration } from '../../composables/useCelebration';
import { useHeroStats } from '../../composables/useHeroStats';
import { useHitFeed } from '../../composables/useHitFeed';
import { usePhoneLayout } from '../../composables/usePhoneLayout';
import { usePress } from '../../composables/usePress';
import { useHabitStore } from '../../store/habitStore';
import { useTabStore } from '../../store/tabStore';
import ExpBar from '../ui/ExpBar.vue';
import HealthBar from '../ui/HealthBar.vue';
import Modal from '../ui/Modal.vue';
import StatIcon from '../ui/StatIcon.vue';
import { HERO_PHONE_PLACEMENT, HERO_PLACEMENT } from './heroArt';
import HeroDetails from './HeroDetails.vue';
import PlayerSprite from './PlayerSprite.vue';

// A condensed, always-visible emoji stat line (Buffed numbers) sits under
// the bars; the Base/Buffed breakdown and the gear live in the details
// (HeroDetails) behind the hero's half of the stage: the Hero tab on a phone,
// a popup on wider screens. See BossPanel.vue for the same pattern.
const showDetails = ref(false);
const isPhone = usePhoneLayout();
const tabStore = useTabStore();

// A damage stat only shows while a skill of its type could use it (the details keep them all).
const habitStore = useHabitStore();
const has = (type: DamageType) => habitStore.habits.some((habit) => habit.damageType === type);

function openDetails() {
  if (isPhone.value) tabStore.select('hero');
  else showDetails.value = true;
}

const {
  character,
  heroName,
  maxHealth,
  displayLevel,
  expNeeded,
  displayExp,
  physicalDamage,
  magicDamage,
  healing,
  trueDamage,
  critChance,
  armor,
  magicResist,
  lifesteal,
  armorPen,
  magicPen,
  critBoost,
  critBoostDaysLeft,
  healBoost,
  healBoostDaysLeft,
  woundsEffect,
  woundsDaysLeft,
  blindEffect,
  blindDaysLeft,
  severEffect,
  severDaysLeft,
  sunderEffect,
  sunderDaysLeft,
  doomDays,
} = useHeroStats();

// Turned to face the boss across the stage, and stood on its plinth by the
// art's visual center (see heroArt.ts); phones draw it smaller.
const heroClass = computed(() => heroClassFor(character.value));
const placement = computed(() => {
  const { width, left, bottom } = HERO_PLACEMENT[heroClass.value];
  const phone = HERO_PHONE_PLACEMENT[heroClass.value];
  return {
    '--hero-w': width,
    '--hero-x': left,
    '--hero-y': bottom,
    '--hero-pw': phone.width,
    '--hero-px': phone.left,
    '--hero-py': phone.bottom,
  };
});

// A level-up's beat (useCelebration) rings the hero and ticks the level over.
const { phase } = useCelebration();
const leveling = computed(() => phase.value === 'leveling');

// Held back while a blow is on its way, so the bar moves as it lands (FightStage plays the hits).
const { shownHp } = useHitFeed();
const shownHealth = computed(() => shownHp('hero', character.value.currentHealth, maxHealth.value));
const { pressed, pressHandlers } = usePress();

// The stat line keeps to one row at every width: whatever wraps past the
// first is hidden whole (it's all in the details), so the hero's block
// never grows into the boss's half of the stage.
const statLine = ref<HTMLElement | null>(null);
let statLineObserver: ResizeObserver | null = null;

function clipStatLine() {
  const items = Array.from(statLine.value?.children ?? []) as HTMLElement[];
  for (const item of items) item.style.display = '';
  // Measure every item before hiding any, so hiding can't reflow the rest.
  const shown = items.filter((item) => item.getClientRects().length > 0);
  const tops = shown.map((item) => item.getBoundingClientRect().top);
  const firstRowEnd = shown[0]?.getBoundingClientRect().bottom ?? 0;
  shown.forEach((item, i) => {
    if (tops[i] >= firstRowEnd) item.style.display = 'none';
  });
}

onMounted(() => {
  // Sizes change with the width, the theme and the numbers themselves.
  statLineObserver = new ResizeObserver(() => requestAnimationFrame(clipStatLine));
  if (statLine.value) statLineObserver.observe(statLine.value);
  document.fonts?.ready.then(clipStatLine);
  clipStatLine();
});
onUpdated(clipStatLine);
onBeforeUnmount(() => {
  statLineObserver?.disconnect();
});
</script>

<template>
  <!-- The hero's half of the fight stage (FightStage), facing the boss's. -->
  <div class="character-panel" :class="{ leveling, pressed }">
    <div class="hero-plat" aria-hidden="true" />
    <div class="hero-figure" :style="placement">
      <PlayerSprite :character="character" stage />
      <span v-if="leveling" class="level-ring" aria-hidden="true" />
    </div>
    <div class="hero-block">
      <h2 class="name-line">
        <span class="hero-name">{{ heroName }}</span>
        <span class="level-number">{{ displayLevel }}</span>
        <span v-if="leveling" class="level-up-popup" role="status">Level up</span>
      </h2>
      <!-- The HP bar carries its own numbers, and the EXP runs along its foot. -->
      <div class="bars">
        <HealthBar :current="shownHealth" :max="maxHealth" variant="player" />
        <!-- Keyed by level so the bar snaps empty on a level-up instead of draining back. -->
        <ExpBar :key="displayLevel" :current="displayExp" :max="expNeeded" />
      </div>
      <p ref="statLine" class="stat-summary">
        <span v-if="has('physical')"><StatIcon name="physical" />{{ formatCompact(physicalDamage) }}</span>
        <span v-if="has('magic')"><StatIcon name="magic" />{{ formatCompact(magicDamage) }}</span>
        <span v-if="has('healing')"><StatIcon name="healing" />{{ formatCompact(healing) }}</span>
        <span v-if="has('trueDamage')"><StatIcon name="true" />{{ formatCompact(trueDamage) }}</span>
        <span><StatIcon name="crit" />{{ (critChance * 100).toFixed(0) }}%</span>
        <span v-if="armor > 0"><StatIcon name="armor" />{{ formatCompact(armor) }}</span>
        <span v-if="magicResist > 0"><StatIcon name="magicResist" />{{ formatCompact(magicResist) }}</span>
        <span v-if="lifesteal > 0"><StatIcon name="lifesteal" />{{ lifesteal.toFixed(0) }}%</span>
        <span v-if="armorPen > 0"><StatIcon name="armorPen" />{{ armorPen.toFixed(0) }}%</span>
        <span v-if="magicPen > 0"><StatIcon name="magicPen" />{{ magicPen.toFixed(0) }}%</span>
        <span v-if="critBoost"><StatIcon name="critBoost" />+{{ (critBoost.bonus * 100).toFixed(0) }}% crit · {{ critBoostDaysLeft }}d</span>
        <span v-if="healBoost"><StatIcon name="healBoost" />+{{ (healBoost.bonus * 100).toFixed(0) }}% heal · {{ healBoostDaysLeft }}d</span>
        <span v-if="woundsEffect"><StatIcon name="wounds" />{{ (woundsEffect.effectRate * 100).toFixed(0) }}% heal · {{ woundsDaysLeft }}d</span>
        <span v-if="blindEffect"><StatIcon name="blind" />Blinded · {{ blindDaysLeft }}d</span>
        <span v-if="severEffect"><StatIcon name="sever" />Severed · {{ severDaysLeft }}d</span>
        <span v-if="sunderEffect"><StatIcon name="sunder" />Sundered · {{ sunderDaysLeft }}d</span>
        <span v-if="doomDays !== undefined"><StatIcon name="doom" />Doom · {{ doomDays }}d</span>
      </p>
    </div>
    <!-- The whole half is one button, clipped to its side of the stage's step. -->
    <button type="button" class="tap tap-hero" :aria-label="`${heroName} details`" v-on="pressHandlers" @click="openDetails" />

    <Modal v-model="showDetails" :title="heroName" max-width="520px">
      <HeroDetails />
    </Modal>
  </div>
</template>

<style scoped>
/* The hero's half of the stage, positioned within FightStage's .stage-inner
   on its phone geometry (--u scales the art on narrow phones). */
.character-panel {
  display: contents;
}

.hero-plat {
  position: absolute;
  left: calc(11 * var(--u));
  bottom: 2px;
  width: calc(120 * var(--u));
  height: 18px;
  background: color-mix(in srgb, var(--text) 12%, transparent);
  transition: background 0.3s ease;
}

/* The whole hero, smaller than the boss and standing on its plinth; the
   per-class --hero-p* numbers come from HERO_PHONE_PLACEMENT (the banner's
   --hero-* from HERO_PLACEMENT). No z-index, so its level ring stacks with
   the blocks. */
.hero-figure {
  position: absolute;
  left: calc(var(--hero-px) * var(--u));
  bottom: calc(var(--hero-py) * 1px);
  width: calc(var(--hero-pw) * var(--u));
}

.hero-figure :deep(.player-sprite),
.hero-figure :deep(.hero) {
  width: 100%;
  height: auto;
}

.hero-figure :deep(.hero) {
  transition: filter 0.3s ease;
}

/* Floats on the stage to the hero's right. Its left edge sits at the same
   share of the stage (150px of 390) at every phone width, clear of the
   warrior's sword tip (224px wide at 390). */
.hero-block {
  position: absolute;
  z-index: 4;
  bottom: 6px;
  right: 16px;
  width: calc(100% * 240 / 390 - 16px);
  display: flex;
  flex-direction: column;
  gap: 5px;
  text-shadow:
    0 0 8px #000,
    0 1px 2px #000;
}

/* A long name is cut with "…"; the level always shows. */
.name-line {
  position: relative;
  display: flex;
  align-items: baseline;
  min-width: 0;
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.2;
  color: var(--text-h);
  transition: color 0.3s ease;
}

/* The tap cue: a small chevron after the level. */
.name-line::after {
  content: '';
  flex-shrink: 0;
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-left: 9px;
  vertical-align: 1px;
  border-top: 1.5px solid currentColor;
  border-right: 1.5px solid currentColor;
  transform: rotate(45deg);
  color: var(--text);
}

.hero-name {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* Clipped together to the HP bar's pill, so the EXP seam follows its ends. */
.bars {
  position: relative;
  border-radius: 999px;
  overflow: hidden;
}

/* Tall enough to carry its own HP numbers, at its right end, clear of the
   seam. */
.hero-block :deep(.health-bar) {
  height: 16px;
}

.hero-block :deep(.health-bar-label) {
  inset: 0 0 3px;
  justify-content: flex-end;
  padding-right: 7px;
}

/* The EXP as a seam along the HP bar's foot. */
.hero-block :deep(.exp-bar) {
  position: absolute;
  inset: auto 0 0;
  height: 3px;
  border-radius: 0;
  background: rgba(0, 0, 0, 0.45);
}

.hero-block :deep(.exp-bar-label) {
  display: none;
}

.stat-summary span {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
}

.stat-summary :deep(.stat-icon) {
  opacity: 0.8;
}

.stat-summary :deep(.stat-icon svg) {
  width: 12px;
  height: 12px;
}

/* The banner's hero sits 7% in from the left, each class offset from the
   warrior's spot as on phone. */
@media (min-width: 821px) {
  .hero-plat {
    left: calc(7% - 12px);
    bottom: 2px;
    width: 140px;
  }

  .hero-figure {
    left: calc(7% + (var(--hero-x) - 23) * 1px);
    bottom: calc(var(--hero-y) * 1px);
    width: calc(var(--hero-w) * 1px);
  }

  .hero-block {
    bottom: 18px;
    right: auto;
    left: calc(7% + 200px);
    width: 250px;
  }
}

/* Small and dimmed, so the name and bar lead. One row only: clipStatLine
   hides whichever chips wrap past it. */
.stat-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 7px;
  margin: 0;
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 1.2;
  color: var(--text);
}

/* A transparent button over the whole stage, clipped to the hero's side of
   the step (BossPanel's .tap-boss is the rest). */
.tap {
  position: absolute;
  inset: 0;
  z-index: 6;
  margin: 0;
  padding: 0;
  background: none;
  border: 0;
  border-radius: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.tap:focus-visible {
  outline: none;
}

/* Held (or focused from the keyboard): the hero brightens, its platform and
   name light up. On at once, so even a quick tap shows it, then fades. */
.pressed .hero-figure :deep(.hero),
.character-panel:has(.tap:focus-visible) .hero-figure :deep(.hero) {
  filter: brightness(1.25);
}

.pressed .hero-plat,
.character-panel:has(.tap:focus-visible) .hero-plat {
  background: color-mix(in srgb, var(--accent) 30%, transparent);
}

.pressed .name-line,
.character-panel:has(.tap:focus-visible) .name-line {
  color: var(--accent);
}

.pressed .hero-plat,
.pressed .name-line,
.pressed .hero-figure :deep(.hero) {
  transition-duration: 0s;
}

.tap-hero {
  clip-path: polygon(
    0 var(--split-yl),
    var(--split-x) var(--split-yl),
    var(--split-x) var(--split-ym),
    var(--split-x2) var(--split-ym),
    var(--split-x2) var(--split-yr),
    100% var(--split-yr),
    100% 100%,
    0 100%
  );
}

/* ---------- A level-up: ring, "Level up", the number ticks over ---------- */

.level-ring {
  position: absolute;
  inset: -6px;
  border: 2px solid var(--accent);
  border-radius: 50%;
  box-shadow:
    0 0 20px var(--accent),
    inset 0 0 14px var(--accent);
  pointer-events: none;
  opacity: 0;
  animation: level-ring 1s ease-out;
}

/* Just above the name line, clear of a long name that fills it. */
.level-up-popup {
  position: absolute;
  bottom: 100%;
  right: 0;
  color: var(--accent);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  white-space: nowrap;
  text-shadow:
    0 0 2px #000,
    0 0 10px #000;
  pointer-events: none;
  opacity: 0;
  animation: level-up-float 1.4s ease-out;
}

.level-number {
  display: inline-block;
  flex-shrink: 0;
  margin-left: 0.4em;
}

.leveling .level-number {
  animation: level-tick 0.6s ease;
}

.leveling .exp-bar {
  animation: exp-glow 0.9s ease;
}

@keyframes level-ring {
  0% {
    opacity: 0.9;
    transform: scale(0.6);
  }
  100% {
    opacity: 0;
    transform: scale(1.5);
  }
}

@keyframes level-up-float {
  0% {
    opacity: 0;
    transform: translateY(-50%) scale(1.3);
  }
  15%,
  75% {
    opacity: 1;
    transform: translateY(-50%);
  }
  100% {
    opacity: 0;
    transform: translateY(-120%);
  }
}

@keyframes level-tick {
  40% {
    transform: scale(1.6);
    color: var(--accent);
  }
}

@keyframes exp-glow {
  40% {
    box-shadow: 0 0 16px 2px var(--accent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-plat,
  .name-line,
  .hero-figure :deep(.hero) {
    transition: none;
  }

  .level-ring,
  .leveling .level-number,
  .leveling .exp-bar {
    animation: none;
  }

  .level-up-popup {
    animation: none;
    opacity: 1;
    transform: translateY(-50%);
  }
}
</style>
