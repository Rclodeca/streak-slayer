// A one-time copy of the stored save, taken before the first load that can
// rewrite it under the shop/gold/gem economy. The load-time migrations convert
// an old run in place; this is the way back if one of them ever misbehaves. Kept
// out of the export file and the cloud sync (saveFile.ts's ENTRY_KEYS), so an
// import can't overwrite it.

import { STORAGE_KEY as SAVE_KEY } from './plugins/saveState';
import { storage } from './storage';

export const BACKUP_KEY = 'streak-slayer:save:v5:pre-economy';
export const CONVERTED_KEY = 'streak-slayer:economy-converted';

export type BackupOutcome = 'fresh' | 'already' | 'backed-up' | 'backup-failed';

/**
 * Copies the stored save, as written, to BACKUP_KEY the first time it runs on
 * this install, then marks the install converted. Unreadable text is copied too
 * (the load would replace it with a fresh run). An install with no save is just
 * marked. A failed copy never stops the load, and the first copy is never replaced.
 */
export function backUpBeforeConversion(): BackupOutcome {
  if (storage.getItem(CONVERTED_KEY) !== null) return 'already';
  const raw = storage.getItem(SAVE_KEY);
  const hasBackup = storage.getItem(BACKUP_KEY) !== null;
  let outcome: BackupOutcome = hasBackup ? 'already' : 'fresh';
  if (raw !== null && !hasBackup) {
    try {
      storage.setItem(BACKUP_KEY, raw);
      outcome = 'backed-up';
    } catch {
      outcome = 'backup-failed';
    }
  }
  try {
    storage.setItem(CONVERTED_KEY, '1');
  } catch {
    // Nothing more to do: the next load tries again.
  }
  return outcome;
}
