<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  bloodlustDaysLeft,
  bossMissDamage,
  bossSkillEffectText,
  bossSkillMarks,
  dailyPeriodKey,
  damageReductionPct,
  doomDaysLeft,
  doomPct,
  formatCompact,
  effectiveResistAfterPen,
  itemBonusPercent,
  PERSONALITY_NAME,
  frenzyDaysLeft,
  reflectDaysLeft,
  undyingActive,
} from '../../game-engine';
import { useCelebration } from '../../composables/useCelebration';
import { useHitFeed } from '../../composables/useHitFeed';
import { usePress } from '../../composables/usePress';
import { useBossStore } from '../../store/bossStore';
import { useCharacterStore } from '../../store/characterStore';
import { useDebugClockStore } from '../../store/debugClockStore';
import { PERSONALITY_SPRITE } from './bossSprites';
import HealthBar from '../ui/HealthBar.vue';
import Modal from '../ui/Modal.vue';
import StatIcon from '../ui/StatIcon.vue';
import type { StatIconName } from '../ui/statIcons';
import { baseSpriteUrl, PHONE_STAGE_MEDIA, spriteUrl } from '../ui/spriteUrl';

const baseUrl = import.meta.env.BASE_URL;
const bossStore = useBossStore();
const characterStore = useCharacterStore();

// While a kill plays out, the slain boss stays on the stage (at 0 HP, so the
// killing blow's hit still shows) until the next one rises in its place.
const { phase, displayedBoss } = useCelebration();
const boss = computed(() => displayedBoss.value ?? bossStore.boss);

// Held back while a blow is on its way, so the bar drops as it lands (FightStage plays the hits).
const { shownHp } = useHitFeed();
const shownHealth = computed(() => shownHp(boss.value.index, boss.value.health, boss.value.maxHealth));
// Where this boss's skills wait — never which skill (see bossSkillMarks).
const skillMarks = computed(() => bossSkillMarks(boss.value));

// Skills that have fired and are still running on the boss.
const debugClockStore = useDebugClockStore();
const currentDayKey = computed(() => dailyPeriodKey(debugClockStore.now()));
const bloodlustDays = computed(() => bloodlustDaysLeft(boss.value, currentDayKey.value));
const frenzyDays = computed(() => frenzyDaysLeft(boss.value, currentDayKey.value));
const reflectDays = computed(() => reflectDaysLeft(boss.value, currentDayKey.value));
const undying = computed(() => undyingActive(boss.value, currentDayKey.value));
const doomDays = computed(() => doomDaysLeft(boss.value, currentDayKey.value));

// The name's last word carries the tap cue's chevron, so a name that only
// just fits its line never leaves the chevron alone on the next.
const bossName = computed(() => PERSONALITY_NAME[boss.value.personality]);
const nameHead = computed(() => bossName.value.slice(0, bossName.value.lastIndexOf(' ') + 1));
const nameTail = computed(() => bossName.value.slice(bossName.value.lastIndexOf(' ') + 1));
const { pressed, pressHandlers } = usePress();

// A condensed, always-visible emoji stat line (effective numbers only) sits
// under the HP bar; the full stats live in a modal behind the boss's half of
// the stage. See CharacterPanel.vue for the same pattern.
const showDetails = ref(false);

const physicalAttack = computed(() => bossMissDamage(boss.value.physicalAttack));
const magicAttack = computed(() => bossMissDamage(boss.value.magicAttack));

// Damage reduction against the player's attacks, after the player's own
// armorPen/magicPen items shave the boss's resist stat (same math as
// completeHabit in combat.ts).
const armorReduction = computed(
  () => damageReductionPct(effectiveResistAfterPen(boss.value.armor, itemBonusPercent(characterStore.character, 'armorPen'))) * 100,
);
const magicResistReduction = computed(
  () => damageReductionPct(effectiveResistAfterPen(boss.value.magicResist, itemBonusPercent(characterStore.character, 'magicPen'))) * 100,
);

interface StatTile {
  icon: StatIconName;
  label: string;
  value: string;
  note?: string;
}

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

