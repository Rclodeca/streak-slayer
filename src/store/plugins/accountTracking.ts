// Pays level milestone gems as the hero levels up: every character store
// change hands the level to the account, which pays only levels it has never
// reached before (so a new run climbing back up pays nothing twice).
// Idempotent per `pinia` instance, same pattern as `setupPersistence`.

import type { Pinia } from 'pinia';
import { useAccountStore } from '../accountStore';
import { useActivityLogStore } from '../activityLogStore';
import { useCharacterStore } from '../characterStore';

const wiredPinias = new WeakSet<Pinia>();

export function setupAccountTracking(pinia: Pinia): void {
  if (wiredPinias.has(pinia)) return;
  wiredPinias.add(pinia);

  const accountStore = useAccountStore(pinia);
  const activityLogStore = useActivityLogStore(pinia);
  const characterStore = useCharacterStore(pinia);

  characterStore.$subscribe((_mutation, state) => {
    const gemsPaid = accountStore.recordLevel(state.character.level);
    if (gemsPaid > 0) activityLogStore.addEntry({ kind: 'gems', amount: gemsPaid, reason: 'level' });
  }, { detached: true, flush: 'sync' });
}
