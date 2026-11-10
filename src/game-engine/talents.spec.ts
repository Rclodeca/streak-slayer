import { describe, expect, it } from 'vitest';
import { createCharacter } from './character';
import { createRng } from './rng';
import { TALENT_DEFS, TALENT_SHOOTS } from './constants/talentTree';
import {
  canSpendTalent,
  isTalentUnlocked,
  spendTalent,
  talentBonusFlat,
  talentBonusPercent,
  talentEffectValue,
  talentPointsInShoot,
  talentPointsSpent,
  talentPointsTotal,
  talentPointsUnspent,
  talentRank,
  talentsOpen,
  talentUnlockPending,
  TALENTS_UNLOCK_LEVEL,
  unlockTalents,
} from './talents';
import type { Character } from './types';
import type { TalentId } from './constants/talentTree';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  const starterStats = { physicalDamage: 10, magicDamage: 10, healing: 6, health: 50, trueDamage: 6 };
  return { level: 20, exp: 0, starterStats, currentHealth: 50, ownedItemIds: [], equippedItemIds: [], critChance: 0.01, ...overrides };
}

/** Spends `ranks` of `id`, ignoring points and unlocks — builds a state to test from. */
function withTalents(character: Character, talents: Partial<Record<TalentId, number>>): Character {
  return { ...character, talents: { ...character.talents, ...talents } };
}

const defsIn = (shoot: string) => TALENT_DEFS.filter((def) => def.shoot === shoot);
const total = (shoot: string) => defsIn(shoot).reduce((sum, def) => sum + def.maxRank, 0);
const toTheTop = (shoot: string) => defsIn(shoot).filter((def) => def.kind === 'main').reduce((sum, def) => sum + def.maxRank, 0);

