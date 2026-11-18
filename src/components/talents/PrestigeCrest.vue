<script setup lang="ts">
import { Crown, Lock } from 'lucide-vue-next';
import { computed } from 'vue';
import { nextPrestigeRank, PRESTIGE_RANKS, prestigeMark, prestigeRank } from '../../game-engine';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import { climbPercent, crestLabel, ladderSealed } from './prestigeDisplay';

// The way into prestige (docs/mockups/prestige-entrance.html, A · Crest on the banner,
// moved to the left): a round seal on the Talents banner in the next rank's colour,
// the rank earned on it and a ring filling toward the next bar. At the bar it glows
// and its rays turn; before the first prestige, under its bar, it is grey under a
// lock. Tapping it opens the prestige page (TalentSection).
defineEmits<{ open: [] }>();

const accountStore = useAccountStore();
const characterStore = useCharacterStore();
const rank = computed(() => prestigeRank(accountStore.account));
const level = computed(() => characterStore.character.level);
const next = computed(() => nextPrestigeRank(rank.value));
const sealed = computed(() => ladderSealed(rank.value, level.value));
const ready = computed(() => !!next.value && level.value >= next.value.bar);
/** The colour of the rank being climbed to, or relic once Mythic. */
const tier = computed(() => prestigeMark(next.value?.rank ?? PRESTIGE_RANKS.length)!.rarity);
const numeral = computed(() => prestigeMark(rank.value)?.numeral);
</script>

<template>
  <button type="button" class="prestige-crest" :class="[tier, { sealed, ready }]" @click="$emit('open')">
    <span class="crest-seal" aria-hidden="true">
      <span v-if="ready" class="crest-rays" />
      <span v-else-if="!sealed && next" class="crest-ring" :style="{ '--p': climbPercent(rank, level) }" />
      <span class="crest-disc">
        <Lock v-if="sealed" :size="15" />
        <span v-else-if="numeral">{{ numeral }}</span>
        <Crown v-else :size="19" />
      </span>
    </span>
    <span class="crest-text">
      <em>Prestige</em>
      <b>{{ crestLabel(rank, level) }}</b>
    </span>
  </button>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.prestige-crest {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 12px 0 4px;
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
}

.crest-seal {
  position: relative;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
}

.crest-ring {
  position: absolute;
  inset: 0;
}

.crest-rays {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 96px;
  height: 96px;
  margin: -48px 0 0 -48px;
  pointer-events: none;
}

.crest-disc {
  position: relative;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
}

.crest-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
}

.crest-text em {
  font-style: normal;
}
</style>