// The boss's own numbers, listed beside it in the details.
const statTiles = computed<StatTile[]>(() => {
  const b = boss.value;
  return [
    { icon: 'physical', label: 'Physical attack', value: formatCompact(physicalAttack.value) },
    { icon: 'magic', label: 'Magic attack', value: formatCompact(magicAttack.value) },
    ...(b.lifestealPct > 0 ? [{ icon: 'lifesteal' as const, label: 'Lifesteal', value: pct(b.lifestealPct) }] : []),
    { icon: 'armor', label: 'Armor', value: formatCompact(b.armor), note: `${armorReduction.value.toFixed(1)}% less damage` },
    { icon: 'magicResist', label: 'Magic resist', value: formatCompact(b.magicResist), note: `${magicResistReduction.value.toFixed(1)}% less damage` },
  ];
});

// Skills that have fired and are still running, as cards under the figure.
const skillTiles = computed<StatTile[]>(() => [
  ...(reflectDays.value !== undefined
    ? [{ icon: 'reflect' as const, label: 'Reflect', value: `${reflectDays.value}d`, note: bossSkillEffectText('reflect') }]
    : []),
  ...(frenzyDays.value !== undefined
    ? [{ icon: 'frenzy' as const, label: 'Frenzy', value: `${frenzyDays.value}d`, note: bossSkillEffectText('frenzy') }]
    : []),
  ...(bloodlustDays.value !== undefined
    ? [{ icon: 'bloodlust' as const, label: 'Bloodlust', value: `${bloodlustDays.value}d`, note: bossSkillEffectText('bloodlust') }]
    : []),
  ...(undying.value ? [{ icon: 'undying' as const, label: 'Undying', value: 'Today', note: bossSkillEffectText('undying') }] : []),
  ...(doomDays.value !== undefined ? [{ icon: 'doom' as const, label: 'Doom', value: `${doomDays.value}d`, note: bossSkillEffectText('doom', doomPct(characterStore.character)) }] : []),
]);
</script>

<template>
  <!-- The boss's half of the fight stage (FightStage): no box of its own, so
       each piece sits straight on the stage. -->
  <div class="boss-panel" :class="{ pressed }">
    <div class="boss-plat" aria-hidden="true" />
    <div class="boss-figure" :class="{ dying: phase === 'dying', arriving: phase === 'arriving' }">
      <!-- Phones draw the base build, smaller (see PHONE_STAGE_MEDIA). -->
      <picture>
        <source :media="PHONE_STAGE_MEDIA" :srcset="baseSpriteUrl(PERSONALITY_SPRITE[boss.personality])" />
        <img class="sprite" :src="spriteUrl(PERSONALITY_SPRITE[boss.personality])" alt="Boss" />
      </picture>
      <template v-if="phase === 'dying'">
        <span class="death-flash" aria-hidden="true" />
        <span class="death-sparks" aria-hidden="true" />
      </template>
    </div>
    <div class="boss-block">
      <h2 class="boss-name"><span class="boss-number">#{{ boss.index }}</span> {{ nameHead }}<span class="name-tail">{{ nameTail }}</span></h2>
      <HealthBar :current="shownHealth" :max="boss.maxHealth" variant="boss" :marks="skillMarks" />
      <p class="stat-summary">
        <span><StatIcon name="physical" /> {{ formatCompact(physicalAttack) }}</span>
        <span><StatIcon name="magic" /> {{ formatCompact(magicAttack) }}</span>
        <span><StatIcon name="armor" /> {{ formatCompact(boss.armor) }}</span>
        <span><StatIcon name="magicResist" /> {{ formatCompact(boss.magicResist) }}</span>
        <span v-if="boss.lifestealPct > 0"><StatIcon name="lifesteal" /> {{ (boss.lifestealPct * 100).toFixed(0) }}%</span>
        <span v-if="reflectDays !== undefined"><StatIcon name="reflect" /> <span class="reflect">{{ reflectDays }}d</span></span>
        <span v-if="frenzyDays !== undefined"><StatIcon name="frenzy" /> <span class="frenzy">{{ frenzyDays }}d</span></span>
        <span v-if="bloodlustDays !== undefined"><StatIcon name="bloodlust" /> <span class="bloodlust">{{ bloodlustDays }}d</span></span>
        <span v-if="undying"><StatIcon name="undying" class="undying" /></span>
        <span v-if="doomDays !== undefined"><StatIcon name="doom" /> <span class="doom">{{ doomDays }}d</span></span>
      </p>
    </div>
    <div v-if="phase === 'dying'" class="slain-stamp" role="status">
      <strong class="slain-word">Slain</strong>
      <span class="slain-name">{{ PERSONALITY_NAME[boss.personality] }}</span>
    </div>
    <!-- The whole half is one button, clipped to its side of the stage's step. -->
    <button type="button" class="tap tap-boss" aria-label="Boss details" v-on="pressHandlers" @click="showDetails = true" />

    <Modal v-model="showDetails" title="Boss" max-width="520px">
      <!-- The boss in its socket, its numbers listed beside it. -->
      <div class="hero">
        <div class="hero-sprite">
          <!-- The base build at its own size: one CSS px per art pixel, whole device pixels on every screen. -->
          <img class="sprite" :src="`${baseUrl}sprites/${PERSONALITY_SPRITE[boss.personality]}.png`" alt="Boss" />
        </div>
        <div class="hero-info">
          <span class="hero-tag">Boss #{{ boss.index }}</span>
          <span class="hero-name">{{ PERSONALITY_NAME[boss.personality] }}</span>
          <HealthBar :current="boss.health" :max="boss.maxHealth" variant="boss" :marks="skillMarks" />
          <div class="ledger">
            <div v-for="stat in statTiles" :key="stat.label" class="stat-tile">
              <span class="tile-label"><StatIcon :name="stat.icon" />{{ stat.label }}</span>
              <span class="tile-value">{{ stat.value }}</span>
              <span v-if="stat.note" class="tile-note">{{ stat.note }}</span>
            </div>
          </div>
        </div>
      </div>

      <section v-if="skillTiles.length" class="stat-group">
        <h4 class="group-label">Skills</h4>
        <div class="skills">
          <div v-for="skill in skillTiles" :key="skill.label" class="stat-tile skill-tile">
            <span class="skill-socket"><StatIcon :name="skill.icon" :size="20" /></span>
            <span class="skill-text">
              <span class="tile-label">{{ skill.label }}</span>
              <span class="tile-note">{{ skill.note }}</span>
            </span>
            <span class="tile-value">{{ skill.value }}</span>
          </div>
        </div>
      </section>

      <p class="stat-note">
        Attack is what a missed medium daily deals. Easy ~0.67x, hard ~1.33x; a crit or missed weekly doubles it.
        Armor and magic resist show the reduction your attacks face after your pen items.
      </p>
    </Modal>
  </div>
