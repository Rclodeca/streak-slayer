import { Castle, Shirt, Sprout } from 'lucide-vue-next';
import type { Component } from 'vue';
import { nextPrestigeRank, PRESTIGE_RANKS } from '../../game-engine';

// How the Talents tab's prestige crest and ladder draw the ranks (docs/mockups/prestige-tree.html,
// A, and prestige-entrance.html, A · Crest on the banner): the special a rank gives,
// and where the climb stands.
export interface PrestigeSpecialLook {
  name: string;
  line?: string;
  icon: Component;
}

export const PRESTIGE_SPECIAL_LOOK: Record<number, PrestigeSpecialLook> = {
  1: { name: 'Free dungeon', line: 'Yours to enter.', icon: Castle },
  2: { name: 'Deeper roots', line: 'Talents +1 max rank', icon: Sprout },
  3: { name: 'Free dungeon', line: 'Yours to enter.', icon: Castle },
  4: { name: 'Deeper roots II', line: 'Talents +1 max rank', icon: Sprout },
  5: { name: 'Mythic skin', line: 'For every hero.', icon: Shirt },
};

/** A rung of the ladder: earned, the next one (at its bar: ready), or still sealed. */
export type LadderState = 'done' | 'next' | 'ready' | 'sealed';

/** The state of the rung at `index` (0 is rank I) for a hero at `rank` and `level`. */
export function ladderState(index: number, rank: number, level: number): LadderState {
  if (index < rank) return 'done';
  if (index > rank) return 'sealed';
  return level >= PRESTIGE_RANKS[index].bar ? 'ready' : 'next';
}

/** Whether the whole ladder is veiled: only before the first prestige, under its bar. */
export function ladderSealed(rank: number, level: number): boolean {
  return rank === 0 && level < PRESTIGE_RANKS[0].bar;
}

/** The crest's line: the first bar, the climb to the next, Ready, or Mythic once done. */
export function crestLabel(rank: number, level: number): string {
  const next = nextPrestigeRank(rank);
  if (!next) return 'Mythic';
  if (level >= next.bar) return 'Ready';
  return rank === 0 ? `Lv ${next.bar}` : `Lv ${level} / ${next.bar}`;
}

/** How far up the climb from level 1 to the next bar the hero is, as a percent: never under 4, so a sliver shows; 100 once Mythic. */
export function climbPercent(rank: number, level: number): number {
  const next = nextPrestigeRank(rank);
  if (!next) return 100;
  return Math.max(4, Math.min(100, ((level - 1) / (next.bar - 1)) * 100));
}
