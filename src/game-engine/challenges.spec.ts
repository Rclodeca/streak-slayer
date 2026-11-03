import { describe, expect, it } from 'vitest';
import {
  activeChallenges,
  applyChallengeEvent,
  challengeProgress,
  CHALLENGE_DEFS,
  doneChallenges,
  drawChallenge,
  getChallengeDef,
  offerableChallenges,
  recordBadCheck,
  takeChallenge,
} from './challenges';
import type { ChallengeEntry, ChallengeId } from './challenges';
import { ITEM_CATALOG } from './items';
import { createRng } from './rng';
import { addDaysToDayKey, dailyPeriodKey, dayOfWeekIndex } from './time';
import type { Boss, Character, Habit, Quest } from './types';

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

// ---- events, day-end and progress text (Task 3) ----

const ENDED = new Date('2026-11-10T20:00:00Z'); // the day that just ended
const D = dailyPeriodKey(ENDED);
const TODAY = addDaysToDayKey(D, 1);

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Habit',
    period: 'daily',
    difficulty: 'easy',
    damageType: 'physical',
    isBad: false,
    streakCount: 0,
    lastCompletedPeriodKey: null,
    lastCheckedPeriodKey: null,
    ...overrides,
  };
}

function makeBoss(overrides: Partial<Boss> = {}): Boss {
  return { index: 4, health: 100, maxHealth: 100, ...overrides } as Boss;
}

function withEntry(id: ChallengeId, overrides: Partial<ChallengeEntry> = {}, character: Partial<Character> = {}): Character {
  return makeCharacter({ challenges: [entry(id, { takenDayKey: '2026-11-01', ...overrides })], ...character });
}

function dayEnd(character: Character, habits: Habit[] = [], quests: Quest[] = [], ended = ENDED, todayKey = TODAY) {
  return applyChallengeEvent(character, { type: 'day-end', endedDate: ended, habits, quests }, todayKey);
}

function only(result: { character: Character }): ChallengeEntry {
  return result.character.challenges![0];
}

function quest(id: string): Quest {
  return { id, description: id, difficulty: 'easy', dueDateKey: '2099-01-01' };
}

describe('applyChallengeEvent: counted challenges', () => {
  it('counts each bad-habit resist and completes at 5, reporting it once', () => {
    let character = withEntry('resist');
    for (let i = 1; i <= 4; i++) {
      const r = applyChallengeEvent(character, { type: 'bad-resisted' }, TODAY);
      expect(r.completed).toEqual([]);
      character = r.character;
      expect(only(r).progress).toBe(i);
    }
    const last = applyChallengeEvent(character, { type: 'bad-resisted' }, TODAY);
    expect(last.completed.map((e) => e.id)).toEqual(['resist']);
    expect(only(last)).toMatchObject({ progress: 5, doneDayKey: TODAY });
    // A done entry no longer reacts.
    expect(applyChallengeEvent(last.character, { type: 'bad-resisted' }, TODAY).character).toBe(last.character);
  });

  it('counts landed crits toward Crit streak and bosses toward Twice slain', () => {
    expect(only(applyChallengeEvent(withEntry('land-crits'), { type: 'crit-landed' }, TODAY)).progress).toBe(1);
    const slain = (c: Character) => applyChallengeEvent(c, { type: 'boss-defeated', boss: makeBoss(), byTrueSkill: false, byCrit: false }, TODAY);
    const one = slain(withEntry('slay-two'));
    expect(only(one).progress).toBe(1);
    expect(slain(one.character).completed.map((e) => e.id)).toEqual(['slay-two']);
  });

  it('counts a quest completed on time only when it was added on an earlier day', () => {
    const done = (createdDayKey?: string) => applyChallengeEvent(withEntry('quest-run'), { type: 'quest-completed', createdDayKey }, TODAY);
    expect(only(done(undefined)).progress).toBe(1);
    expect(only(done(D)).progress).toBe(1);
    expect(only(done(TODAY)).progress).toBe(0);
  });
});

