<script setup lang="ts">
import { computed } from 'vue';
import { ChevronsUp, Skull, Sprout } from 'lucide-vue-next';
import { useModalPriority } from '../../composables/useModalPriority';
import { talentPointsUnspent } from '../../game-engine';
import { useCharacterStore } from '../../store/characterStore';
import Modal from '../ui/Modal.vue';
import RuleList from '../ui/RuleList.vue';
import type { Rule } from '../ui/RuleList.vue';

// Shown every run on reaching TALENTS_UNLOCK_LEVEL (see talentUnlockPending), and
// once to a save already past it. "Onward" opens the Talents tab; the brass count
// on the plate is the points already waiting.
const { talentUnlockVisible } = useModalPriority();
const characterStore = useCharacterStore();
const points = computed(() => talentPointsUnspent(characterStore.character));

const RULES: Rule[] = [
  { icon: ChevronsUp, tone: 'accent', title: 'Earn', text: 'Each level brings a point.' },
  { icon: Sprout, tone: 'solid', title: 'Grow', text: 'Spent points stay spent.' },
  { icon: Skull, tone: 'danger', title: 'Fall', text: 'The tree dies with you.' },
];

function onward() {
  characterStore.unlockTalents();
}
</script>

<template>
  <Modal :model-value="talentUnlockVisible" :dismissible="false" title="Talents unlocked" max-width="440px">
    <div class="talent-unlock">
      <div class="emblem" aria-hidden="true">
        <Sprout :size="34" :stroke-width="1.5" />
        <span class="count">{{ points }}</span>
      </div>
      <p class="tagline">Every level leaves its mark.</p>
      <RuleList :rules="RULES" />
      <button type="button" class="onward primary-button" @click="onward">Onward</button>
    </div>
  </Modal>
</template>

<style scoped>
.emblem {
  position: relative;
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  margin: 0.25rem auto 0.9rem;
  color: var(--accent);
  background: radial-gradient(circle, var(--accent-bg), transparent 70%);
  border: 1px solid var(--accent-border);
  border-radius: 50%;
  box-shadow: 0 0 24px -8px var(--accent);
}

/* The points already waiting, on a plate at the emblem's corner. */
.count {
  position: absolute;
  top: -8px;
  right: -10px;
  z-index: 2;
  display: grid;
  place-items: center;
  min-width: 26px;
  height: 26px;
  padding: 0 6px;
  font-weight: 800;
  color: var(--on-brass);
  background: var(--brass);
}

.tagline {
  margin: 0 0 1.1rem;
  color: var(--text);
  text-align: center;
}

.onward {
  display: block;
  width: 100%;
  padding: 0.8rem 1.2rem;
}
</style>
