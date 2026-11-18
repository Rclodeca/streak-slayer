// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCharacter, createRng, generateBoss } from '../game-engine';
import { STORAGE_KEY as SAVE_KEY, serializeSaveState } from './plugins/saveState';
import { applySaveFile, buildSaveFile, readSaveFile } from './saveFile';
import { setStorageBackend } from './storage';
import { BACKUP_KEY, backUpBeforeConversion, CONVERTED_KEY } from './preEconomyBackup';

const OLD_SAVE = JSON.stringify({ schemaVersion: 5, character: { name: 'Old' }, habits: [] });

describe('back up before conversion', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => setStorageBackend(null));

  it('copies the stored save, byte for byte, to BACKUP_KEY and returns backed-up', () => {
    localStorage.setItem(SAVE_KEY, OLD_SAVE);
    expect(backUpBeforeConversion()).toBe('backed-up');
    expect(localStorage.getItem(BACKUP_KEY)).toBe(OLD_SAVE);
    expect(localStorage.getItem(CONVERTED_KEY)).toBe('1');
  });

  it('backs up text that is not a readable save', () => {
    for (const junk of ['not json', '{"schemaVersion":4}']) {
      localStorage.clear();
      localStorage.setItem(SAVE_KEY, junk);
      expect(backUpBeforeConversion()).toBe('backed-up');
      expect(localStorage.getItem(BACKUP_KEY)).toBe(junk);
    }
  });

  it('writes no backup for an install with no save, marks it converted, and returns fresh', () => {
    expect(backUpBeforeConversion()).toBe('fresh');
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
    expect(localStorage.getItem(CONVERTED_KEY)).toBe('1');
  });

  it('does nothing once marked: a second call returns already and keeps the first copy', () => {
    localStorage.setItem(SAVE_KEY, OLD_SAVE);
    backUpBeforeConversion();
    localStorage.setItem(SAVE_KEY, '{"converted":true}');
    expect(backUpBeforeConversion()).toBe('already');
    expect(localStorage.getItem(BACKUP_KEY)).toBe(OLD_SAVE);
  });

  it('never replaces a backup that is already there, even when the marker is missing', () => {
    localStorage.setItem(BACKUP_KEY, OLD_SAVE);
    localStorage.setItem(SAVE_KEY, '{"converted":true}');
    expect(backUpBeforeConversion()).toBe('already');
    expect(localStorage.getItem(BACKUP_KEY)).toBe(OLD_SAVE);
    expect(localStorage.getItem(CONVERTED_KEY)).toBe('1');
  });

  it('still marks converted and returns backup-failed when the backup write throws', () => {
    const map = new Map<string, string>([[SAVE_KEY, OLD_SAVE]]);
    setStorageBackend({
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => {
        if (key === BACKUP_KEY) throw new Error('quota');
        map.set(key, value);
      },
      removeItem: (key) => void map.delete(key),
    });
    expect(backUpBeforeConversion()).toBe('backup-failed');
    expect(map.get(CONVERTED_KEY)).toBe('1');
    expect(map.has(BACKUP_KEY)).toBe(false);
  });

  it('an import leaves the backup alone', () => {
    localStorage.setItem(SAVE_KEY, OLD_SAVE);
    backUpBeforeConversion();
    const rng = createRng(1);
    localStorage.setItem(SAVE_KEY, serializeSaveState({ character: createCharacter(rng), boss: generateBoss(1, rng), habits: [] }));
    const file = readSaveFile(buildSaveFile())!.file;
    applySaveFile(file);
    expect(localStorage.getItem(BACKUP_KEY)).toBe(OLD_SAVE);
  });
});
