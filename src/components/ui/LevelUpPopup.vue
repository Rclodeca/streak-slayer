<script setup lang="ts">
import { computed, ref } from 'vue';
import { Crown, ScrollText, Sparkle } from 'lucide-vue-next';
import type { Component } from 'vue';
import { effectiveStat, formatCompact, questUnlockPending, talentUnlockPending, UNLOCK_LEVELS } from '../../game-engine';
import type { UnlockId } from '../../game-engine';
import { TUNING } from '../../game-engine/constants/tuning';
import { useCenteredArt } from '../../composables/useCenteredArt';
import { useLevelUp } from '../../composables/useLevelUp';
import { useModalPriority } from '../../composables/useModalPriority';
import { useSkins } from '../../composables/useSkins';
import { useCharacterStore } from '../../store/characterStore';
import { HERO_STAGE_CANVAS } from '../character/heroArt';
import { TALENTS_TAB_ICON } from '../talents/talentDisplay';
import Modal from './Modal.vue';
import StatIcon from './StatIcon.vue';
import { baseSpriteUrl } from './spriteUrl';
import type { StatIconName } from './statIcons';

// The level-up popup (docs/mockups/level-up.html, option B): the hero on the
// worn arena with the new level beside them, the five grown stats as tiles,
// the heal, and whatever the level opened (UNLOCK_LEVELS), one wide card or
// two side by side. Its Onward unlocks Quests and Talents, so their own
// popups only show for a save that reached the level without one of these.
const { current, dismiss } = useLevelUp();
const { levelUpVisible } = useModalPriority();
const characterStore = useCharacterStore();
const skins = useSkins();
const baseUrl = import.meta.env.BASE_URL;

// The arena at 2 CSS px per art pixel, as on the stage and the Hero tab.
const ART_W = 432;
const ART_H = 232;
const strip = ref<HTMLElement | null>(null);
const offset = useCenteredArt(strip, ART_W);

const STATS: { stat: 'health' | 'physicalDamage' | 'magicDamage' | 'healing' | 'trueDamage'; icon: StatIconName; label: string }[] = [
  { stat: 'health', icon: 'health', label: 'Health' },
  { stat: 'physicalDamage', icon: 'physical', label: 'Physical' },
  { stat: 'magicDamage', icon: 'magic', label: 'Magic' },
  { stat: 'healing', icon: 'healing', label: 'Healing' },
  { stat: 'trueDamage', icon: 'true', label: 'True damage' },
];

const stats = computed(() => {
  const news = current.value;
  if (!news) return [];
  const character = characterStore.character;
  return STATS.map(({ stat, icon, label }) => {
    const now = effectiveStat({ ...character, level: news.toLevel }, stat);
    const was = effectiveStat({ ...character, level: news.fromLevel }, stat);
    return { icon, label, value: formatCompact(now), gain: formatCompact(now - was) };
  });
});

interface Unlock {
  id: UnlockId;
  name: string;
  icon: Component;
  line: string;
}

const unlocks = computed<Unlock[]>(() => {
  const news = current.value;
  if (!news) return [];
  const character = characterStore.character;
  const all: Record<UnlockId, Unlock | null> = {
    quests: questUnlockPending(character) ? { id: 'quests', name: 'Quests', icon: ScrollText, line: 'Some deeds are sworn only once.' } : null,
    talents: talentUnlockPending(character) ? { id: 'talents', name: 'Talents', icon: TALENTS_TAB_ICON, line: 'Grow stronger with every run.' } : null,
    special: news.special ? { id: 'special', name: 'Special', icon: Sparkle, line: `${news.special} now strikes ×${TUNING.SPECIAL_MULTIPLIER}.` } : null,
    ult: news.ult ? { id: 'ult', name: 'Ult', icon: Crown, line: `${news.ult} now strikes ×${TUNING.ULT_MULTIPLIER}.` } : null,
  };
  return (Object.keys(UNLOCK_LEVELS) as UnlockId[]).flatMap((id) => all[id] ?? []);
});

function onward() {
  if (unlocks.value.some((unlock) => unlock.id === 'quests')) characterStore.unlockQuests();
  if (unlocks.value.some((unlock) => unlock.id === 'talents')) characterStore.unlockTalents();
  dismiss();
}
</script>

<template>
  <Modal :model-value="levelUpVisible" :dismissible="false" max-width="420px">
    <div v-if="current" class="level-up">
      <div
        ref="strip"
        class="level-strip"
        :style="{ '--art-w': `${ART_W}px`, '--art-h': `${ART_H}px`, '--art-x': `${offset}px`, '--hero-size': `${HERO_STAGE_CANVAS}px` }"
      >
        <img class="level-arena" :src="`${baseUrl}sprites/${skins.arenaArt.value}.png`" alt="" />
        <img class="level-hero" :src="baseSpriteUrl(skins.heroArt.value)" alt="" />
        <h3 class="level-title">Level up</h3>
        <p class="level-number"><small>Level</small><b>{{ current.toLevel }}</b></p>
      </div>

      <ul class="level-stats">
        <li v-for="tile in stats" :key="tile.icon" class="level-stat" :aria-label="`${tile.label} ${tile.value}, up ${tile.gain}`">
          <StatIcon :name="tile.icon" :size="16" />
          <b>{{ tile.value }}</b>
          <span class="gain">+{{ tile.gain }}</span>
        </li>
      </ul>
      <p v-if="current.healed > 0" class="level-heal">Healed <span class="gain">+{{ formatCompact(current.healed) }}</span></p>

      <ul v-if="unlocks.length" class="level-unlocks" :class="{ pair: unlocks.length > 1 }">
        <li v-for="unlock in unlocks" :key="unlock.id" class="level-unlock" :class="unlock.id">
          <span class="unlock-plate" aria-hidden="true"><component :is="unlock.icon" :size="24" :stroke-width="1.75" /></span>
          <div>
            <small class="unlock-new">New</small>
            <p class="unlock-name">{{ unlock.name }}</p>
            <p class="unlock-line">{{ unlock.line }}</p>
          </div>
        </li>
      </ul>

      <button type="button" class="onward primary-button" @click="onward">Onward</button>
    </div>
  </Modal>
