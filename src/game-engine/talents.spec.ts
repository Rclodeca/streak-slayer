import { describe, expect, it } from 'vitest';
import { createCharacter } from './character';
import { createRng } from './rng';
import { TALENT_DEFS, TALENT_SHOOTS } from './constants/talentTree';
import { TALENT_COST } from './constants/economy';
import {
  buyTalent,
  canBuyTalent,
  isTalentUnlocked,
  nextTalentCost,
  talentBonusFlat,
  talentBonusPercent,
  talentEffectValue,
  talentRanksBought,
  talentRanksInShoot,
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

describe('ranks bought', () => {
  it('count every rank across the tree', () => {
    expect(talentRanksBought(withTalents(makeCharacter(), { might: 3, precision: 1 }))).toBe(4);
  });

  it('count a shoot’s ranks on their own', () => {
    const hero = withTalents(makeCharacter(), { might: 2, vigor: 3, 'armor-break': 1 });
    expect(talentRanksInShoot(hero, 'damage')).toBe(3);
    expect(talentRanksInShoot(hero, 'tank')).toBe(3);
    expect(talentRanksInShoot(hero, 'support')).toBe(0);
  });

  it('set the price of the next rank', () => {
    expect(nextTalentCost(makeCharacter())).toEqual(TALENT_COST(1));
    expect(nextTalentCost(withTalents(makeCharacter(), { might: 3 }))).toEqual(TALENT_COST(4));
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

describe('buying a rank', () => {
  it('the first rank costs 100 gold', () => {
    const result = buyTalent(makeCharacter({ gold: 150 }), 0, 'might');
    expect(result?.character.gold).toBe(50);
    expect(talentRank(result!.character, 'might')).toBe(1);
    expect(result?.gemsSpent).toBe(0);
  });

  it('the fourth rank needs a gem', () => {
    const hero = withTalents(makeCharacter({ gold: 1000 }), { might: 3 });
    expect(buyTalent(hero, 0, 'precision')).toBeNull();
    const result = buyTalent(hero, 1, 'precision');
    expect(result?.gemsSpent).toBe(1);
    expect(result?.character.gold).toBe(600);
    expect(talentRank(result!.character, 'precision')).toBe(1);
  });

  it('short on gold buys nothing', () => {
    const hero = makeCharacter({ gold: 99 });
    expect(canBuyTalent(hero, 0, 'might')).toBe(false);
    expect(buyTalent(hero, 0, 'might')).toBeNull();
  });

  it('levels no longer give anything', () => {
    expect(canBuyTalent(makeCharacter({ level: 30, gold: 0 }), 5, 'might')).toBe(false);
  });

  it('does not change the hero it was given', () => {
    const hero = makeCharacter({ gold: 500 });
    buyTalent(hero, 0, 'might');
    expect(hero.talents).toBeUndefined();
    expect(hero.gold).toBe(500);
  });

  it('is refused for a locked node', () => {
    expect(buyTalent(makeCharacter({ gold: 500 }), 0, 'precision')).toBeNull();
  });

  it('is refused at full ranks', () => {
    expect(buyTalent(withTalents(makeCharacter({ gold: 5000 }), { might: 3 }), 5, 'might')).toBeNull();
  });

  it('is refused for an id the tree does not have', () => {
    expect(buyTalent(makeCharacter({ gold: 500 }), 0, 'nonsense' as TalentId)).toBeNull();
  });

  it('is refused while the hero lies dead, so gold due to be lost can’t be spent', () => {
    expect(canBuyTalent(makeCharacter({ gold: 500, currentHealth: 0 }), 0, 'might')).toBe(false);
    expect(canBuyTalent(makeCharacter({ gold: 500, currentHealth: 0.3 }), 0, 'might')).toBe(false);
  });

  it('is refused before the Talents tab opens', () => {
    expect(canBuyTalent(makeCharacter({ level: 4, gold: 500 }), 0, 'might')).toBe(false);
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
    expect(talentRanksBought(fresh)).toBe(0);
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
