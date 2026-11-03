import { describe, expect, it } from 'vitest';
import {
  activeChallenges,
  CHALLENGE_DEFS,
  doneChallenges,
  drawChallenge,
  getChallengeDef,
  offerableChallenges,
  takeChallenge,
} from './challenges';
import type { ChallengeEntry, ChallengeId } from './challenges';
import { ITEM_CATALOG } from './items';
import { createRng } from './rng';
import type { Character } from './types';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  const starterStats = { physicalDamage: 10, magicDamage: 10, healing: 6, health: 50, trueDamage: 6 };
  return {
    level: 5,
    exp: 0,
    starterStats,
    currentHealth: starterStats.health,
    ownedItemIds: [],
    equippedItemIds: [],
    critChance: 0.01,
    ...overrides,
  };
}

function entry(id: ChallengeId, overrides: Partial<ChallengeEntry> = {}): ChallengeEntry {
  return { id, relicId: `relic-${id}`, takenDayKey: '2026-11-01', progress: 0, ...overrides };
}

const allIds = CHALLENGE_DEFS.map((d) => d.id);

describe('challenge catalog', () => {
  it('has 17 unique challenges, one per relic', () => {
    expect(CHALLENGE_DEFS).toHaveLength(17);
    expect(new Set(allIds).size).toBe(17);
    expect(CHALLENGE_DEFS.length).toBe(ITEM_CATALOG.filter((i) => i.rarity === 'relic').length);
  });

  it('gives every challenge a name, deed, positive goal and icon', () => {
    for (const def of CHALLENGE_DEFS) {
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.deed.length).toBeGreaterThan(0);
      expect(def.goal).toBeGreaterThanOrEqual(1);
      expect(def.icon).toMatch(/^[a-z-]+$/);
    }
  });

  it('looks a challenge up by id', () => {
    expect(getChallengeDef('resist').goal).toBe(5);
  });
});

describe('offerableChallenges / drawChallenge', () => {
  it('offers all 17 to a character with none', () => {
    expect(offerableChallenges(makeCharacter())).toHaveLength(17);
    expect(offerableChallenges(makeCharacter({ challenges: [] }))).toHaveLength(17);
  });

  it('drops active and done entries', () => {
    const character = makeCharacter({ challenges: [entry('resist'), entry('rank-up', { doneDayKey: '2026-11-02' })] });
    const ids = offerableChallenges(character).map((d) => d.id);
    expect(ids).toHaveLength(15);
    expect(ids).not.toContain('resist');
    expect(ids).not.toContain('rank-up');
  });

  it('draws an offerable challenge, and null when every challenge is an entry', () => {
    const character = makeCharacter({ challenges: [entry('resist')] });
    for (let seed = 1; seed < 20; seed++) {
      const drawn = drawChallenge(character, createRng(seed));
      expect(drawn).not.toBeNull();
      expect(drawn).not.toBe('resist');
    }
    const full = makeCharacter({ challenges: allIds.map((id) => entry(id)) });
    expect(drawChallenge(full, createRng(1))).toBeNull();
  });
});

describe('takeChallenge', () => {
  it('appends an entry with a reserved relic and clears the offer', () => {
    const character = makeCharacter({ offeredChallengeId: 'resist' });
    const taken = takeChallenge(character, 'resist', createRng(3), '2026-11-03');
    expect(taken.offeredChallengeId).toBeUndefined();
    expect(taken.challenges).toHaveLength(1);
    const [e] = taken.challenges!;
    expect(e).toMatchObject({ id: 'resist', takenDayKey: '2026-11-03', progress: 0 });
    expect(ITEM_CATALOG.find((i) => i.id === e.relicId)?.rarity).toBe('relic');
  });

  it('never reserves an earned, owned or already promised relic: all 17 get distinct relics, a 18th take is a no-op', () => {
    let character = makeCharacter();
    for (let i = 0; i < allIds.length; i++) {
      character = takeChallenge(character, allIds[i], createRng(i * 7 + 1), '2026-11-03');
    }
    const relicIds = character.challenges!.map((e) => e.relicId);
    expect(new Set(relicIds).size).toBe(17);
    expect(takeChallenge(character, 'resist', createRng(1), '2026-11-03')).toBe(character);

    const earned = ITEM_CATALOG.filter((i) => i.rarity === 'relic').map((i) => i.id);
    const some = makeCharacter({ earnedRelicIds: earned.slice(1), ownedItemIds: [] });
    const taken = takeChallenge(some, 'resist', createRng(2), '2026-11-03');
    expect(taken.challenges![0].relicId).toBe(earned[0]);
  });

  it('is a no-op when no relic is available', () => {
    const earned = ITEM_CATALOG.filter((i) => i.rarity === 'relic').map((i) => i.id);
    const character = makeCharacter({ earnedRelicIds: earned });
    expect(takeChallenge(character, 'resist', createRng(1), '2026-11-03')).toBe(character);
  });

  it('returns the same object for a challenge already held, and keeps the offer', () => {
    const character = makeCharacter({ challenges: [entry('resist')], offeredChallengeId: 'rank-up' });
    const again = takeChallenge(character, 'resist', createRng(1), '2026-11-03');
    expect(again).toBe(character);
    expect(again.offeredChallengeId).toBe('rank-up');
  });
});

describe('activeChallenges / doneChallenges', () => {
  it('splits entries by doneDayKey and copes with none', () => {
    const character = makeCharacter({ challenges: [entry('resist'), entry('rank-up', { doneDayKey: '2026-11-02' })] });
    expect(activeChallenges(character).map((e) => e.id)).toEqual(['resist']);
    expect(doneChallenges(character).map((e) => e.id)).toEqual(['rank-up']);
    expect(activeChallenges(makeCharacter())).toEqual([]);
    expect(doneChallenges(makeCharacter())).toEqual([]);
  });
});
