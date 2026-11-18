// @vitest-environment jsdom
//
// A level-24, boss-27 run made under the old rules (per-run talent tree,
// level-up events for slots, one-off trials, no account) must carry on in
// place when the new version loads it. See docs/superpowers/specs/2026-11-18-run-conversion-design.md.

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { characterGold, createCharacter, createHabit, createRng, generateBoss, maxEquipSlots, STARTING_GEMS } from '../game-engine';
import type { Character, ChallengeEntry } from '../game-engine';
import { initializeStores } from './index';
import { CURRENT_SCHEMA_VERSION, STORAGE_KEY } from './plugins/saveState';
import { BACKUP_KEY } from './preEconomyBackup';

const RANKS = { might: 3, precision: 3, 'keen-edge': 2, brawn: 3, 'armor-break': 3, arcana: 3, 'might-2': 3, 'precision-2': 3 } as const;
const OLD_TRIALS: ChallengeEntry[] = [
  { id: 'new-good', takenDayKey: '2026-10-01', progress: 1, doneDayKey: '2026-10-02' },
  { id: 'rank-up', takenDayKey: '2026-10-05', progress: 1, doneDayKey: '2026-10-09' },
];

/** The save the live (pre-shop) version wrote for a level-24 warrior: no account, no gold, no trial sets. */
function legacySaveText(): string {
  const rng = createRng(7);
  const character: Record<string, unknown> = {
    ...createCharacter(rng, 'warrior'),
    level: 24,
    talentsUnlocked: true,
    talents: RANKS,
    takenEventIds: ['item-slots', 'item-slots-2'],
    pendingEventPicks: 0,
    challenges: OLD_TRIALS,
  };
  for (const key of ['slotUpgrades', 'shopUnlocked', 'servicesUnlocked', 'looksUnlocked', 'trials', 'gold', 'shop', 'prestige', 'heroPending']) delete character[key];
  const habits = [createHabit('Run', 'daily', 'medium', false, rng), createHabit('No sugar', 'daily', 'easy', true, rng)];
  return JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, character, boss: generateBoss(27, rng), habits });
}

function ranksOf(character: Character): number {
  return Object.values(character.talents ?? {}).reduce((sum, rank) => sum + (rank ?? 0), 0);
}

describe('converting a level-24 old save in place', () => {
  let original: string;

  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.useFakeTimers();
    original = legacySaveText();
    localStorage.setItem(STORAGE_KEY, original);
  });

  it('keeps the ranks and the slots', () => {
    const { characterStore } = initializeStores();
    const character = characterStore.character as unknown as Record<string, unknown>;
    expect(ranksOf(characterStore.character)).toBe(23);
    expect(characterStore.character.slotUpgrades).toBe(4);
    expect(maxEquipSlots(characterStore.character)).toBe(8);
    expect(character.takenEventIds).toBeUndefined();
    expect(character.pendingEventPicks).toBeUndefined();
  });

  it('opens the shop gates by level', () => {
    const { characterStore } = initializeStores();
    expect(characterStore.character).toMatchObject({ shopUnlocked: true, servicesUnlocked: true, looksUnlocked: true });
  });

  it('credits the old trials without paying gems for them', () => {
    const { characterStore, accountStore } = initializeStores();
    const paid = (characterStore.character.trials ?? []).filter((entry) => (entry.claimed ?? []).length > 0);
    expect(paid.length).toBeGreaterThan(0);
    expect(characterStore.character.challenges).toBeUndefined();
    expect(accountStore.account.gems).toBe(STARTING_GEMS + 4 + 4 + 4 + 4);
    expect(accountStore.account.highestLevel).toBe(24);
  });

  it('starts gold at 0', () => {
    const { characterStore } = initializeStores();
    expect(characterGold(characterStore.character)).toBe(0);
  });

  it('backs the old save up byte for byte', () => {
    initializeStores();
    expect(localStorage.getItem(BACKUP_KEY)).toBe(original);
  });

  it('a second load changes nothing', () => {
    const first = initializeStores();
    vi.advanceTimersByTime(300);
    const written = localStorage.getItem(STORAGE_KEY);
    expect(written).not.toBe(original);
    const snapshot = JSON.parse(JSON.stringify({ character: first.characterStore.character, account: first.accountStore.account, habits: first.habitStore.habits }));

    setActivePinia(createPinia());
    const second = initializeStores();
    vi.advanceTimersByTime(300);

    expect(JSON.parse(JSON.stringify({ character: second.characterStore.character, account: second.accountStore.account, habits: second.habitStore.habits }))).toEqual(snapshot);
    expect(localStorage.getItem(BACKUP_KEY)).toBe(original);
  });
});
