<script setup lang="ts">
import { computed } from 'vue';
import { canSpendTalent, talentRank } from '../../game-engine';
import type { TalentDef } from '../../game-engine';
import { useCharacterStore } from '../../store/characterStore';
import Modal from '../ui/Modal.vue';
import { TALENT_LOOK, talentAmount, talentDescription, talentState } from './talentDisplay';

// A node's popup (docs/mockups/pixel-talents.html, "Tap a node"): what it does,
// what the rank in hand gives and what the next would. Spent points can't be
// taken back, so Learn is the confirm: the tap on the node, then this one. It
// stays up so the next rank is one more tap, and greys out when it can't be taken.
const props = defineProps<{ def: TalentDef | null }>();
const emit = defineEmits<{ close: [] }>();
const characterStore = useCharacterStore();

const rank = computed(() => (props.def ? talentRank(characterStore.character, props.def.id) : 0));
const look = computed(() => (props.def ? TALENT_LOOK[props.def.id] : null));
const full = computed(() => !!props.def && rank.value >= props.def.maxRank);
const state = computed(() => (props.def ? talentState(characterStore.character, props.def) : 'open'));
const canLearn = computed(() => !!props.def && canSpendTalent(characterStore.character, props.def.id));

function learn() {
  if (props.def) characterStore.spendTalent(props.def.id);
}
</script>

<template>
  <Modal :model-value="def !== null" title="Talent" max-width="360px" @update:model-value="emit('close')">
    <div v-if="def && look" class="talent-popup">
      <div class="nhead n" :class="state">
        <span class="sock" :style="{ '--c': look.color }"><component :is="look.icon" :size="28" aria-hidden="true" /></span>
        <div class="rt">
          <span class="nm">{{ def.name }}</span>
          <span class="pips" aria-hidden="true"><i v-for="n in def.maxRank" :key="n" class="pip" :class="{ lit: n <= rank }" /></span>
        </div>
      </div>
      <p class="desc">{{ talentDescription(def) }}</p>
      <div class="plates">
        <div class="plate now">
          <small>Now · {{ rank }}/{{ def.maxRank }}</small>
          <span>{{ talentAmount(def, rank) }}</span>
        </div>
        <div class="plate next" :class="{ done: full }">
          <small>Next · {{ Math.min(rank + 1, def.maxRank) }}/{{ def.maxRank }}</small>
          <span>{{ full ? '—' : talentAmount(def, rank + 1) }}</span>
        </div>
      </div>
      <button type="button" class="learn primary-button" :disabled="!canLearn" @click="learn">
        <template v-if="full">Full</template>
        <template v-else>Learn <span class="count">1</span></template>
      </button>
    </div>
  </Modal>
</template>

<style scoped>
.nhead {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.sock {
  display: grid;
  place-items: center;
  flex: none;
  width: 60px;
  height: 60px;
  color: var(--c);
}

.rt {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pips {
  display: inline-flex;
  gap: 3px;
}

.pip {
  width: 6px;
  height: 6px;
  border: 1.5px solid var(--brass);
}

.pip.lit {
  background: var(--brass);
}

.desc {
  margin: 0 0 14px;
}

.plates {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 16px;
}

.plate {
  padding: 8px 10px;
}

.plate small {
  display: block;
  margin-bottom: 2px;
}

.learn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
}
</style>
