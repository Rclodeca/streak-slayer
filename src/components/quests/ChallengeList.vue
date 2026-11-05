<script setup lang="ts">
import { computed } from 'vue';
import { activeChallenges, challengeProgress, doneChallenges, getChallengeDef, ITEM_CATALOG } from '../../game-engine';
import type { ChallengeEntry } from '../../game-engine';
import { useBossStore } from '../../store/bossStore';
import { useCharacterStore } from '../../store/characterStore';
import { useDebugClockStore } from '../../store/debugClockStore';
import { useHabitStore } from '../../store/habitStore';
import { trialKey, useTrialSeenStore } from '../../store/trialSeenStore';
import StatIcon from '../ui/StatIcon.vue';
import { challengeIcon } from './challengeIcons';

const characterStore = useCharacterStore();
const habitStore = useHabitStore();
const bossStore = useBossStore();
const debugClockStore = useDebugClockStore();
const trialSeen = useTrialSeenStore();

// Active first, finished ones sink to the bottom. One that was new when the
// phone's Trials tab opened says so (trialSeenStore).
const cards = computed(() => {
  const { character } = characterStore;
  const context = { habits: habitStore.habits, boss: bossStore.boss, todayDate: debugClockStore.now() };
  const card = (entry: ChallengeEntry) => ({
    entry,
    def: getChallengeDef(entry.id),
    done: !!entry.doneDayKey,
    fresh: trialSeen.fresh.includes(trialKey(entry)),
    relicName: ITEM_CATALOG.find((item) => item.id === entry.relicId)?.name ?? '',
    progress: challengeProgress(entry, context),
  });
  return [...activeChallenges(character), ...doneChallenges(character)].map(card);
});
</script>

<template>
  <ul v-if="cards.length" class="challenge-list">
    <li v-for="card in cards" :key="card.entry.id" class="challenge" :class="{ done: card.done }">
      <span class="challenge-socket"><component :is="challengeIcon(card.def.icon)" :size="22" /></span>
      <div class="challenge-body">
        <span class="challenge-name">{{ card.def.name }}<span v-if="card.fresh" class="challenge-new">New</span></span>
        <span class="challenge-deed">{{ card.def.deed }}</span>
        <template v-if="!card.done">
          <span v-if="card.progress.kind === 'bar'" class="challenge-progress">
            <span class="challenge-bar"><i :style="{ width: `${(card.progress.cur / card.progress.max) * 100}%` }" /></span>
            <span class="challenge-count">{{ card.progress.cur }} / {{ card.progress.max }}</span>
          </span>
          <span v-else class="challenge-status">{{ card.progress.text }}</span>
        </template>
      </div>
      <span v-if="!card.done" class="challenge-gift" role="img" aria-label="An unknown item"><StatIcon name="gift" :size="20" /><span class="mark">?</span></span>
      <span v-else class="challenge-relic">{{ card.relicName }}</span>
    </li>
  </ul>
  <p v-else class="section-empty">Nothing sworn.</p>
</template>

<style scoped>
.challenge-list {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.challenge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 52px;
  padding: 0.6rem 0.8rem;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.challenge-socket {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
}

.challenge-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.challenge-name {
  color: var(--text-h);
}

.challenge-new {
  margin-left: 0.5rem;
  font-size: 0.7rem;
  vertical-align: 2px;
}

.challenge-deed,
.challenge-status,
.challenge-count {
  color: var(--text);
  font-size: 0.8rem;
}

.challenge-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.challenge-bar {
  flex: 1;
  height: 6px;
  background: var(--border);
}

.challenge-bar i {
  display: block;
  height: 100%;
  background: var(--accent);
}

.challenge-gift {
  display: inline-flex;
  align-items: center;
  flex: none;
  gap: 0.15rem;
}

.challenge-relic {
  flex: none;
  max-width: 40%;
  color: var(--text-h);
  font-size: 0.8rem;
  text-align: right;
}

.challenge.done {
  opacity: 0.7;
}

.challenge.done .challenge-name {
  text-decoration: line-through;
}
</style>
