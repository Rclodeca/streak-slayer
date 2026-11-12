// Testing-only override for the Trials badge (the claim count and the new-trial
// pip on the Trials tab and the stage's gift button), so both can be looked at
// without finishing or taking a trial. Null means the real value shows. Not
// persisted: it resets on reload.

import { defineStore } from 'pinia';

export const useDebugTrialsBadgeStore = defineStore('debugTrialsBadge', {
  state: () => ({ claims: null as number | null, pip: null as boolean | null }),
  actions: {
    set(claims: number | null, pip: boolean | null) {
      this.claims = claims;
      this.pip = pip;
    },
  },
});
