<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Lock } from 'lucide-vue-next';
import { characterGold, shopGateOpen, UNLOCK_LEVELS } from '../../game-engine';
import { useItemDropQueue } from '../../composables/useItemDropQueue';
import { usePhoneLayout } from '../../composables/usePhoneLayout';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import CurrencyChips from '../ui/CurrencyChips.vue';
import Modal from '../ui/Modal.vue';
import SectionTitle from '../ui/SectionTitle.vue';
import StatIcon from '../ui/StatIcon.vue';
import ShopCounter from './ShopCounter.vue';
import ShopScene from './ShopScene.vue';

// The Shop tab. On a phone it is the switch and wares (ShopCounter), under the
// shopkeeper's scene pinned above (AppShell). On a wider screen it is a banner,
// the purse and a button in the side column, and the scene and wares open in a
// modal, as Talents do. Sealed until UNLOCK_LEVELS.shop, as Talents are.
const isPhone = usePhoneLayout();
const characterStore = useCharacterStore();
const accountStore = useAccountStore();
const gold = computed(() => characterGold(characterStore.character));
const open = computed(() => shopGateOpen(characterStore.character, 'shop'));
const shopOpen = ref(false);
// A bought item's popup opens under the shop modal (both teleport to the body,
// the shop's later), so the shop steps aside for it.
const { current: dropShown } = useItemDropQueue();
watch(dropShown, (item) => {
  if (item) shopOpen.value = false;
});
</script>

<template>
  <section class="shop-section">
    <div v-if="!open" class="shop-sealed">
      <span class="lock-mark"><Lock :size="18" /></span>
      <p class="lock-text">Reach level {{ UNLOCK_LEVELS.shop }}</p>
    </div>
    <ShopCounter v-else-if="isPhone" />
    <template v-else>
      <div class="shop-header">
        <SectionTitle title="Shop"><StatIcon name="gold" :size="18" /></SectionTitle>
        <CurrencyChips :gold="gold" :gems="accountStore.account.gems" show-zero />
      </div>
      <button type="button" class="open-shop primary-button" @click="shopOpen = true">Open shop</button>
      <Modal v-model="shopOpen" title="Shop" max-width="460px">
        <div class="shop-modal">
          <ShopScene />
          <ShopCounter />
        </div>
      </Modal>
    </template>
  </section>
</template>

<style scoped>
.shop-section,
.shop-modal,
.shop-sealed {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shop-sealed {
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

.shop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
</style>
