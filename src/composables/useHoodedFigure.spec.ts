import { afterEach, describe, expect, it } from 'vitest';
import { INTRO_LINES, returnLines, useHoodedFigure } from './useHoodedFigure';

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
});
