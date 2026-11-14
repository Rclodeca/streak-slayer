<script setup lang="ts">
import { TUNING } from '../../game-engine/constants/tuning';
import { useModalPriority } from '../../composables/useModalPriority';
import { useServices } from '../../composables/useServices';
import ItemHero from '../ui/ItemHero.vue';
import Modal from '../ui/Modal.vue';

// The enchanted item on its own screen, with its doubled bonuses, until the
// player continues. Mounted once in AppShell; useServices holds the item.
const { revealed, dismissReveal } = useServices();
const { enchantRevealVisible } = useModalPriority();
</script>

<template>
  <Modal :model-value="enchantRevealVisible" :dismissible="false" title="Enchanted!" max-width="640px">
    <template v-if="revealed">
      <ItemHero :item="revealed" :factor="TUNING.DOUBLED_ITEM_MULTIPLIER" />
      <button type="button" class="ok primary-button" @click="dismissReveal">Nice!</button>
    </template>
  </Modal>
</template>

<style scoped>
.ok {
  display: block;
  width: 100%;
  margin-top: 0.75rem;
}
</style>
