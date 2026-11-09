// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { createCharacter, createRng, generateBoss } from '../../game-engine';
import { loadSaveState, serializeSaveState, STORAGE_KEY, writeSaveState } from './saveState';

function state() {
  const rng = createRng(1);
  return { character: createCharacter(rng), boss: generateBoss(1, rng), habits: [] };
}

describe('save state', () => {
  beforeEach(() => localStorage.clear());

  it('stamps each write with the time it was saved', () => {
    writeSaveState(state(), 1_700_000_000_000);
    expect(loadSaveState()?.savedAt).toBe(1_700_000_000_000);
  });

  it('takes the stamp from the write, not from the state handed in', () => {
    writeSaveState({ ...state(), savedAt: 5 }, 1_700_000_000_000);
    expect(loadSaveState()?.savedAt).toBe(1_700_000_000_000);
  });

  it('stamps with the current time when none is given', () => {
    const before = Date.now();
    writeSaveState(state());
    const savedAt = loadSaveState()?.savedAt;
    expect(savedAt).toBeGreaterThanOrEqual(before);
    expect(savedAt).toBeLessThanOrEqual(Date.now());
  });

  it('still loads a save written before it was stamped', () => {
    localStorage.setItem(STORAGE_KEY, serializeSaveState(state()));
    const loaded = loadSaveState();
    expect(loaded).not.toBeNull();
    expect(loaded?.savedAt).toBeUndefined();
  });
});
