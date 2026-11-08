// Side-quest challenges: optional in-game deeds, one per relic, taken from the
// level-up side-quest card. State lives on Character.challenges (per run), and
// everything here is pure. Progress rules arrive with applyChallengeEvent.

import { TUNING } from './constants/tuning';
import { isDueOn } from './habits';
import { availableRelics } from './items';
import { pickRandom, type Rng } from './rng';
import { dailyPeriodKey, daysBetweenDayKeys } from './time';
import type { Boss, ChallengeEntry, ChallengeId, Character, Habit, Quest } from './types';

export type { ChallengeEntry, ChallengeId, PendingAddition } from './types';

export interface ChallengeDef {
  id: ChallengeId;
  name: string;
  /** One plain line saying what to do. */
  deed: string;
  /** 1 for one-shot and state challenges; the count for counted ones. */
  goal: number;
  /** Lucide icon, kebab-case. */
  icon: string;
}

export const CHALLENGE_DEFS: readonly ChallengeDef[] = [
  { id: 'perfect-day', name: 'Perfect day', deed: 'Check off every daily skill in a day, and no bad habit.', goal: 1, icon: 'calendar-check' },
  { id: 'clean-days', name: 'Clean slate', deed: 'Go 3 days in a row without a bad habit.', goal: 3, icon: 'shield-check' },
  { id: 'resist', name: 'Hold the line', deed: 'Resist 5 bad habits.', goal: 5, icon: 'shield' },
  { id: 'early-start', name: 'Early riser', deed: 'Check off a hard skill before noon.', goal: 1, icon: 'sunrise' },
  { id: 'streak-all', name: 'Unbroken', deed: 'Every daily habit, good and bad, on a 3-day streak.', goal: 1, icon: 'flame' },
  { id: 'new-good', name: 'New discipline', deed: 'Add a good skill and keep it a day.', goal: 1, icon: 'plus' },
  { id: 'new-bad', name: 'Name the enemy', deed: 'Add a bad habit and keep it a day.', goal: 1, icon: 'skull' },
  { id: 'fresh-quests', name: 'Fresh quests', deed: 'Add 3 quests and keep them a day.', goal: 3, icon: 'scroll-text' },
  { id: 'rank-up', name: 'Rank up', deed: "Raise a skill's rank.", goal: 1, icon: 'chevrons-up' },
  { id: 'enchant', name: 'Enchanted', deed: 'Enchant an item.', goal: 1, icon: 'sparkles' },
  { id: 'epic-find', name: 'Epic find', deed: 'Find an epic item.', goal: 1, icon: 'gem' },
  { id: 'true-kill', name: 'True strike', deed: 'Kill a boss with a true damage skill.', goal: 1, icon: 'crosshair' },
  { id: 'untouched', name: 'Untouched', deed: 'Kill a boss that never hurt you.', goal: 1, icon: 'swords' },
  { id: 'crit-kill', name: 'Killing crit', deed: 'Kill a boss with a critical hit.', goal: 1, icon: 'zap' },
  { id: 'quest-run', name: 'Quest run', deed: 'Complete 3 quests on time.', goal: 3, icon: 'list-checks' },
  { id: 'slay-two', name: 'Twice slain', deed: 'Slay 2 bosses.', goal: 2, icon: 'trophy' },
  { id: 'land-crits', name: 'Crit streak', deed: 'Land 5 critical hits.', goal: 5, icon: 'target' },
];

export function getChallengeDef(id: ChallengeId): ChallengeDef {
  const def = CHALLENGE_DEFS.find((d) => d.id === id);
  if (!def) throw new Error(`Unknown challenge: ${id}`);
  return def;
}

/** Challenges not active or finished this run. */
export function offerableChallenges(character: Character): ChallengeDef[] {
  const held = (character.challenges ?? []).map((e) => e.id);
  return CHALLENGE_DEFS.filter((d) => !held.includes(d.id));
}

/** A random offerable challenge, or null when none is left. */
export function drawChallenge(character: Character, rng: Rng): ChallengeId | null {
  const offerable = offerableChallenges(character);
  return offerable.length > 0 ? pickRandom(offerable, rng).id : null;
}

/**
 * Takes a challenge, reserving a random available relic for it and clearing
 * the offer. The same character back if it is already held or no relic is left.
 */
export function takeChallenge(character: Character, id: ChallengeId, rng: Rng, todayKey: string): Character {
  if ((character.challenges ?? []).some((e) => e.id === id)) return character;
  const relics = availableRelics(character);
  if (relics.length === 0) return character;
  const entry: ChallengeEntry = { id, relicId: pickRandom(relics, rng).id, takenDayKey: todayKey, progress: 0 };
  return { ...character, challenges: [...(character.challenges ?? []), entry], offeredChallengeId: undefined };
}

