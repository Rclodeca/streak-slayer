<script setup lang="ts">
import { computed } from 'vue';
import { Gift, Lock, ScrollText, Sword, UserRound } from 'lucide-vue-next';
import { activeChallenges, dailyPeriodKey, questsOpen } from '../../game-engine';
import { useCharacterStore } from '../../store/characterStore';
import { useDebugClockStore } from '../../store/debugClockStore';
import { useQuestStore } from '../../store/questStore';
import { useTabStore } from '../../store/tabStore';
import { useTrialSeenStore } from '../../store/trialSeenStore';

// The phone's bottom bar (docs/mockups/pixel-tabs-final.html): which list
// shows under the stage. Quests counts what's due today or overdue; Trials
// wears a pip while a new trial waits unseen. Sealed (before
// QUESTS_UNLOCK_LEVEL) Quests and Trials grey out under a lock, with no
// badges, but still open onto their seal.
const tabStore = useTabStore();
const characterStore = useCharacterStore();
const questStore = useQuestStore();
const debugClockStore = useDebugClockStore();
const trialSeen = useTrialSeenStore();

const TABS = [
  { id: 'skills', label: 'Skills', icon: Sword, sealable: false },
  { id: 'quests', label: 'Quests', icon: ScrollText, sealable: true },
  { id: 'trials', label: 'Trials', icon: Gift, sealable: true },
  { id: 'hero', label: 'Hero', icon: UserRound, sealable: false },
] as const;

const open = computed(() => questsOpen(characterStore.character));
const todayKey = computed(() => dailyPeriodKey(debugClockStore.now()));
// dueDateKey is YYYY-MM-DD, so it compares as text.
const dueCount = computed(() => questStore.quests.filter((quest) => !quest.doneDayKey && (quest.overdue || quest.dueDateKey <= todayKey.value)).length);
const newTrial = computed(() => tabStore.tab !== 'trials' && trialSeen.unseen(activeChallenges(characterStore.character)));
</script>

<template>
  <div class="tab-bar" role="tablist" aria-label="Lists">
    <button
      v-for="tab in TABS"
      :key="tab.id"
      type="button"
      role="tab"
      class="tab"
      :class="[`tab-${tab.id}`, { selected: tabStore.tab === tab.id, sealed: tab.sealable && !open }]"
      :aria-selected="tabStore.tab === tab.id"
      @click="tabStore.select(tab.id)"
    >
      <component :is="tab.icon" :size="21" class="tab-icon" />
      <span class="tab-label">{{ tab.label }}</span>
      <Lock v-if="tab.sealable && !open" :size="12" class="tab-lock" aria-hidden="true" />
      <span v-else-if="tab.id === 'quests' && dueCount" class="tab-count">{{ dueCount }}</span>
      <span v-else-if="tab.id === 'trials' && newTrial" class="tab-pip" role="img" aria-label="New" />
    </button>
  </div>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. The bar runs
   under the home indicator, its tabs clear of it. */
.tab-bar {
  display: flex;
  padding: 0 6px env(safe-area-inset-bottom, 0px);
  background: var(--bg);
  border-top: 1px solid var(--border);
}

.tab {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 58px;
  padding: 3px 0 0;
  background: none;
  border: 0;
  border-radius: 0;
  color: var(--text);
  font-size: 0.7rem;
  -webkit-tap-highlight-color: transparent;
}

.tab.selected {
  color: var(--text-h);
}

/* The badges ride the icon's top-right corner. */
.tab-lock,
.tab-count,
.tab-pip {
  position: absolute;
  top: 6px;
  left: calc(50% + 7px);
}

.tab-count {
  min-width: 16px;
  font-size: 0.7rem;
  font-weight: 800;
  line-height: 16px;
}

.tab-pip {
  width: 8px;
  height: 8px;
  margin-top: 2px;
  background: var(--accent);
}
</style>
