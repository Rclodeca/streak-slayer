// Trials: 12 sets of rungs that pay gems (and a little gold early on), every
// one live from level 1 (docs/superpowers/specs/2026-11-18-trial-sets-design.md).
// State lives on Character.trials, one entry per set, seeded by seedTrials and
// kept through death and prestige, so each rung is reached and paid once per
// account. Everything here is pure; the sets themselves are in constants/trials.ts.

import { TRIAL_SETS } from './constants/trials';
import type { TrialMark, TrialRung, TrialSetDef, TrialSetId } from './constants/trials';
import { TUNING } from './constants/tuning';
import { isDueOn } from './habits';
import { ITEM_CATALOG } from './items';
import type { ItemRarity } from './items';
import { dailyPeriodKey } from './time';
import type { Boss, ChallengeEntry, ChallengeId, Character, Habit, PendingAddition, Quest, TrialEntry } from './types';

export { TRIAL_SETS } from './constants/trials';
export type { TrialMark, TrialRung, TrialSetDef, TrialSetId } from './constants/trials';
export type { TrialEntry } from './types';

export function getTrialSet(id: TrialSetId): TrialSetDef {
  const def = TRIAL_SETS.find((d) => d.id === id);
  if (!def) throw new Error(`Unknown trial set: ${id}`);
  return def;
}

function reached(rung: TrialRung, entry: TrialEntry): boolean {
  if (rung.goal !== undefined) return entry.count >= rung.goal;
  return rung.mark !== undefined && (entry.marks ?? []).includes(rung.mark);
}

/** The first rung reached and not yet paid, or -1. A card's Claim pays this one. */
export function waitingRung(entry: TrialEntry): number {
  const { rungs } = getTrialSet(entry.id);
  return rungs.findIndex((rung, i) => !(entry.claimed ?? []).includes(i) && reached(rung, entry));
}

/** The first rung not yet paid, or -1 once the set is done. */
export function openRung(entry: TrialEntry): number {
  const { rungs } = getTrialSet(entry.id);
  return rungs.findIndex((_, i) => !(entry.claimed ?? []).includes(i));
}

/** Every rung reached across the sets, paid or not (Undo isn't offered for a check that reaches one). */
export function reachedRungCount(character: Character): number {
  return (character.trials ?? []).reduce((sum, entry) => sum + getTrialSet(entry.id).rungs.filter((rung) => reached(rung, entry)).length, 0);
}

/** Sets with a rung waiting to be claimed: the count on the Trials button. */
export function claimableTrials(character: Character): TrialEntry[] {
  return (character.trials ?? []).filter((entry) => waitingRung(entry) >= 0);
}

/**
 * Pays set `id`'s waiting rung: marks it claimed and returns it. The same
 * character back (and no rung) when nothing waits.
 */
export function markTrialClaimed(character: Character, id: TrialSetId): { character: Character; rung?: TrialRung } {
  const entries = character.trials ?? [];
  const entry = entries.find((e) => e.id === id);
  const index = entry ? waitingRung(entry) : -1;
  if (!entry || index < 0) return { character };
  const paid = { ...entry, claimed: [...(entry.claimed ?? []), index] };
  return { character: { ...character, trials: entries.map((e) => (e === entry ? paid : e)) }, rung: getTrialSet(id).rungs[index] };
}

// ---------- Seeding, and an old save's one-off trials ----------

/** What a load can tell about the account so far, for sets a save doesn't hold yet. */
export interface TrialFloors {
  /** Bosses beaten this climb (the boss up now, less one). */
  bossesBeaten: number;
  habits: Habit[];
}

const goodDailies = (habits: Habit[]) => habits.filter((h) => h.period === 'daily' && !h.isBad);
const bestDailyStreak = (habits: Habit[]) => Math.max(0, ...goodDailies(habits).map((h) => h.streakCount));
const ownsRelic = (character: Character) =>
  character.ownedItemIds.some((id) => ITEM_CATALOG.find((item) => item.id === id)?.rarity === 'relic');