/** The player level at which the Trials section opens, each run. */
export const TRIALS_UNLOCK_LEVEL = 4;

/** The trial handed over when Trials open, so the tab never opens empty. */
export const FIRST_TRIAL: ChallengeId = 'new-good';

/** Slaying one of these bosses hands over a free trial (see milestoneTrial). */
export const TRIAL_MILESTONE_BOSSES: readonly number[] = [5, 10];

/** A milestone trial is only handed over while fewer than this many trials are active. */
export const MILESTONE_ACTIVE_CAP = 2;

/** Whether the Trials section is open: unlocked this run, or at the unlock level with its popup up. */
export function trialsOpen(character: Character): boolean {
  return character.trialsUnlocked === true || character.level >= TRIALS_UNLOCK_LEVEL;
}

/** Whether the "Trials unlocked" popup is due: the unlock level reached this run and the section not yet opened. */
export function trialUnlockPending(character: Character): boolean {
  return !character.trialsUnlocked && character.level >= TRIALS_UNLOCK_LEVEL;
}

/**
 * Opens the Trials section for the rest of the run and hands over the first
 * trial. The same character back if it is already open.
 */
export function unlockTrials(character: Character, rng: Rng, todayKey: string): Character {
  if (character.trialsUnlocked) return character;
  return takeChallenge({ ...character, trialsUnlocked: true }, FIRST_TRIAL, rng, todayKey);
}

/**
 * Settles `trialsUnlocked` on a save from before the trial lock: a hero
 * already at the unlock level, or holding a trial, was already using them, so
 * they stay open with no popup. Anyone else is sealed like any new run.
 */
export function migrateTrialUnlock(character: Character): Character {
  if (character.trialsUnlocked !== undefined) return character;
  const holds = (character.challenges ?? []).length > 0;
  return { ...character, trialsUnlocked: character.level >= TRIALS_UNLOCK_LEVEL || holds };
}

/**
 * A free trial for slaying boss `bossIndex`, if it is a milestone boss, Trials
 * are open, fewer than MILESTONE_ACTIVE_CAP trials are active, and one is left
 * to draw. The same character back otherwise.
 */
export function milestoneTrial(character: Character, bossIndex: number, rng: Rng, todayKey: string): Character {
  if (!TRIAL_MILESTONE_BOSSES.includes(bossIndex)) return character;
  if (!trialsOpen(character) || activeChallenges(character).length >= MILESTONE_ACTIVE_CAP) return character;
  const id = drawChallenge(character, rng);
  return id === null ? character : takeChallenge(character, id, rng, todayKey);
}

export function activeChallenges(character: Character): ChallengeEntry[] {
  return (character.challenges ?? []).filter((e) => !e.doneDayKey);
}

export function doneChallenges(character: Character): ChallengeEntry[] {
  return (character.challenges ?? []).filter((e) => e.doneDayKey);
}

/** Finished challenges whose reward waits for the player to claim it. */
export function claimableChallenges(character: Character): ChallengeEntry[] {
  return (character.challenges ?? []).filter((e) => e.unclaimed);
}

/** Marks a finished challenge claimed. The same character back if it is not waiting to be claimed. */
export function markChallengeClaimed(character: Character, id: ChallengeId): Character {
  const entries = character.challenges ?? [];
  if (!entries.some((e) => e.id === id && e.unclaimed)) return character;
  const claimed = entries.map((e) => {
    if (e.id !== id) return e;
    const paid = { ...e };
    delete paid.unclaimed;
    return paid;
  });
  return { ...character, challenges: claimed };
}

const C = TUNING.CHALLENGES;

/** Something that happened in play that a challenge may care about. */
export type ChallengeEvent =
  | { type: 'habit-checked'; habit: Habit; hour: number } // a live good-habit tap; hour is the local hour 0-23
  | { type: 'bad-resisted' } // a bad habit left unchecked through its period
  | { type: 'crit-landed' }
  | { type: 'rank-up' }
  | { type: 'enchanted' }
  | { type: 'epic-dropped' }
  | { type: 'boss-defeated'; boss: Boss; byTrueSkill: boolean; byCrit: boolean } // boss = the slain boss
  | { type: 'habit-added'; habit: Habit }
  | { type: 'quest-added'; questId: string }
  | { type: 'quest-completed'; createdDayKey?: string } // an on-time completion
  | { type: 'state-changed'; habits: Habit[] } // evaluates Unbroken
  | { type: 'day-end'; endedDate: Date; habits: Habit[]; quests: Quest[] };

