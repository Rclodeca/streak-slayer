<script setup lang="ts">
import { Check, Flag, Gift, Gem } from 'lucide-vue-next';
import { useModalPriority } from '../../composables/useModalPriority';
import { createRng, dailyPeriodKey } from '../../game-engine';
import { useCharacterStore } from '../../store/characterStore';
import { useDebugClockStore } from '../../store/debugClockStore';
import Modal from '../ui/Modal.vue';
import RuleList from '../ui/RuleList.vue';
import type { Rule } from '../ui/RuleList.vue';

// Shown every run on reaching TRIALS_UNLOCK_LEVEL (see trialUnlockPending).
// "Onward" unseals the section and hands over the first trial.
const { trialUnlockVisible } = useModalPriority();
const characterStore = useCharacterStore();
const debugClockStore = useDebugClockStore();

const RULES: Rule[] = [
  { icon: Flag, tone: 'accent', title: 'Take', text: 'The game names the deed.' },
  { icon: Check, tone: 'solid', title: 'Finish', text: 'Do it, then claim it.' },
  { icon: Gem, tone: 'accent', title: 'Uncover', text: 'Something hidden waits behind each.' },
];

function onward() {
  characterStore.unlockTrials(dailyPeriodKey(debugClockStore.now()), createRng());
}
</script>

<template>
  <Modal :model-value="trialUnlockVisible" :dismissible="false" title="Trials unlocked" max-width="440px">
    <div class="emblem" aria-hidden="true">
      <Gift :size="34" :stroke-width="1.5" />
    </div>
    <p class="tagline">Not every test is of your choosing.</p>
    <RuleList :rules="RULES" />
    <button type="button" class="onward primary-button" @click="onward">Onward</button>
  </Modal>
</template>

<style scoped>
.emblem {
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
  font-style: italic;
  text-align: center;
}

.onward {
  display: block;
  width: 100%;
  padding: 0.8rem 1.2rem;
}
</style>
