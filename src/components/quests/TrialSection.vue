<script setup lang="ts">
import { computed } from 'vue';
import { Gift, Lock } from 'lucide-vue-next';
import { questsOpen } from '../../game-engine';
import { useCharacterStore } from '../../store/characterStore';
import ChallengeList from './ChallengeList.vue';
import SealedNotice from './SealedNotice.vue';

// Trials: the side quests, in-game challenges each for a hidden relic
// (game-engine/challenges.ts). The game sets them, so there's no add button.
// Sealed along with the quests until QUESTS_UNLOCK_LEVEL (see questsOpen).
const characterStore = useCharacterStore();
const open = computed(() => questsOpen(characterStore.character));
</script>

<template>
  <section class="trial-section" :class="{ locked: !open }">
    <div class="quest-header">
      <h2><Lock v-if="!open" :size="16" class="section-icon lock-icon" /><Gift v-else :size="16" class="section-icon" />Trials</h2>
    </div>
    <p class="section-caption">Sworn deeds</p>
    <SealedNotice v-if="!open" />
    <ChallengeList v-else />
  </section>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.quest-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quest-header h2 {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.locked h2 {
  color: var(--text);
}
</style>
