import { Castle, Shirt, Sprout } from 'lucide-vue-next';
import type { Component } from 'vue';
import { nextPrestigeRank, PRESTIGE_RANKS } from '../../game-engine';

// How the Talents tab's prestige ladder draws each rank (docs/mockups/prestige-tree.html,
// A · Crown plinth): the special a rank gives, and where the climb stands.
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

/** The line under the crown plinth: the first bar, Ready, the ranks so far, or V once Mythic. */
export function plinthLabel(rank: number, level: number): string {
  const next = nextPrestigeRank(rank);
  if (!next) return 'V';
  if (level >= next.bar) return 'Ready';
  return rank === 0 ? `Lv ${next.bar}` : `${rank} / ${PRESTIGE_RANKS.length}`;
}