describe('applyChallengeEvent: one-shot challenges', () => {
  const complete = (id: ChallengeId, event: Parameters<typeof applyChallengeEvent>[1]) => applyChallengeEvent(withEntry(id), event, TODAY).completed.map((e) => e.id);

  it('Early riser needs a hard good skill checked before noon', () => {
    const hard = makeHabit({ difficulty: 'hard' });
    expect(complete('early-start', { type: 'habit-checked', habit: hard, hour: 11 })).toEqual(['early-start']);
    expect(complete('early-start', { type: 'habit-checked', habit: hard, hour: 12 })).toEqual([]);
    expect(complete('early-start', { type: 'habit-checked', habit: makeHabit({ difficulty: 'medium' }), hour: 6 })).toEqual([]);
    expect(complete('early-start', { type: 'habit-checked', habit: makeHabit({ difficulty: 'hard', isBad: true }), hour: 6 })).toEqual([]);
  });

  it('completes Rank up, Enchanted and Epic find on their events', () => {
    expect(complete('rank-up', { type: 'rank-up' })).toEqual(['rank-up']);
    expect(complete('enchant', { type: 'enchanted' })).toEqual(['enchant']);
    expect(complete('epic-find', { type: 'epic-dropped' })).toEqual(['epic-find']);
    expect(complete('rank-up', { type: 'enchanted' })).toEqual([]);
  });

  it('completes True strike, Killing crit and Untouched from the boss kill', () => {
    const kill = (byTrueSkill: boolean, byCrit: boolean, boss = makeBoss()) => ({ type: 'boss-defeated' as const, boss, byTrueSkill, byCrit });
    expect(complete('true-kill', kill(true, false))).toEqual(['true-kill']);
    expect(complete('true-kill', kill(false, true))).toEqual([]);
    expect(complete('crit-kill', kill(false, true))).toEqual(['crit-kill']);
    expect(complete('crit-kill', kill(true, false))).toEqual([]);
    expect(complete('untouched', kill(false, false))).toEqual(['untouched']);
    expect(complete('untouched', kill(false, false, makeBoss({ hurtPlayer: true })))).toEqual([]);
  });
});

describe('applyChallengeEvent: Unbroken', () => {
  const state = (habits: Habit[]) => applyChallengeEvent(withEntry('streak-all'), { type: 'state-changed', habits }, TODAY).completed.length === 1;

  it('needs every daily, good and bad, at 3+, and at least one daily', () => {
    expect(state([makeHabit({ streakCount: 3 }), makeHabit({ id: 'b', isBad: true, streakCount: 5 })])).toBe(true);
    expect(state([makeHabit({ streakCount: 3 }), makeHabit({ id: 'b', isBad: true, streakCount: 2 })])).toBe(false);
    expect(state([])).toBe(false);
  });

  it('ignores weeklies', () => {
    expect(state([makeHabit({ streakCount: 3 }), makeHabit({ id: 'w', period: 'weekly', streakCount: 0 })])).toBe(true);
    expect(state([makeHabit({ id: 'w', period: 'weekly', streakCount: 9 })])).toBe(false);
  });
});

describe('applyChallengeEvent: additions count at the next rollover', () => {
  const good = makeHabit({ id: 'g1' });
  const bad = makeHabit({ id: 'b1', isBad: true });

  it('queues an addition only for a challenge already taken, matching good vs bad', () => {
    const none = applyChallengeEvent(makeCharacter(), { type: 'habit-added', habit: good }, TODAY);
    expect(none.character.challenges).toBeUndefined();
    const newGood = applyChallengeEvent(withEntry('new-good'), { type: 'habit-added', habit: good }, TODAY);
    expect(only(newGood).pending).toEqual([{ id: 'g1', dayKey: TODAY }]);
    expect(only(applyChallengeEvent(withEntry('new-good'), { type: 'habit-added', habit: bad }, TODAY)).pending).toBeUndefined();
    expect(only(applyChallengeEvent(withEntry('new-bad'), { type: 'habit-added', habit: bad }, TODAY)).pending).toEqual([{ id: 'b1', dayKey: TODAY }]);
    expect(only(applyChallengeEvent(withEntry('fresh-quests'), { type: 'quest-added', questId: 'q1' }, TODAY)).pending).toEqual([{ id: 'q1', dayKey: TODAY }]);
  });

  it('counts a surviving addition from an earlier day at day-end, and completes', () => {
    const added = applyChallengeEvent(withEntry('new-good'), { type: 'habit-added', habit: good }, D).character;
    const result = dayEnd(added, [good]);
    expect(result.completed.map((e) => e.id)).toEqual(['new-good']);
    expect(only(result).pending).toBeUndefined();
  });

  it('does not count an addition deleted before day-end, nor one added today', () => {
    const added = applyChallengeEvent(withEntry('new-good'), { type: 'habit-added', habit: good }, D).character;
    const deleted = dayEnd(added, []);
    expect(only(deleted)).toMatchObject({ progress: 0 });
    expect(only(deleted).pending ?? []).toEqual([]);

    const addedToday = applyChallengeEvent(withEntry('new-good'), { type: 'habit-added', habit: good }, TODAY).character;
    const kept = dayEnd(addedToday, [good]);
    expect(only(kept).progress).toBe(0);
    expect(only(kept).pending).toEqual([{ id: 'g1', dayKey: TODAY }]);
  });

  it('Fresh quests needs 3 survivors, counting a quest finished before the rollover', () => {
    let character = withEntry('fresh-quests');
    for (const id of ['q1', 'q2', 'q3']) character = applyChallengeEvent(character, { type: 'quest-added', questId: id }, D).character;
    const two = dayEnd(character, [], [quest('q1'), quest('q2')]);
    expect(only(two).progress).toBe(2);
    expect(two.completed).toEqual([]);
    const three = dayEnd(character, [], [quest('q1'), quest('q2'), { ...quest('q3'), doneDayKey: D }]);
    expect(three.completed.map((e) => e.id)).toEqual(['fresh-quests']);
  });

  it('running the day-end twice does not double count', () => {
    let character = withEntry('fresh-quests');
    for (const id of ['q1', 'q2']) character = applyChallengeEvent(character, { type: 'quest-added', questId: id }, D).character;
    const quests = [quest('q1'), quest('q2')];
    const first = dayEnd(character, [], quests);
    const second = dayEnd(first.character, [], quests);
    expect(only(second).progress).toBe(2);
  });
});

