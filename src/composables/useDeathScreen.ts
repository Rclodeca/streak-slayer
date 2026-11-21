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
// Whether the screen itself shows. A fall is flagged at once (isDead holds back every
// other popup), but the screen waits for the killing hit to land on the stage.
const revealed = ref(false);
let revealTimer: ReturnType<typeof setTimeout> | undefined;
// Testing: the screen opened from the dev menu over a hero still standing. It
// shows the page as if they fell, and its choices only close it.
const isPreview = ref(false);

export function useDeathScreen() {
  /** `revealAfterMs`: how long the screen waits to show, for a hit still on its way. */
  function triggerDeath(revealAfterMs = 0) {
    clearTimeout(revealTimer);
    isDead.value = true;
    isPreview.value = false;
    if (revealAfterMs > 0) {
      revealed.value = false;
      revealTimer = setTimeout(() => (revealed.value = true), revealAfterMs);
    } else {
      revealed.value = true;
    }
  }

  function triggerPreview() {
    clearTimeout(revealTimer);
    isDead.value = true;
    isPreview.value = true;
    revealed.value = true;
  }

  function dismiss() {
    clearTimeout(revealTimer);
    isDead.value = false;
    isPreview.value = false;
    revealed.value = false;
  }

  return { isDead, isPreview, revealed, triggerDeath, triggerPreview, dismiss };
}
