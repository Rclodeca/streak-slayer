<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ChevronsDown } from 'lucide-vue-next';
import { ITEM_CATALOG, PERSONALITY_NAME, REVIVE_GEMS, bossNumber, deathToll, formatCompact, heroClassFor, reviveState } from '../../game-engine';
import { lockBodyScroll } from '../../composables/useBodyScrollLock';
import { useCombatActions } from '../../composables/useCombatActions';
import { useDeathScreen } from '../../composables/useDeathScreen';
import { useMissedSkillsGate } from '../../composables/useMissedSkillsGate';
import { useQuestMissGate } from '../../composables/useQuestMissGate';
import { useSkins } from '../../composables/useSkins';
import { useAccountStore } from '../../store/accountStore';
import { useBossStore } from '../../store/bossStore';
import { useCharacterStore } from '../../store/characterStore';
import { bossSprite } from '../boss/bossSprites';
import TrialsModal from '../quests/TrialsModal.vue';
import { spriteSrcset, spriteUrl } from './spriteUrl';
import StatIcon from './StatIcon.vue';

// A death opens straight on the choice, over the whole screen
// (docs/mockups/app-ui-pass.html, death): what rising again costs in one card (it names
// the item it drops), and at the foot the keys: Revive at half HP for gems, brass,
// with Rise again under it. Short of gems, a line says why and Get gems opens the
// Challenges over this screen.
const { isDead, isPreview, dismiss } = useDeathScreen();
// The screen waits while the daily update or a missed quest is still to land
// (their popups show first), so a revive never meets a hit queued that day.
const { hasPending: habitMissPending } = useMissedSkillsGate();
const { hasPending: questMissPending } = useQuestMissGate();
const shown = computed(() => isDead.value && !habitMissPending.value && !questMissPending.value);
const { restart, revive } = useCombatActions();
const accountStore = useAccountStore();
const bossStore = useBossStore();
const characterStore = useCharacterStore();

const showGems = ref(false);

const baseUrl = import.meta.env.BASE_URL;
const skins = useSkins();
const heroArt = computed(() => skins.heroArtFor(heroClassFor(characterStore.character)));
const boss = computed(() => bossStore.boss);
// The gem revive: open on every fall while the gems cover it. A preview reads
// the hero as fallen.
const revival = computed(() => reviveState(isPreview.value ? { ...characterStore.character, currentHealth: 0 } : characterStore.character, accountStore.account.gems));
const gemsHeld = computed(() => Math.min(accountStore.account.gems, REVIVE_GEMS));
// What "Rise again" will take; each loss shows only when above zero.
const toll = computed(() => deathToll(characterStore.character));
// The item picked at the fall (markFallItem), while still worn; a preview shows the first worn item.
const fallItem = computed(() => {
  const id = isPreview.value ? characterStore.character.equippedItemIds[0] : characterStore.character.fallItemId;
  return id && characterStore.character.equippedItemIds.includes(id) ? ITEM_CATALOG.find((item) => item.id === id) : undefined;
});
const rarityLabel = computed(() => (fallItem.value ? fallItem.value.rarity.charAt(0).toUpperCase() + fallItem.value.rarity.slice(1) : ''));

let releaseScrollLock: (() => void) | null = null;
function unlock() {
  releaseScrollLock?.();
  releaseScrollLock = null;
}
watch(
  shown,
  (dead) => {
    if (dead) {
      showGems.value = false;
      if (!releaseScrollLock) releaseScrollLock = lockBodyScroll();
    } else {
      unlock();
    }
  },
  { immediate: true },
);
onBeforeUnmount(unlock);
</script>

<template>
  <Teleport to="body">
    <div v-if="shown" class="death-layer">
      <div class="setback">
        <div class="arena" aria-hidden="true">
          <img class="arena-img" :src="`${baseUrl}sprites/${skins.arenaArt.value}.png`" alt="" />
          <span class="glow" />
          <img class="foe" :srcset="spriteSrcset(bossSprite(boss))" alt="" />
          <img class="fallen" :src="spriteUrl(heroArt)" alt="" />
          <span class="shade" />
        </div>
        <h2 class="fell">You fell</h2>
        <p class="by">{{ PERSONALITY_NAME[boss.personality] }} · Boss {{ bossNumber(boss) }}</p>

        <section v-if="fallItem || toll.levels || toll.gold || toll.items" class="path rise-path">
          <p class="cost-label">Rising again costs</p>
          <div v-if="fallItem" class="drop" :style="{ '--rarity': `var(--rarity-${fallItem.rarity})` }">
            <span class="drop-frame"><img :src="`${baseUrl}sprites/${fallItem.icon}.png`" alt="" /></span>
            <span class="drop-text">
              <small class="drop-rarity">{{ rarityLabel }}</small>
              <strong class="drop-name">{{ fallItem.name }}</strong>
              <span class="drop-tag">Dropped</span>
            </span>
          </div>
          <ul v-if="toll.levels || toll.gold || (toll.items && !fallItem)" class="losses">
            <li v-if="toll.levels" class="loss"><ChevronsDown :size="16" />−{{ toll.levels }} level{{ toll.levels === 1 ? '' : 's' }}</li>
            <li v-if="toll.gold" class="loss"><StatIcon name="gold" :size="15" />−{{ formatCompact(toll.gold) }} gold</li>
            <li v-if="toll.items && !fallItem" class="loss">−1 item</li>
          </ul>
        </section>

        <div class="acts">
          <button v-if="revival === 'buy'" type="button" class="revive-button" @click="isPreview ? dismiss() : revive()">
            Revive at half HP<span class="revive-price" :aria-label="`${REVIVE_GEMS} gems`"><StatIcon name="gems" :size="15" />{{ REVIVE_GEMS }}</span>
          </button>
          <template v-else-if="revival === 'short'">
            <p class="short">Get more gems to revive at half HP</p>
            <p class="gems-held">
              <span class="count">{{ gemsHeld }} / {{ REVIVE_GEMS }}<StatIcon name="gems" :size="15" /></span>
              <span class="bar" aria-hidden="true"><i :style="{ width: `${(gemsHeld / REVIVE_GEMS) * 100}%` }" /></span>
            </p>
            <button type="button" class="gems-button" @click="showGems = true">Get gems</button>
          </template>
          <button type="button" class="rise-button" @click="isPreview ? dismiss() : restart()">Rise again</button>
        </div>
      </div>
    </div>
    <TrialsModal v-if="shown" v-model="showGems" over />
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
  background: #0e0f17;
}

