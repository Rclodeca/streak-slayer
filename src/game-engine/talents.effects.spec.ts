import { describe, expect, it } from 'vitest';
import { applyResist } from './boss';
import { resolveBreakpoints, resolveDoom } from './bossSkills';
import {
  bossMissDamage,
  completeHabit,
  habitDamageBreakdown,
  missHabit,
  missQuest,
  resolveBossDefeatIfDead,
  resolvePlayerDeathIfDead,
  reviveWithFeatherIfEquipped,
} from './combat';
import { TUNING } from './constants/tuning';
import { itemBonusPercent, itemFlatBonus, rollScavengerDrop } from './items';
import { addExpAndResolveLevelUps, effectiveCritChance, effectiveStat, itemStatMultiplier } from './leveling';
import { questOverdueExp, questRewardExp } from './quests';
import { createRng } from './rng';
import type { Rng } from './rng';
import type { TalentId } from './constants/talentTree';
import type { Boss, Character, Habit } from './types';

const DAY_KEY = '2026-01-01';
const noCritRng = () => 0.99;
const alwaysCritRng = () => 0;

function makeCharacter(overrides: Partial<Character> = {}): Character {
  const starterStats = { physicalDamage: 10, magicDamage: 10, healing: 6, health: 50, trueDamage: 6 };
  return { level: 1, exp: 0, starterStats, currentHealth: starterStats.health, ownedItemIds: [], equippedItemIds: [], critChance: 0.01, ...overrides };
}

/** A hero with these ranks and these items equipped. Ranks are set directly, whatever the points. */
function hero(talents: Partial<Record<TalentId, number>> = {}, equipped: string[] = [], overrides: Partial<Character> = {}): Character {
  return makeCharacter({ talents, equippedItemIds: equipped, ownedItemIds: equipped, ...overrides });
}

function makeBoss(overrides: Partial<Boss> = {}): Boss {
  return { index: 1, personality: 'balanced', maxHealth: 1000, health: 1000, physicalAttack: 20, magicAttack: 20, armor: 0, magicResist: 0, lifestealPct: 0, ...overrides };
}

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-id',
    name: 'Test Habit',
    period: 'daily',
    difficulty: 'medium',
    damageType: 'physical',
    isBad: false,
    streakCount: 0,
    lastCompletedPeriodKey: null,
    lastCheckedPeriodKey: null,
    ...overrides,
  };
}

/** An rng that hands out `values` in order, then 0.5, and counts its calls. */
function scripted(values: number[]): Rng & { calls: number } {
  const queue = [...values];
  const rng = Object.assign(() => {
    rng.calls += 1;
    return queue.shift() ?? 0.5;
  }, { calls: 0 });
  return rng;
}

/** A boss that always strikes with its physical attack. */
const physicalBoss = (overrides: Partial<Boss> = {}) => makeBoss({ physicalShare: 1, ...overrides });

