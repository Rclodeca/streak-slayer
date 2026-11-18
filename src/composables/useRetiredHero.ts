// Small shared (module-scoped) note of the hero who just prestiged — same
// singleton reasoning as useDeathScreen. `useCombatActions().prestige()`
// records it right before the new run, and the new-hero screen that follows
// reads it to say who retired at what level. Session-only: after a reload
// that screen simply greets a new hero.

import { ref } from 'vue';

export interface RetiredHero {
  name: string;
  level: number;
}

const retired = ref<RetiredHero | null>(null);

export function useRetiredHero() {
  function recordRetired(hero: RetiredHero) {
    retired.value = hero;
  }

  function clearRetired() {
    retired.value = null;
  }

  return { retired, recordRetired, clearRetired };
}