.death-layer > * {
  flex: 1;
}

.setback {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 0 14px calc(18px + env(safe-area-inset-bottom));
}

/* The arena with the boss standing over the fallen hero, dimmed: a red glow
   rises behind them from the floor, and the whole strip fades into the page.
   The arena is 216 x 116 art px at 2 CSS px, anchored to the floor like the stage's. */
.arena {
  position: relative;
  flex: none;
  height: calc(176px + env(safe-area-inset-top));
  margin: 0 -14px;
  overflow: hidden;
}

.arena-img {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 432px;
  height: 232px;
  transform: translateX(-50%);
  image-rendering: pixelated;
  filter: brightness(0.45) saturate(0.6);
}

.foe {
  position: absolute;
  right: max(16px, calc(50% - 170px));
  bottom: 14px;
  image-rendering: pixelated;
}

/* The hero's build at its stage size (96px, see spriteUrl), laid down. */
.fallen {
  position: absolute;
  left: max(8px, calc(50% - 170px));
  bottom: 0;
  width: 96px;
  height: 96px;
  image-rendering: pixelated;
  transform: rotate(-90deg);
  filter: grayscale(0.85) brightness(0.85);
}

.glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(80% 70% at 50% 100%, rgba(168, 42, 32, 0.28), transparent 70%);
}

.shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(transparent 45%, #0e0f17);
}

.fell {
  position: relative;
  margin: -26px 0 0;
  text-align: center;
  color: #e46a5a;
  font: 700 24px 'Cinzel', serif;
  letter-spacing: 0.16em;
  text-indent: 0.16em;
  text-shadow: 0 2px 0 #3a0e0a;
}

.by {
  margin: 0 0 12px;
  text-align: center;
  font-size: 13px;
}

/* What rising again costs, in one card. */
.path {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 13px;
  background: #2d2c50;
  border-bottom: 3px solid #0e0e19;
  box-shadow:
    inset 2px 2px 0 #4d4c7e,
    inset -2px -2px 0 #191a28;
  clip-path: var(--px3);
}

.cost-label {
  margin: 0 0 -2px;
  color: #9a9ab8;
  font: 700 11px 'Alegreya Sans', sans-serif;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

/* The keys at the screen's foot: the brass revive (or, short of gems, why and Get
   gems), and Rise again under it as a plain outlined key. */
.acts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
  padding-top: 16px;
}

.revive-button,
.gems-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 50px;
  padding: 0 1rem;
  color: #231c0c;
  font: 800 16px 'Alegreya Sans', sans-serif;
  letter-spacing: 0.04em;
  background: #c7a560;
  border: 0;
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.3),
    inset 0 -3px 0 #6e5a2f;
  clip-path: var(--px2);
  -webkit-tap-highlight-color: transparent;
}

.revive-price {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #13505e;
  font-weight: 800;
}

.revive-price :deep(.stat-icon) {
  color: #13505e;
}

.short {
  margin: 0;
  text-align: center;
  font-size: 14.5px;
  color: #d3d4e4;
}

.gems-held {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
}

.gems-held .count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--icon-gem);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.gems-held .bar {
  position: relative;
  flex: 1;
  max-width: 160px;
  height: 10px;
  background: #222338;
  box-shadow:
    inset 0 0 0 1px #3a3b5c,
    inset 0 2px 0 rgba(0, 0, 0, 0.35);
  clip-path: var(--px2);
}

.gems-held .bar i {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--icon-gem);
}

.rise-button {
  display: block;
  width: 100%;
  min-height: 48px;
  color: #dfe0f0;
  font: 700 16px 'Alegreya Sans', sans-serif;
  background: transparent;
  border: 0;
  box-shadow: inset 0 0 0 2px #4a4a70;
  clip-path: var(--px2);
}

/* The item the fall drops, named, in its rarity's colour. */
.drop {
  display: flex;
  align-items: center;
  gap: 12px;
}

.drop-frame {
  display: grid;
  flex: none;
  width: 72px;
  height: 72px;
  place-items: center;
  background: color-mix(in srgb, var(--rarity) 14%, #12131c);
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--rarity) 75%, #000);
  clip-path: var(--px2);
}

.drop-frame img {
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
}

.drop-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.drop-rarity {
  color: var(--rarity);
  font: 600 12.5px 'Alegreya Sans', sans-serif;
}

.drop-name {
  color: var(--text-h);
  font: 700 17px/1.15 'Alegreya', Georgia, serif;
  overflow-wrap: anywhere;
}

.drop-tag {
  margin-top: 3px;
  color: #ef8a7c;
  font: 800 12px 'Alegreya Sans', sans-serif;
}

.losses {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.loss {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 10px;
  color: #ef8a7c;
  font: 800 16px 'Alegreya Sans', sans-serif;
  font-variant-numeric: tabular-nums;
  background: #12131c;
  box-shadow:
    inset 0 3px 0 rgba(0, 0, 0, 0.35),
    inset 0 0 0 1px #2c2c47;
  clip-path: var(--px2);
}
</style>
