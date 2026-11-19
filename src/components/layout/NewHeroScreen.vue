<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Component } from 'vue';
import { Anvil, ChevronLeft, ChevronRight, ChevronsUp, Dices, Flame, Gift, Sword, Swords, WandSparkles, Zap } from 'lucide-vue-next';
import { DEFAULT_HERO_NAME, HERO_CLASSES, heroClassFor, MAX_HERO_NAME_LENGTH, prestigeMark, prestigeRank } from '../../game-engine';
import { useCombatActions } from '../../composables/useCombatActions';
import type { HeroPick } from '../../composables/useCombatActions';
import type { HeroClass } from '../../game-engine';
import { useRetiredHero } from '../../composables/useRetiredHero';
import { useSkins } from '../../composables/useSkins';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import { useHighScoreStore } from '../../store/highScoreStore';
import { HERO_PICK_PLACEMENT } from '../character/heroArt';
import PlayerSprite from '../character/PlayerSprite.vue';
import PrestigeNumeral from '../ui/PrestigeNumeral.vue';
import RuleList from '../ui/RuleList.vue';
import type { Rule } from '../ui/RuleList.vue';
import { spriteUrl } from '../ui/spriteUrl';

// Full-screen greeting shown in place of the dashboard while the hero is
// unnamed (see Character.name) or waiting on a pick: the very first launch,
// and every run after a prestige. A new run picks its hero here, turning
// through them by the fire; a prestiged hero keeps its name, so only the first
// hero is asked for one. A run already under way (an old save named late)
// just gets its name.
const characterStore = useCharacterStore();
const skins = useSkins();
const { retired } = useRetiredHero();
const { beginRun } = useCombatActions();

const name = ref('');
// After a prestige the hero is already named and only picks a new look.
const named = computed(() => characterStore.character.name !== undefined);

const PICKS: HeroPick[] = [...HERO_CLASSES, 'fate'];
// The cleric art reads as a mage, so that's its name here.
const PICK_LOOK: Record<HeroPick, { name: string; icon: Component }> = {
  warrior: { name: 'Warrior', icon: Sword },
  cleric: { name: 'Mage', icon: WandSparkles },
  ranger: { name: 'Ranger', icon: Zap },
  fate: { name: 'Fate', icon: Dices },
};
// A horizontal drag at least this long turns the wheel.
const SWIPE_PX = 40;

const choosing = computed(() => characterStore.character.heroPending === true);
// After a prestige (named, and picking a hero) the page leads with the new rank,
// in its colour, and who retired (docs/mockups/death-prestige-flow.html, A).
const accountStore = useAccountStore();
const highScoreStore = useHighScoreStore();
const mark = computed(() => (named.value && choosing.value ? prestigeMark(prestigeRank(accountStore.account)) : null));
// Who retired: noted by the prestige this session, else the run it recorded on the board.
const retiredLine = computed(() => {
  const rank = prestigeRank(accountStore.account);
  const run = highScoreStore.topRuns.find((r) => r.prestige === rank);
  const hero = retired.value ?? (run ? { name: run.heroName ?? DEFAULT_HERO_NAME, level: run.level } : null);
  return hero ? `${hero.name} retired at level ${hero.level}` : `${characterStore.character.name} begins again`;
});
const KEPT: { icon: Component; text: string }[] = [
  { icon: Flame, text: 'Habits + ranks' },
  { icon: Anvil, text: 'Talents' },
  { icon: Gift, text: 'Challenges' },
];
// Opens on the hero the run was rolled as: a warrior on the first run, the
// retired hero's class after a prestige.
const pick = ref<HeroPick>(heroClassFor(characterStore.character));
// Fate shows the warrior's shape, darkened.
const shownClass = computed(() => (pick.value === 'fate' ? 'warrior' : pick.value));
function placementFor(heroClass: HeroClass) {
  const { width, left, bottom } = HERO_PICK_PLACEMENT[heroClass];
  return { width: `${width}px`, height: `${width}px`, left: `${left}px`, bottom: `${bottom}px` };
}

function turn(step: number) {
  pick.value = PICKS[(PICKS.indexOf(pick.value) + step + PICKS.length) % PICKS.length];
}

let swipeFromX: number | null = null;

function startSwipe(event: PointerEvent) {
  swipeFromX = event.clientX;
}

function cancelSwipe() {
  swipeFromX = null;
}

