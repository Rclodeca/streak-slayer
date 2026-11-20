<script setup lang="ts">
import { computed } from 'vue';
import { characterGold } from '../../game-engine';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import StatIcon from '../ui/StatIcon.vue';

// The phone's purse (docs/mockups/app-ui-pass.html, hanging purse): gold and gems on
// one small plate hung from the screen's top-left edge, on every phone tab but the
// Hero tab (its name plate carries them) and the Focus strip. The + after the gems is
// the way to get more: it asks AppShell to open the Challenges. A gain shows in the
// gain popup over the tab bar, not here.
defineEmits<{ 'get-gems': [] }>();

const characterStore = useCharacterStore();
const accountStore = useAccountStore();
const gold = computed(() => characterGold(characterStore.character));
const gems = computed(() => accountStore.account.gems);
</script>

<template>
  <div class="stage-purse">
    <span class="purse-plate" :aria-label="`${gold.toLocaleString('en-US')} gold, ${gems.toLocaleString('en-US')} gems`">
      <span class="purse-count"><StatIcon name="gold" :size="13" />{{ gold.toLocaleString('en-US') }}</span>
      <span class="purse-count">
        <StatIcon name="gems" :size="13" />{{ gems.toLocaleString('en-US') }}
        <button type="button" class="purse-plus" aria-label="Get gems" @click="$emit('get-gems')">+</button>
      </span>
    </span>
  </div>
</template>

<style scoped>
/* Hangs from the screen's top edge, its left edge in line with the Hero tab's name
   plate (8px in). Fixed, so the stage's glide doesn't carry it, and above the stage
   (8) but below the popups. It takes no taps but the +. */
.stage-purse {
  position: fixed;
  top: 0;
  left: calc(8px + env(safe-area-inset-left, 0px));
  z-index: 9;
  pointer-events: none;
}

/* The plate is dark in every theme (the stage is always night), so it keeps the bright
   gold and gem whatever the theme's own are. Lines on its three open sides and both
   bottom corners cut; it grows down over a status bar's inset, so its dark fill
   covers it. */
.purse-plate {
  --icon-coin: #f0c64e;
  --icon-gem: #6fd6ea;
  display: flex;
  align-items: center;
  gap: 7px;
  height: calc(26px + env(safe-area-inset-top, 0px));
  padding: env(safe-area-inset-top, 0px) 8px 0 12px;
  box-sizing: border-box;
  white-space: nowrap;
  background: rgba(7, 8, 12, 0.88);
  box-shadow:
    inset 1px 0 0 #333c52,
    inset -1px 0 0 #333c52,
    inset 0 -1px 0 #333c52;
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px));
  color: #f0f3f7;
  font-family: var(--serif);
  font-size: 14.5px;
  font-weight: 700;
  line-height: 1;
}

.purse-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* A bare + after the gems, set off by a hairline. Its 14x18 box is small, so an
   invisible 44px one (::after) takes the tap. */
.purse-plus {
  position: relative;
  width: 14px;
  height: 18px;
  margin-left: 8px;
  padding: 0;
  border: 0;
  background: none;
  color: #dfe0f0;
  font-family: var(--sans);
  font-size: 17px;
  font-weight: 800;
  line-height: 1;
  pointer-events: auto;
}

.purse-plus::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 2px;
  bottom: 2px;
  width: 1px;
  background: #333c52;
}

.purse-plus::after {
  content: '';
  position: absolute;
  inset: -13px -15px;
}
</style>