describe('stat talents', () => {
  it('add to the totals equipped items feed: percent into itemBonusPercent, flat into itemFlatBonus', () => {
    // Soul Lantern is +12% EXP.
    expect(itemBonusPercent(hero({ insight: 2 }, ['soul-lantern']), 'expGain')).toBe(12 + 4);
    expect(itemFlatBonus(hero({ plating: 2, bastion: 1 }), 'armor')).toBe(75);
    expect(itemFlatBonus(hero({ warding: 1, bastion: 1 }), 'magicResist')).toBe(50);
  });

  it('are never doubled by enchanting', () => {
    const enchanted = hero({ insight: 2 }, ['soul-lantern'], { doubledItemIds: ['soul-lantern'] });
    expect(itemBonusPercent(enchanted, 'expGain')).toBe(24 + 4);
  });

  it('raise max health, the damage multipliers, healing and crit chance', () => {
    expect(effectiveStat(hero({ vigor: 3, 'vigor-2': 1 }), 'health')).toBeCloseTo(50 * 1.12, 10);
    expect(itemStatMultiplier(hero({ brawn: 3, might: 2 }), 'physicalDamage')).toBeCloseTo(1 + (9 + 4) / 100, 10);
    expect(itemStatMultiplier(hero({ truestrike: 2, might: 1 }), 'trueDamage')).toBeCloseTo(1 + (8 + 2) / 100, 10);
    expect(itemStatMultiplier(hero({ mending: 3 }), 'healing')).toBeCloseTo(1.09, 10);
    expect(effectiveCritChance(hero({ precision: 3, 'precision-2': 1 }))).toBeCloseTo(0.01 + 0.04, 10);
  });

  it('feed armor pen into a hit against the boss', () => {
    const boss = makeBoss({ armor: 100 });
    const habit = makeHabit();
    const plain = completeHabit(hero(), habit, [habit], boss, DAY_KEY, noCritRng);
    const broken = completeHabit(hero({ 'armor-break': 3 }), habit, [habit], boss, DAY_KEY, noCritRng);
    // Armor Break x3 is 6% off the boss's 100 armor.
    const raw = habitDamageBreakdown(hero(), habit, [habit]).effectiveDamage;
    expect(broken.damageDealt).toBeCloseTo(applyResist(raw, 94), 10);
    expect(plain.damageDealt).toBeCloseTo(applyResist(raw, 100), 10);
  });

  it('feed Leech into lifesteal, which Sever still stops', () => {
    const habit = makeHabit();
    const wounded = (extra: Partial<Character> = {}) => hero({ leech: 2 }, [], { currentHealth: 10, ...extra });
    const healed = completeHabit(wounded(), habit, [habit], makeBoss(), DAY_KEY, noCritRng);
    expect(healed.lifestealHealed).toBeCloseTo(healed.damageDealt! * 0.01, 10);
    const severed = completeHabit(wounded({ statusEffects: [{ type: 'sever', appliedDayKey: DAY_KEY, durationDays: 3 }] }), habit, [habit], makeBoss(), DAY_KEY, noCritRng);
    expect(severed.lifestealHealed).toBeUndefined();
  });

  it('feed armor and magic resist into a boss hit, which Sunder still halves', () => {
    const boss = physicalBoss();
    const raw = bossMissDamage(boss.physicalAttack);
    const habit = makeHabit();
    const plated = missHabit(hero({ plating: 3 }), habit, boss, DAY_KEY, () => 0.5);
    expect(plated.character.currentHealth).toBeCloseTo(50 - applyResist(raw, 75), 10);
    const sundered = missHabit(hero({ plating: 3 }, [], { statusEffects: [{ type: 'sunder', appliedDayKey: DAY_KEY, durationDays: 3 }] }), habit, boss, DAY_KEY, () => 0.5);
    expect(sundered.character.currentHealth).toBeCloseTo(50 - applyResist(raw, 37.5), 10);
  });

  it('count for nothing before a rank is spent', () => {
    const bare = makeCharacter();
    expect(itemBonusPercent(bare, 'allDamage')).toBe(0);
    expect(effectiveStat(bare, 'health')).toBe(50);
  });
});

describe('Weekly Might', () => {
  const weekly = makeHabit({ period: 'weekly' });

  it('multiplies damage from weekly skills on top of the weekly bonus, not from dailies', () => {
    const base = habitDamageBreakdown(hero(), weekly, [weekly]);
    const mighty = habitDamageBreakdown(hero({ 'weekly-might': 3 }), weekly, [weekly]);
    expect(mighty.weeklyMultiplier).toBeCloseTo(base.weeklyMultiplier * 1.15, 10);
    const daily = makeHabit();
    expect(habitDamageBreakdown(hero({ 'weekly-might': 3 }), daily, [daily]).weeklyMultiplier).toBe(1);
  });

  it('does not touch healing from a weekly skill', () => {
    const heal = makeHabit({ period: 'weekly', damageType: 'healing' });
    const wounded = { currentHealth: 5 };
    const plain = completeHabit(hero({}, [], wounded), heal, [heal], makeBoss(), DAY_KEY, noCritRng);
    const mighty = completeHabit(hero({ 'weekly-might': 3 }, [], wounded), heal, [heal], makeBoss(), DAY_KEY, noCritRng);
    expect(mighty.character.currentHealth).toBeCloseTo(plain.character.currentHealth, 10);
  });

  it('stacks with Moonwell', () => {
    const plain = completeHabit(hero({}, ['moonwell']), weekly, [weekly], makeBoss(), DAY_KEY, noCritRng);
    const mighty = completeHabit(hero({ 'weekly-might': 2 }, ['moonwell']), weekly, [weekly], makeBoss(), DAY_KEY, noCritRng);
    expect(mighty.damageDealt! / plain.damageDealt!).toBeCloseTo(1.1, 10);
  });
});

