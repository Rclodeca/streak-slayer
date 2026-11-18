import { describe, expect, it } from 'vitest';
import { resolvePlayerDeathIfDead } from './combat';
import { createRng } from './rng';
import { addDaysToDayKey, dailyPeriodKey, dayOfWeekIndex } from './time';
import {
  applyTrialEvent,
  claimableTrials,
  getTrialSet,
  markTrialClaimed,
  reachedRungCount,
  recordBadCheck,
  seedTrials,
  trialCard,
  trialCards,
  TRIAL_SETS,
  waitingRung,
} from './trials';
import type { TrialEntry, TrialEvent, TrialSetId } from './trials';
import type { Boss, ChallengeEntry, Character, Habit, Quest } from './types';

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

const quest = (id: string): Quest => ({ id, description: id, difficulty: 'easy', dueDateKey: '2099-01-01' });
const entry = (id: TrialSetId, overrides: Partial<TrialEntry> = {}): TrialEntry => ({ id, takenDayKey: '2026-11-01', count: 0, ...overrides });
const withEntry = (id: TrialSetId, overrides: Partial<TrialEntry> = {}, character: Partial<Character> = {}) =>
  makeCharacter({ trials: [entry(id, overrides)], ...character });
const only = (character: Character) => character.trials![0];
const feed = (character: Character, ...events: TrialEvent[]) => events.reduce((c, e) => applyTrialEvent(c, e, TODAY), character);
const dayEnd = (character: Character, habits: Habit[] = [], quests: Quest[] = [], ended = ENDED, todayKey = TODAY) =>
  applyTrialEvent(character, { type: 'day-end', endedDate: ended, habits, quests }, todayKey);
const slay = (boss: Partial<Boss> = {}, byCrit = false, byTrueSkill = false): TrialEvent => ({ type: 'boss-defeated', boss: makeBoss(boss), byCrit, byTrueSkill });
const floors = { bossesBeaten: 0, habits: [] as Habit[] };

describe('the trial sets', () => {
  it('are 12 sets of 49 rungs', () => {
    expect(TRIAL_SETS).toHaveLength(12);
    expect(TRIAL_SETS.reduce((n, s) => n + s.rungs.length, 0)).toBe(49);
  });

  it('every rung is reached by a goal or a mark, never both, and goals climb', () => {
    for (const set of TRIAL_SETS) {
      for (const rung of set.rungs) expect((rung.goal === undefined) !== (rung.mark === undefined), `${set.id}: ${rung.deed}`).toBe(true);
      const goals = set.rungs.flatMap((r) => (r.goal === undefined ? [] : [r.goal]));
      expect(goals, set.id).toEqual([...goals].sort((a, b) => a - b));
    }
  });

  it('throws on an unknown set', () => expect(() => getTrialSet('nope' as TrialSetId)).toThrow());
});

describe('seedTrials', () => {
  it('gives a fresh character every set at 0, once', () => {
    const seeded = seedTrials(makeCharacter(), '2026-11-14', floors);
    expect(seeded.trials!.map((e) => e.id)).toEqual(TRIAL_SETS.map((s) => s.id));
    expect(seeded.trials!.every((e) => e.count === 0 && e.takenDayKey === '2026-11-14')).toBe(true);
    expect(seedTrials(seeded, '2026-11-15', floors)).toBe(seeded);
  });

  it('starts Bosses slain at the bosses beaten and Longest streak at the best good daily streak', () => {
    const habits = [makeHabit({ id: 'a', streakCount: 4 }), makeHabit({ id: 'b', streakCount: 9, isBad: true }), makeHabit({ id: 'w', period: 'weekly', streakCount: 12 })];
    const seeded = seedTrials(makeCharacter(), TODAY, { bossesBeaten: 13, habits });
    expect(seeded.trials!.find((e) => e.id === 'bosses')!.count).toBe(13);
    expect(seeded.trials!.find((e) => e.id === 'streak')!.count).toBe(4);
  });

  it('marks the relic rung for a hero who already owns a relic', () => {
    const seeded = seedTrials(makeCharacter({ ownedItemIds: ['ember-heart'] }), TODAY, floors);
    expect(seeded.trials!.find((e) => e.id === 'epics')!.marks).toEqual(['relic']);
  });

  it('keeps the sets a save holds and tops up the rest', () => {
    const held = entry('crits', { count: 7 });
    const seeded = seedTrials(makeCharacter({ trials: [held] }), TODAY, floors);
    expect(seeded.trials![0]).toBe(held);
    expect(seeded.trials).toHaveLength(12);
  });
});

