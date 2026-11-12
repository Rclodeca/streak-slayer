<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChartColumn, Lock, Swords } from 'lucide-vue-next';
import { describeItemBonus, describeItemBonusParts, itemDoubleFactor, MAX_EQUIP_SLOTS } from '../../game-engine';
import { useHeroStats } from '../../composables/useHeroStats';
import ExpBar from '../ui/ExpBar.vue';
import HealthBar from '../ui/HealthBar.vue';
import ItemSparks from '../ui/ItemSparks.vue';
import SectionTitle from '../ui/SectionTitle.vue';
import StatIcon from '../ui/StatIcon.vue';
import { BOOST_STAT_ICON } from '../ui/statIcons';
import PlayerSprite from './PlayerSprite.vue';

// The hero's details: what's running on them, their gear and their stats.
// In the popup (CharacterPanel) they open on the hero with their level and
// bars; as the phone's Hero tab (`page`), where the pinned home base (HomeBase,
// in AppShell) already shows the hero, their name, level and best streak, straight
// on the gear: a rack of every slot (RACK_ROW across, locked ones shown) and the card
// of the one picked.
const props = defineProps<{ page?: boolean }>();

const baseUrl = import.meta.env.BASE_URL;

const { character, maxHealth, displayLevel, expNeeded, displayExp, activeEffects, equippedItems, slotCount, emptySlotCount, statTiles } = useHeroStats();

// The rack: every slot the game can ever have, two sockets across and four down,
// beside the card of the picked item. The ones worn hold their item, the unlocked
// rest are empty sockets and the others locked.
const RACK_COLUMNS = 2;
const picked = ref<string | null>(null);
// The item whose card shows: the one tapped, or the first worn if it's gone (or nothing's tapped yet).
const selected = computed(() => equippedItems.value.find((item) => item.id === picked.value) ?? equippedItems.value[0] ?? null);
const cells = computed(() =>
  Array.from({ length: MAX_EQUIP_SLOTS }, (_, slot) => {
    const item = equippedItems.value[slot];
    return { slot, item, state: item ? ('worn' as const) : slot < slotCount.value ? ('empty' as const) : ('locked' as const) };
  }),
);
// The rack row of the picked item, where the card's pointer sits.
const selectedRow = computed(() => Math.floor(Math.max(0, equippedItems.value.findIndex((item) => item.id === selected.value?.id)) / RACK_COLUMNS));
// The popup lists every item; the tab, only the picked one under the rack.
const listedItems = computed(() => (props.page ? (selected.value ? [selected.value] : []) : equippedItems.value));
</script>

