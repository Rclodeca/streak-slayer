<script setup lang="ts">
import { computed } from 'vue';
import { MAX_PRESTIGE, prestigeRank, withPrestige } from '../../game-engine';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';

// Steps the account's prestige 0 → V → 0, to see the marks before prestiging exists.
const accountStore = useAccountStore();
const characterStore = useCharacterStore();
const rank = computed(() => prestigeRank(accountStore.account));

function step() {
  accountStore.setPrestige((rank.value + 1) % (MAX_PRESTIGE + 1));
  characterStore.setCharacter(withPrestige(characterStore.character, rank.value));
}
</script>

<template>
  <button type="button" class="prestige-step" @click="step">
    Prestige {{ rank }} → {{ (rank + 1) % (MAX_PRESTIGE + 1) }} (testing)
  </button>
</template>

<style scoped>
.prestige-step {
  align-self: flex-start;
  font-size: 0.8em;
  opacity: 0.7;
  border: 1px dashed var(--border);
  background: transparent;
  color: inherit;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
}

.prestige-step:hover {
  opacity: 1;
}
</style>