function endSwipe(event: PointerEvent) {
  if (swipeFromX === null) return;
  const dx = event.clientX - swipeFromX;
  swipeFromX = null;
  if (Math.abs(dx) >= SWIPE_PX) turn(dx < 0 ? 1 : -1);
}

const RULES: Rule[] = [
  { icon: Sword, tone: 'accent', title: 'Keep', text: 'A habit kept strikes the boss.' },
  { icon: Swords, tone: 'danger', title: 'Break', text: 'Miss a habit and the boss strikes you.' },
  { icon: ChevronsUp, tone: 'solid', title: 'Rise', text: 'Each boss slain makes you stronger.' },
];

function begin() {
  beginRun(characterStore.character.name ?? name.value, pick.value);
}
</script>

<template>
  <form class="new-hero" :class="mark?.rarity" @submit.prevent="begin">
    <div v-if="mark" class="rank-head">
      <PrestigeNumeral :mark="mark" large />
      <p class="rank-line">Prestige {{ mark.numeral }} · {{ mark.title }}</p>
      <h1 class="retired-line">{{ retiredLine }}</h1>
      <p class="carry">Choose who carries the name.</p>
    </div>
    <template v-else>
      <p class="eyebrow">Every habit is a weapon.</p>
      <h1 class="game-title">StreakSlayer</h1>
    </template>

    <template v-if="choosing">
      <div class="hero-pick" @pointerdown="startSwipe" @pointerup="endSwipe" @pointercancel="cancelSwipe">
        <button type="button" class="turn turn-prev" aria-label="Previous hero" @click="turn(-1)">
          <ChevronLeft :size="26" :stroke-width="1.4" />
        </button>
        <div class="bonfire">
          <div class="pick-hero" :class="{ fated: pick === 'fate' }">
            <!-- Every hero is drawn up front and only the picked one shown: swapping
                 one img's src resized it before the new art had loaded. -->
            <img
              v-for="heroClass in HERO_CLASSES"
              v-show="heroClass === shownClass"
              :key="heroClass"
              :src="spriteUrl(skins.heroArtFor(heroClass))"
              :style="placementFor(heroClass)"
              alt=""
              draggable="false"
            />
            <span v-if="pick === 'fate'" class="fate-mark">?</span>
          </div>
        </div>
        <button type="button" class="turn turn-next" aria-label="Next hero" @click="turn(1)">
          <ChevronRight :size="26" :stroke-width="1.4" />
        </button>
      </div>
      <p class="pick-name" :class="`pick-${pick}`" aria-live="polite">
        <component :is="PICK_LOOK[pick].icon" class="pick-icon" :size="15" />{{ PICK_LOOK[pick].name }}
      </p>
      <div class="pick-dots" aria-hidden="true">
        <i v-for="p in PICKS" :key="p" :class="{ on: p === pick }" />
      </div>
    </template>
    <div v-else class="bonfire">
      <PlayerSprite :character="characterStore.character" />
    </div>

    <div v-if="mark" class="oath">
      <ul class="kept" aria-label="Carried over">
        <li v-for="item in KEPT" :key="item.text"><component :is="item.icon" class="kept-icon" :size="14" />{{ item.text }}</li>
      </ul>
      <button type="submit" class="begin rank-begin">Begin</button>
    </div>
    <div v-else class="oath">
      <h2 class="oath-title">{{ named ? `${characterStore.character.name} rises again` : 'A new hero' }}</h2>

      <label v-if="!named" class="field">
        <span class="field-label">Name</span>
        <input v-model="name" class="name-input" type="text" :maxlength="MAX_HERO_NAME_LENGTH" :placeholder="DEFAULT_HERO_NAME" autocomplete="off" />
      </label>

      <RuleList :rules="RULES" />

      <button type="submit" class="begin primary-button">{{ named ? 'Rise' : 'Begin' }}</button>
    </div>
  </form>
</template>

<style scoped>
.new-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4vh 0 2rem;
  text-align: center;
}

.eyebrow {
  margin: 0;
  color: var(--text);
  font-size: 0.9rem;
}

.game-title {
  margin: 0.35rem 0 0;
  color: var(--text-h);
  font-size: clamp(1.8rem, 5vw, 2.8rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.02em;
}

.bonfire {
  position: relative;
  isolation: isolate;
  /* Full width up to 340px: a fixed 340px forced the page wider than a 320px phone. */
  width: 100%;
  max-width: 340px;
  height: 210px;
  margin: 0.75rem 0 0.25rem;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bonfire::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 12% 18% 0;
  /* Fades out inside its box, so the glow has no hard bottom edge. */
  background: radial-gradient(closest-side at 50% 62%, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.03) 70%, transparent);
}