/** Where each old one-off trial lands: a count it proves, or a mark. Clean slate and Unbroken have no set. */
const LEGACY_CREDIT: Record<ChallengeId, { set: TrialSetId; count?: number; mark?: TrialMark } | null> = {
  'perfect-day': { set: 'perfect-days', count: 1 },
  'clean-days': null,
  resist: { set: 'resisted', count: 5 },
  'early-start': { set: 'feats', mark: 'early-riser' },
  'streak-all': null,
  'new-good': { set: 'first-steps', mark: 'good-skill' },
  'new-bad': { set: 'first-steps', mark: 'bad-habit' },
  'fresh-quests': { set: 'first-steps', mark: 'quest' },
  'rank-up': { set: 'ranks', count: 1 },
  enchant: { set: 'enchants', count: 1 },
  'epic-find': { set: 'epics', count: 1 },
  'true-kill': { set: 'feats', mark: 'true-kill' },
  untouched: { set: 'untouched', count: 1 },
  'crit-kill': { set: 'feats', mark: 'crit-kill' },
  'quest-run': { set: 'quests', count: 3 },
  'slay-two': { set: 'bosses', count: 2 },
  'land-crits': { set: 'crits', count: 5 },
};

/** Credits one old trial to its set's entry: what it proved, and, if it was paid, the rungs that proof covers as paid too. */
function creditLegacy(entry: TrialEntry, old: ChallengeEntry): TrialEntry {
  const credit = LEGACY_CREDIT[old.id];
  if (!credit || credit.set !== entry.id) return entry;
  const finished = !!old.doneDayKey;
  const paid = finished && !old.unclaimed;
  const { rungs } = getTrialSet(entry.id);
  let next = entry;
  if (credit.mark) {
    // Fresh quests proves a quest was kept as soon as one counted.
    if (!finished && !(old.id === 'fresh-quests' && old.progress > 0)) return entry;
    next = { ...next, marks: [...new Set([...(next.marks ?? []), credit.mark])] };
    if (paid) next = { ...next, claimed: [...(next.claimed ?? []), rungs.findIndex((r) => r.mark === credit.mark)] };
    return next;
  }
  const proved = finished ? (credit.count ?? 0) : old.progress;
  next = { ...next, count: Math.max(next.count, proved) };
  if (paid) {
    const covered = rungs.flatMap((r, i) => (r.goal !== undefined && r.goal <= proved ? [i] : []));
    next = { ...next, claimed: [...new Set([...(next.claimed ?? []), ...covered])] };
  }
  return next;
}

/** A set's entry as a load first gives it: counts from what the save shows, and an old save's one-off trials credited. */
function freshEntry(def: TrialSetDef, character: Character, todayKey: string, floors: TrialFloors): TrialEntry {
  const count = def.id === 'bosses' ? floors.bossesBeaten : def.id === 'streak' ? bestDailyStreak(floors.habits) : 0;
  let entry: TrialEntry = { id: def.id, takenDayKey: todayKey, count };
  if (def.id === 'epics' && ownsRelic(character)) entry = { ...entry, marks: ['relic'] };
  for (const old of character.challenges ?? []) entry = creditLegacy(entry, old);
  return entry;
}

/**
 * Gives the character every trial set it doesn't hold yet, starting
 * `todayKey`, and drops an old save's one-off trials once they're credited
 * (seedTrials' freshEntry). Sets already held are untouched. The same
 * character back when there's nothing to do.
 */
export function seedTrials(character: Character, todayKey: string, floors: TrialFloors): Character {
  const held = character.trials ?? [];
  const missing = TRIAL_SETS.filter((def) => !held.some((entry) => entry.id === def.id));
  if (missing.length === 0 && character.challenges === undefined) return character;
  const seeded: Character = { ...character, trials: [...held, ...missing.map((def) => freshEntry(def, character, todayKey, floors))] };
  delete seeded.challenges;
  return seeded;
}

// ---------- Counting ----------

const C = TUNING.TRIALS;

