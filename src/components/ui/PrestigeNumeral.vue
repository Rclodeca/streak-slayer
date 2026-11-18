<script setup lang="ts">
import type { PrestigeMark } from '../../game-engine';

// The prestige rank as a roman numeral on an outline plate (docs/mockups/hero-prestige-4.html):
// a dark plate, its frame and numeral in the rank's rarity colour. Both places it
// shows (the Hero tab's armory, the fight stage) are night in every theme, so the
// colours are Moonlit's rarity colours, fixed. `small` is the stage's size,
// `large` the Talents tab's prestige ladder (PrestigeLadder).
defineProps<{ mark: PrestigeMark; small?: boolean; large?: boolean }>();
</script>

<template>
  <span class="prestige-numeral" :class="[mark.rarity, { small, large }]" role="img" :aria-label="`Prestige ${mark.rank}`">{{ mark.numeral }}</span>
</template>

<style scoped>
.prestige-numeral {
  --tier: #5f95e6;
  --tier-dark: #1f3c70;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  min-width: 34px;
  padding: 0 7px;
  font-family: var(--heading);
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.04em;
  text-shadow: none;
  color: var(--tier);
  background: #0a0c12;
  box-shadow:
    inset 2px 2px 0 var(--tier),
    inset -2px -2px 0 var(--tier-dark);
  clip-path: var(--px2, none);
}

.prestige-numeral.epic {
  --tier: #b57be8;
  --tier-dark: #4f2a7e;
}

.prestige-numeral.relic {
  --tier: #f58a35;
  --tier-dark: #7a3a0e;
}

.prestige-numeral.large {
  width: 52px;
  height: 52px;
  padding: 0;
  font-size: 1.25rem;
  font-weight: 900;
  box-shadow:
    inset 3px 3px 0 var(--tier),
    inset -3px -3px 0 var(--tier-dark);
  clip-path: var(--px3, none);
}

.prestige-numeral.small {
  height: 16px;
  min-width: 20px;
  padding: 0 4px;
  font-size: 0.625rem;
}
</style>
