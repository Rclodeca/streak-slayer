import { describe, expect, it } from 'vitest';
import { TALENT_DEFS } from '../../game-engine';
import type { Character, TalentDef, TalentId } from '../../game-engine';
import { SHOOT_LOOK, TALENT_LOOK, talentAmount, talentDescription, talentLockReason } from './talentDisplay';

const def = (id: TalentId): TalentDef => TALENT_DEFS.find((d) => d.id === id)!;
const hero = (talents: Partial<Record<TalentId, number>> = {}): Character => ({
  level: 20,
  exp: 0,
  starterStats: { physicalDamage: 10, magicDamage: 10, healing: 6, health: 50, trueDamage: 6 },
  currentHealth: 50,
  ownedItemIds: [],
  equippedItemIds: [],
  critChance: 0.01,
  talents,
});

describe('talent icons', () => {
  it('give every node and every shoot an icon and colour', () => {
    for (const d of TALENT_DEFS) expect(TALENT_LOOK[d.id], d.id).toBeDefined();
    expect(Object.keys(SHOOT_LOOK).sort()).toEqual(['damage', 'support', 'tank']);
  });
});

describe('talentDescription', () => {
  it('says what a rank does, per rank for a node with several', () => {
    expect(talentDescription(def('brawn'))).toBe('+3% physical damage per rank.');
    expect(talentDescription(def('last-stand'))).toBe('−5% damage taken while below 25% HP per rank.');
  });

  it('leaves out "per rank" for a single-rank node', () => {
    expect(talentDescription(def('executioner'))).toBe('Crits deal +0.5×.');
    expect(talentDescription(def('blessed'))).toBe('Heal skills can crit, for double healing.');
  });
});

describe('talentAmount', () => {
  it('shows a dash before any rank is learned', () => {
    expect(talentAmount(def('might'), 0)).toBe('—');
  });

  it('adds up a percent stat over its ranks', () => {
    expect(talentAmount(def('brawn'), 1)).toBe('+3%');
    expect(talentAmount(def('brawn'), 3)).toBe('+9%');
    expect(talentAmount(def('leech'), 1)).toBe('+0.5%');
    expect(talentAmount(def('leech'), 2)).toBe('+1%');
  });

  it('adds up a flat stat, and says "each" for Bastion’s pair', () => {
    expect(talentAmount(def('plating'), 2)).toBe('+50');
    expect(talentAmount(def('bastion'), 3)).toBe('+75 each');
  });

  it('adds up a special effect in its own unit', () => {
    expect(talentAmount(def('keen-edge'), 2)).toBe('+0.2×');
    expect(talentAmount(def('weekly-might'), 3)).toBe('+15%');
    expect(talentAmount(def('last-stand'), 2)).toBe('−10%');
    expect(talentAmount(def('scavenger'), 3)).toBe('15%');
    expect(talentAmount(def('renewal'), 2)).toBe('+4%');
  });

  it('names a single-rank node’s effect once learned', () => {
    expect(talentAmount(def('unbroken'), 1)).toBe('10% dodge');
    expect(talentAmount(def('executioner'), 1)).toBe('+0.5×');
    expect(talentAmount(def('blessed'), 1)).toBe('Heal crits');
  });
});

describe('talentLockReason', () => {
  it('names the main node before a locked main node', () => {
    expect(talentLockReason(hero(), def('precision'))).toBe('Needs a rank in Might.');
    expect(talentLockReason(hero({ might: 1 }), def('precision'))).toBeNull();
  });

  it('names the parent of a locked offshoot', () => {
    expect(talentLockReason(hero(), def('keen-edge'))).toBe('Needs a rank in Precision.');
  });

  it('asks for every main node full before a top node', () => {
    expect(talentLockReason(hero({ might: 3 }), def('executioner'))).toBe('Needs every main node full.');
  });

  it('is null for an open node', () => {
    expect(talentLockReason(hero(), def('might'))).toBeNull();
  });
});
