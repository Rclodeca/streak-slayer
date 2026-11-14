<script setup lang="ts">
import { Gift } from 'lucide-vue-next';
import ChallengeList from './ChallengeList.vue';
import SectionTitle from '../ui/SectionTitle.vue';

// Trials: in-game challenges that pay gems (game-engine/challenges.ts), every
// one live from level 1. The game sets them, so there's no add button.
</script>

<template>
  <section class="trial-section">
    <div class="quest-header">
      <SectionTitle title="Trials"><Gift :size="18" class="section-icon" /></SectionTitle>
    </div>
    <p class="section-caption">Sworn deeds</p>
    <ChallengeList />
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
</style>
