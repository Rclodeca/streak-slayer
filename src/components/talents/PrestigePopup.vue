<script setup lang="ts">
import { Crown } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { bossNumber, heroClassFor, nextPrestigeRank, PRESTIGE_BONUS_PER_RANK, PRESTIGE_GEMS, prestigeMark, prestigeRank, SKIN_CATALOG } from '../../game-engine';
import { useCombatActions } from '../../composables/useCombatActions';
import { useSkins } from '../../composables/useSkins';
import { useAccountStore } from '../../store/accountStore';
import { useBossStore } from '../../store/bossStore';
import { useCharacterStore } from '../../store/characterStore';
import Modal from '../ui/Modal.vue';
import PrestigeNumeral from '../ui/PrestigeNumeral.vue';
import StatIcon from '../ui/StatIcon.vue';
import { baseSpriteUrl } from '../ui/spriteUrl';
import { PRESTIGE_SPECIAL_LOOK } from './prestigeDisplay';

// The prestige popup (docs/mockups/prestige-popup.html, A · The statue): the
// retiring hero in grey stone on a pedestal, stamped Retired, with a plaque of who
// they were; the new rank's plate landing in its rays; the rank's gains and
// special; and the choice. Prestige runs useCombatActions().prestige, which ends
// on the new-hero screen. A second tap does nothing.
const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const { prestige } = useCombatActions();
const accountStore = useAccountStore();
const bossStore = useBossStore();
const characterStore = useCharacterStore();
const skins = useSkins();

const next = computed(() => nextPrestigeRank(prestigeRank(accountStore.account)));
const mark = computed(() => (next.value ? prestigeMark(next.value.rank) : null));
const look = computed(() => (next.value ? PRESTIGE_SPECIAL_LOOK[next.value.rank] : null));
const heroClass = computed(() => heroClassFor(characterStore.character));
const heroLabel = computed(() => heroClass.value.charAt(0).toUpperCase() + heroClass.value.slice(1));
const name = computed(() => characterStore.character.name ?? '');
/** At V, the socket shows the Mythic skin for the class being played. */
const mythicArt = computed(() => (next.value?.special === 'mythic-skin' ? SKIN_CATALOG.find((skin) => skin.mythic && skin.heroClass === heroClass.value)?.art : undefined));
const EMBERS = Array.from({ length: 8 }, (_, i) => ({ left: `${6 + ((i * 37) % 88)}%`, animationDuration: `${3 + (i % 4)}s`, animationDelay: `${(i * 0.6) % 3}s` }));

const taken = ref(false);
watch(
  () => props.modelValue,
  (open) => {
    if (open) taken.value = false;
  },
);

function close() {
  emit('update:modelValue', false);
}

function confirm() {
  if (taken.value) return;
  taken.value = true;
  prestige();
  close();
}
</script>