describe("seedTrials: an old save's one-off trials", () => {
  const old = (id: ChallengeEntry['id'], overrides: Partial<ChallengeEntry> = {}): ChallengeEntry => ({ id, takenDayKey: '2026-11-01', progress: 0, ...overrides });
  const paid = { doneDayKey: '2026-11-03' };
  const waiting = { doneDayKey: '2026-11-03', unclaimed: true };
  const migrate = (challenges: ChallengeEntry[], f = floors) => seedTrials(makeCharacter({ challenges }), TODAY, f);
  const set = (c: Character, id: TrialSetId) => c.trials!.find((e) => e.id === id)!;

  it('drops the old field', () => {
    expect(migrate([old('resist')]).challenges).toBeUndefined();
    expect('challenges' in migrate([])).toBe(false);
  });

  it('a claimed trial marks the rungs it proves paid, so nothing is paid twice', () => {
    const c = migrate([old('quest-run', { progress: 3, ...paid }), old('slay-two', { progress: 2, ...paid }), old('crit-kill', { progress: 1, ...paid })]);
    expect(set(c, 'quests')).toMatchObject({ count: 3, claimed: [0, 1] });
    expect(set(c, 'bosses')).toMatchObject({ count: 2, claimed: [0] });
    expect(set(c, 'feats')).toMatchObject({ marks: ['crit-kill'], claimed: [0] });
    expect(claimableTrials(c)).toEqual([]);
  });

  it('a finished, unclaimed trial leaves its rung waiting', () => {
    const c = migrate([old('resist', { progress: 5, ...waiting }), old('new-bad', { progress: 1, ...waiting })]);
    expect(set(c, 'resisted')).toMatchObject({ count: 5 });
    expect(set(c, 'resisted').claimed).toBeUndefined();
    expect(set(c, 'first-steps').marks).toEqual(['bad-habit']);
    expect(claimableTrials(c).map((e) => e.id)).toEqual(['first-steps', 'resisted']);
  });

  it('carries an unfinished count over, and a counted Fresh quests proves a quest', () => {
    const c = migrate([old('land-crits', { progress: 3 }), old('fresh-quests', { progress: 1 }), old('rank-up')]);
    expect(set(c, 'crits').count).toBe(3);
    expect(set(c, 'first-steps').marks).toEqual(['quest']);
    expect(set(c, 'ranks').count).toBe(0);
  });

  it('Clean slate and Unbroken have no set', () => {
    const c = migrate([old('clean-days', paid), old('streak-all', paid)]);
    expect(reachedRungCount(c)).toBe(0);
  });

  it('the save’s own counts can reach further, and those rungs wait', () => {
    const c = migrate([old('slay-two', { progress: 2, ...paid })], { bossesBeaten: 12, habits: [] });
    expect(set(c, 'bosses')).toMatchObject({ count: 12, claimed: [0] });
    expect(waitingRung(set(c, 'bosses'))).toBe(1);
  });
});

