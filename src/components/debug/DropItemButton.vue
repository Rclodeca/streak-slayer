<script setup lang="ts">
import { useCharacterStore } from '../../store/characterStore';

// Drops the last worn item, freeing a slot.
const characterStore = useCharacterStore();

function dropItem() {
  const last = characterStore.character.equippedItemIds.at(-1);
  if (last) characterStore.discardItem(last);
}
</script>

<template>
  <button type="button" class="drop-item" @click="dropItem">Drop 1 item (testing)</button>
</template>

<style scoped>
.drop-item {
  align-self: flex-start;
  font-size: 0.8em;
  opacity: 0.7;
  border: 1px dashed var(--border);
  background: transparent;
  color: inherit;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
}

.drop-item:hover {
  opacity: 1;
}
</style>
