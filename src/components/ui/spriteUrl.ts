// Hero and boss art comes in two builds that draw at the same CSS size (npm
// run sprites, scripts/item-icons/rebuild-sprites.cjs): <name>.png, whose art
// pixels are 1.5 CSS px across (3 device px on 2x screens, like the item
// icons there), and <name>@3x.png at 4/3 CSS px (4 device px on 3x screens).
// The same media query as the stylesheets picks one, so a sprite drawn at its
// canvas size lands on whole device pixels either way.
const dense =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(min-resolution: 3dppx), (-webkit-min-device-pixel-ratio: 3)').matches;

/** The URL of a hero or boss sprite (a path under public/sprites/, no extension) for this screen. */
export function spriteUrl(name: string): string {
  return `${import.meta.env.BASE_URL}sprites/${name}${dense ? '@3x' : ''}.png`;
}

// The phone stage draws its fighters smaller, at the base build's file size:
// one CSS px per art pixel, which lands on whole device pixels on every
// screen (2 per art pixel on 2x, 3 on 3x).
export const PHONE_STAGE_MEDIA = '(max-width: 820px)';

/** The URL of a sprite's base build, for drawing at its file size. */
export function baseSpriteUrl(name: string): string {
  return `${import.meta.env.BASE_URL}sprites/${name}.png`;
}

/**
 * The srcset of a native-art sprite (npm run boss-art): its 3x build on 2x
 * screens and its 4x build on 3x, where an <img> draws each at the file's width
 * over the density, so every art pixel is 1.5 (2x) or 4/3 (3x) CSS px across
 * and lands on whole device pixels. It has no 1x candidate, so a 1x screen
 * takes the 2x build too; leave `src` off, which would add one.
 */
export function spriteSrcset(name: string): string {
  return `${import.meta.env.BASE_URL}sprites/${name}.png 2x, ${import.meta.env.BASE_URL}sprites/${name}@3x.png 3x`;
}