describe('applyChallengeEvent: day-end challenges', () => {
  const doneToday = (overrides: Partial<Habit> = {}) => makeHabit({ lastCompletedPeriodKey: D, ...overrides });

  it('Perfect day: every good daily due was checked, no bad habit', () => {
    const habits = [doneToday({ id: 'a' }), doneToday({ id: 'b' }), makeHabit({ id: 'w', period: 'weekly' })];
    expect(dayEnd(withEntry('perfect-day'), habits).completed.map((e) => e.id)).toEqual(['perfect-day']);
  });

  it('Perfect day fails on a missed daily, a bad-habit check that day, or no good dailies due', () => {
    expect(dayEnd(withEntry('perfect-day'), [doneToday({ id: 'a' }), makeHabit({ id: 'b' })]).completed).toEqual([]);
    expect(dayEnd(withEntry('perfect-day', {}, { lastBadCheckDayKey: D }), [doneToday()]).completed).toEqual([]);
    expect(dayEnd(withEntry('perfect-day'), []).completed).toEqual([]);
    expect(dayEnd(withEntry('perfect-day'), [makeHabit({ period: 'weekly', lastCompletedPeriodKey: D })]).completed).toEqual([]);
  });

  it('Perfect day ignores a habit created that day and a set-day habit resting that day', () => {
    const habits = [doneToday({ id: 'a' }), makeHabit({ id: 'new', createdDayKey: D })];
    expect(dayEnd(withEntry('perfect-day'), habits).completed).toHaveLength(1);
    const rest = makeHabit({ id: 'rest', days: [(dayOfWeekIndex(ENDED) + 1) % 7] });
    expect(dayEnd(withEntry('perfect-day'), [doneToday({ id: 'a' }), rest]).completed).toHaveLength(1);
  });

  it('nothing reacts to a day that ended before the challenge was taken', () => {
    const result = dayEnd(withEntry('perfect-day', { takenDayKey: TODAY }), [doneToday()]);
    expect(result.completed).toEqual([]);
    expect(only(result).lastDayKey).toBeUndefined();
  });

  it('Perfect day may be completed by the day it was taken on', () => {
    expect(dayEnd(withEntry('perfect-day', { takenDayKey: D }), [doneToday()]).completed).toHaveLength(1);
  });

  it('Clean slate counts clean days, and a bad check resets the run', () => {
    const day = (n: number) => new Date(ENDED.getTime() + n * 86400000);
    let character = withEntry('clean-days');
    let result = dayEnd(character, [], [], day(0), addDaysToDayKey(D, 1));
    expect(only(result).progress).toBe(1);
    result = dayEnd(result.character, [], [], day(1), addDaysToDayKey(D, 2));
    expect(only(result).progress).toBe(2);
    character = { ...result.character, lastBadCheckDayKey: addDaysToDayKey(D, 2) };
    result = dayEnd(character, [], [], day(2), addDaysToDayKey(D, 3));
    expect(only(result).progress).toBe(0);
    for (let n = 3; n <= 5; n++) result = dayEnd(result.character, [], [], day(n), addDaysToDayKey(D, n + 1));
    expect(result.completed.map((e) => e.id)).toEqual(['clean-days']);
  });

  it('running a day-end twice for the same day leaves progress unchanged', () => {
    const first = dayEnd(withEntry('clean-days'));
    const second = dayEnd(first.character);
    expect(only(first).progress).toBe(1);
    expect(second.character).toBe(first.character);
  });

  it('Clean slate resets across a gap of days (no protection)', () => {
    const entryAt = { progress: 2, lastDayKey: addDaysToDayKey(D, -2) };
    const result = dayEnd(withEntry('clean-days', entryAt));
    expect(only(result)).toMatchObject({ progress: 1, lastDayKey: D });
  });
});