</template>

<style scoped>
/* The strip runs to the popup's edges and top: past the scroll box's padding
   (1rem 1.25rem) and the empty header's gap below it (0.75rem). */
.level-strip {
  position: relative;
  height: 150px;
  margin: calc(-1rem - 0.75rem) -1.25rem 0.75rem;
  overflow: hidden;
  background: #080811;
  border-bottom: 3px solid var(--card-lip, #0e0e19);
}

/* Bottom-aligned, so the strip shows the arena's floor and the wall above it. */
.level-arena {
  position: absolute;
  left: var(--art-x);
  bottom: 0;
  width: var(--art-w);
  height: var(--art-h);
  max-width: none;
  image-rendering: pixelated;
}

/* The base build at 2 CSS px per art pixel, as on the stage, left of middle. */
.level-hero {
  position: absolute;
  left: 18px;
  bottom: 6px;
  width: var(--hero-size);
  height: var(--hero-size);
  max-width: none;
  image-rendering: pixelated;
}

/* Night behind the text: the title and level read on any arena. */
.level-strip::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, transparent 40%, rgba(8, 8, 17, 0.6)),
    linear-gradient(rgba(8, 8, 17, 0.55), transparent 45%);
  pointer-events: none;
}

.level-title,
.level-number {
  position: absolute;
  z-index: 1;
  margin: 0;
}

.level-title {
  top: 14px;
  left: 1.25rem;
  font-family: var(--heading);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #f4f4fa;
}

.level-number {
  right: 1.25rem;
  bottom: 14px;
  text-align: right;
  color: var(--brass, #d2bb85);
  text-shadow: 0 2px 0 #000;
}

.level-number small {
  display: block;
  font-family: var(--heading);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.level-number b {
  font-family: var(--heading);
  font-size: 2.9rem;
  line-height: 1;
}

.level-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.level-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 0 7px;
  background: var(--code-bg);
  clip-path: polygon(0 2px, 2px 2px, 2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px));
  box-shadow: inset 2px 2px 0 var(--sunk-hi), inset -2px -2px 0 var(--sunk-lo);
}

.level-stat b {
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--text-h);
  font-variant-numeric: tabular-nums;
}

.gain {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--heal-color);
  font-variant-numeric: tabular-nums;
}

.level-heal {
  margin: 8px 0 0;
  font-size: 0.85rem;
  text-align: center;
  color: var(--text);
}

.level-heal .gain {
  font-size: inherit;
}

.level-unlocks {
  display: grid;
  gap: 8px;
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
}

.level-unlocks.pair {
  grid-template-columns: 1fr 1fr;
}

/* A lifted card: the plate beside the words, or above them in a pair. */
.level-unlock {
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 12px;
  align-items: center;
  padding: 12px;
  background: var(--card);
  clip-path: polygon(0 2px, 2px 2px, 2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px));
  box-shadow: inset 2px 2px 0 var(--card-hi), inset -2px -2px 0 var(--card-lo);
}

.pair .level-unlock {
  grid-template-columns: 1fr;
  justify-items: center;
  gap: 8px;
  padding: 14px 10px 12px;
  text-align: center;
}

/* The unlock popups' silver plate, smaller: a silver rim round a sunk well. */
.unlock-plate {
  position: relative;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  color: var(--moon, var(--accent));
}

.unlock-plate::before,
.unlock-plate::after {
  content: '';
  position: absolute;
}

.unlock-plate::before {
  inset: 0;
  background: linear-gradient(var(--button-fill), var(--button-lip));
  clip-path: polygon(0 3px, 3px 3px, 3px 0, calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px));
}

.unlock-plate::after {
  inset: 3px;
  background: var(--code-bg);
  clip-path: polygon(0 2px, 2px 2px, 2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px));
  box-shadow: inset 2px 2px 0 var(--sunk-hi), inset -2px -2px 0 var(--sunk-lo);
}

.unlock-plate svg {
  position: relative;
  z-index: 1;
}

.special .unlock-plate {
  color: var(--icon-gold);
}

.ult .unlock-plate {
  color: var(--icon-violet);
}

.unlock-new {
  display: block;
  font-family: var(--heading);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--brass);
}

.unlock-name,
.unlock-line {
  margin: 0;
}

.unlock-name {
  font-family: var(--serif);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-h);
}

.unlock-line {
  font-size: 0.85rem;
  color: var(--text);
}

.onward {
  display: block;
  width: 100%;
  margin-top: 16px;
  padding: 0.8rem 1.2rem;
}
</style>
