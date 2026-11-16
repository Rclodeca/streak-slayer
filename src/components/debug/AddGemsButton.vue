<script setup lang="ts">
import { useAccountStore } from '../../store/accountStore';

const accountStore = useAccountStore();
</script>

<template>
  <button type="button" class="add-gems" @click="accountStore.addGems(100)">+100 gems (testing)</button>
</template>

<style scoped>
.add-gems {
  align-self: flex-start;
  font-size: 0.8em;
  opacity: 0.7;
  border: 1px dashed var(--border);
  background: transparent;
  color: inherit;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
}

.add-gems:hover {
  opacity: 1;
}
</style>