describe('the talent tree', () => {
  it('is 97 points in all: Damage 39, Tank 29, Support 29', () => {
    expect(total('damage')).toBe(39);
    expect(total('tank')).toBe(29);
    expect(total('support')).toBe(29);
    expect(TALENT_DEFS.reduce((sum, def) => sum + def.maxRank, 0)).toBe(97);
  });

  it('takes 18, 15 and 17 points of main nodes to open each top node', () => {
    expect(toTheTop('damage')).toBe(18);
    expect(toTheTop('tank')).toBe(15);
    expect(toTheTop('support')).toBe(17);
  });

  it('lists the shoots Damage, Tank, Support', () => {
    expect(TALENT_SHOOTS).toEqual(['damage', 'tank', 'support']);
  });

  it('has unique ids, at most 3 ranks a node, one top node a shoot', () => {
    expect(new Set(TALENT_DEFS.map((def) => def.id)).size).toBe(TALENT_DEFS.length);
    expect(Math.max(...TALENT_DEFS.map((def) => def.maxRank))).toBe(3);
    for (const shoot of TALENT_SHOOTS) expect(defsIn(shoot).filter((def) => def.kind === 'top')).toHaveLength(1);
  });

  it('hangs every offshoot off a main node of its own shoot, never the first', () => {
    for (const shoot of TALENT_SHOOTS) {
      const mains = defsIn(shoot).filter((def) => def.kind === 'main');
      for (const offshoot of defsIn(shoot).filter((def) => def.kind === 'offshoot')) {
        const parent = mains.findIndex((def) => def.id === offshoot.parent);
        expect(parent, offshoot.id).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the main order of the spec', () => {
    const mains = (shoot: string) => defsIn(shoot).filter((def) => def.kind === 'main').map((def) => def.id);
    expect(mains('damage')).toEqual(['might', 'precision', 'brawn', 'arcana', 'might-2', 'precision-2']);
    expect(mains('tank')).toEqual(['vigor', 'plating', 'warding', 'vigor-2', 'bastion']);
    expect(mains('support')).toEqual(['mending', 'renewal', 'insight', 'mending-2', 'renewal-2', 'leech']);
  });
});

describe('talent points', () => {
  it('give one point per level gained, none at level 1', () => {
    expect(talentPointsTotal(makeCharacter({ level: 1 }))).toBe(0);
    expect(talentPointsTotal(makeCharacter({ level: 5 }))).toBe(4);
    expect(talentPointsTotal(makeCharacter({ level: 20 }))).toBe(19);
  });

  it('count spent ranks and leave the rest unspent, derived from level', () => {
    const hero = withTalents(makeCharacter({ level: 10 }), { might: 3, precision: 1 });
    expect(talentPointsSpent(hero)).toBe(4);
    expect(talentPointsUnspent(hero)).toBe(5);
  });

  it('hand a hero already in progress its points with no saved field', () => {
    expect(talentPointsUnspent(makeCharacter({ level: 12 }))).toBe(11);
  });

  it('count a shoot’s spent points on their own', () => {
    const hero = withTalents(makeCharacter(), { might: 2, vigor: 3, 'armor-break': 1 });
    expect(talentPointsInShoot(hero, 'damage')).toBe(3);
    expect(talentPointsInShoot(hero, 'tank')).toBe(3);
    expect(talentPointsInShoot(hero, 'support')).toBe(0);
  });
});

describe('unlocking nodes', () => {
  it('opens the first main node of every shoot from the start', () => {
    const hero = makeCharacter();
    for (const id of ['might', 'vigor', 'mending'] as const) expect(isTalentUnlocked(hero, id)).toBe(true);
  });

  it('opens each later main node once the one before it has a rank', () => {
    const hero = makeCharacter();
    expect(isTalentUnlocked(hero, 'precision')).toBe(false);
    expect(isTalentUnlocked(withTalents(hero, { might: 1 }), 'precision')).toBe(true);
    expect(isTalentUnlocked(withTalents(hero, { might: 1 }), 'brawn')).toBe(false);
  });

  it('opens an offshoot once its parent has a rank, not before', () => {
    const hero = makeCharacter();
    expect(isTalentUnlocked(hero, 'keen-edge')).toBe(false);
    expect(isTalentUnlocked(withTalents(hero, { might: 3, precision: 1 }), 'keen-edge')).toBe(true);
  });

  it('opens a top node only once every main node in its shoot is full, offshoots not counting', () => {
    const mains = { might: 3, precision: 3, brawn: 3, arcana: 3, 'might-2': 3 } as const;
    const hero = makeCharacter({ level: 30 });
    expect(isTalentUnlocked(withTalents(hero, mains), 'executioner')).toBe(false);
    expect(isTalentUnlocked(withTalents(hero, { ...mains, 'precision-2': 2 }), 'executioner')).toBe(false);
    expect(isTalentUnlocked(withTalents(hero, { ...mains, 'precision-2': 3 }), 'executioner')).toBe(true);
  });
});

describe('spending a rank', () => {
  it('costs one point and adds a rank', () => {
    const hero = makeCharacter({ level: 5 });
    const after = spendTalent(hero, 'might');
    expect(talentRank(after, 'might')).toBe(1);
    expect(talentPointsUnspent(after)).toBe(3);
  });

  it('does not change the hero it was given', () => {
    const hero = makeCharacter();
    spendTalent(hero, 'might');
    expect(hero.talents).toBeUndefined();
  });

  it('is refused for a locked node', () => {
    const hero = makeCharacter();
    expect(canSpendTalent(hero, 'precision')).toBe(false);
    expect(spendTalent(hero, 'precision')).toBe(hero);
  });

  it('is refused at full ranks', () => {
    const hero = withTalents(makeCharacter(), { might: 3 });
    expect(canSpendTalent(hero, 'might')).toBe(false);
    expect(spendTalent(hero, 'might')).toBe(hero);
  });

  it('is refused with no points left', () => {
    const hero = withTalents(makeCharacter({ level: 5 }), { might: 3, precision: 1 });
    expect(talentPointsUnspent(hero)).toBe(0);
    expect(canSpendTalent(hero, 'precision')).toBe(false);
    expect(spendTalent(hero, 'precision')).toBe(hero);
  });

  it('is refused for an id the tree does not have', () => {
    const hero = makeCharacter();
    expect(spendTalent(hero, 'nonsense' as TalentId)).toBe(hero);
  });

  it('is refused before the Talents tab opens', () => {
    const hero = makeCharacter({ level: 4 });
    expect(canSpendTalent(hero, 'might')).toBe(false);
  });
});

describe('the Talents unlock', () => {
  it('opens at level 5', () => {
    expect(TALENTS_UNLOCK_LEVEL).toBe(5);
    expect(talentsOpen(makeCharacter({ level: 4 }))).toBe(false);
    expect(talentsOpen(makeCharacter({ level: 5 }))).toBe(true);
  });

  it('shows the unlock popup from level 5 until it is dismissed', () => {
    expect(talentUnlockPending(makeCharacter({ level: 4 }))).toBe(false);
    expect(talentUnlockPending(makeCharacter({ level: 5 }))).toBe(true);
    expect(talentUnlockPending(unlockTalents(makeCharacter({ level: 5 })))).toBe(false);
  });

  it('shows the popup once to a save already past level 5, which has no flag', () => {
    expect(talentUnlockPending(makeCharacter({ level: 14 }))).toBe(true);
  });

  it('keeps the tab open once unlocked, even if the flag is all that is left', () => {
    expect(talentsOpen(unlockTalents(makeCharacter({ level: 5 })))).toBe(true);
  });
});

describe('a new run', () => {
  it('starts with an empty, locked tree', () => {
    const fresh = createCharacter(createRng(1));
    expect(fresh.talents).toBeUndefined();
    expect(fresh.talentsUnlocked).toBe(false);
    expect(talentPointsSpent(fresh)).toBe(0);
  });
});

describe('talent bonuses', () => {
  it('add per-rank percent to the stat they name', () => {
    const hero = withTalents(makeCharacter(), { might: 3, 'might-2': 2 });
    expect(talentBonusPercent(hero, 'allDamage')).toBe(10);
    expect(talentBonusPercent(hero, 'critChance')).toBe(0);
  });

  it('add per-rank flat to the flat stat they name, Bastion to both armor and magic resist', () => {
    const hero = withTalents(makeCharacter(), { plating: 2, bastion: 3, warding: 1, 'iron-hide': 2 });
    expect(talentBonusFlat(hero, 'armor')).toBe(25 * 2 + 25 * 3 + 25 * 2);
    expect(talentBonusFlat(hero, 'magicResist')).toBe(25 * 1 + 25 * 3);
  });

  it('keep a stat that appears twice in a shoot as two separate nodes', () => {
    const hero = withTalents(makeCharacter(), { vigor: 3, 'vigor-2': 3 });
    expect(talentBonusPercent(hero, 'health')).toBe(18);
  });

  it('are 0 with no talents', () => {
    expect(talentBonusPercent(makeCharacter(), 'allDamage')).toBe(0);
    expect(talentBonusFlat(makeCharacter(), 'armor')).toBe(0);
  });

  it('give special nodes their effect by rank', () => {
    const hero = withTalents(makeCharacter(), { 'keen-edge': 2, executioner: 1, 'weekly-might': 3, unbroken: 1 });
    expect(talentEffectValue(hero, 'critMultiplier')).toBeCloseTo(0.2 + 0.5, 10);
    expect(talentEffectValue(hero, 'weeklyDamage')).toBe(15);
    expect(talentEffectValue(hero, 'dodge')).toBe(10);
    expect(talentEffectValue(hero, 'milestoneExp')).toBe(0);
  });
});