interface Ctx {
  character: Character;
  todayKey: string;
}

type Handler = (entry: ChallengeEntry, event: ChallengeEvent, ctx: Ctx) => ChallengeEntry;

/** +1 progress each time `type` happens. */
const counts =
  (type: ChallengeEvent['type']): Handler =>
  (entry, event) =>
    event.type === type ? { ...entry, progress: entry.progress + 1 } : entry;

/** Completes at once when `when` holds for the event. */
const completesWhen =
  (when: (event: ChallengeEvent) => boolean): Handler =>
  (entry, event) =>
    when(event) ? { ...entry, progress: 1 } : entry;

const dailies = (habits: Habit[]) => habits.filter((h) => h.period === 'daily');

function allDailiesStreaking(habits: Habit[]): boolean {
  const daily = dailies(habits);
  return daily.length > 0 && daily.every((h) => h.streakCount >= C.STREAK_EVERYTHING_MIN);
}

/**
 * Additions (a new habit or quest) wait in `pending` and count at the next
 * day rollover, and only if they still exist then — so add-then-delete can't
 * farm them. `addedId` picks the id a matching add event queues; `liveIds`
 * lists what exists at the day-end.
 */
function additionsCountAtRollover(
  addedId: (event: ChallengeEvent) => string | undefined,
  liveIds: (event: Extract<ChallengeEvent, { type: 'day-end' }>) => string[],
): Handler {
  return (entry, event, { todayKey }) => {
    const added = addedId(event);
    if (added !== undefined) {
      if (entry.pending?.some((p) => p.id === added)) return entry;
      return { ...entry, pending: [...(entry.pending ?? []), { id: added, dayKey: todayKey }] };
    }
    if (event.type !== 'day-end' || !entry.pending?.length) return entry;
    const live = liveIds(event);
    const waiting = entry.pending.filter((p) => live.includes(p.id));
    const counted = waiting.filter((p) => p.dayKey < todayKey).length;
    const rest = waiting.filter((p) => p.dayKey >= todayKey);
    return { ...entry, progress: entry.progress + counted, pending: rest.length > 0 ? rest : undefined };
  };
}

/**
 * Runs a day-end check once per ended day `D`, never for a day before the
 * challenge was taken and never twice. `check` returns the new progress.
 */
function onDayEnd(check: (entry: ChallengeEntry, day: string, ctx: Ctx, event: Extract<ChallengeEvent, { type: 'day-end' }>) => number): Handler {
  return (entry, event, ctx) => {
    if (event.type !== 'day-end') return entry;
    const day = dailyPeriodKey(event.endedDate);
    if (day < entry.takenDayKey) return entry;
    if (entry.lastDayKey !== undefined && entry.lastDayKey >= day) return entry;
    return { ...entry, progress: check(entry, day, ctx, event), lastDayKey: day };
  };
}

const HANDLERS: Record<ChallengeId, Handler> = {
  'perfect-day': onDayEnd((entry, day, { character }, event) => {
    const due = dailies(event.habits).filter(
      (h) => !h.isBad && isDueOn(h, event.endedDate) && !(h.createdDayKey !== undefined && h.createdDayKey >= day),
    );
    const perfect = due.length > 0 && due.every((h) => h.lastCompletedPeriodKey === day) && character.lastBadCheckDayKey !== day;
    return perfect ? 1 : entry.progress;
  }),
  'clean-days': onDayEnd((entry, day, { character }) => {
    // A gap of days is not backfilled and carries no protection: the run starts over.
    const gap = entry.lastDayKey !== undefined && daysBetweenDayKeys(entry.lastDayKey, day) > 1;
    const run = gap ? 0 : entry.progress;
    return character.lastBadCheckDayKey === day ? 0 : run + 1;
  }),
  resist: counts('bad-resisted'),
  'early-start': completesWhen(
    (e) => e.type === 'habit-checked' && e.habit.difficulty === 'hard' && !e.habit.isBad && e.hour < C.EARLY_START_HOUR,
  ),
  'streak-all': (entry, event) => (event.type === 'state-changed' && allDailiesStreaking(event.habits) ? { ...entry, progress: 1 } : entry),
  'new-good': additionsCountAtRollover(
    (e) => (e.type === 'habit-added' && !e.habit.isBad ? e.habit.id : undefined),
    (e) => e.habits.map((h) => h.id),
  ),
  'new-bad': additionsCountAtRollover(
    (e) => (e.type === 'habit-added' && e.habit.isBad ? e.habit.id : undefined),
    (e) => e.habits.map((h) => h.id),
  ),
  'fresh-quests': additionsCountAtRollover(
    (e) => (e.type === 'quest-added' ? e.questId : undefined),
    (e) => e.quests.map((q) => q.id),
  ),
  'rank-up': completesWhen((e) => e.type === 'rank-up'),
  enchant: completesWhen((e) => e.type === 'enchanted'),
  'epic-find': completesWhen((e) => e.type === 'epic-dropped'),
  'true-kill': completesWhen((e) => e.type === 'boss-defeated' && e.byTrueSkill),
  untouched: completesWhen((e) => e.type === 'boss-defeated' && !e.boss.hurtPlayer),
  'crit-kill': completesWhen((e) => e.type === 'boss-defeated' && e.byCrit),
  'quest-run': (entry, event, { todayKey }) =>
    event.type === 'quest-completed' && (event.createdDayKey === undefined || event.createdDayKey < todayKey)
      ? { ...entry, progress: entry.progress + 1 }
      : entry,
  'slay-two': counts('boss-defeated'),
  'land-crits': counts('crit-landed'),
};

