<script setup lang="ts">
import { characterGold } from '../../game-engine';
import { useCharacterStore } from '../../store/characterStore';

const characterStore = useCharacterStore();

function addGold() {
  const character = characterStore.character;
  characterStore.setCharacter({ ...character, gold: characterGold(character) + 1000 });
}
</script>

<template>
  <button type="button" class="add-gold" @click="addGold">+1000g (testing)</button>
</template>

<style scoped>
.add-gold {
  align-self: flex-start;
  font-size: 0.8em;
  opacity: 0.7;
  border: 1px dashed var(--border);
  background: transparent;
  color: inherit;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
}

.add-gold:hover {
  opacity: 1;
}
</style>