.bonfire::after {
  content: '';
  position: absolute;
  z-index: -1;
  left: 32%;
  right: 32%;
  bottom: 12px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(0, 0, 0, 0.6), transparent 70%);
}

.bonfire :deep(.player-sprite) {
  width: 192px;
  height: 192px;
  margin-bottom: 0;
}

.bonfire :deep(.layer) {
  image-rendering: pixelated;
}

.hero-pick {
  position: relative;
  width: 100%;
  max-width: 460px;
  display: flex;
  justify-content: center;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}

.hero-pick .bonfire {
  margin-bottom: 0;
}

.turn {
  position: absolute;
  top: 50%;
  z-index: 1;
  width: 48px;
  height: 48px;
  margin-top: -24px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.turn-prev {
  left: 0;
}

.turn-next {
  right: 0;
}

.pick-hero {
  position: relative;
  width: 150px;
  height: 150px;
  margin-bottom: 8px;
}

.pick-hero img {
  position: absolute;
  image-rendering: pixelated;
  pointer-events: none;
}

.pick-hero.fated img {
  filter: brightness(0) drop-shadow(0 0 10px rgba(224, 120, 58, 0.35));
  opacity: 0.85;
}

.fate-mark {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding-bottom: 20px;
  color: var(--accent);
  font-size: 2.75rem;
}

.pick-name {
  margin: 0.4rem 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--text-h);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.pick-warrior .pick-icon {
  color: var(--dmg-physical);
}

.pick-cleric .pick-icon {
  color: var(--dmg-magic);
}

.pick-ranger .pick-icon {
  color: var(--dmg-true);
}

.pick-fate .pick-icon {
  color: var(--accent);
}

.pick-dots {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 0.5rem 0 1rem;
}

.pick-dots i {
  width: 6px;
  height: 6px;
  border: 1px solid var(--border);
  border-radius: 50%;
}

.pick-dots i.on {
  background: var(--accent);
  border-color: var(--accent);
}

.oath {
  width: 100%;
  max-width: 460px;
  text-align: left;
}

.oath-title {
  margin: 0 0 1rem;
  color: var(--text-h);
  font-size: 1.1rem;
  text-align: center;
}

/* After a prestige: the rank leads, in its colour (PrestigeNumeral's fixed
   tiers), then who retired. */
.new-hero.rare {
  --rank: #5f95e6;
  --rank-dark: #1f3c70;
}

.new-hero.epic {
  --rank: #b57be8;
  --rank-dark: #4f2a7e;
}

.new-hero.relic {
  --rank: #f58a35;
  --rank-dark: #7a3a0e;
}

.rank-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-top: 3vh;
}

.rank-head :deep(.prestige-numeral) {
  filter: drop-shadow(0 0 14px color-mix(in srgb, var(--rank) 55%, transparent));
}

.rank-line {
  margin: 0;
  color: var(--rank);
  font: 700 11px 'Cinzel', serif;
  letter-spacing: 0.24em;
  text-indent: 0.24em;
  text-transform: uppercase;
}

.retired-line {
  margin: 2px 0 0;
  color: var(--text-h);
  font: 700 24px/1.15 'Alegreya', Georgia, serif;
}

.carry {
  margin: 0;
  color: var(--text);
  font-size: 14.5px;
}

.kept {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
}

.kept li {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  color: var(--text-h);
  font: 700 13.5px 'Alegreya Sans', sans-serif;
  background: var(--code-bg);
  box-shadow: inset 0 0 0 1px var(--border);
  clip-path: var(--px2);
}

.kept-icon {
  color: var(--brass, var(--accent));
}

/* Begin in the rank's colour. */
.rank-begin {
  min-height: 48px;
  color: #0f1020;
  font: 700 15px 'Cinzel', serif;
  letter-spacing: 0.18em;
  text-indent: 0.18em;
  text-transform: uppercase;
  background: var(--rank);
  border: 0;
  border-bottom: 3px solid var(--rank-dark);
  clip-path: var(--px2);
}

.field {
  display: block;
  margin-bottom: 1.25rem;
}

.field-label {
  display: block;
  margin-bottom: 0.4rem;
  color: var(--text);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.name-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.8rem 1rem;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-h);
  font-family: inherit;
  font-size: 1.1rem;
}

.name-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 14px -4px var(--accent);
}

.begin {
  display: block;
  width: 100%;
  padding: 0.8rem 1.2rem;
}
</style>