</template>

<style scoped>
/* The boss's half of the stage, positioned within FightStage's .stage-inner
   on its phone geometry (--u scales the art on narrow phones). */
.boss-panel {
  display: contents;
  /* The base build's canvas, so whole device pixels per art pixel (see
     PHONE_STAGE_MEDIA); the banner draws the larger build (spriteUrl). */
  --boss-w: calc(128 * var(--u));
}

.boss-plat {
  position: absolute;
  right: calc(30 * var(--u));
  top: calc(14px + 116 * var(--u));
  width: calc(136 * var(--u));
  height: 18px;
  background: color-mix(in srgb, var(--text) 12%, transparent);
  transition: background 0.3s ease;
}

/* No z-index, so its kill effects and the plain sprite stack with the blocks.
   Below the menu button, which sits in the stage's top-right corner. */
.boss-figure {
  position: absolute;
  top: 14px;
  right: calc(34 * var(--u));
  width: var(--boss-w);
}

.boss-figure picture {
  display: contents;
}

/* Floats on the stage to the boss's left, in the corner the top bar left.
   Its right edge sits at the mock's share of the stage (212px of 390, just
   past the middle) at every phone width (196px wide at 390). */
.boss-block {
  position: absolute;
  z-index: 4;
  top: 0;
  left: 16px;
  width: calc(100% * 212 / 390 - 16px);
  display: flex;
  flex-direction: column;
  gap: 5px;
  text-shadow:
    0 0 8px #000,
    0 1px 2px #000;
}

/* Never cut: a long name wraps to a second line, the chevron after its last
   word. */
.boss-name {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.2;
  color: var(--text-h);
  transition: color 0.3s ease;
}

.name-tail {
  white-space: nowrap;
}

/* The boss's place in the run, where the top bar used to show it. */
.boss-number {
  font-size: 0.75rem;
  letter-spacing: 0.04em;
}

