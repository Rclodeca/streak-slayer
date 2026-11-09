// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacter, createRng, generateBoss } from '../game-engine';
import { RUNS_KEY } from './highScoreStore';
import { serializeSaveState, STORAGE_KEY as SAVE_KEY, writeSaveState } from './plugins/saveState';
import { buildSaveFile, readSaveFile } from './saveFile';
import { syncSave } from './syncSave';
import type { SyncAdapter } from './syncSave';

interface FakeAdapter extends SyncAdapter {
  remote: string | null;
  pushes: string[];
  pullError: Error | null;
}

function fakeAdapter(remote: string | null = null): FakeAdapter {
  const adapter: FakeAdapter = {
    remote,
    pushes: [],
    pullError: null,
    async pull() {
      if (adapter.pullError) throw adapter.pullError;
      return adapter.remote;
    },
    async push(text) {
      adapter.pushes.push(text);
      adapter.remote = text;
    },
  };
  return adapter;
}

interface CopyOptions {
  name?: string;
  savedAt?: number;
  blank?: boolean; // a hero not yet picked, with no past runs: what a new install starts with
  runs?: number; // runs on the high-score list
}

/** Stores a run on this device the way the app would, then returns its save file text. */
function storeLocal({ name = 'Aldric', savedAt = 1000, blank = false, runs = blank ? 0 : 1 }: CopyOptions = {}) {
  const rng = createRng(1);
  const character = { ...createCharacter(rng), name, heroPending: blank };
  writeSaveState({ character, boss: generateBoss(1, rng), habits: [] }, savedAt);
  if (runs > 0) localStorage.setItem(RUNS_KEY, JSON.stringify(Array.from({ length: runs }, (_, i) => ({ id: `r${i}` }))));
  return buildSaveFile();
}

/** A save file as another device would have left it in the cloud. */
function cloudCopy(options: CopyOptions) {
  localStorage.clear();
  const text = storeLocal(options);
  localStorage.clear();
  return text;
}

function localHeroName() {
  return readSaveFile(buildSaveFile())?.summary.heroName;
}

