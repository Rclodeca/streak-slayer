import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BOSS_ART_COUNT, bossFamily, PERSONALITY_NAME } from '../../game-engine';
import type { BossFamily, Personality } from '../../game-engine';
import { bossSprite } from './bossSprites';

const sprites = fileURLToPath(new URL('../../../public/sprites', import.meta.url));

describe('bossSprite', () => {
  it('names the image the boss was rolled, from 1', () => {
    expect(bossSprite({ personality: 'dragon3x', index: 9, art: 0 })).toBe('bosses/dragon/1');
    expect(bossSprite({ personality: 'balanced', index: 9, art: 5 })).toBe('bosses/drifter/6');
  });

  it('gives a boss with no saved art a fixed image from its index', () => {
    const a = bossSprite({ personality: 'arcane', index: 12 });
    expect(a).toBe(bossSprite({ personality: 'arcane', index: 12 }));
    expect(a).toBe(`bosses/arcane/${(11 % BOSS_ART_COUNT.arcane) + 1}`);
  });

  it('has both builds of every image of every family', () => {
    const families = new Set((Object.keys(PERSONALITY_NAME) as Personality[]).map(bossFamily));
    expect([...families].sort()).toEqual((Object.keys(BOSS_ART_COUNT) as BossFamily[]).sort());
    for (const family of families) {
      for (let n = 1; n <= BOSS_ART_COUNT[family]; n++) {
        expect(existsSync(`${sprites}/bosses/${family}/${n}.png`)).toBe(true);
        expect(existsSync(`${sprites}/bosses/${family}/${n}@3x.png`)).toBe(true);
      }
      expect(existsSync(`${sprites}/bosses/${family}/${BOSS_ART_COUNT[family] + 1}.png`)).toBe(false);
    }
  });
});
