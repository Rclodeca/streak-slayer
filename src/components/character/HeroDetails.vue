<script setup lang="ts">
import { computed } from 'vue';
import { UserRound } from 'lucide-vue-next';
import { describeItemBonus, describeItemBonusParts, formatCompact, itemDoubleFactor } from '../../game-engine';
import type { Habit } from '../../game-engine';
import { useHeroStats } from '../../composables/useHeroStats';
import { useHabitStore } from '../../store/habitStore';
import ExpBar from '../ui/ExpBar.vue';
import HealthBar from '../ui/HealthBar.vue';
import StatIcon from '../ui/StatIcon.vue';
import { BOOST_STAT_ICON } from '../ui/statIcons';
import PlayerSprite from './PlayerSprite.vue';

// The hero's details: what's running on them, their gear and their stats.
// In the popup (CharacterPanel) they open on the hero with their level and
// bars; as the phone's Hero tab (`page`), where the Focus strip already shows
// the hero, on their name, then their level and best streak.
defineProps<{ page?: boolean }>();

const baseUrl = import.meta.env.BASE_URL;

const { character, heroName, maxHealth, displayLevel, expNeeded, displayExp, activeEffects, equippedItems, emptySlotCount, statTiles } = useHeroStats();

const habitStore = useHabitStore();
// The longest streak running now, and whose it is.
const bestStreak = computed(() =>
  habitStore.habits.reduce<Habit | null>((best, habit) => (habit.streakCount > (best?.streakCount ?? 0) ? habit : best), null),
);
</script>

<template>
  <div class="hero-details" :class="{ 'hero-page': page }">
    <template v-if="page">
      <div class="hero-page-header">
        <h2><UserRound :size="16" class="section-icon" />{{ heroName }}</h2>
      </div>
      <div class="tiles hero-head">
        <div class="stat-tile">
          <span class="tile-label"><StatIcon name="levelUp" />Level</span>
          <span class="tile-value level-value">{{ displayLevel }}</span>
          <span class="tile-note">{{ formatCompact(expNeeded - displayExp) }} EXP to next</span>
        </div>
        <div class="stat-tile">
          <span class="tile-label"><StatIcon name="streak" />Best streak</span>
          <span class="tile-value">{{ bestStreak?.streakCount ?? 0 }}</span>
          <span v-if="bestStreak" class="tile-note">{{ bestStreak.name }}</span>
        </div>
      </div>
    </template>
    <div v-else class="hero">
      <div class="hero-sprite">
        <PlayerSprite :character="character" />
      </div>
      <div class="hero-info">
        <span class="hero-level">Level {{ displayLevel }}</span>
        <HealthBar :current="character.currentHealth" :max="maxHealth" variant="player" />
        <ExpBar :key="displayLevel" :current="displayExp" :max="expNeeded" />
      </div>
    </div>

    <div v-if="activeEffects.length" class="effects">
      <span v-for="effect in activeEffects" :key="effect.text" class="effect" :class="effect.tone">
        <StatIcon :name="effect.icon" />{{ effect.text }} · {{ effect.days }}d
      </span>
    </div>

    <section class="stat-group">
      <h4 class="group-label">Equipment</h4>
      <ul class="gear-list">
        <li
          v-for="item in equippedItems"
          :key="item.id"
          class="gear-row"
          :class="[`rarity-${item.rarity}`, { enchanted: itemDoubleFactor(character, item.id) > 1 }]"
        >
          <span class="gear-icon">
            <span class="gear-art">
              <img :src="`${baseUrl}sprites/${item.icon}.png`" :alt="item.name" />
            </span>
          </span>
          <div class="gear-text">
            <span class="gear-name">{{ item.name }}</span>
            <span class="gear-tags">
              <span class="gear-rarity">{{ item.rarity }}</span>
              <span v-if="itemDoubleFactor(character, item.id) > 1" class="gear-enchanted">Enchanted</span>
            </span>
            <span v-if="item.type === 'consumable'" class="gear-bonus">{{ describeItemBonus(item) }}</span>
            <span v-else class="gear-bonuses">
              <span v-for="part in describeItemBonusParts(item, itemDoubleFactor(character, item.id))" :key="`${part.stat}${part.text}`" class="gear-bonus">
                <StatIcon :name="BOOST_STAT_ICON[part.stat]" /><span class="gear-bonus-value">{{ part.text }}</span> <span class="gear-bonus-label">{{ part.label }}</span>
              </span>
            </span>
            <span v-if="item.effectText" class="gear-effect">{{ item.effectText }}</span>
          </div>
        </li>
        <li v-for="n in emptySlotCount" :key="`empty-${n}`" class="gear-row empty"><span class="gear-icon" aria-hidden="true" />Empty slot</li>
      </ul>
    </section>

    <section class="stat-group">
      <h4 class="group-label">Stats</h4>
      <div class="tiles">
        <div v-for="stat in statTiles" :key="stat.label" class="stat-tile">
          <span class="tile-label"><StatIcon :name="stat.icon" />{{ stat.label }}</span>
          <span class="tile-value">
            {{ stat.value }}
            <span v-if="stat.gain" class="tile-gain">{{ stat.gain }}</span>
          </span>
          <span v-if="stat.note" class="tile-note">{{ stat.note }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hero-page-header h2 {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.hero-head {
  margin-top: 0.5rem;
}

.rarity-common {
  --rarity: var(--rarity-common);
}

.rarity-uncommon {
  --rarity: var(--rarity-uncommon);
}

.rarity-rare {
  --rarity: var(--rarity-rare);
}

.rarity-epic {
  --rarity: var(--rarity-epic);
}

.rarity-relic {
  --rarity: var(--rarity-relic);
}

.hero {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--code-bg);
  border: 1px solid var(--accent-border);
  border-radius: 12px;
  box-shadow: 0 0 18px -8px var(--accent);
}

/* The hero at its stage size (its canvas, so whole device pixels per art
   pixel, the gear icons' size). Every hero is about 124px wide there; the
   transparent canvas around it overflows this box. The rim and glow match the
   gear icons'. */
.hero-sprite {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  width: 124px;
}

.hero-sprite .player-sprite {
  flex-shrink: 0;
  width: auto;
  height: auto;
}

.hero-sprite :deep(.hero) {
  --rim: color-mix(in srgb, var(--accent) 25%, #000);
  width: var(--hero-canvas);
  height: var(--hero-canvas);
  filter:
    drop-shadow(2px 0 0 var(--rim))
    drop-shadow(-2px 0 0 var(--rim))
    drop-shadow(0 2px 0 var(--rim))
    drop-shadow(0 -2px 0 var(--rim))
    drop-shadow(0 0 10px color-mix(in srgb, var(--accent) 30%, transparent));
}

.hero-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.hero-level {
  color: var(--text-h);
  font-size: 1.2rem;
  font-weight: 600;
}

.gear-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.gear-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.3rem 0.6rem;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-left: 3px solid var(--rarity);
  border-radius: 8px;
}

.gear-row.enchanted {
  box-shadow: 0 0 12px -6px var(--accent-solid);
}

/* An empty slot: its socket with nothing in it. */
.gear-row.empty {
  --rarity: var(--border);
  color: var(--text);
  font-size: 0.8rem;
  border-style: dashed;
  border-left-style: dashed;
  border-left-color: var(--border);
}

/* A recessed slot: rarity hairline, a dark inner bevel and a faint glow. */
.gear-icon {
  position: relative;
  flex-shrink: 0;
  width: var(--item-slot);
  height: var(--item-slot);
  border: 1px solid color-mix(in srgb, var(--rarity) 55%, transparent);
  border-radius: 4px;
  background: radial-gradient(circle, color-mix(in srgb, var(--rarity) 22%, transparent), rgba(0, 0, 0, 0.55) 72%);
  box-shadow:
    inset 0 0 0 3px rgba(0, 0, 0, 0.55),
    inset 0 0 0 4px color-mix(in srgb, var(--rarity) 22%, transparent),
    0 0 14px -6px var(--rarity);
  /* 1 except for 32-grid icons, which shrink on dense screens (see main.scss). */
  zoom: var(--item-gear-zoom);
}

/* Clips the art's transparent padding, which overflows the slot. */
.gear-art {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
}

/* Sized for the icons' grid (see main.scss) so every art pixel is a whole
   number of device pixels. The rim is a dark rarity tone around the
   silhouette, which thickens thin items. */
.gear-art img {
  --rim: color-mix(in srgb, var(--rarity) 55%, #000);
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--item-art);
  height: var(--item-art);
  transform: translate(-50%, -50%);
  image-rendering: pixelated;
  pointer-events: none;
  filter:
    drop-shadow(2px 0 0 var(--rim))
    drop-shadow(-2px 0 0 var(--rim))
    drop-shadow(0 2px 0 var(--rim))
    drop-shadow(0 -2px 0 var(--rim))
    drop-shadow(0 0 6px color-mix(in srgb, var(--rarity) 45%, transparent));
}

.gear-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.gear-name {
  color: var(--text-h);
  font-weight: 600;
}

/* The rarity (and Enchanted) on a line of their own under the name. */
.gear-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 0.4rem;
}