/**
 * Feeds one event to every active challenge. A finished one gets
 * `doneDayKey: todayKey` and `unclaimed`, and is returned in `completed`; its
 * reward is paid when the player claims it. The same character back when
 * nothing changed.
 */
export function applyChallengeEvent(
  character: Character,
  event: ChallengeEvent,
  todayKey: string,
): { character: Character; completed: ChallengeEntry[] } {
  const entries = character.challenges;
  if (!entries || entries.length === 0) return { character, completed: [] };
  const ctx: Ctx = { character, todayKey };
  const completed: ChallengeEntry[] = [];
  const next = entries.map((entry) => {
    if (entry.doneDayKey) return entry;
    const updated = HANDLERS[entry.id](entry, event, ctx);
    if (updated === entry) return entry;
    const goal = getChallengeDef(entry.id).goal;
    if (updated.progress < goal) return updated;
    const done: ChallengeEntry = { ...updated, progress: goal, doneDayKey: todayKey, unclaimed: true };
    completed.push(done);
    return done;
  });
  if (next.every((entry, i) => entry === entries[i])) return { character, completed: [] };
  return { character: { ...character, challenges: next }, completed };
}

/** Notes that a bad habit was checked off on `dayKey` (Perfect day and Clean slate read it at the day's end). */
export function recordBadCheck(character: Character, dayKey: string): Character {
  return character.lastBadCheckDayKey === dayKey ? character : { ...character, lastBadCheckDayKey: dayKey };
}

export type ChallengeProgress = { kind: 'bar'; cur: number; max: number } | { kind: 'text'; text: string };

/** What a challenge card shows under its deed: a bar for counted ones (and the live tallies of Perfect day and Unbroken, which can fall), a short line for the rest. */
export function challengeProgress(entry: ChallengeEntry, ctx: { habits: Habit[]; boss: Boss; todayDate: Date }): ChallengeProgress {
  const def = getChallengeDef(entry.id);
  if (def.goal > 1) {
    // Fresh quests can show its additions still waiting for the rollover.
    const waiting = entry.id === 'fresh-quests' ? (entry.pending?.length ?? 0) : 0;
    return { kind: 'bar', cur: Math.min(def.goal, entry.progress + waiting), max: def.goal };
  }
  const today = dailyPeriodKey(ctx.todayDate);
  switch (entry.id) {
    case 'perfect-day': {
      const due = dailies(ctx.habits).filter(
        (h) => !h.isBad && isDueOn(h, ctx.todayDate) && !(h.createdDayKey !== undefined && h.createdDayKey >= today),
      );
      const done = due.filter((h) => h.lastCompletedPeriodKey === today).length;
      return due.length === 0 ? { kind: 'text', text: 'Nothing due today' } : { kind: 'bar', cur: done, max: due.length };
    }
    case 'streak-all': {
      const daily = dailies(ctx.habits);
      if (daily.length === 0) return { kind: 'text', text: 'No daily skills' };
      const streaking = daily.filter((h) => h.streakCount >= C.STREAK_EVERYTHING_MIN).length;
      return { kind: 'bar', cur: streaking, max: daily.length };
    }
    case 'untouched':
      return { kind: 'text', text: `Boss ${ctx.boss.index} · ${ctx.boss.hurtPlayer ? 'struck' : 'untouched so far'}` };
    case 'new-good':
    case 'new-bad':
      return { kind: 'text', text: entry.pending?.length ? 'Counts at dawn' : 'Not yet' };
    default:
      return { kind: 'text', text: 'Not yet' };
  }
}
