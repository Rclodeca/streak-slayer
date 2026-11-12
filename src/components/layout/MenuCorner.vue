<script setup lang="ts">
// The page's menu (and the Trials button when there's room) in the screen's top-right
// corner, for a tab that has no banner above it: the phone's Talents tab, which fills
// the screen. FightStage and HomeBase carry the same corner in their own slots.
</script>

<template>
  <div class="stage-menu"><slot /></div>
</template>

<style scoped>
/* Over the page, above the tree and below the popups. */
.stage-menu {
  position: absolute;
  z-index: 9;
  top: calc(6px + env(safe-area-inset-top, 0px));
  right: 0;
  padding-right: calc(2px + env(safe-area-inset-right, 0px));
}
</style>