describe('applyChallengeEvent: no challenges', () => {
  it('returns the character unchanged when challenges is undefined or empty', () => {
    const bare = makeCharacter();
    expect(applyChallengeEvent(bare, { type: 'rank-up' }, TODAY)).toEqual({ character: bare, completed: [] });
    expect(applyChallengeEvent(bare, { type: 'rank-up' }, TODAY).character).toBe(bare);
    const empty = makeCharacter({ challenges: [] });
    expect(applyChallengeEvent(empty, { type: 'day-end', endedDate: ENDED, habits: [], quests: [] }, TODAY).character).toBe(empty);
  });

  it('returns the same character when no entry reacts', () => {
    const character = withEntry('resist');
    expect(applyChallengeEvent(character, { type: 'rank-up' }, TODAY).character).toBe(character);
  });
});

describe('recordBadCheck', () => {
  it('stamps the day, and returns the same character if already stamped', () => {
    const stamped = recordBadCheck(makeCharacter(), D);
    expect(stamped.lastBadCheckDayKey).toBe(D);
    expect(recordBadCheck(stamped, D)).toBe(stamped);
  });
});

describe('challengeProgress', () => {
  const ctx = (habits: Habit[] = [], boss: Boss = makeBoss(), todayDate: Date = ENDED) => ({ habits, boss, todayDate });

  it('gives a bar for counted challenges', () => {
    expect(challengeProgress(entry('resist', { progress: 2 }), ctx())).toEqual({ kind: 'bar', cur: 2, max: 5 });
    expect(challengeProgress(entry('slay-two', { progress: 1 }), ctx())).toEqual({ kind: 'bar', cur: 1, max: 2 });
    expect(challengeProgress(entry('clean-days', { progress: 1 }), ctx())).toEqual({ kind: 'bar', cur: 1, max: 3 });
  });

  it('Fresh quests counts pending additions in its bar', () => {
    const e = entry('fresh-quests', { progress: 1, pending: [{ id: 'q', dayKey: TODAY }] });
    expect(challengeProgress(e, ctx())).toEqual({ kind: 'bar', cur: 2, max: 3 });
  });

  it('Perfect day reads "<n> of <m> done today"', () => {
    const habits = [makeHabit({ id: 'a', lastCompletedPeriodKey: D }), makeHabit({ id: 'b' }), makeHabit({ id: 'c', isBad: true })];
    expect(challengeProgress(entry('perfect-day'), ctx(habits))).toEqual({ kind: 'text', text: '1 of 2 done today' });
  });

  it('Unbroken reads "<n> of <m> at 3+"', () => {
    const habits = [makeHabit({ id: 'a', streakCount: 4 }), makeHabit({ id: 'b', streakCount: 1 }), makeHabit({ id: 'w', period: 'weekly' })];
    expect(challengeProgress(entry('streak-all'), ctx(habits))).toEqual({ kind: 'text', text: '1 of 2 at 3+' });
  });

  it('Untouched reads the boss number and whether it has struck', () => {
    expect(challengeProgress(entry('untouched'), ctx([], makeBoss({ index: 12 })))).toEqual({ kind: 'text', text: 'Boss 12 · untouched so far' });
    expect(challengeProgress(entry('untouched'), ctx([], makeBoss({ index: 12, hurtPlayer: true })))).toEqual({ kind: 'text', text: 'Boss 12 · struck' });
  });

  it('gives a plain line for the other one-shots', () => {
    expect(challengeProgress(entry('rank-up'), ctx())).toEqual({ kind: 'text', text: 'Not yet' });
  });
});