describe('Keen Edge and Executioner', () => {
  const habit = makeHabit();
  const magic = makeHabit({ damageType: 'magic' });
  const dealt = (character: Character, h: Habit) => completeHabit(character, h, [h], makeBoss(), DAY_KEY, alwaysCritRng).damageDealt!;

  it('add to the crit multiplier: 2.7× at full ranks', () => {
    const plain = dealt(hero(), habit);
    expect(dealt(hero({ 'keen-edge': 2, executioner: 1 }), habit) / plain).toBeCloseTo(2.7 / 2, 10);
    expect(dealt(hero({ 'keen-edge': 1 }), habit) / plain).toBeCloseTo(2.1 / 2, 10);
  });

  it('add to Voidcaller’s Scepter’s 3× magic crits: 3.7×', () => {
    const scepter = ['voidcallers-scepter'];
    expect(dealt(hero({ 'keen-edge': 2, executioner: 1 }, scepter), magic) / dealt(hero({}, scepter), magic)).toBeCloseTo(3.7 / 3, 10);
  });

  it('leave a hit that does not crit alone', () => {
    const plain = completeHabit(hero(), habit, [habit], makeBoss(), DAY_KEY, noCritRng).damageDealt;
    expect(completeHabit(hero({ 'keen-edge': 2, executioner: 1 }), habit, [habit], makeBoss(), DAY_KEY, noCritRng).damageDealt).toBe(plain);
  });
});

describe('Blessed', () => {
  const heal = makeHabit({ damageType: 'healing' });
  const healedBy = (character: Character, rng: Rng) => {
    const result = completeHabit(character, heal, [heal], makeBoss(), DAY_KEY, rng);
    return { gain: result.character.currentHealth - character.currentHealth, result };
  };

  it('lets a heal skill crit for double healing, at the hero’s crit chance', () => {
    const wounded = { currentHealth: 5 };
    const plain = healedBy(hero({ blessed: 1 }, [], wounded), noCritRng);
    const crit = healedBy(hero({ blessed: 1 }, [], wounded), alwaysCritRng);
    expect(crit.gain).toBeCloseTo(plain.gain * 2, 10);
    expect(crit.result.healCrit).toBe(true);
    expect(crit.result.wasCrit).toBeFalsy();
    expect(plain.result.healCrit).toBeFalsy();
  });

  it('is flat 2×: Keen Edge and Executioner raise damage crits only', () => {
    const wounded = { currentHealth: 5 };
    const plain = healedBy(hero({ blessed: 1 }, [], wounded), alwaysCritRng);
    const edged = healedBy(hero({ blessed: 1, 'keen-edge': 2, executioner: 1 }, [], wounded), alwaysCritRng);
    expect(edged.gain).toBeCloseTo(plain.gain, 10);
  });

  it('never crits without it, and rolls nothing so the rng sequence is untouched', () => {
    const rng = scripted([0]);
    const { result } = healedBy(hero({}, [], { currentHealth: 5 }), rng);
    expect(result.healCrit).toBeFalsy();
    expect(rng.calls).toBe(0);
  });

  it('is stopped by Blind, as it stops damage crits', () => {
    const blind = { currentHealth: 5, statusEffects: [{ type: 'blind' as const, appliedDayKey: DAY_KEY, durationDays: 3 }] };
    const plain = healedBy(hero({ blessed: 1 }, [], { currentHealth: 5 }), noCritRng);
    const blinded = healedBy(hero({ blessed: 1 }, [], blind), alwaysCritRng);
    expect(blinded.gain).toBeCloseTo(plain.gain, 10);
    expect(blinded.result.healCrit).toBeFalsy();
  });

  it('counts the doubled overheal for Wellspring Crown', () => {
    const full = (talents: Partial<Record<TalentId, number>>) => hero(talents, ['wellspring-crown']);
    const plain = completeHabit(full({ blessed: 1 }), heal, [heal], makeBoss(), DAY_KEY, noCritRng).damageDealt!;
    const crit = completeHabit(full({ blessed: 1 }), heal, [heal], makeBoss(), DAY_KEY, alwaysCritRng).damageDealt!;
    expect(crit).toBeCloseTo(plain * 2, 10);
  });
});

