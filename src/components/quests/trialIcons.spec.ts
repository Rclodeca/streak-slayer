import { describe, expect, it } from 'vitest';
import { TRIAL_SETS } from '../../game-engine';
import { TRIAL_ICONS, trialIcon } from './trialIcons';

describe('trialIcons', () => {
  it('has a Lucide component for every trial set icon name', () => {
    for (const def of TRIAL_SETS) expect(TRIAL_ICONS[def.icon], def.icon).toBeDefined();
  });

  it('falls back to a gift for an unknown name', () => {
    expect(trialIcon('nope')).toBe(TRIAL_ICONS.gift);
  });
});
