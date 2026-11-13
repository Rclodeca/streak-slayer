<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ArrowLeft, Gift } from 'lucide-vue-next';
import AppMenu from './AppMenu.vue';
import TabBar from './TabBar.vue';
import NewHeroScreen from './NewHeroScreen.vue';
import PopupPreview from '../debug/PopupPreview.vue';
import FightStage from '../fight/FightStage.vue';
import SkipDayButton from '../debug/SkipDayButton.vue';
import HeroDetails from '../character/HeroDetails.vue';
import HomeBase from '../character/HomeBase.vue';
import MenuCorner from './MenuCorner.vue';
import HabitList from '../habits/HabitList.vue';
import HighScorePage from '../highscores/HighScorePage.vue';
import QuestSection from '../quests/QuestSection.vue';
import TrialSection from '../quests/TrialSection.vue';
import TalentSection from '../talents/TalentSection.vue';
import TalentUnlockPopup from '../talents/TalentUnlockPopup.vue';
import ProgressSummary from './ProgressSummary.vue';
import ActivityLog from '../ui/ActivityLog.vue';
import DeathScreen from '../ui/DeathScreen.vue';
import Modal from '../ui/Modal.vue';
import HoodedScene from '../ui/HoodedScene.vue';
import ItemDropPopup from '../ui/ItemDropPopup.vue';
import MissedSkillsPopup from '../ui/MissedSkillsPopup.vue';
import QuestCompletePopup from '../quests/QuestCompletePopup.vue';
import QuestMissPopup from '../quests/QuestMissPopup.vue';
import QuestUnlockPopup from '../quests/QuestUnlockPopup.vue';
import TrialUnlockPopup from '../quests/TrialUnlockPopup.vue';
import EventChoiceModal from '../events/EventChoiceModal.vue';
import ReviveNotice from '../ui/ReviveNotice.vue';
import BossSkillPopup from '../boss/BossSkillPopup.vue';
import { activeChallenges, trialsOpen } from '../../game-engine';
import { useCelebration } from '../../composables/useCelebration';
import { usePhoneLayout } from '../../composables/usePhoneLayout';
import { useStageFocused } from '../../composables/useStageFocused';
import { useBossStore } from '../../store/bossStore';
import { useCharacterStore } from '../../store/characterStore';
import { useLogVisibleStore } from '../../store/logVisibleStore';
import { useTabStore } from '../../store/tabStore';
import { useTrialsBadge } from '../../composables/useTrialsBadge';
import { trialKey, useTrialSeenStore } from '../../store/trialSeenStore';

const bossStore = useBossStore();
const characterStore = useCharacterStore();
const logVisible = useLogVisibleStore();

const { claimCount, newTrial } = useTrialsBadge();
const stageFocused = useStageFocused();

const isDev = import.meta.env.DEV;

// Follows the fight stage, which keeps a slain boss up until the next arrives.
const { displayedBoss } = useCelebration();
const bossIndex = computed(() => (displayedBoss.value ?? bossStore.boss).index);

// An unnamed hero (first launch, or a new run after a death) gets the
// full-screen NewHeroScreen instead of the whole shell. The popups live inside
// the shell, so anything queued meanwhile simply waits until the hero is named.
const needsName = computed(() => characterStore.character.name === undefined);

// No router in this app — swaps the main content for HighScorePage in place
// rather than navigating. It's opened from AppMenu and closed with the Back
// button. The popup overlays below stay mounted regardless (they're
// independently gated Teleports, see useModalPriority), so a queued
// death/item/quest popup isn't hidden by this toggle.
// With the fight showing there's no top bar: the menu rides in the stage's
// top-right corner (FightStage's slot, so it stays with the pinned stage) and
// the boss's number joins its name (BossPanel). High Scores keeps the bar,
// with its Back button.
const showHighScores = ref(false);

// Phones show one list at a time, picked in the bottom bar (TabBar), each
// opening at its top; the Hero tab is the hero's details, which wider screens
// open as a popup from the stage. There the log is a popup from the menu too,
// in place of the side column.
const isPhone = usePhoneLayout();
const tabStore = useTabStore();
const showLog = ref(false);

