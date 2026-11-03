import { afterEach, describe, expect, it } from 'vitest';
import { deathLines, INTRO_LINES, returnLines, useHoodedFigure } from './useHoodedFigure';

describe('useHoodedFigure', () => {
  afterEach(() => useHoodedFigure().endScene());

  it('says the three opening lines, in order', () => {
    const { scene, startScene } = useHoodedFigure();
    startScene('intro');
    expect(scene.value).toEqual({ kind: 'intro', lines: INTRO_LINES });
    expect(INTRO_LINES).toEqual(['Habits, is it?', 'How sweet.', 'Let’s see how long they hold.']);
  });

  it('says one return line after a death', () => {
    const { scene, startScene } = useHoodedFigure();
    startScene('back');
    expect(scene.value!.kind).toBe('back');
    expect(scene.value!.lines).toHaveLength(1);
  });

  it('ends the scene', () => {
    const { scene, startScene, endScene } = useHoodedFigure();
    startScene('intro');
    endScene();
    expect(scene.value).toBeNull();
  });

  it('never repeats a return line twice running', () => {
    let prior = returnLines(() => 0)[0];
    for (let i = 0; i < 20; i++) {
      const next = returnLines(() => 0)[0];
      expect(next).not.toBe(prior);
      prior = next;
    }
  });

  it('never repeats a death line twice running', () => {
    const run = { level: 14, bossIndex: 9 };
    let prior = deathLines(run, () => 0)[0];
    for (let i = 0; i < 20; i++) {
      const next = deathLines(run, () => 0)[0];
      expect(next).not.toBe(prior);
      prior = next;
    }
  });

  it('quotes the run in words', () => {
    const run = { level: 14, bossIndex: 9 };
    const seen = new Set<string>();
    for (const roll of [0, 0.4, 0.9]) seen.add(deathLines(run, () => roll)[0]);
    expect([...seen]).toContain('Fourteen levels… and still you fall.');
    expect([...seen]).toContain('Boss nine. Further than most.');
  });

  it('writes compound numbers with a hyphen and singular for level one', () => {
    expect(deathLines({ level: 21, bossIndex: 1 }, () => 0)[0]).toBe('Twenty-one levels… and still you fall.');
    expect(deathLines({ level: 1, bossIndex: 1 }, () => 0.01)[0]).toBe('One level… and still you fall.');
  });

  it('keeps "further than most" for runs that got somewhere', () => {
    for (let n = 0; n < 12; n++) {
      for (const roll of [0, 0.5, 0.99]) {
        expect(deathLines({ level: 2, bossIndex: 2 }, () => roll)[0]).not.toContain('Further than most');
      }
    }
  });
});
