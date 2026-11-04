import { describe, expect, it } from 'vitest';
import { PERSONALITY_NAME } from '../../../game-engine';
import type { Personality } from '../../../game-engine';
import { createPainter, ditherFoot, rgba } from './painter';
import type { Fit } from './painter';
import { STAGE_SCENES } from './scenes';
import { sceneMotion } from './sceneFx';

const PERSONALITIES = Object.keys(PERSONALITY_NAME) as Personality[];

// The stages a scene meets, in art pixels, with the fits StageScene works out for
// them: a 390px phone, a narrow and a wide one, the desktop banner (3px art
// pixels) and the Focus strip.
const STAGES: { name: string; cols: number; rows: number; fit: Fit }[] = [
  { name: '390px phone', cols: 195, rows: 113, fit: { dxL: -1, dxR: 0, oy: 5 } },
  { name: '375px phone', cols: 188, rows: 113, fit: { dxL: -2, dxR: -5, oy: 3 } },
  { name: '430px phone', cols: 215, rows: 113, fit: { dxL: -1, dxR: 20, oy: 5 } },
  { name: '700px tablet', cols: 350, rows: 113, fit: { dxL: 66, dxR: 87, oy: 5 } },
  { name: 'desktop banner', cols: 403, rows: 98, fit: { dxL: 10, dxR: 199, oy: -7 } },
  { name: 'Focus strip', cols: 195, rows: 42, fit: { dxL: -17, dxR: 4, oy: -34 } },
];

describe('stage scenes', () => {
  it('has a scene for every boss', () => {
    expect(Object.keys(STAGE_SCENES).sort()).toEqual([...PERSONALITIES].sort());
  });

  for (const stage of STAGES) {
    it(`covers every pixel of a ${stage.name}, for every boss`, () => {
      for (const personality of PERSONALITIES) {
        const g = createPainter(stage.cols, stage.rows, stage.fit);
        STAGE_SCENES[personality].paint(g);
        const gaps = g.buf.reduce((n, v) => n + (v === 0 ? 1 : 0), 0);
        expect({ personality, gaps }).toEqual({ personality, gaps: 0 });
      }
    });
  }

  it('paints the same scene every time', () => {
    for (const personality of PERSONALITIES) {
      const a = createPainter(195, 113, STAGES[0].fit), b = createPainter(195, 113, STAGES[0].fit);
      STAGE_SCENES[personality].paint(a);
      STAGE_SCENES[personality].paint(b);
      expect(a.buf).toEqual(b.buf);
    }
  });

  it('runs every scene’s motion without drawing outside its layer', () => {
    for (const personality of PERSONALITIES) {
      for (const stage of STAGES) {
        const scene = STAGE_SCENES[personality];
        const data = scene.paint(createPainter(stage.cols, stage.rows, stage.fit)) ?? {};
        const m = createPainter(stage.cols, stage.rows, stage.fit);
        const draw = sceneMotion(scene.fx, m, data, 100);
        for (let t = 1; t <= 200; t++) draw(t);
        expect(m.buf.length).toBe(stage.cols * stage.rows);
      }
    }
  });

  it('dissolves the foot into the page, thicker toward the bottom', () => {
    const g = createPainter(195, 121, STAGES[0].fit);
    STAGE_SCENES.balanced.paint(g);
    ditherFoot(g, 6, '#e9dfc8');
    const page = rgba('#e9dfc8');
    const share = (y0: number, y1: number) => g.buf.subarray(y0 * 195, y1 * 195).reduce((n, v) => n + (v === page ? 1 : 0), 0) / ((y1 - y0) * 195);
    expect(share(0, 115)).toBe(0);
    expect(share(115, 118)).toBeGreaterThan(0);
    expect(share(118, 121)).toBeGreaterThan(share(115, 118));
    expect(share(118, 121)).toBeGreaterThan(0.5);
  });
});
