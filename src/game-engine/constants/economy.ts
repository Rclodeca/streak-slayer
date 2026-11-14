// Every gold and gem number in one place. Numbers are placeholders until
// playtested; the spec's budget rule is pinned in economy.spec.ts.

/** Gold a boss pays when slain: rises with the boss's place in the run. */
export function bossGold(bossIndex: number): number {
  return Math.round(40 + 10 * bossIndex);
}

/** Cost of the `n`th talent rank bought overall (1-based). Gold is the bulk; gems are the key that kicks in from rank 4. */
export function TALENT_COST(n: number): { gold: number; gems: number } {
  const gold = Math.min(2000, n <= 5 ? 100 * n : 500 + 25 * (n - 5));
  const gems = n <= 3 ? 0 : n <= 24 ? 1 : n <= 60 ? 2 : 3;
  return { gold, gems };
}

/** Gems paid once per account on first reaching each level. */
export const LEVEL_GEM_MILESTONES: readonly { level: number; gems: number }[] = [
  { level: 5, gems: 2 },
  { level: 10, gems: 3 },
  { level: 15, gems: 4 },
  { level: 20, gems: 5 },
  { level: 25, gems: 6 },
  { level: 30, gems: 7 },
  { level: 35, gems: 8 },
  { level: 40, gems: 9 },
  { level: 45, gems: 10 },
  { level: 50, gems: 10 },
];

/** Every free gem an account can earn. `trials` and `dungeonFirstClears` are placeholders until milestones B and F. */
export const FREE_GEM_SOURCES = {
  levels: LEVEL_GEM_MILESTONES.reduce((sum, m) => sum + m.gems, 0),
  trials: 210,
  dungeonFirstClears: 0,
};

/** Gem prices beyond the tree that the free budget must also cover (placeholders until D and E). */
export const PLANNED_GEM_SINKS = { skin: 40, revive: 10 };