/* The tap cue: a small chevron after the name. */
.name-tail::after {
  content: '';
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

/* Tall enough to carry its own HP numbers, at its right end. */
.boss-block :deep(.health-bar) {
  height: 16px;
}

.boss-block :deep(.health-bar-label) {
  justify-content: flex-end;
  padding-right: 7px;
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

@media (min-width: 821px) {
  .boss-panel {
    --boss-w: 192px;
  }

  .boss-plat {
    right: calc(7% + 4px);
    top: 174px;
    width: 186px;
  }

  .boss-figure {
    top: 0;
    right: 7%;
  }

  .boss-block {
    top: 30px;
    left: auto;
    right: calc(7% + 218px);
    width: 280px;
  }
}

/* Small and dimmed, so the name and bar lead. Wraps freely when the boss has
   reflect, lifesteal or wounds. */
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

/* A transparent button over the whole stage, clipped to the boss's side of
   the step, so the two halves meet with no gap and no overlap. */
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

.tap-boss {
  clip-path: polygon(
    0 0,
    100% 0,
    100% var(--split-yr),
    var(--split-x2) var(--split-yr),
    var(--split-x2) var(--split-ym),
    var(--split-x) var(--split-ym),
    var(--split-x) var(--split-yl),
    0 var(--split-yl)
  );
}

/* The boss in its socket on the left, its tag, name, HP and numbers beside
   it. */
.hero {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
}

/* Sized to the art's 128px canvas, with room for the socket's rim. */
.hero-sprite {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 136px;
  height: 152px;
  padding-bottom: 6px;
  overflow: hidden;
  background: radial-gradient(ellipse 55% 58% at 50% 60%, color-mix(in srgb, var(--damage-color) 18%, transparent), transparent 72%);
  border: 1px solid color-mix(in srgb, var(--damage-color) 50%, transparent);
  border-radius: 8px;
}

.hero-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-top: 0.2rem;
}

.hero-tag {
  color: var(--damage-color);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-name {
  color: var(--text-h);
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.2;
}

/* One row per number: label on the left, value on the right, a note under. */
.ledger {
  display: flex;
  flex-direction: column;
  margin-top: 0.3rem;
  padding: 0.1rem 0.6rem;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.ledger .stat-tile {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 0.4rem;
  padding: 0.3rem 0;
}

.ledger .stat-tile + .stat-tile {
  border-top: 1px solid var(--border);
}

.tile-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text);
  font-size: 0.8rem;
}

.ledger .tile-label {
  flex: 1;
}

.tile-value {
  color: var(--text-h);
  font-size: 0.95rem;
  font-weight: 600;
}

.ledger .tile-note {
  flex-basis: 100%;
  padding-left: 1.4rem;
  color: var(--text);
  font-size: 0.7rem;
}

.stat-group {
  margin-top: 1rem;
}

.group-label {
  margin: 0 0 0.4rem;
  color: var(--text);
  font-size: 0.7rem;
  font-weight: 400;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* A running skill: its icon in a small socket, what it does, the days left. */
.skills {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.skill-tile {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.7rem 0.5rem 0.5rem;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.skill-socket {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid color-mix(in srgb, var(--damage-color) 50%, transparent);
  border-radius: 6px;
}

.skill-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.skill-tile .tile-label {
  color: var(--text-h);
  font-size: 0.95rem;
  font-weight: 600;
}

.skill-tile .tile-note {
  color: var(--text);
  font-size: 0.8rem;
}

.skill-tile .tile-value {
  color: var(--damage-color);
}

.stat-note {
  margin: 0.6rem 0 0;
  font-size: 0.75rem;
  color: var(--text);
}

/* Art pixels the gear icons' size, with their dark rim and a glow, in the
   boss's damage colour. */
.boss-figure :deep(.sprite),
.hero-sprite :deep(.sprite) {
  --rim: color-mix(in srgb, var(--damage-color) 20%, #000);
  image-rendering: pixelated;
  filter:
    drop-shadow(2px 0 0 var(--rim))
    drop-shadow(-2px 0 0 var(--rim))
    drop-shadow(0 2px 0 var(--rim))
    drop-shadow(0 -2px 0 var(--rim))
    drop-shadow(0 0 12px color-mix(in srgb, var(--damage-color) 35%, transparent));
}

.boss-figure :deep(.sprite) {
  width: 100%;
  height: auto;
  transition: filter 0.3s ease;
}

/* Held (or focused from the keyboard): the boss brightens, its platform and
   name light up. On at once, so even a quick tap shows it, then fades. */
.pressed .boss-figure :deep(.sprite),
.boss-panel:has(.tap:focus-visible) .boss-figure :deep(.sprite) {
  filter:
    drop-shadow(2px 0 0 var(--rim))
    drop-shadow(-2px 0 0 var(--rim))
    drop-shadow(0 2px 0 var(--rim))
    drop-shadow(0 -2px 0 var(--rim))
    drop-shadow(0 0 12px color-mix(in srgb, var(--damage-color) 35%, transparent))
    brightness(1.25);
}

.pressed .boss-plat,
.boss-panel:has(.tap:focus-visible) .boss-plat {
  background: color-mix(in srgb, var(--accent) 30%, transparent);
}

.pressed .boss-name,
.boss-panel:has(.tap:focus-visible) .boss-name {
  color: var(--accent);
}

.pressed .boss-plat,
.pressed .boss-name,
.pressed .boss-figure :deep(.sprite) {
  transition-duration: 0s;
}

.hero-sprite :deep(.sprite) {
  flex-shrink: 0;
  width: 128px;
  height: 128px;
}

/* ---------- A kill: flash, fall into the fog, "Slain" ---------- */

.boss-figure.dying :deep(.sprite) {
  transform-origin: 50% 100%;
  animation: boss-fall 1.1s cubic-bezier(0.5, 0, 0.8, 0.4) both;
}

.boss-figure.arriving :deep(.sprite) {
  animation: boss-arrive 0.8s cubic-bezier(0.2, 0.8, 0.3, 1) both;
}

.death-flash {
  position: absolute;
  z-index: 2;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(ellipse 50% 60% at 50% 60%, rgba(255, 240, 210, 0.85), transparent 70%);
  animation: death-flash 0.45s ease-out;
}

.death-sparks {
  position: absolute;
  z-index: 2;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  --spark: var(--accent);
  background-image:
    radial-gradient(2px 2px at 40% 80%, var(--spark) 50%, transparent 55%),
    radial-gradient(1.5px 1.5px at 52% 70%, var(--spark) 50%, transparent 55%),
    radial-gradient(2px 2px at 60% 85%, var(--spark) 50%, transparent 55%),
    radial-gradient(1.5px 1.5px at 46% 60%, var(--spark) 50%, transparent 55%),
    radial-gradient(1.8px 1.8px at 56% 55%, var(--spark) 50%, transparent 55%),
    radial-gradient(1.2px 1.2px at 35% 66%, var(--spark) 50%, transparent 55%),
    radial-gradient(1.6px 1.6px at 65% 62%, var(--spark) 50%, transparent 55%);
  animation: death-sparks 1.6s ease-out 0.2s;
}

/* Across the whole stage, level with the middle of the boss. */
.slain-stamp {
  position: absolute;
  z-index: 5;
  top: 0;
  left: 0;
  right: 0;
  height: var(--boss-w);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  pointer-events: none;
  animation: slain-stamp 1.9s ease 0.35s both;
}

.slain-stamp::before {
  content: '';
  position: absolute;
  z-index: -1;
  top: 50%;
  left: 8%;
  right: 8%;
  height: 4.5rem;
  transform: translateY(-50%);
  background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.75) 20%, rgba(0, 0, 0, 0.75) 80%, transparent);
}

.slain-word {
  color: var(--text-h);
  font-size: 1.6rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  text-shadow:
    0 0 14px var(--accent),
    0 2px 0 #000;
}

.slain-name {
  color: var(--text);
  font-size: 0.9rem;
  text-shadow: 0 1px 6px #000;
}

/* Staggers, then sinks into the fog. */
@keyframes boss-fall {
  0% {
    transform: none;
    opacity: 1;
  }
  18% {
    transform: translateX(-4px) rotate(-3deg);
  }
  30% {
    transform: translateX(3px) rotate(2deg);
    opacity: 1;
  }
  100% {
    transform: translateY(46px) scaleY(0.7);
    opacity: 0;
  }
}

@keyframes boss-arrive {
  0% {
    opacity: 0;
    transform: translateY(24px);
  }
  100% {
    opacity: 1;
    transform: none;
  }
}

@keyframes death-flash {
  25% {
    opacity: 1;
  }
}

@keyframes death-sparks {
  0% {
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(-90px);
  }
}

@keyframes slain-stamp {
  0% {
    opacity: 0;
    transform: scale(1.25);
  }
  15% {
    opacity: 1;
    transform: none;
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .boss-plat,
  .boss-name,
  .boss-figure :deep(.sprite) {
    transition: none;
  }

  .boss-figure.dying :deep(.sprite) {
    animation: none;
    opacity: 0;
  }

  .boss-figure.arriving :deep(.sprite),
  .death-flash,
  .death-sparks,
  .slain-stamp {
    animation: none;
  }
}
</style>
