// Compiles the theme stylesheet and checks that the theme declares the
// whole palette, that no token is used without being declared,
// and that no alpha tone is built the way the browser silently drops.

import { readdirSync, readFileSync } from 'node:fs';
import { compile } from 'sass';
import { describe, expect, it } from 'vitest';
import { THEMES } from '../../../store/themeStore';

/** Every colour (and light) a theme must set on `:root[data-theme=<id>]`. */
export const PALETTE_TOKENS = [
  'bg',
  'bg-rgb',
  'text',
  'text-h',
  'border',
  'code-bg',
  'frame',
  'frame-rgb',
  'panel-fill',
  'ash-rgb',
  'ash-mark',
  'ash-deep',
  'moon',
  'moon-solid',
  'moon-tint-rgb',
  'moon-glow-rgb',
  'brass',
  'brass-rgb',
  'brass-solid',
  'check-done',
  'check-done-line',
  'page-glow',
  'button-fill',
  'button-fill-hover',
  'button-line',
  'button-text',
  'stage-light',
  'boss-sprite-filter',
  'hero-sprite-filter',
  'spent-text',
  'day-on-rgb',
  'bar-rgb',
  'plate',
  // Pixel-cut cards, buttons and panels.
  'card',
  'card-hi',
  'card-lo',
  'card-lip',
  'card-ink',
  'struck-card',
  'struck-hi',
  'struck-lo',
  'struck-face',
  'struck-lip',
  'struck-ink',
  'quiet-card',
  'quiet-hi',
  'quiet-lo',
  'resting-face',
  'panel-hi',
  'panel-lo',
  'sunk-hi',
  'sunk-lo',
  'button-lip',
  'stone-face',
  'stone-lip',
  'field',
  'field-line',
  'field-shadow',
  'check-bg',
  'selected-card',
  'selected-shadow',
  'brass-on-face',
  'on-brass',
  'tint-to',
  'well',
  'on-true-damage',
  'on-crimson',
  'input-fill',
];

function compileThemes(): string {
  return compile('src/assets/scss/themes/index.scss').css;
}

/** Custom properties the components define themselves (scoped styles, inline `:style` bindings). */
function componentTokens(): Set<string> {
  const names = new Set<string>();
  for (const file of readdirSync('src', { recursive: true, encoding: 'utf8' })) {
    if (!file.endsWith('.vue')) continue;
    const source = readFileSync(`src/${file}`, 'utf8');
    for (const [, name] of source.matchAll(/['"]?--([\w-]+)['"]?\s*:/g)) names.add(name);
  }
  return names;
}

/** Custom properties declared in blocks whose selector is exactly `:root[data-theme=<id>]`. */
function declaredTokens(css: string, id: string): Set<string> {
  const names = new Set<string>();
  const selector = new RegExp(`^:root\\[data-theme=['"]?${id}['"]?\\]$`);
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selectors.split(',').some((s) => selector.test(s.trim()))) continue;
    for (const [, name] of body.matchAll(/(?:^|[;\s])--([\w-]+)\s*:/g)) names.add(name);
  }
  return names;
}

describe('Themes', () => {
  const css = compileThemes();

  for (const { id } of THEMES) {
    it(`declares every palette token for ${id}`, () => {
      const declared = declaredTokens(css, id);
      expect(PALETTE_TOKENS.filter((name) => !declared.has(name))).toEqual([]);
    });
  }

  it('no longer mentions the ashen theme id', () => {
    expect(css).not.toMatch(/data-theme=['"]?ashen/);
  });

  it('declares every custom property it uses', () => {
    const known = new Set([...css.matchAll(/--([\w-]+)\s*:/g)].map((m) => m[1]));
    for (const [, name] of readFileSync('src/style.css', 'utf8').matchAll(/--([\w-]+)\s*:/g)) known.add(name);
    for (const name of componentTokens()) known.add(name);
    const used = new Set([...css.matchAll(/var\(\s*--([\w-]+)/g)].map((m) => m[1]));
    expect([...used].filter((name) => !known.has(name))).toEqual([]);
  });

  it('rounds only what is round by nature', () => {
    // Pixel-cut: corners are stepped (clip-path) or square. Dots, rings and
    // ellipses keep 50%.
    const radii = [...css.matchAll(/border-radius:\s*([^;}]+)/g)].map((m) => m[1].trim());
    expect(radii.filter((r) => !['0', '50%', 'inherit'].includes(r))).toEqual([]);
  });

  it('evaluates every tone() call', () => {
    // Sass leaves functions in custom-property values as text unless they are
    // interpolated, and the browser then drops the whole value.
    expect(css).not.toMatch(/\btone\(/);
  });

  it('never feeds a token to rgba()', () => {
    // Sass passes rgba($x, a) through unchanged once $x is a var(), and the
    // browser then drops the colour silently. Only tone() may make alpha
    // tones, and it writes `rgb(var(--x-rgb) / a)`.
    expect(css.match(/rgba\(\s*var\(/g)).toBeNull();
    expect(css.match(/rgb\(\s*var\((?!--[\w-]+-rgb\)\s*\/)/g)).toBeNull();
  });
});
