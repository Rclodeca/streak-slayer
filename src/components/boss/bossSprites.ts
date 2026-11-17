import { bossArt, bossFamily } from '../../game-engine';
import type { Personality } from '../../game-engine';

// Boss art is native pixel art (Pixellab), several images per family (see
// BOSS_ART_COUNT): public/sprites/bosses/<family>/<n>.png, n from 1, built by
// `npm run boss-art` already mirrored to face the hero, so nothing turns it in
// code. A boss wears the image it was rolled (`art`); one saved before art was
// rolled has a fixed one (see bossArt).

/** The sprite name (a path under public/sprites/, no extension) of a boss, or of a high-score run's boss. */
export function bossSprite(boss: { personality: Personality; index: number; art?: number }): string {
  return `bosses/${bossFamily(boss.personality)}/${bossArt(boss) + 1}`;
}

// How much lower than the rest the tall bosses stand on the phone's arena, in CSS px
// (whole art pixels), so the purse beside the menu (StagePurse) covers less of their
// heads: 4px where that clears the plate, 8px where it still touches. Measured
// against the plate, sprite by sprite (docs/mockups/currency-placement.html); the
// rest never reach it. At 8px their feet tuck under the hero's name, which is
// drawn over them.
const ARENA_DROP: Partial<Record<string, number>> = {
  'bosses/arcane/1': 8,
  'bosses/arcane/2': 4,
  'bosses/arcane/3': 8,
  'bosses/arcane/4': 4,
  'bosses/armored/1': 8,
  'bosses/armored/2': 8,
  'bosses/armored/3': 8,
  'bosses/armored/4': 8,
  'bosses/brute/1': 8,
  'bosses/brute/2': 8,
  'bosses/brute/3': 8,
  'bosses/serpent/1': 8,
  'bosses/serpent/2': 8,
  'bosses/serpent/3': 8,
  'bosses/serpent/4': 4,
  'bosses/warded/3': 8,
  'bosses/warlord/1': 8,
  'bosses/warlord/4': 8,
  'bosses/warlord/5': 8,
  'bosses/warlord/6': 8,
  'bosses/wraith/1': 8,
  'bosses/wraith/2': 8,
  'bosses/wraith/3': 8,
  'bosses/wraith/4': 8,
};

/** How much lower (CSS px) a boss sprite stands on the phone's arena than the rest. */
export function bossArenaDrop(sprite: string): number {
  return ARENA_DROP[sprite] ?? 0;
}