// What sits above the lists on a phone: the fight stage, the home base on the Hero tab,
// or nothing but the menu's corner on Talents, which fills the screen. Wider screens
// always have the stage.
const topBar = computed(() => {
  if (isPhone.value && tabStore.tab === 'hero') return HomeBase;
  if (isPhone.value && tabStore.tab === 'talents') return MenuCorner;
  return FightStage;
});
// The Trials button under the menu, where there's room: not on the Focus strip; the menu
// lists Trials instead. Talents has no stage, so it always has room.
const trialsButton = computed(
  () => isPhone.value && trialsOpen(characterStore.character) && (tabStore.tab === 'hero' || tabStore.tab === 'talents' || !stageFocused.value),
);
const trialsInMenu = computed(() => isPhone.value && trialsOpen(characterStore.character) && !trialsButton.value);
const scrollBody = ref<HTMLElement | null>(null);
watch(
  () => tabStore.tab,
  () => {
    if (scrollBody.value) scrollBody.value.scrollTop = 0;
  },
);

// What's on the Trials tab has been seen: its pip goes, and the new ones
// keep their "New" tags until the tab is left.
const trialSeen = useTrialSeenStore();
const trialKeys = computed(() => activeChallenges(characterStore.character).map(trialKey).join());
watch(
  [() => isPhone.value && tabStore.tab === 'trials', trialKeys],
  ([onTrials]) => {
    if (onTrials) trialSeen.visit(activeChallenges(characterStore.character));
    else trialSeen.leave();
  },
  { immediate: true },
);
</script>

<template>
  <NewHeroScreen v-if="needsName" />
  <div v-else class="app-shell" :class="{ 'fight-view': !showHighScores }">
    <div v-if="showHighScores" class="progress-bar">
      <span>Boss #{{ bossIndex }}</span>
      <div class="top-actions">
        <button type="button" class="nav-button" @click="showHighScores = false"><ArrowLeft :size="14" />Back</button>
        <AppMenu @high-scores="showHighScores = true" />
      </div>
    </div>
    <DeathScreen />
    <HoodedScene />
    <ItemDropPopup />
    <MissedSkillsPopup />
    <EventChoiceModal />
    <QuestMissPopup />
    <BossSkillPopup />
    <QuestCompletePopup />
    <QuestUnlockPopup />
    <TrialUnlockPopup />
    <TalentUnlockPopup />
    <ReviveNotice />

    <HighScorePage v-if="showHighScores" />
    <template v-else>
      <SkipDayButton v-if="isDev" />
      <PopupPreview v-if="isDev" />
      <div class="layout" :class="{ 'talents-full': isPhone && tabStore.tab === 'talents' }">
        <component :is="topBar">
          <AppMenu :trials-item="trialsInMenu" @high-scores="showHighScores = true" @log="showLog = true" @trials="tabStore.select('trials')" />
          <button v-if="trialsButton" type="button" class="stage-trials" aria-label="Trials" @click="tabStore.select('trials')">
            <Gift class="icon-rim" :size="22" :stroke-width="4.5" aria-hidden="true" />
            <Gift :size="22" />
            <span v-if="claimCount" class="trials-count" aria-label="Ready to claim"><span>{{ claimCount }}</span></span>
            <span v-else-if="newTrial" class="trials-pip" role="img" aria-label="New" />
          </button>
        </component>
        <div ref="scrollBody" class="scroll-body" :class="{ 'talents-view': isPhone && tabStore.tab === 'talents', 'hero-view': isPhone && tabStore.tab === 'hero' }">
          <main class="main">
            <div class="tab-panel" :class="{ current: tabStore.tab === 'skills' }"><HabitList /></div>
            <div class="tab-panel" :class="{ current: tabStore.tab === 'quests' }"><QuestSection /></div>
            <div class="tab-panel" :class="{ current: tabStore.tab === 'trials' }"><TrialSection /></div>
            <div v-if="isPhone" class="tab-panel" :class="{ current: tabStore.tab === 'talents' }"><TalentSection /></div>
            <div v-if="isPhone" class="tab-panel" :class="{ current: tabStore.tab === 'hero' }"><HeroDetails page /></div>
          </main>
          <aside class="side">
            <ProgressSummary class="progress" />
            <TalentSection v-if="!isPhone" />
            <ActivityLog v-if="logVisible.on" />
            <div class="log-end" aria-hidden="true">
              <span class="log-end-rule" />
              <span class="log-end-gem small" />
              <span class="log-end-gem" />
              <span class="log-end-gem small" />
              <span class="log-end-rule flip" />
            </div>
          </aside>
        </div>
        <TabBar v-if="isPhone" />
      </div>
      <Modal v-model="showLog" title="Log" sheet>
        <ActivityLog bare />
      </Modal>
    </template>
  </div>
