<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { ChevronLeft, Crown, Lock } from 'lucide-vue-next';
import { characterGold, TALENTS_UNLOCK_LEVEL, talentsOpen } from '../../game-engine';
import { usePhoneLayout } from '../../composables/usePhoneLayout';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import { useTabStore } from '../../store/tabStore';
import CurrencyChips from '../ui/CurrencyChips.vue';
import Modal from '../ui/Modal.vue';
import SectionTitle from '../ui/SectionTitle.vue';
import PrestigeCrest from './PrestigeCrest.vue';
import PrestigeLadder from './PrestigeLadder.vue';
import TalentTree from './TalentTree.vue';
import { TALENTS_TAB_ICON } from './talentDisplay';

// The Talents tab (docs/mockups/pixel-talents.html, Plinths). On a phone it is the
// banner (with a word that talents are kept) pinned over the tree (TalentTree) with its plinths
// pinned under it, only the tree scrolling between; the gold and gems are in the purse
// beside the menu (StagePurse). On a wider screen the tab is the banner, with the gold
// and gems, and a button, and the tree opens in a modal. The prestige crest
// (PrestigeCrest) on the banner opens the prestige page (PrestigeLadder): on a phone
// in the tree's place, with a way back, closing when the tab is left; on a wider
// screen in its own modal. Sealed until TALENTS_UNLOCK_LEVEL.
const characterStore = useCharacterStore();
const isPhone = usePhoneLayout();
const open = computed(() => talentsOpen(characterStore.character));
const accountStore = useAccountStore();
const gold = computed(() => characterGold(characterStore.character));
const treeOpen = ref(false);
const prestigeOpen = ref(false);
const tabStore = useTabStore();
watch(
  () => tabStore.tab,
  () => {
    prestigeOpen.value = false;
  },
);
// The page opens at its foot, the next rank and the Prestige button, as the tree does.
const page = ref<HTMLElement | null>(null);
watch(prestigeOpen, () =>
  nextTick(() => {
    if (page.value) page.value.scrollTop = page.value.scrollHeight;
  }),
);
</script>

<template>
  <section class="talent-section" :class="{ locked: !open }">
    <div v-if="!open" class="talent-sealed">
      <span class="lock-mark"><Lock :size="18" /></span>
      <p class="lock-text">Reach level {{ TALENTS_UNLOCK_LEVEL }}</p>
    </div>
    <template v-else-if="isPhone && prestigeOpen">
      <div class="talent-header prestige-head">
        <button type="button" class="prestige-back" aria-label="Back to Talents" @click="prestigeOpen = false"><ChevronLeft :size="24" aria-hidden="true" /></button>
        <SectionTitle title="Prestige"><Crown :size="18" class="section-icon" /></SectionTitle>
      </div>
      <div ref="page" class="prestige-page"><PrestigeLadder /></div>
    </template>
    <template v-else>
      <div class="talent-header">
        <SectionTitle title="Talents"><component :is="TALENTS_TAB_ICON" :size="18" class="section-icon" /></SectionTitle>
        <CurrencyChips v-if="!isPhone" :gold="gold" :gems="accountStore.account.gems" show-zero />
      </div>
      <div class="talent-band">
        <PrestigeCrest @open="prestigeOpen = true" />
        <p class="talent-kept">Permanent upgrades.</p>
      </div>
      <TalentTree v-if="isPhone" />
      <template v-else>
        <button type="button" class="open-tree primary-button" @click="treeOpen = true">Open tree</button>
        <Modal v-model="treeOpen" title="Talents" max-width="460px">
          <div class="talent-modal-points"><CurrencyChips :gold="gold" :gems="accountStore.account.gems" show-zero /></div>
          <TalentTree />
        </Modal>
        <Modal v-model="prestigeOpen" title="Prestige" max-width="460px">
          <PrestigeLadder />
        </Modal>
      </template>
    </template>
  </section>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.talent-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.talent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 50px;
}

.talent-header h2 {
  display: inline-flex;
  align-items: center;
  margin: 0;
}

.talent-modal-points {
  margin-bottom: 0.5rem;
}

.talent-band {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0 0 0.25rem;
}

.talent-kept {
  margin: 0;
  text-align: right;
}

.prestige-head {
  justify-content: flex-start;
  gap: 4px;
}

.prestige-back {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-left: -10px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
}

/* The top rung clears the menu's column down the right edge (MenuCorner). */
.prestige-page {
  flex: 1;
  min-height: 0;
  padding-top: 40px;
  overflow-y: auto;
  scrollbar-width: none;
}

.open-tree {
  display: block;
  width: 100%;
  min-height: 48px;
  margin-top: 0.5rem;
}

.talent-sealed {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 320px;
}

.lock-mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 50%;
}

.lock-text {
  margin: 0;
}

/* Phones: AppShell hands the tab the whole box, so the tree fills what the banner leaves. */
@media (max-width: 820px) {
  .talent-section {
    height: 100%;
  }
}
</style>