<template>
  <Modal :model-value="modelValue && !!mark" max-width="420px" @update:model-value="close">
    <div v-if="mark && look && next" class="prestige-popup" :class="mark.rarity">
      <div class="prestige-scene">
        <span class="prestige-glow" aria-hidden="true" />
        <span class="prestige-embers" aria-hidden="true"><i v-for="(style, n) in EMBERS" :key="n" :style="style" /></span>
        <img class="prestige-statue" :src="baseSpriteUrl(skins.heroArtFor(heroClass))" alt="" />
        <span class="prestige-pedestal" aria-hidden="true" />
        <span class="prestige-stamp">Retired</span>
        <span class="prestige-plaque">
          <span class="who">{{ name }}</span>
          <span class="meta">{{ heroLabel }} · Lv {{ characterStore.character.level }} · Boss {{ bossNumber(bossStore.boss) }}</span>
        </span>
      </div>
      <div class="prestige-badge">
        <span class="prestige-rays" aria-hidden="true" />
        <PrestigeNumeral :mark="mark" large class="prestige-plate" />
      </div>
      <p class="prestige-rank">Prestige {{ mark.numeral }}</p>
      <h3 class="prestige-title">{{ mark.title }}</h3>
      <ul class="prestige-gains">
        <li><StatIcon name="hit" :size="16" /><b>+{{ PRESTIGE_BONUS_PER_RANK.allDamage }}%</b><small>damage</small></li>
        <li><StatIcon name="health" :size="16" /><b>+{{ PRESTIGE_BONUS_PER_RANK.health }}%</b><small>max HP</small></li>
        <li><StatIcon name="exp" :size="16" /><b>+{{ PRESTIGE_BONUS_PER_RANK.expGain }}%</b><small>EXP</small></li>
        <li><StatIcon name="gems" :size="16" /><b>{{ PRESTIGE_GEMS }}</b><small>gems</small></li>
      </ul>
      <div class="prestige-special">
        <span class="sock">
          <img v-if="mythicArt" :src="baseSpriteUrl(mythicArt)" alt="" />
          <component :is="look.icon" v-else :size="22" aria-hidden="true" />
        </span>
        <div>
          <small class="new">New</small>
          <p class="nm">{{ look.name }}</p>
          <p v-if="look.line" class="ln">{{ look.line }}</p>
        </div>
      </div>
      <p class="prestige-warn">{{ name }} begins again at <b>level 1</b>.</p>
      <div class="prestige-choice">
        <button type="button" class="prestige-cancel" @click="close">Cancel</button>
        <button type="button" class="prestige-confirm" :disabled="taken" @click="confirm"><Crown :size="18" aria-hidden="true" />Prestige</button>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. The scene runs
   to the popup's edges and top, as the level-up's strip does. */
.prestige-scene {
  position: relative;
  height: 172px;
  margin: calc(-1rem - 0.75rem) -1.25rem 0;
  overflow: hidden;
}

.prestige-glow,
.prestige-embers {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.prestige-embers {
  overflow: hidden;
}

.prestige-embers i {
  position: absolute;
  bottom: -6px;
  width: 3px;
  height: 3px;
  opacity: 0;
}

.prestige-statue {
  position: absolute;
  bottom: 62px;
  left: 50%;
  z-index: 2;
  width: 64px;
  height: 64px;
  max-width: none;
  margin-left: -32px;
  image-rendering: pixelated;
}

.prestige-pedestal {
  position: absolute;
  bottom: 44px;
  left: 50%;
  z-index: 1;
  width: 92px;
  height: 22px;
  margin-left: -46px;
}

.prestige-stamp {
  position: absolute;
  top: 40px;
  left: calc(50% + 30px);
  z-index: 3;
}

.prestige-plaque {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 3;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}

.prestige-badge {
  position: relative;
  z-index: 3;
  display: grid;
  place-items: center;
  margin: -36px 0 4px;
}

.prestige-rays {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 220px;
  height: 220px;
  margin: -110px 0 0 -110px;
  border-radius: 50%;
  pointer-events: none;
}

.prestige-plate {
  position: relative;
  width: 64px;
  height: 64px;
}

.prestige-rank,
.prestige-title {
  margin: 0;
  text-align: center;
}

.prestige-gains {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.prestige-gains li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 0 7px;
}

.prestige-special {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 10px;
  align-items: center;
  margin-top: 8px;
  padding: 9px 12px;
}

.prestige-special .sock {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
}

.prestige-special .sock img {
  width: 40px;
  height: 40px;
  image-rendering: pixelated;
}

.prestige-special p {
  margin: 0;
}

.prestige-warn {
  margin: 12px 0 0;
  text-align: center;
}

.prestige-choice {
  display: grid;
  grid-template-columns: 1fr 1.7fr;
  gap: 8px;
  margin-top: 14px;
  padding-bottom: env(safe-area-inset-bottom);
}

.prestige-cancel,
.prestige-confirm {
  min-height: 52px;
  border: 0;
  cursor: pointer;
}

.prestige-confirm {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  overflow: hidden;
  white-space: nowrap;
}
</style>
