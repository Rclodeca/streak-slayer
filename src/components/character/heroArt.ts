import type { HeroClass } from '../../game-engine';

// Hero art is native pixel art (Pixellab, npm run hero-art): each hero is cropped
// onto a square canvas of 64 art pixels (72 in the @3x build, see spriteUrl),
// centred, its feet on the bottom row. Drawn at HERO_CANVAS CSS px, that is
// 1.5 CSS px per art pixel on 2x screens (3 device px) and 4/3 on 3x (4 device
// px), so every pixel lands whole, the same as the bosses (bossSprites.ts). Every
// hero's art stays facing right, toward the boss, so nothing turns it in code.

/** The canvas size every hero is drawn at, in CSS px: 96 = 64 * 1.5 = 72 * 4/3. Doubling it keeps both exact. */
export const HERO_CANVAS = 96;

// Where each hero stands on the fight stage, in px on its 390px-wide phone
// design: drawn width (its canvas), then left and bottom offsets. The figure is
// centred on its canvas and stands on the canvas floor, so every hero is placed
// the same: centred on its plinth, its feet 8px below the plinth's top.
export interface HeroPlacement {
  width: number;
  left: number;
  bottom: number;
}

const STAGE_PLACEMENT: HeroPlacement = { width: HERO_CANVAS, left: 33, bottom: 12 };

export const HERO_PLACEMENT: Record<HeroClass, HeroPlacement> = {
  warrior: STAGE_PLACEMENT,
  cleric: STAGE_PLACEMENT,
  ranger: STAGE_PLACEMENT,
};

// The phone stage draws the same size (the old art had a smaller build there).
// Phones centre the canvas on the plinth in CharacterPanel's CSS, so only the
// width and the feet's height are read from here.
export const HERO_PHONE_PLACEMENT: Record<HeroClass, HeroPlacement> = {
  warrior: { width: HERO_CANVAS, left: 0, bottom: 12 },
  cleric: { width: HERO_CANVAS, left: 0, bottom: 12 },
  ranger: { width: HERO_CANVAS, left: 0, bottom: 12 },
};

// The width the Focus strip draws a hero's canvas at (a fitted, not a whole
// step, size, like the strip's boss).
export const HERO_STRIP = 64;

// Where each hero's head is in its base build, in art px: its middle across
// and the top of the face, a little above the eyes (the medallion shows 17
// art px below it). The Hero tab's title medallion
// centres on it for the hero's portrait, which it draws at HERO_PORTRAIT_SCALE
// CSS px per art pixel.
export const HERO_PORTRAIT_SCALE = 2;
export const HERO_FACE: Record<HeroClass, { x: number; y: number }> = {
  warrior: { x: 33, y: 17 },
  cleric: { x: 31, y: 22 },
  ranger: { x: 32, y: 19 },
};

// The hero on the new-hero screen's fire, in its 150px box: drawn width, then
// left and bottom offsets, with its feet on the box floor and its canvas
// centred. Drawn at twice the canvas size (3 CSS px per art pixel, 8/3 on 3x),
// as a larger illustration.
export const HERO_PICK_CANVAS = HERO_CANVAS * 2;
const PICK_PLACEMENT: HeroPlacement = { width: HERO_PICK_CANVAS, left: (150 - HERO_PICK_CANVAS) / 2, bottom: 0 };
export const HERO_PICK_PLACEMENT: Record<HeroClass, HeroPlacement> = {
  warrior: PICK_PLACEMENT,
  cleric: PICK_PLACEMENT,
  ranger: PICK_PLACEMENT,
};
