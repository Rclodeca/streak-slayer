<script setup lang="ts">
import { Feather } from 'lucide-vue-next';
import { useReviveNotice } from '../../composables/useReviveNotice';

const { visible } = useReviveNotice();
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="revive-toast">
      <span class="revive-mark" aria-hidden="true"><Feather :size="20" :stroke-width="1.75" /></span>
      <span class="revive-text">Phoenix Feather consumed — revived at half health!</span>
    </div>
  </Teleport>
</template>

<style scoped>
.revive-toast {
  position: fixed;
  top: calc(1rem + env(safe-area-inset-top, 0px));
  left: 50%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transform: translateX(-50%);
  /* Centred by its own width: left: 50% alone caps it at half the screen. */
  width: max-content;
  max-width: calc(100vw - 2rem);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem 1rem;
  box-shadow: var(--shadow);
  font-weight: 600;
  z-index: 1000;
  pointer-events: none;
}
</style>
