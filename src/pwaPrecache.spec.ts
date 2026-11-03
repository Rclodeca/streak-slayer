// Builds the app and checks that the service worker precaches every hero,
// boss and item sprite, so the art comes from local cache (and works offline)
// instead of popping in over the network on a cold open.

import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { build } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const SPRITES_DIR = join(import.meta.dirname, '..', 'public', 'sprites');

function pngsUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? pngsUnder(join(dir, entry.name))
      : entry.name.endsWith('.png')
        ? [join(dir, entry.name)]
        : [],
  );
}

describe('service worker precache', () => {
  let outDir: string;
  let sw: string;

  beforeAll(async () => {
    outDir = mkdtempSync(join(tmpdir(), 'streak-slayer-build-'));
    await build({ logLevel: 'silent', build: { outDir, emptyOutDir: true } });
    sw = readFileSync(join(outDir, 'sw.js'), 'utf8');
  }, 120_000);

  afterAll(() => {
    rmSync(outDir, { recursive: true, force: true });
  });

  it('precaches every sprite png', () => {
    const sprites = pngsUnder(SPRITES_DIR).map((file) =>
      relative(join(SPRITES_DIR, '..'), file).split('\\').join('/'),
    );
    expect(sprites.length).toBeGreaterThan(0);
    // The worker is minified (`url:"x"`) in a production build and pretty
    // printed (`"url": "x"`) under vitest, so match both.
    const missing = sprites.filter((name) => !new RegExp(`url"?:\\s*"${name}"`).test(sw));
    expect(missing).toEqual([]);
  });
});