describe('applyTrialEvent: counted sets', () => {
  it('counts boss kills, resists, crits, enchants and rank-ups', () => {
    const c = feed(
      makeCharacter({ trials: (['bosses', 'resisted', 'crits', 'enchants', 'ranks'] as TrialSetId[]).map((id) => entry(id)) }),
      slay(),
      slay(),
      { type: 'bad-resisted' },
      { type: 'crit-landed' },
      { type: 'crit-landed' },
      { type: 'crit-landed' },
      { type: 'enchanted' },
      { type: 'rank-up' },
    );
    expect(c.trials!.map((e) => e.count)).toEqual([2, 1, 3, 1, 1]);
  });

  it('Untouched kills counts only a boss that never hurt you', () => {
    expect(only(feed(withEntry('untouched'), slay(), slay({ hurtPlayer: true }))).count).toBe(1);
  });

  it('Epic finds counts each epic dropped', () => {
    expect(only(feed(withEntry('epics'), { type: 'items-found', rarities: ['epic', 'rare', 'epic'] })).count).toBe(2);
  });

  it('Epic finds marks the relic once one is owned, from any source', () => {
    const c = feed(withEntry('epics', {}, { ownedItemIds: ['soul-lantern'] }), { type: 'rank-up' });
    expect(only(c).marks).toEqual(['relic']);
  });

  it('Quests completed counts on-time finishes of a quest made before today', () => {
    const c = feed(withEntry('quests'), { type: 'quest-completed', createdDayKey: D }, { type: 'quest-completed', createdDayKey: TODAY }, { type: 'quest-completed' });
    expect(only(c).count).toBe(2);
  });

  it('Longest streak keeps the best good daily streak and never drops', () => {
    const up = feed(withEntry('streak'), { type: 'state-changed', habits: [makeHabit({ streakCount: 5 }), makeHabit({ id: 'bad', isBad: true, streakCount: 40 })] });
    expect(only(up).count).toBe(5);
    expect(feed(up, { type: 'state-changed', habits: [makeHabit({ streakCount: 0 })] })).toBe(up);
  });

  it('returns the same character when nothing counts', () => {
    const c = withEntry('crits');
    expect(applyTrialEvent(c, { type: 'rank-up' }, TODAY)).toBe(c);
    const bare = makeCharacter();
    expect(applyTrialEvent(bare, { type: 'rank-up' }, TODAY)).toBe(bare);
  });
});

describe('applyTrialEvent: step sets', () => {
  it('Feats marks a crit kill, a true-damage kill and a hard skill before noon', () => {
    const hard = makeHabit({ difficulty: 'hard' });
    const c = feed(withEntry('feats'), slay({}, true, false), slay({}, false, true), { type: 'habit-checked', habit: hard, hour: 13 });
    expect(only(c).marks).toEqual(['crit-kill', 'true-kill']);
    expect(only(feed(c, { type: 'habit-checked', habit: hard, hour: 9 })).marks).toContain('early-riser');
    expect(only(feed(withEntry('feats'), { type: 'habit-checked', habit: makeHabit({ difficulty: 'hard', isBad: true }), hour: 9 })).marks).toBeUndefined();
  });

  it('First steps marks an addition at the next rollover, if it still exists', () => {
    const good = makeHabit({ id: 'g' });
    const bad = makeHabit({ id: 'b', isBad: true });
    let c = applyTrialEvent(withEntry('first-steps'), { type: 'habit-added', habit: good }, D);
    c = applyTrialEvent(c, { type: 'habit-added', habit: bad }, D);
    c = applyTrialEvent(c, { type: 'quest-added', questId: 'q1' }, D);
    expect(only(c).pending).toHaveLength(3);
    c = dayEnd(c, [good], [quest('q1')]); // the bad habit was deleted
    expect(only(c).marks).toEqual(['good-skill', 'quest']);
    expect(only(c).pending).toBeUndefined();
  });

  it('First steps waits a day: an addition made today counts at the next rollover', () => {
    const c = dayEnd(applyTrialEvent(withEntry('first-steps'), { type: 'habit-added', habit: makeHabit() }, TODAY), [makeHabit()]);
    expect(only(c).marks).toBeUndefined();
    expect(only(c).pending).toHaveLength(1);
    expect(trialCard(only(c)).progress).toEqual({ kind: 'text', text: 'Counts at dawn' });
  });
});

describe('applyTrialEvent: Perfect days', () => {
  const doneThen = (overrides: Partial<Habit> = {}) => makeHabit({ lastCompletedPeriodKey: D, ...overrides });

  it('counts a day with every good daily due checked and no bad habit', () => {
    const habits = [doneThen({ id: 'a' }), doneThen({ id: 'b' }), makeHabit({ id: 'w', period: 'weekly' })];
    expect(only(dayEnd(withEntry('perfect-days'), habits))).toMatchObject({ count: 1, lastDayKey: D });
  });

  it('skips a missed daily, a bad check that day, or no dailies due', () => {
    expect(only(dayEnd(withEntry('perfect-days'), [doneThen({ id: 'a' }), makeHabit({ id: 'b' })])).count).toBe(0);
    expect(only(dayEnd(recordBadCheck(withEntry('perfect-days'), D), [doneThen()])).count).toBe(0);
    expect(only(dayEnd(withEntry('perfect-days'), [])).count).toBe(0);
  });

  it('ignores a habit made that day, a resting set-day habit and a frozen one', () => {
    const rest = makeHabit({ id: 'rest', days: [(dayOfWeekIndex(ENDED) + 1) % 7] });
    const habits = [doneThen({ id: 'a' }), makeHabit({ id: 'new', createdDayKey: D }), rest, makeHabit({ id: 'frozen', frozenDayKeys: [D] })];
    expect(only(dayEnd(withEntry('perfect-days'), habits)).count).toBe(1);
  });

  it('counts a day once, and never one before the set was taken', () => {
    const once = dayEnd(withEntry('perfect-days'), [doneThen()]);
    expect(dayEnd(once, [doneThen()])).toBe(once);
    expect(only(dayEnd(withEntry('perfect-days', { takenDayKey: TODAY }), [doneThen()])).count).toBe(0);
  });
});

