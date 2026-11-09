import type { HeroClass } from '../../game-engine';

// Every hero's art file is stored facing right, toward the boss, so nothing
// turns it around in code.

// The size each hero's square canvas is drawn at, in CSS px. Both builds of
// the art (see spriteUrl) fill it with whole cells, so drawn at this size the
// art lands on whole device pixels on 2x and 3x screens. A multiple of 12 for
// that, which is why the cleric's is larger: its art is.
export const HERO_CANVAS: Record<HeroClass, number> = {
  warrior: 168,
  cleric: 180,
  ranger: 168,
};

// Where each hero stands on the fight stage, in px on its 390px-wide phone
// design: drawn width (its canvas), then left and bottom offsets. Each is
// placed by its visual center of mass rather than its box, so the three
// stand in the same spot.
export interface HeroPlacement {
  width: number;
  left: number;
  bottom: number;
}

export const HERO_PLACEMENT: Record<HeroClass, HeroPlacement> = {
  warrior: { width: HERO_CANVAS.warrior, left: 23, bottom: 8 },
  cleric: { width: HERO_CANVAS.cleric, left: 6, bottom: 6 },
  ranger: { width: HERO_CANVAS.ranger, left: 12, bottom: 10 },
};

// The base build's file size (the canvas at one CSS px per art pixel, 2/3
// of HERO_CANVAS), as the phone stage draws each hero.
export const HERO_BASE: Record<HeroClass, number> = {
  warrior: 112,
  cleric: 120,
  ranger: 112,
};

// Where each hero's head is in its base build, in art px: its middle across
// and the top of the head (or hood). The Hero tab's title medallion centres
// on it for the hero's portrait.
export const HERO_FACE: Record<HeroClass, { x: number; y: number }> = {
  warrior: { x: 48, y: 9 },
  cleric: { x: 50, y: 24 },
  ranger: { x: 56, y: 9 },
};

// HERO_PLACEMENT for the phone stage's smaller heroes: the same spots,
// scaled to their base size.
export const HERO_PHONE_PLACEMENT: Record<HeroClass, HeroPlacement> = {
  warrior: { width: HERO_BASE.warrior, left: 15, bottom: 5 },
  cleric: { width: HERO_BASE.cleric, left: 4, bottom: 4 },
  ranger: { width: HERO_BASE.ranger, left: 8, bottom: 7 },
};

// The hero on the new-hero screen's fire, in its 150px box: drawn width (its
// canvas), then left and bottom offsets, with its feet on the box floor and
// its center of mass in the middle.
export const HERO_PICK_PLACEMENT: Record<HeroClass, HeroPlacement> = {
  warrior: { width: HERO_CANVAS.warrior, left: 10, bottom: -5 },
  cleric: { width: HERO_CANVAS.cleric, left: -6, bottom: -7 },
  ranger: { width: HERO_CANVAS.ranger, left: -2, bottom: -3 },
};
