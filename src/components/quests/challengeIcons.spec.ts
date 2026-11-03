import { describe, expect, it } from 'vitest';
import { CHALLENGE_DEFS } from '../../game-engine';
import { CHALLENGE_ICONS, challengeIcon } from './challengeIcons';

describe('challengeIcons', () => {
  it('has a Lucide component for every challenge icon name', () => {
    for (const def of CHALLENGE_DEFS) expect(CHALLENGE_ICONS[def.icon], def.icon).toBeDefined();
  });

  it('falls back to a scroll for an unknown name', () => {
    expect(challengeIcon('nope')).toBe(CHALLENGE_ICONS['scroll-text']);
  });
});