.gear-rarity {
  color: var(--rarity);
  font-size: 0.7rem;
  font-weight: 400;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.gear-enchanted {
  margin-left: 0.4rem;
  padding: 0 0.4rem;
  background: rgba(167, 139, 250, 0.14);
  border: 1px solid rgba(167, 139, 250, 0.5);
  border-radius: 999px;
  color: var(--accent-solid);
  font-size: 0.7rem;
  font-weight: 600;
}

.gear-effect {
  color: var(--rarity);
  font-size: 0.75rem;
  font-style: italic;
}

.gear-bonuses {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 0.75rem;
}

.gear-bonus {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--text-h);
  font-size: 0.8rem;
}

.enchanted .gear-bonuses .gear-bonus {
  color: var(--accent-solid);
}

.gear-bonus-label {
  color: var(--text);
}

.effects {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.75rem;
}

.effect {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.6rem;
  border: 1px solid;
  border-radius: 999px;
  font-size: 0.8rem;
}

.effect.boon {
  color: var(--heal-color);
  background: color-mix(in srgb, var(--heal-color) 12%, transparent);
  border-color: color-mix(in srgb, var(--heal-color) 45%, transparent);
}

.effect.bane {
  color: var(--damage-color);
  background: color-mix(in srgb, var(--damage-color) 12%, transparent);
  border-color: color-mix(in srgb, var(--damage-color) 45%, transparent);
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

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.5rem;
}

.stat-tile {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.55rem 0.7rem;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.tile-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text);
  font-size: 0.75rem;
}

.tile-value {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  color: var(--text-h);
  font-size: 1.25rem;
  font-weight: 600;
}

.tile-gain {
  padding: 0 0.4rem;
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  border-radius: 999px;
  color: var(--accent);
  font-size: 0.7rem;
  font-weight: 600;
  text-shadow: 0 0 8px var(--accent);
}

.tile-note {
  color: var(--text);
  font-size: 0.75rem;
}
</style>