<template>
  <div class="hero-details" :class="{ 'hero-page': page }">
    <div v-if="!page" class="hero">
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
      <div v-if="page" class="hero-page-header">
        <SectionTitle title="Equipment" :aside="`${equippedItems.length} / ${slotCount}`"><Swords :size="18" class="section-icon" /></SectionTitle>
      </div>
      <h4 v-else class="group-label">Equipment</h4>
      <div :class="{ 'gear-bay': page }">
        <div v-if="page" class="rack" role="group" aria-label="Equipment">
          <template v-for="cell in cells" :key="cell.slot">
            <button
              v-if="cell.item"
              type="button"
              class="rack-slot"
              :class="[`rarity-${cell.item.rarity}`, { enchanted: itemDoubleFactor(character, cell.item.id) > 1, selected: selected?.id === cell.item.id }]"
              :aria-label="`${cell.item.name}, ${cell.item.rarity}`"
              :aria-pressed="selected?.id === cell.item.id"
              @click="picked = cell.item.id"
            >
              <span class="gear-icon">
                <ItemSparks :rarity="cell.item.rarity" :seed="cell.slot" />
                <span class="gear-art"><img :src="`${baseUrl}sprites/${cell.item.icon}.png`" alt="" /></span>
              </span>
            </button>
            <span v-else class="rack-slot" :class="cell.state" role="img" :aria-label="cell.state === 'empty' ? 'Empty slot' : 'Locked slot'">
              <span class="gear-icon"><Lock v-if="cell.state === 'locked'" :size="18" class="slot-lock" /></span>
            </span>
          </template>
        </div>
        <ul class="gear-list" :class="page && selected ? [`rarity-${selected.rarity}`, 'gear-detail'] : undefined" :style="page ? { '--row': selectedRow } : undefined">
        <li
          v-for="(item, index) in listedItems"
          :key="item.id"
          class="gear-row"
          :class="[`rarity-${item.rarity}`, { enchanted: itemDoubleFactor(character, item.id) > 1 }]"
        >
          <span class="gear-icon">
            <ItemSparks :rarity="item.rarity" :seed="index" />
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
        <li v-for="n in page ? 0 : emptySlotCount" :key="`empty-${n}`" class="gear-row empty"><span class="gear-icon" aria-hidden="true" />Empty slot</li>
      </ul>
      </div>
    </section>

    <section class="stat-group">
      <div v-if="page" class="hero-page-header"><SectionTitle title="Stats"><ChartColumn :size="18" class="section-icon" /></SectionTitle></div>
      <h4 v-else class="group-label">Stats</h4>
      <div class="tiles">
        <div v-for="stat in statTiles" :key="stat.label" class="stat-tile" :class="{ reduced: stat.now }">
          <span class="tile-label"><StatIcon :name="stat.icon" />{{ stat.label }}</span>
          <span class="tile-value">
            <template v-if="stat.now"><s class="tile-usual">{{ stat.value }}</s><span class="tile-now">{{ stat.now }}</span></template>
            <template v-else>{{ stat.value }}</template>
            <span v-if="stat.gain" class="tile-gain">{{ stat.gain }}</span>
          </span>
          <span v-if="stat.reason || stat.note" class="tile-note">{{ stat.reason ?? stat.note }}</span>
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

/* The Hero tab's gear bay: the rack (two sockets across, four down) beside the picked
   item's card, which stretches to the rack's height. The art is the same fixed size on
   every screen (--rack-art, see main.scss): only the card's width follows the phone. */
.gear-bay {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
}

.rack {
  display: grid;
  grid-template-columns: repeat(2, var(--rack-slot));
  grid-auto-rows: var(--rack-slot);
  gap: 8px;
  align-content: start;
  padding: 8px;
}

.rack-slot {
  min-width: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
}

button.rack-slot {
  cursor: pointer;
}

.rack-slot .gear-icon {
  display: grid;
  place-items: center;
  width: var(--rack-slot);
  height: var(--rack-slot);
}

.rack-slot .gear-art img,
.gear-detail .gear-art img {
  width: var(--rack-art);
  height: var(--rack-art);
}

.rack-slot.empty,
.rack-slot.locked {
  --rarity: var(--border);
}

.slot-lock {
  position: relative;
  color: var(--text);
}

/* The card: the item's socket and name across the top, its bonuses and effect
   under them over the full width. A pointer on its left edge sits level with the
   picked socket's row. */
.gear-detail {
  position: relative;
}

.gear-detail::before {
  content: '';
  position: absolute;
  top: calc(8px + var(--row, 0) * (var(--rack-slot) + 8px) + var(--rack-slot) / 2 - 6px);
  left: -8px;
  border: 6px solid transparent;
  border-left: 0;
  border-right-color: var(--rarity);
}

.gear-detail .gear-row {
  flex: 1;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-content: start;
  align-items: center;
  column-gap: 10px;
  row-gap: 4px;
}

.gear-detail .gear-icon {
  grid-row: 1 / span 2;
  width: var(--rack-slot);
  height: var(--rack-slot);
}

.gear-detail .gear-text {
  display: contents;
}

.gear-detail .gear-name {
  grid-column: 2;
  align-self: end;
}

.gear-detail .gear-tags {
  grid-column: 2;
  align-self: start;
}

.gear-detail .gear-bonuses,
.gear-detail .gear-bonus,
.gear-detail .gear-effect {
  grid-column: 1 / -1;
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

/* A stat a boss skill is lowering: the usual value struck through, what it is now beside it. */
.tile-usual {
  color: var(--text);
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration-color: var(--damage-color);
  text-decoration-thickness: 2px;
}

.tile-now {
  color: var(--damage-color);
}

.stat-tile.reduced {
  border-color: color-mix(in srgb, var(--damage-color) 40%, var(--border));
}
</style>
