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