describe('Last Stand', () => {
  const habit = makeHabit();
  const boss = physicalBoss();
  const raw = bossMissDamage(boss.physicalAttack);
  const lost = (character: Character) => character.currentHealth - missHabit(character, habit, boss, DAY_KEY, () => 0.5).character.currentHealth;

  it('cuts boss hits by 5% a rank while below 25% of max HP', () => {
    expect(lost(hero({ 'last-stand': 3 }, [], { currentHealth: 10 }))).toBeCloseTo(raw * 0.85, 10);
    expect(lost(hero({ 'last-stand': 1 }, [], { currentHealth: 10 }))).toBeCloseTo(raw * 0.95, 10);
  });

  it('does nothing at 25% or above', () => {
    expect(lost(hero({ 'last-stand': 3 }, [], { currentHealth: 12.5 }))).toBeCloseTo(raw, 10);
    expect(lost(hero({ 'last-stand': 3 }, [], { currentHealth: 40 }))).toBeCloseTo(raw, 10);
  });

  it('checks health before the hit, and measures against max HP with Vigor', () => {
    // Vigor x3 is 54.5 max; 13 is under 25% of that but not of 50.
    expect(lost(hero({ 'last-stand': 3, vigor: 3 }, [], { currentHealth: 13 }))).toBeCloseTo(raw * 0.85, 10);
    expect(lost(hero({ 'last-stand': 3 }, [], { currentHealth: 13 }))).toBeCloseTo(raw, 10);
  });

  it('applies to a missed quest', () => {
    const quest = { id: 'q', description: 'q', difficulty: 'medium' as const, dueDateKey: DAY_KEY };
    const struck = missQuest(hero({ 'last-stand': 3 }, [], { currentHealth: 10 }), quest, boss, DAY_KEY, () => 0.5);
    expect(10 - struck.character.currentHealth).toBeCloseTo(raw * 0.85, 10);
  });

  it('applies to Rend, Ravage and Doom', () => {
    const rendBoss = makeBoss({ maxHealth: 1000, health: 400, skills: [{ at: 0.5, skill: 'rend' }] });
    const rend = resolveBreakpoints(600, rendBoss, hero({ 'last-stand': 3 }, [], { currentHealth: 10 }), DAY_KEY, () => 0.99);
    expect(rend.fired).toEqual({ skill: 'rend', outcome: 'landed', amount: expect.closeTo(10 * 0.2 * 0.85, 10) });
    const dooming = makeBoss({ doomDueDayKey: DAY_KEY });
    expect(resolveDoom(hero({ 'last-stand': 3 }, [], { currentHealth: 10 }), dooming, DAY_KEY).amount).toBeCloseTo(10 * (TUNING.BOSS_SKILLS.DOOM_PCT / 100) * 0.85, 10);
  });
});