describe('claiming', () => {
  it('pays the first rung reached and not paid, one at a time', () => {
    const c = withEntry('bosses', { count: 6 });
    expect(claimableTrials(c).map((e) => e.id)).toEqual(['bosses']);
    const first = markTrialClaimed(c, 'bosses');
    expect(first.rung).toMatchObject({ goal: 1, gems: 4, goldKills: 0.5 });
    const second = markTrialClaimed(first.character, 'bosses');
    expect(second.rung).toMatchObject({ goal: 5 });
    expect(claimableTrials(second.character)).toEqual([]);
    expect(markTrialClaimed(second.character, 'bosses')).toEqual({ character: second.character });
  });

  it('a step set pays its steps in any order', () => {
    const c = withEntry('feats', { marks: ['early-riser'] });
    expect(markTrialClaimed(c, 'feats').rung?.mark).toBe('early-riser');
  });

  it('a death keeps the sets, and a waiting rung can still be claimed once', () => {
    const dead = withEntry('bosses', { count: 1 }, { currentHealth: 0 });
    const boss = makeBoss({ index: 1, personality: 'balanced', physicalAttack: 20, magicAttack: 20, armor: 10, magicResist: 10, lifestealPct: 0 });
    const risen = resolvePlayerDeathIfDead(dead, boss, createRng(1)).character;
    expect(risen.trials).toEqual(dead.trials);
    expect(markTrialClaimed(risen, 'bosses').rung?.goal).toBe(1);
  });
});

describe('trialCard / trialCards', () => {
  it('leads with the rung being climbed, with its bar', () => {
    const card = trialCard(entry('bosses', { count: 14, claimed: [0, 1, 2] }));
    expect(card).toMatchObject({ rungNumber: 4, waiting: false, done: false, progress: { kind: 'bar', cur: 14, max: 25 } });
    expect(card.rung?.deed).toBe('Slay 25 bosses');
    expect(card.rungs.map((r) => r.state)).toEqual(['paid', 'paid', 'paid', 'ahead', 'ahead', 'ahead', 'ahead']);
  });

  it('leads with a waiting rung, and has no bar then', () => {
    const card = trialCard(entry('bosses', { count: 14, claimed: [0, 1] }));
    expect(card).toMatchObject({ rungNumber: 3, waiting: true, progress: null });
    expect(card.rungs[2].state).toBe('waiting');
  });

  it('a set with every rung paid is done', () => {
    const card = trialCard(entry('untouched', { count: 15, claimed: [0, 1, 2] }));
    expect(card).toMatchObject({ rung: null, done: true, rungNumber: 3 });
  });

  it('a marked rung not reached shows no bar', () => {
    expect(trialCard(entry('epics', { count: 15, claimed: [0, 1, 2] })).progress).toBeNull();
  });

  it('orders waiting sets first, then the rest in table order, finished sets last', () => {
    const c = makeCharacter({
      trials: [entry('crits', { count: 5 }), entry('untouched', { count: 15, claimed: [0, 1, 2] }), entry('streak'), entry('bosses')],
    });
    expect(trialCards(c).map((card) => card.def.id)).toEqual(['crits', 'bosses', 'streak', 'untouched']);
  });

  it('counts every rung reached, paid or not', () => {
    expect(reachedRungCount(makeCharacter({ trials: [entry('bosses', { count: 10, claimed: [0] }), entry('feats', { marks: ['true-kill'] })] }))).toBe(4);
  });
});