</template>

<style scoped>
/* Under the menu button, in the stage's corner: a way to the Trials tab. The
   Focus strip is too short to hold both. */
.stage-trials {
  position: relative;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
}

.fight-stage.focus .stage-trials {
  display: none;
}

.app-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  text-align: left;
}

.progress-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-h);
}

.top-actions {
  display: flex;
  margin-left: auto;
  align-items: center;
  gap: 0.5rem;
}

.nav-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3em 0.7em;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 1.25rem;
  align-items: start;
}

/* The fight runs across the page as a banner, then skills and quests on the
   left and progress and the log on the right. On desktop the banner scrolls
   away and the drop-down bar takes over; on phones the stage stays pinned at
   the top (FightStage). */
.layout > .fight-stage {
  grid-column: 1 / -1;
}

/* The stage's 4px of air under its plinths, and on phones its --stage-grow, come
   out of the gap below, so the lists stay where they were. (On a phone the stage is pinned over the top of
   the scroll box, which has air of its own there.) */
.layout > .fight-stage:not(.focus) {
  margin-bottom: calc(-4px - var(--stage-grow, 0px));
}

/* Desktop: no box of its own, the columns are the grid's, and every list
   shows. */
.scroll-body,
.tab-panel {
  display: contents;
}

.main,
.side {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
}

/* Closes off the bottom of the page, clear of the phone's home indicator.
   Shown whether or not the log is. */
.log-end {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem 0 calc(0.75rem + env(safe-area-inset-bottom));
}

.log-end-rule {
  width: 4.5rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-border));
}

.log-end-rule.flip {
  transform: scaleX(-1);
}

.log-end-gem {
  box-sizing: border-box;
  width: 7px;
  height: 7px;
  transform: rotate(45deg);
  border: 1px solid var(--accent-solid);
  background: var(--bg);
}

.log-end-gem.small {
  width: 4px;
  height: 4px;
  border-color: var(--accent-border);
  background: var(--accent-border);
}

@media (max-width: 1024px) {
  .layout {
    grid-template-columns: minmax(0, 1fr) 320px;
  }
}

/* Phones: one column. The fight view fills the screen and never scrolls
   itself: the stage (or the Hero tab's home base) is the top row, the bottom bar the last, and the current
   tab's list scrolls in a box between them, so a pull past either end of the
   list bounces only the list, never the stage (the page has nothing to
   bounce, see main.scss). Every section is a row of the scroll box's grid,
   spaced like the rest. The side column (the progress rings and the log) is
   desktop and tablet only: the log is the menu's popup here. */
@media (max-width: 820px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .app-shell.fight-view {
    position: fixed;
    inset: 0;
    gap: 0;
  }

  .fight-view .layout {
    flex: 1;
    min-height: 0;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 0;
  }

  .scroll-body {
    display: grid;
    align-content: start;
    align-self: stretch;
    gap: 1.25rem;
    min-height: 0;
    overflow-y: auto;
    padding: 1.25rem 1rem 1rem;
  }

  .main {
    display: contents;
  }

  /* The Talents tab pins its banner and plinths and scrolls only the tree, so the
     box hands it the whole height instead of scrolling itself. */
  .scroll-body.talents-view {
    grid-template-rows: minmax(0, 1fr);
    overflow: hidden;
    padding: calc(6px + env(safe-area-inset-top, 0px)) 0.75rem 0.5rem;
  }

  /* Talents has no banner above it, so the box is the layout's first row (the menu's
     corner floats over it, from the layout's own top, below any dev buttons). */
  .fight-view .layout.talents-full {
    position: relative;
    grid-template-rows: minmax(0, 1fr) auto;
  }

  /* The Hero tab's blocks sit 14px apart (HeroDetails), so its box takes 14px at the top
     and 18px at the foot. */
  .scroll-body.hero-view {
    padding: 14px 1rem 18px;
  }

  .tab-panel:not(.current),
  .side {
    display: none;
  }
}
</style>