describe('Unbroken', () => {
  const habit = makeHabit();
  const boss = physicalBoss({ lifestealPct: 0.5 });
  const unbroken = () => hero({ unbroken: 1 });

  it('dodges a boss hit on a roll under 10%', () => {
    const struck = missHabit(unbroken(), habit, boss, DAY_KEY, scripted([0.5, 0.5, 0.099]));
    expect(struck.character.currentHealth).toBe(50);
    expect(struck.dodged).toBe(true);
  });

  it('takes the hit on a roll of 10% or more', () => {
    const struck = missHabit(unbroken(), habit, boss, DAY_KEY, scripted([0.5, 0.5, 0.1]));
    expect(struck.character.currentHealth).toBeLessThan(50);
    expect(struck.dodged).toBeFalsy();
  });

  it('never dodges without it, however low the roll', () => {
    const struck = missHabit(hero(), habit, boss, DAY_KEY, () => 0);
    expect(struck.character.currentHealth).toBeLessThan(50);
    expect(struck.dodged).toBeFalsy();
  });

  it('still resets the missed skill’s streak', () => {
    const struck = missHabit(unbroken(), makeHabit({ streakCount: 7 }), boss, DAY_KEY, () => 0);
    expect(struck.dodged).toBe(true);
    expect(struck.updatedHabit.streakCount).toBe(0);
  });

  it('gives the boss no lifesteal, no Bloodlust heal, and does not flag the hero as hurt', () => {
    const hurt = makeBoss({ physicalShare: 1, lifestealPct: 0.5, health: 500, bloodlustDayKey: DAY_KEY });
    const struck = missHabit(unbroken(), habit, hurt, DAY_KEY, () => 0);
    expect(struck.boss.health).toBe(500);
    expect(struck.bossLifestealHealed).toBeUndefined();
    expect(struck.boss.hurtPlayer).toBeUndefined();
  });

  it('does not use up Dawnguard Helm for the day', () => {
    const helm = hero({ unbroken: 1 }, ['dawnguard-helm']);
    const dodged = missHabit(helm, habit, boss, DAY_KEY, () => 0);
    expect(dodged.character.effectDayKeys?.dawnguard).toBeUndefined();
    const hit = missHabit(dodged.character, habit, boss, DAY_KEY, () => 0.5);
    expect(hit.character.effectDayKeys?.dawnguard).toBe(DAY_KEY);
  });

  it('shows a Frenzy crit as no crit when the hit is dodged', () => {
    const frenzied = physicalBoss({ frenzyDayKey: DAY_KEY });
    expect(missHabit(unbroken(), habit, frenzied, DAY_KEY, () => 0).wasCrit).toBe(false);
  });

  it('applies to a missed quest', () => {
    const quest = { id: 'q', description: 'q', difficulty: 'medium' as const, dueDateKey: DAY_KEY };
    const struck = missQuest(unbroken(), quest, boss, DAY_KEY, () => 0);
    expect(struck.dodged).toBe(true);
    expect(struck.character.currentHealth).toBe(50);
  });

  it('rolls once every strike, with or without it, so the rng sequence stays stable', () => {
    const without = scripted([]);
    missHabit(hero(), habit, boss, DAY_KEY, without);
    const withIt = scripted([]);
    missHabit(unbroken(), habit, boss, DAY_KEY, withIt);
    expect(withIt.calls).toBe(without.calls);
    expect(without.calls).toBe(3);
  });
});

describe('Waymark', () => {
  // A streak of 4 checked off reaches the milestone at 5.
  const habit = makeHabit({ streakCount: 4 });
  const milestone = (character: Character) => completeHabit(character, habit, [habit], makeBoss(), DAY_KEY, noCritRng).milestoneExp;

  it('multiplies the EXP a streak milestone pays', () => {
    expect(milestone(hero())).toBe(5);
    expect(milestone(hero({ waymark: 3 }))).toBeCloseTo(5 * 1.15, 10);
  });

  it('stacks with Banner of Endurance', () => {
    expect(milestone(hero({ waymark: 3 }, ['banner-of-endurance']))).toBeCloseTo(5 * 2 * 1.15, 10);
  });
});

describe('Wisdom', () => {
  it('multiplies quest EXP, on top of the Quill', () => {
    const base = questRewardExp(hero(), 'medium', 0);
    expect(questRewardExp(hero({ wisdom: 2 }), 'medium', 0)).toBeCloseTo(base * 1.06, 10);
    expect(questRewardExp(hero({ wisdom: 2 }, ['quill-of-oaths']), 'medium', 0)).toBeCloseTo(base * 2 * 1.06, 10);
  });

  it('carries into an overdue quest’s half pay', () => {
    expect(questOverdueExp(hero({ wisdom: 2 }), 'medium', 0)).toBeCloseTo(questOverdueExp(hero(), 'medium', 0) * 1.06, 10);
  });
});

describe('Insight', () => {
  it('multiplies every EXP grant, the way an EXP item does', () => {
    const { character } = addExpAndResolveLevelUps(hero({ insight: 3 }), 10);
    expect(character.exp).toBeCloseTo(10.6, 10);
  });
});

describe('Renewal', () => {
  const levelUpHeal = (character: Character) => {
    const grown = addExpAndResolveLevelUps({ ...character, currentHealth: 1 }, 25);
    const max = effectiveStat(grown.character, 'health');
    return { pct: ((grown.character.currentHealth - 1) / max) * 100, levels: grown.levelsGained };
  };

  it('adds 2% of max HP a rank to the level-up heal', () => {
    const base = levelUpHeal(hero()).pct;
    expect(base).toBeCloseTo(TUNING.LEVEL_UP_HEAL_PCT, 8);
    expect(levelUpHeal(hero({ renewal: 3, 'renewal-2': 3 })).pct).toBeCloseTo(base + 12, 8);
  });

  it('adds up with Sage’s Codex rather than replacing the base', () => {
    const codex = levelUpHeal(hero({}, ['sages-codex'])).pct;
    expect(codex).toBeCloseTo(TUNING.LEVEL_UP_HEAL_PCT + TUNING.ITEM_EFFECTS.SAGES_INSIGHT_LEVEL_UP_HEAL_PCT, 8);
    expect(levelUpHeal(hero({ renewal: 3, 'renewal-2': 3 }, ['sages-codex'])).pct).toBeCloseTo(codex + 12, 8);
  });
});