/** Something that happened in play that a trial may care about. */
export type TrialEvent =
  | { type: 'habit-checked'; habit: Habit; hour: number } // a live good-habit tap; hour is the local hour 0-23
  | { type: 'bad-resisted' } // a bad habit left unchecked through its period
  | { type: 'crit-landed' }
  | { type: 'rank-up' }
  | { type: 'enchanted' }
  | { type: 'items-found'; rarities: ItemRarity[] } // a boss's drops
  | { type: 'boss-defeated'; boss: Boss; byTrueSkill: boolean; byCrit: boolean } // boss = the slain boss
  | { type: 'habit-added'; habit: Habit }
  | { type: 'quest-added'; questId: string }
  | { type: 'quest-completed'; createdDayKey?: string } // an on-time completion
  | { type: 'state-changed'; habits: Habit[] } // Longest streak reads the habits
  | { type: 'day-end'; endedDate: Date; habits: Habit[]; quests: Quest[] };

interface Ctx {
  character: Character;
  todayKey: string;
}

type Handler = (entry: TrialEntry, event: TrialEvent, ctx: Ctx) => TrialEntry;

const add = (entry: TrialEntry, n = 1): TrialEntry => (n > 0 ? { ...entry, count: entry.count + n } : entry);

const withMark = (entry: TrialEntry, mark: TrialMark): TrialEntry =>
  (entry.marks ?? []).includes(mark) ? entry : { ...entry, marks: [...(entry.marks ?? []), mark] };

/** +1 each time `type` happens. */
const counts =
  (type: TrialEvent['type']): Handler =>
  (entry, event) =>
    event.type === type ? add(entry) : entry;

/** First steps: an addition waits in `pending` and marks its step at the next rollover, if it still exists then, so add-then-delete can't farm it. */
const firstSteps: Handler = (entry, event, { todayKey }) => {
  const queue = (id: string, mark: TrialMark): TrialEntry => {
    if ((entry.marks ?? []).includes(mark) || entry.pending?.some((p) => p.id === id)) return entry;
    return { ...entry, pending: [...(entry.pending ?? []), { id, dayKey: todayKey, mark }] };
  };
  if (event.type === 'habit-added') return queue(event.habit.id, event.habit.isBad ? 'bad-habit' : 'good-skill');
  if (event.type === 'quest-added') return queue(event.questId, 'quest');
  if (event.type !== 'day-end' || !entry.pending?.length) return entry;
  const live = [...event.habits.map((h) => h.id), ...event.quests.map((q) => q.id)];
  const waiting = entry.pending.filter((p) => live.includes(p.id));
  const kept = waiting.filter((p) => p.dayKey < todayKey);
  const rest: PendingAddition[] = waiting.filter((p) => p.dayKey >= todayKey);
  let next: TrialEntry = { ...entry, pending: rest.length > 0 ? rest : undefined };
  for (const p of kept) if (p.mark) next = withMark(next, p.mark);
  return next;
};

/** Perfect days: once per ended day, every due daily skill checked and no bad habit. */
const perfectDays: Handler = (entry, event, { character }) => {
  if (event.type !== 'day-end') return entry;
  const day = dailyPeriodKey(event.endedDate);
  if (day < entry.takenDayKey || (entry.lastDayKey !== undefined && entry.lastDayKey >= day)) return entry;
  const due = goodDailies(event.habits).filter((h) => isDueOn(h, event.endedDate) && !(h.createdDayKey !== undefined && h.createdDayKey >= day));
  const perfect = due.length > 0 && due.every((h) => h.lastCompletedPeriodKey === day) && character.lastBadCheckDayKey !== day;
  return { ...add(entry, perfect ? 1 : 0), lastDayKey: day };
};

