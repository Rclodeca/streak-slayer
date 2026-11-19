// Small shared (module-scoped) death-screen flag — same singleton reasoning
// as useItemDropQueue/useLootToast: the code that detects death
// (useCombatActions) and the component that renders the blocking popup
// (DeathScreen, mounted once in AppShell) must see the same state.
//
// Deliberately just flags: the actual character/boss/skill reset is
// performed by `useCombatActions().restart()`, not here, so this stays a
// pure UI flag with no game-engine knowledge.

import { ref } from 'vue';

const isDead = ref(false);
// Testing: the screen opened from the dev menu over a hero still standing. It
// shows the page as if they fell, and its choices only close it.
const isPreview = ref(false);

export function useDeathScreen() {
  function triggerDeath() {
    isDead.value = true;
    isPreview.value = false;
  }

  function triggerPreview() {
    isDead.value = true;
    isPreview.value = true;
  }

  function dismiss() {
    isDead.value = false;
    isPreview.value = false;
  }

  return { isDead, isPreview, triggerDeath, triggerPreview, dismiss };
}
