// Keeps a copy of the save somewhere off the device (the iCloud key-value
// store on iOS, say) and decides which side wins when the two differ. The
// copy is the same text the export file holds, so a restore is just an
// import. The place itself sits behind SyncAdapter; this file is the rules.
//
// Run it at launch, before the stores hydrate: a 'restore' writes the cloud
// copy into storage and the caller must reload straight after (applySaveFile
// suspends save writes until then). A 'push' sends this device's copy up.
// Pushing after later saves is the caller's job too.

import { deserializeSaveState } from './plugins/saveState';
import { applySaveFile, buildSaveFile, readSaveFile } from './saveFile';
import type { SaveFile } from './saveFile';

export interface SyncAdapter {
  /** The cloud copy's text, or null when there isn't one. Rejects when the cloud can't be reached. */
  pull(): Promise<string | null>;
  push(text: string): Promise<void>;
}

export type SyncAction = 'none' | 'restore' | 'push';

interface Copy {
  savedAt: number; // a save from before saves were stamped counts as the oldest
  blank: boolean;
}

/** Null when the text isn't a save file this version can load. */
function readCopy(text: string | null): Copy | null {
  const read = text === null ? null : readSaveFile(text);
  const raw = read?.file.entries.save;
  const save = raw ? deserializeSaveState(raw) : null;
  if (!read || !save) return null;
  return {
    savedAt: save.savedAt ?? 0,
    // What a new install starts with: a hero still to be picked, and no run ever ended. A hero
    // still to be picked after a death has a run on the list, so it is a real copy.
    blank: save.character.heroPending === true && !hasRuns(read.file),
  };
}

function hasRuns(file: SaveFile): boolean {
  try {
    const runs = JSON.parse(file.entries.runs ?? '[]');
    return Array.isArray(runs) && runs.length > 0;
  } catch {
    return false;
  }
}

/**
 * Which side wins. A copy this version can't read is never overwritten, a
 * blank new install never beats (or gets pushed over) a real run however new
 * its stamp, and otherwise the more recently saved copy wins.
 */
export function decideSync(localText: string, remoteText: string | null): SyncAction {
  const local = readCopy(localText);
  const remote = readCopy(remoteText);
  if (remoteText !== null && !remote) return 'none';
  if (!remote) return local && !local.blank ? 'push' : 'none';
  if (!local) return 'restore';
  if (local.blank !== remote.blank) return local.blank ? 'restore' : 'push';
  if (remote.savedAt > local.savedAt) return 'restore';
  if (local.savedAt > remote.savedAt) return 'push';
  return 'none';
}

/** Rejects, with nothing changed on either side, when the adapter can't pull or push. */
export async function syncSave(adapter: SyncAdapter): Promise<SyncAction> {
  const remoteText = await adapter.pull();
  const localText = buildSaveFile();
  const action = decideSync(localText, remoteText);
  if (action === 'push') {
    await adapter.push(localText);
  } else if (action === 'restore') {
    const remote = remoteText === null ? null : readSaveFile(remoteText);
    if (remote) applySaveFile(remote.file);
  }
  return action;
}
