// The trial sets: 12 ladders of rungs, 275 gems and 4 boss kills of gold in
// all (docs/superpowers/specs/2026-11-18-trial-sets-design.md §2). Every rung
// pays at least what the one before it did; where gold stops, gems rise. The
// budget and that rule are pinned in economy.spec.ts. The counting lives in
// trials.ts.

export type TrialSetId =
  | 'first-steps'
  | 'bosses'
  | 'streak'
  | 'perfect-days'
  | 'quests'
  | 'resisted'
  | 'crits'
  | 'enchants'
  | 'ranks'
  | 'epics'
  | 'untouched'
  | 'feats';

/** A step a set marks rather than counts: the step sets' deeds, and Epic finds' relic. */
export type TrialMark = 'good-skill' | 'bad-habit' | 'quest' | 'crit-kill' | 'true-kill' | 'early-riser' | 'relic';

export interface TrialRung {
  /** One plain line saying what to do. */
  deed: string;
  gems: number;
  /** Boss kills' worth of gold, read at the current boss and prestige when claimed (goldPrice). */
  goldKills?: number;
  /** A counted rung: reached when the set's count gets here. */
  goal?: number;
  /** A marked rung: reached when the set holds this mark. */
  mark?: TrialMark;
}

export interface TrialSetDef {
  id: TrialSetId;
  name: string;
  /** Lucide icon, kebab-case. */
  icon: string;
  rungs: readonly TrialRung[];
}

const counted = (deed: (n: number) => string, rungs: [goal: number, gems: number, goldKills?: number][]): TrialRung[] =>
  rungs.map(([goal, gems, goldKills]) => ({ deed: deed(goal), gems, goal, ...(goldKills !== undefined && { goldKills }) }));

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const TRIAL_SETS: readonly TrialSetDef[] = [
  {
    id: 'first-steps',
    name: 'First steps',
    icon: 'footprints',
    rungs: [
      { deed: 'Add a good skill and keep it a day', gems: 4, goldKills: 0.5, mark: 'good-skill' },
      { deed: 'Add a bad habit and keep it a day', gems: 4, goldKills: 0.5, mark: 'bad-habit' },
      { deed: 'Add a quest and keep it a day', gems: 4, goldKills: 0.5, mark: 'quest' },
    ],
  },
  {
    id: 'bosses',
    name: 'Bosses slain',
    icon: 'trophy',
    rungs: counted((n) => plural(n, 'Slay a boss', `Slay ${n} bosses`), [
      [1, 4, 0.5],
      [5, 4, 0.5],
      [10, 5, 0.5],
      [25, 6, 1],
      [50, 7],
      [100, 7],
      [250, 8],
    ]),
  },
  {
    id: 'streak',
    name: 'Longest streak',
    icon: 'flame',
    rungs: counted((n) => `Keep a daily skill on a ${n}-day streak`, [
      [3, 4],
      [7, 4],
      [14, 6],
      [30, 6],
      [60, 7],
      [100, 8],
    ]),
  },
  {
    id: 'perfect-days',
    name: 'Perfect days',
    icon: 'calendar-check',
    rungs: counted((n) => plural(n, 'Check off every daily skill in a day, and no bad habit', `Have ${n} perfect days`), [
      [1, 4],
      [3, 4],
      [7, 6],
      [15, 6],
      [30, 7],
    ]),
  },
  {
    id: 'quests',
    name: 'Quests completed',
    icon: 'list-checks',
    rungs: counted((n) => plural(n, 'Complete a quest on time', `Complete ${n} quests on time`), [
      [1, 4],
      [3, 4],
      [10, 6],
      [25, 7],
    ]),
  },
  {
    id: 'resisted',
    name: 'Bad habits resisted',
    icon: 'shield',
    rungs: counted((n) => `Resist ${n} bad habits`, [
      [5, 4],
      [15, 6],
      [50, 7],
    ]),
  },
  {
    id: 'crits',
    name: 'Crits landed',
    icon: 'target',
    rungs: counted((n) => `Land ${n} critical hits`, [
      [5, 4],
      [25, 6],
      [100, 7],
    ]),
  },
  {
    id: 'enchants',
    name: 'Enchants',
    icon: 'sparkles',
    rungs: counted((n) => plural(n, 'Enchant an item', `Enchant ${n} items`), [
      [1, 6],
      [3, 6],
      [6, 7],
      [10, 7],
    ]),
  },
  {
    id: 'ranks',
    name: 'Skill ranks raised',
    icon: 'chevrons-up',
    rungs: counted((n) => plural(n, "Raise a skill's rank", `Raise skill ranks ${n} times`), [
      [1, 4],
      [5, 6],
      [15, 7],
      [30, 7],
    ]),
  },
  {
    id: 'epics',
    name: 'Epic finds',
    icon: 'gem',
    rungs: [
      ...counted((n) => plural(n, 'Find an epic item', `Find ${n} epic items`), [
        [1, 6],
        [5, 6],
        [15, 7],
      ]),
      { deed: 'Own a relic', gems: 7, mark: 'relic' },
    ],
  },
  {
    id: 'untouched',
    name: 'Untouched kills',
    icon: 'swords',
    rungs: counted((n) => plural(n, 'Kill a boss that never hurt you', `Kill ${n} bosses that never hurt you`), [
      [1, 4],
      [5, 6],
      [15, 7],
    ]),
  },
  {
    id: 'feats',
    name: 'Feats',
    icon: 'award',
    rungs: [
      { deed: 'Kill a boss with a critical hit', gems: 4, mark: 'crit-kill' },
      { deed: 'Kill a boss with a true damage skill', gems: 4, mark: 'true-kill' },
      { deed: 'Check off a hard skill before noon', gems: 4, mark: 'early-riser' },
    ],
  },
];

/** Every gem the trial sets pay, all rungs together (275). */
export const TRIAL_GEMS_TOTAL = TRIAL_SETS.reduce((sum, set) => sum + set.rungs.reduce((s, r) => s + r.gems, 0), 0);

/** Every boss kill of gold the trial sets pay (4), all of it on easy rungs, so all of it in climb I. */
export const TRIAL_GOLD_KILLS_TOTAL = TRIAL_SETS.reduce((sum, set) => sum + set.rungs.reduce((s, r) => s + (r.goldKills ?? 0), 0), 0);