const HANDLERS: Record<TrialSetId, Handler> = {
  'first-steps': firstSteps,
  bosses: counts('boss-defeated'),
  streak: (entry, event) => {
    if (event.type !== 'state-changed') return entry;
    const best = bestDailyStreak(event.habits);
    return best > entry.count ? { ...entry, count: best } : entry;
  },
  'perfect-days': perfectDays,
  quests: (entry, event, { todayKey }) =>
    event.type === 'quest-completed' && (event.createdDayKey === undefined || event.createdDayKey < todayKey) ? add(entry) : entry,
  resisted: counts('bad-resisted'),
  crits: counts('crit-landed'),
  enchants: counts('enchanted'),
  ranks: counts('rank-up'),
  // Relics don't drop, so the relic rung counts one owned from anywhere (today, the shop), checked on every event.
  epics: (entry, event, { character }) => {
    const found = event.type === 'items-found' ? add(entry, event.rarities.filter((r) => r === 'epic').length) : entry;
    return ownsRelic(character) ? withMark(found, 'relic') : found;
  },
  untouched: (entry, event) => (event.type === 'boss-defeated' && !event.boss.hurtPlayer ? add(entry) : entry),
  feats: (entry, event) => {
    if (event.type === 'boss-defeated') {
      const critted = event.byCrit ? withMark(entry, 'crit-kill') : entry;
      return event.byTrueSkill ? withMark(critted, 'true-kill') : critted;
    }
    if (event.type === 'habit-checked' && event.habit.difficulty === 'hard' && !event.habit.isBad && event.hour < C.EARLY_START_HOUR) {
      return withMark(entry, 'early-riser');
    }
    return entry;
  },
};

/** Feeds one event to every set. A reached rung waits for the player to claim it. The same character back when nothing changed. */
export function applyTrialEvent(character: Character, event: TrialEvent, todayKey: string): Character {
  const entries = character.trials;
  if (!entries || entries.length === 0) return character;
  const ctx: Ctx = { character, todayKey };
  const next = entries.map((entry) => HANDLERS[entry.id](entry, event, ctx));
  if (next.every((entry, i) => entry === entries[i])) return character;
  return { ...character, trials: next };
}

/** Notes that a bad habit was checked off on `dayKey` (Perfect days reads it at the day's end). */
export function recordBadCheck(character: Character, dayKey: string): Character {
  return character.lastBadCheckDayKey === dayKey ? character : { ...character, lastBadCheckDayKey: dayKey };
}

// ---------- What a card shows ----------

export type TrialRungState = 'paid' | 'waiting' | 'ahead';

export interface TrialCard {
  def: TrialSetDef;
  entry: TrialEntry;
  /** The rung the card leads with: the one waiting, else the one being climbed; null once all are paid. */
  rung: TrialRung | null;
  /** That rung's place, 1-based (for "Rung 3 of 7"); the set's length once done. */
  rungNumber: number;
  waiting: boolean;
  done: boolean;
  /** Under a counted rung being climbed: its bar. A marked one shows a short line. */
  progress: { kind: 'bar'; cur: number; max: number } | { kind: 'text'; text: string } | null;
  rungs: { rung: TrialRung; state: TrialRungState }[];
}

export function trialCard(entry: TrialEntry): TrialCard {
  const def = getTrialSet(entry.id);
  const waitingAt = waitingRung(entry);
  const openAt = openRung(entry);
  const at = waitingAt >= 0 ? waitingAt : openAt;
  const rung = at >= 0 ? def.rungs[at] : null;
  const rungs = def.rungs.map((r, i) => ({
    rung: r,
    state: ((entry.claimed ?? []).includes(i) ? 'paid' : reached(r, entry) ? 'waiting' : 'ahead') as TrialRungState,
  }));
  let progress: TrialCard['progress'] = null;
  if (rung && waitingAt < 0) {
    if (rung.goal !== undefined) progress = { kind: 'bar', cur: Math.min(entry.count, rung.goal), max: rung.goal };
    else if (entry.pending?.some((p) => p.mark === rung.mark)) progress = { kind: 'text', text: 'Counts at dawn' };
  }
  return { def, entry, rung, rungNumber: at >= 0 ? at + 1 : def.rungs.length, waiting: waitingAt >= 0, done: openAt < 0, progress, rungs };
}

/** Every set's card in the list's order: a rung waiting first, then the rest in table order, finished sets last. */
export function trialCards(character: Character): TrialCard[] {
  const order = new Map(TRIAL_SETS.map((def, i) => [def.id, i]));
  const cards = (character.trials ?? []).map(trialCard).sort((a, b) => (order.get(a.def.id) ?? 0) - (order.get(b.def.id) ?? 0));
  return [...cards.filter((c) => c.waiting), ...cards.filter((c) => !c.waiting && !c.done), ...cards.filter((c) => c.done)];
}
