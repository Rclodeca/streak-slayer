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
