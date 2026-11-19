// The player profiles: each habit's chance of being done on a day, spread over
// a 10-habit list (the same profiles as scripts/balance-sim.mjs, plus bad).
// With fewer habits each takes the profile's value at its share of the list.

export const PROFILES = {
  good: [0.98, 0.98, 0.97, 0.95, 0.95, 0.93, 0.92, 0.9, 0.88, 0.85],
  decent: [0.97, 0.97, 0.95, 0.88, 0.88, 0.85, 0.85, 0.75, 0.7, 0.7],
  sloppy: [0.85, 0.8, 0.75, 0.7, 0.65, 0.65, 0.6, 0.55, 0.5, 0.45],
  bad: [0.7, 0.65, 0.6, 0.55, 0.5, 0.5, 0.45, 0.4, 0.35, 0.3],
} as const;

export type PlayerKind = keyof typeof PROFILES;

/** Habit `j` of `count`'s chance of being done on a day. */
export function doneChance(kind: PlayerKind, j: number, count: number): number {
  const probs = PROFILES[kind];
  return probs[count <= probs.length ? Math.floor((j * probs.length) / count) : j % probs.length];
}

/** The share of habits the player misses on an average day: how often a bad habit is given in. */
export function missRate(kind: PlayerKind): number {
  const probs = PROFILES[kind];
  return 1 - probs.reduce((sum, p) => sum + p, 0) / probs.length;
}