describe('Second Wind', () => {
  const dead = () => makeBoss({ health: 0 });
  const wounded = (talents: Partial<Record<TalentId, number>>, equipped: string[] = []) => hero(talents, equipped, { level: 10, currentHealth: 1 });

  it('heals 2% of max HP a rank when a boss falls', () => {
    const result = resolveBossDefeatIfDead(wounded({ 'second-wind': 3 }), dead(), createRng(1));
    const max = effectiveStat(result.character, 'health');
    expect(result.talentHealed).toBeCloseTo(max * 0.06, 8);
    expect(result.itemHealed).toBeUndefined();
  });

  it('stacks with Soul Lantern: 36% with both', () => {
    const result = resolveBossDefeatIfDead(wounded({ 'second-wind': 3 }, ['soul-lantern']), dead(), createRng(1));
    const max = effectiveStat(result.character, 'health');
    expect(result.itemHealed).toBeCloseTo(max * 0.3, 8);
    expect(result.talentHealed).toBeCloseTo(max * 0.06, 8);
  });

  it('is capped at max HP', () => {
    const full = resolveBossDefeatIfDead(hero({ 'second-wind': 3 }, [], { level: 10, currentHealth: 1e9 }), dead(), createRng(1));
    expect(full.talentHealed).toBeUndefined();
  });
});

describe('Scavenger', () => {
  it('rolls once at 5% a rank for one extra item', () => {
    expect(rollScavengerDrop(hero({ scavenger: 3 }), [], () => 0.149)).toHaveLength(1);
    expect(rollScavengerDrop(hero({ scavenger: 3 }), [], () => 0.15)).toHaveLength(0);
    expect(rollScavengerDrop(hero({ scavenger: 1 }), [], () => 0.049)).toHaveLength(1);
  });

  it('rolls nothing, and uses no rng, without it', () => {
    const rng = scripted([0]);
    expect(rollScavengerDrop(hero(), [], rng)).toEqual([]);
    expect(rng.calls).toBe(0);
  });

  it('never repeats an item already dropped or owned', () => {
    const [first] = rollScavengerDrop(hero({ scavenger: 3 }), [], () => 0);
    const [second] = rollScavengerDrop(hero({ scavenger: 3 }, [first.id]), [first], () => 0);
    expect(second.id).not.toBe(first.id);
  });

  it('adds one item past the normal drop when a boss falls', () => {
    const without = resolveBossDefeatIfDead(hero({}, [], { level: 10 }), makeBoss({ health: 0 }), () => 0);
    const withIt = resolveBossDefeatIfDead(hero({ scavenger: 1 }, [], { level: 10 }), makeBoss({ health: 0 }), () => 0);
    expect(withIt.itemsDropped).toHaveLength(without.itemsDropped.length + 1);
    expect(withIt.character.ownedItemIds).toHaveLength(without.character.ownedItemIds.length + 1);
  });
});

describe('a run’s end', () => {
  it('empties the tree when the hero dies', () => {
    const fallen = hero({ might: 3, vigor: 2 }, [], { level: 12, currentHealth: 0, talentsUnlocked: true });
    const { character } = resolvePlayerDeathIfDead(fallen, makeBoss(), [], createRng(1));
    expect(character.talents).toBeUndefined();
    expect(character.talentsUnlocked).toBe(false);
  });

  it('keeps the tree through a Phoenix Feather revive', () => {
    const fallen = hero({ might: 3, vigor: 2 }, ['phoenix-feather'], { level: 12, currentHealth: 0 });
    const { character, revived } = reviveWithFeatherIfEquipped(fallen);
    expect(revived).toBe(true);
    expect(character.talents).toEqual({ might: 3, vigor: 2 });
    expect(character.level).toBe(12);
  });
});
