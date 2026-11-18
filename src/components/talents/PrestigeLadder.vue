<script setup lang="ts">
import { Crown, Lock } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { canPrestige, nextPrestigeRank, PRESTIGE_BONUS_PER_RANK, PRESTIGE_GEMS, PRESTIGE_RANKS, prestigeMark, prestigeRank } from '../../game-engine';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import PrestigeNumeral from '../ui/PrestigeNumeral.vue';
import StatIcon from '../ui/StatIcon.vue';
import PrestigePopup from './PrestigePopup.vue';
import { ladderSealed, ladderState, PRESTIGE_SPECIAL_LOOK } from './prestigeDisplay';

// The prestige ladder (docs/mockups/prestige-tree.html, A · Crown plinth): what the
// Talents tab's crown plinth shows in place of a shoot. Five numeral plates climb
// from I at the foot to V at the top, each with its bar on the left and its special
// on the right, the trunk lit up to the last rank earned. Under it, the next
// rank's gains and either the climb to its bar or, at the bar, the Prestige button,
// which opens the prestige popup to confirm. Before the first prestige, under its
// bar, a veil covers it all.
const confirming = ref(false);

const accountStore = useAccountStore();
const characterStore = useCharacterStore();
const rank = computed(() => prestigeRank(accountStore.account));
const level = computed(() => characterStore.character.level);
const next = computed(() => nextPrestigeRank(rank.value));
const sealed = computed(() => ladderSealed(rank.value, level.value));
const ready = computed(() => canPrestige(characterStore.character, rank.value));
/** The colour of the rank being climbed to, or relic once Mythic. */
const tier = computed(() => prestigeMark(next.value?.rank ?? PRESTIGE_RANKS.length)!.rarity);

const rungs = computed(() =>
  PRESTIGE_RANKS.map((def, i) => ({
    def,
    mark: prestigeMark(def.rank)!,
    state: ladderState(i, rank.value, level.value),
    look: PRESTIGE_SPECIAL_LOOK[def.rank],
    // The trunk below a rung is lit once the rung is earned (the foot has none).
    litDown: i > 0 && i < rank.value,
  })).reverse(),
);

/** How far up the climb from level 1 to the next bar the hero is. */
const progress = computed(() => (next.value ? Math.max(4, Math.min(100, ((level.value - 1) / (next.value.bar - 1)) * 100)) : 100));
const EMBERS = Array.from({ length: 10 }, (_, i) => ({ left: `${8 + ((i * 37) % 86)}%`, animationDuration: `${4 + (i % 4) * 1.3}s`, animationDelay: `${(i * 0.7) % 4}s` }));
</script>

<template>
  <div class="prestige-ladder" :class="[tier, { sealed, ready }]">
    <div v-if="ready" class="ladder-embers" aria-hidden="true"><i v-for="(style, n) in EMBERS" :key="n" :style="style" /></div>
    <ol class="ladder-trunk" aria-label="Prestige ranks">
      <li v-for="rung in rungs" :key="rung.def.rank" class="ladder-node" :class="[rung.mark.rarity, rung.state, { top: rung.def.rank === PRESTIGE_RANKS.length }]">
        <span v-if="rung.def.rank > 1" class="ladder-seg" :class="{ lit: rung.litDown }" aria-hidden="true" />
        <span v-if="rung.state === 'ready'" class="ladder-rays" aria-hidden="true" />
        <span class="ladder-lft">
          <span v-if="rung.state === 'done'" class="ladder-title">{{ rung.mark.title }}</span>
          <span v-else class="ladder-bar">Lv {{ rung.def.bar }}</span>
        </span>
        <PrestigeNumeral :mark="rung.mark" large class="ladder-plate" :class="rung.state" />
        <span class="ladder-rgt">
          <span class="ladder-spec"><component :is="rung.look.icon" :size="15" aria-hidden="true" />{{ rung.look.name }}</span>
          <span v-if="rung.look.line" class="ladder-line">{{ rung.look.line }}</span>
        </span>
      </li>
    </ol>

    <div v-if="sealed" class="ladder-veil">
      <span class="ladder-lock"><Lock :size="18" aria-hidden="true" /></span>
      <span>Reach level {{ PRESTIGE_RANKS[0].bar }}</span>
    </div>
    <template v-else-if="next">
      <div class="ladder-next">
        <span class="ladder-label">Next rank</span>
        <div class="ladder-gains">
          <span><StatIcon name="hit" :size="14" /><b>+{{ PRESTIGE_BONUS_PER_RANK.allDamage }}%</b> damage</span>
          <span><StatIcon name="health" :size="14" /><b>+{{ PRESTIGE_BONUS_PER_RANK.health }}%</b> HP</span>
          <span><StatIcon name="exp" :size="14" /><b>+{{ PRESTIGE_BONUS_PER_RANK.expGain }}%</b> EXP</span>
          <span><StatIcon name="gems" :size="14" /><b>{{ PRESTIGE_GEMS }}</b></span>
        </div>
      </div>
      <div class="ladder-act">
        <button v-if="ready" type="button" class="prestige-go" @click="confirming = true"><Crown :size="20" aria-hidden="true" />Prestige</button>
        <div v-else class="ladder-prog" role="progressbar" :aria-valuenow="level" :aria-valuemax="next.bar">
          <i :style="{ width: `calc(${progress}% - 6px)` }" />
          <span>Level {{ level }} / {{ next.bar }}</span>
        </div>
      </div>
    </template>
    <PrestigePopup v-model="confirming" />
  </div>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.prestige-ladder {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 100%;
  max-width: 420px;
  margin: 0 auto;
  padding: 0 12px 6px;
}

.ladder-embers {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.ladder-embers i {
  position: absolute;
  bottom: -6px;
  width: 3px;
  height: 3px;
  opacity: 0;
}

.ladder-trunk {
  display: flex;
  flex-direction: column;
  gap: 22px;
  margin: 0;
  padding: 10px 0 8px;
  list-style: none;
}

.ladder-node {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 64px 1fr;
  align-items: center;
}

/* The trunk from this rung down to the one below, behind the plates. */
.ladder-seg {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 0;
  width: 4px;
  height: calc(100% + 22px);
  margin-left: -2px;
}

.ladder-rays {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 0;
  width: 120px;
  height: 120px;
  margin: -60px 0 0 -60px;
  border-radius: 50%;
  pointer-events: none;
}

.ladder-lft {
  justify-self: end;
  padding-right: 12px;
  text-align: right;
}

.ladder-plate {
  position: relative;
  z-index: 1;
  justify-self: center;
}

.ladder-rgt {
  display: flex;
  flex-direction: column;
  padding-left: 12px;
}

.ladder-spec {
  display: flex;
  align-items: center;
  gap: 5px;
}

.ladder-veil {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.ladder-lock {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.ladder-next {
  margin: 4px 0 8px;
  padding: 8px 10px;
}

.ladder-label {
  display: block;
  margin-bottom: 4px;
  text-align: center;
}

.ladder-gains {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 12px;
}

.ladder-gains span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.ladder-act {
  padding: 0 2px 8px;
}

.prestige-go {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 54px;
  border: 0;
  overflow: hidden;
  cursor: pointer;
}

.ladder-prog {
  position: relative;
  height: 22px;
}

.ladder-prog i {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
}

.ladder-prog span {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}
</style>