describe('syncSave', () => {
  // The save file is stamped with the time it was built, so the clock is held still to compare two builds.
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-08T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('pushes this device\'s run when the cloud has none', async () => {
    const local = storeLocal();
    const adapter = fakeAdapter(null);
    expect(await syncSave(adapter)).toBe('push');
    expect(adapter.pushes).toEqual([local]);
  });

  it('never pushes a blank new install up to an empty cloud, which may just not have synced yet', async () => {
    storeLocal({ name: 'Nobody', blank: true });
    const adapter = fakeAdapter(null);
    expect(await syncSave(adapter)).toBe('none');
    expect(adapter.pushes).toEqual([]);
  });

  it('does nothing when neither side has a run', async () => {
    const adapter = fakeAdapter(null);
    expect(await syncSave(adapter)).toBe('none');
    expect(adapter.pushes).toEqual([]);
  });

  it('restores the cloud copy on a fresh install with no save', async () => {
    const adapter = fakeAdapter(cloudCopy({ name: 'Brin' }));
    expect(await syncSave(adapter)).toBe('restore');
    expect(localHeroName()).toBe('Brin');
    expect(adapter.pushes).toEqual([]);
  });

  it('restores when the cloud copy was saved more recently', async () => {
    const remote = cloudCopy({ name: 'Brin', savedAt: 2000 });
    storeLocal({ name: 'Aldric', savedAt: 1000 });
    expect(await syncSave(fakeAdapter(remote))).toBe('restore');
    expect(localHeroName()).toBe('Brin');
  });

  it('pushes when this device saved more recently', async () => {
    const remote = cloudCopy({ name: 'Brin', savedAt: 1000 });
    const local = storeLocal({ name: 'Aldric', savedAt: 2000 });
    const adapter = fakeAdapter(remote);
    expect(await syncSave(adapter)).toBe('push');
    expect(adapter.pushes).toEqual([local]);
    expect(localHeroName()).toBe('Aldric');
  });

  it('does nothing when both were saved at the same moment', async () => {
    const remote = cloudCopy({ name: 'Brin', savedAt: 1000 });
    storeLocal({ name: 'Aldric', savedAt: 1000 });
    const adapter = fakeAdapter(remote);
    expect(await syncSave(adapter)).toBe('none');
    expect(adapter.pushes).toEqual([]);
    expect(localHeroName()).toBe('Aldric');
  });

  it('counts a save from before saves were stamped as the oldest', async () => {
    const remote = cloudCopy({ name: 'Brin', savedAt: 1 });
    const rng = createRng(1);
    const character = { ...createCharacter(rng), name: 'Aldric', heroPending: false };
    localStorage.setItem(SAVE_KEY, serializeSaveState({ character, boss: generateBoss(1, rng), habits: [] }));
    localStorage.setItem(RUNS_KEY, '[{"id":"r0"}]');
    expect(await syncSave(fakeAdapter(remote))).toBe('restore');
    expect(localHeroName()).toBe('Brin');
  });

  describe('never overwriting a good run', () => {
    it('leaves a cloud copy it cannot read alone', async () => {
      const local = storeLocal();
      const newerFormat = JSON.stringify({ ...JSON.parse(local), format: 2 });
      for (const unreadable of ['not json', newerFormat]) {
        const adapter = fakeAdapter(unreadable);
        expect(await syncSave(adapter)).toBe('none');
        expect(adapter.pushes).toEqual([]);
        expect(adapter.remote).toBe(unreadable);
        expect(buildSaveFile()).toBe(local);
      }
    });

    it('keeps this device\'s run when the cloud copy is from a save version it cannot load', async () => {
      const remote = cloudCopy({ name: 'Brin', savedAt: 9000 }).replace('\\"schemaVersion\\":5', '\\"schemaVersion\\":6');
      storeLocal({ name: 'Aldric', savedAt: 1000 });
      await syncSave(fakeAdapter(remote));
      expect(localHeroName()).toBe('Aldric');
    });

    it('restores over a save this version cannot load, rather than starting fresh', async () => {
      localStorage.setItem('streak-slayer:save:v5', '{"schemaVersion":4}');
      const adapter = fakeAdapter(cloudCopy({ name: 'Brin' }));
      expect(await syncSave(adapter)).toBe('restore');
      expect(localHeroName()).toBe('Brin');
    });

    it('never lets a blank new install beat a real cloud copy, even though it is newer', async () => {
      const remote = cloudCopy({ name: 'Brin', savedAt: 1000 });
      storeLocal({ name: 'Nobody', savedAt: 9000, blank: true });
      const adapter = fakeAdapter(remote);
      expect(await syncSave(adapter)).toBe('restore');
      expect(adapter.pushes).toEqual([]);
      expect(localHeroName()).toBe('Brin');
    });

    it('never lets a blank cloud copy beat a real run here, even though it is newer', async () => {
      const remote = cloudCopy({ name: 'Nobody', savedAt: 9000, blank: true });
      storeLocal({ name: 'Aldric', savedAt: 1000 });
      const adapter = fakeAdapter(remote);
      expect(await syncSave(adapter)).toBe('push');
      expect(localHeroName()).toBe('Aldric');
    });

    it('treats a hero still to be picked after a death as real, because the run is on the list', async () => {
      const remote = cloudCopy({ name: 'Brin', savedAt: 1000 });
      const local = storeLocal({ name: 'Aldric', savedAt: 2000, blank: true, runs: 1 });
      const adapter = fakeAdapter(remote);
      expect(await syncSave(adapter)).toBe('push');
      expect(adapter.pushes).toEqual([local]);
    });

    it('lets time decide between two blank installs', async () => {
      const remote = cloudCopy({ savedAt: 2000, blank: true });
      storeLocal({ savedAt: 1000, blank: true });
      expect(await syncSave(fakeAdapter(remote))).toBe('restore');
    });
  });

  it('lets an adapter failure through without touching this device or the cloud', async () => {
    const local = storeLocal();
    const adapter = fakeAdapter(null);
    adapter.pullError = new Error('iCloud is off');
    await expect(syncSave(adapter)).rejects.toThrow('iCloud is off');
    expect(adapter.pushes).toEqual([]);
    expect(buildSaveFile()).toBe(local);
  });
});
