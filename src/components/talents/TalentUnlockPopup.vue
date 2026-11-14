<script setup lang="ts">
import { ChevronsUp, Infinity as InfinityIcon, Sprout } from 'lucide-vue-next';
import { useModalPriority } from '../../composables/useModalPriority';
import { useCharacterStore } from '../../store/characterStore';
import Modal from '../ui/Modal.vue';
import RuleList from '../ui/RuleList.vue';
import { TALENTS_TAB_ICON } from './talentDisplay';
import type { Rule } from '../ui/RuleList.vue';

// Shown every run on reaching TALENTS_UNLOCK_LEVEL (see talentUnlockPending), and
// once to a save already past it. "Onward" opens the Talents tab for good.
const { talentUnlockVisible } = useModalPriority();
const characterStore = useCharacterStore();

const RULES: Rule[] = [
  { icon: Sprout, tone: 'accent', title: 'Learn', text: 'Three paths: strike, endure, mend.' },
  { icon: ChevronsUp, tone: 'solid', title: 'Grow', text: 'Every rank makes you stronger.' },
  { icon: InfinityIcon, tone: 'solid', title: 'Keep', text: 'Talents stay when you fall.' },
];

function onward() {
  characterStore.unlockTalents();
}
</script>

<template>
  <Modal :model-value="talentUnlockVisible" :dismissible="false" title="Talents unlocked" max-width="440px">
    <div class="talent-unlock">
      <div class="emblem" aria-hidden="true">
        <component :is="TALENTS_TAB_ICON" :size="34" :stroke-width="1.5" />
      </div>
      <p class="tagline">The tree remembers.</p>
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
