<script setup lang="ts">
import { computed, ref } from 'vue';
import { Lock } from 'lucide-vue-next';
import { TALENTS_UNLOCK_LEVEL, talentPointsUnspent, talentsOpen } from '../../game-engine';
import { usePhoneLayout } from '../../composables/usePhoneLayout';
import { useCharacterStore } from '../../store/characterStore';
import Modal from '../ui/Modal.vue';
import SectionTitle from '../ui/SectionTitle.vue';
import TalentTree from './TalentTree.vue';
import { TALENTS_TAB_ICON } from './talentDisplay';

// The Talents tab (docs/mockups/pixel-talents.html, Plinths). On a phone it is the
// banner (with the points) pinned over the tree (TalentTree) with its plinths
// pinned under it, only the tree scrolling between. On a wider screen the tab is
// the banner and a button, and the tree opens in a modal. Sealed until
// TALENTS_UNLOCK_LEVEL.
const characterStore = useCharacterStore();
const isPhone = usePhoneLayout();
const open = computed(() => talentsOpen(characterStore.character));
const unspent = computed(() => talentPointsUnspent(characterStore.character));
const treeOpen = ref(false);
</script>

<template>
  <section class="talent-section" :class="{ locked: !open }">
    <div v-if="!open" class="talent-sealed">
      <span class="lock-mark"><Lock :size="18" /></span>
      <p class="lock-text">Reach level {{ TALENTS_UNLOCK_LEVEL }}</p>
    </div>
    <template v-else>
      <div class="talent-header">
        <SectionTitle title="Talents"><component :is="TALENTS_TAB_ICON" :size="18" class="section-icon" /></SectionTitle>
        <span class="points"><span class="count" :class="{ zero: unspent === 0 }">{{ unspent }}</span>points</span>
      </div>
      <TalentTree v-if="isPhone" />
      <template v-else>
        <button type="button" class="open-tree primary-button" @click="treeOpen = true">Open tree</button>
        <Modal v-model="treeOpen" title="Talents" max-width="460px">
          <div class="talent-modal-points"><span class="points"><span class="count" :class="{ zero: unspent === 0 }">{{ unspent }}</span>points</span></div>
          <TalentTree />
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

.points {
  display: flex;
  align-items: center;
  gap: 8px;
}

.count {
  display: inline-grid;
  place-items: center;
  min-width: 26px;
  height: 26px;
  padding: 0 6px;
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
