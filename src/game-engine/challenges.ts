// Side-quest challenges: optional in-game deeds, one per relic, taken from the
// level-up side-quest card. State lives on Character.challenges (per run), and
// everything here is pure. Progress rules arrive with applyChallengeEvent.

import { availableRelics } from './items';
import { pickRandom, type Rng } from './rng';
import type { ChallengeEntry, ChallengeId, Character } from './types';

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
  { id: 'streak-all', name: 'Unbroken', deed: 'Every daily skill on a 3-day streak at once.', goal: 1, icon: 'flame' },
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

export function activeChallenges(character: Character): ChallengeEntry[] {
  return (character.challenges ?? []).filter((e) => !e.doneDayKey);
}

export function doneChallenges(character: Character): ChallengeEntry[] {
  return (character.challenges ?? []).filter((e) => e.doneDayKey);
}
