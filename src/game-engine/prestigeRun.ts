// The prestige reset (docs/superpowers/specs/2026-11-17-prestige-design.md §4):
// the player's chosen new run. It takes what a death used to: level, gold,
// items, slots and the boss back to 1. Talents, skill ranks, streaks, trials
// and every unlocked feature stay, and the account pays the rank's gems and special.

import type { Account } from './account';
import { bossAttackAnchorHealth, generateBoss } from './boss';
import { createCharacter, heroClassFor } from './character';
import { PRESTIGE_GEMS } from './constants/economy';
import { rerollAllDamageTypes, resetLevelRewards } from './habits';
import { effectiveStat } from './leveling';
import { canPrestige, MAX_PRESTIGE, PRESTIGE_RANKS, prestigeRank } from './prestige';
import type { Rng } from './rng';
import { MYTHIC_SKIN_IDS } from './skins';
import type { Boss, Character, Habit } from './types';

/**
 * Starts the next rank's run, or null unless canPrestige. A fresh character
 * rolled as the current class (the new-hero screen offers it first), keeping
 * talents, trials and every feature already unlocked (Quests, Talents, the Shop's gates), at the new rank and full health.
 * The boss sequence restarts at 1. Habits keep their streaks and ranks, with
 * damage types re-rolled and Special/Ult/Overdrive cleared, to be earned again.
 */
export function prestigeRun(
  character: Character,
  boss: Boss,
  habits: Habit[],
  rank: number,
  rng: Rng,
): { character: Character; boss: Boss; habits: Habit[] } | null {
  if (!canPrestige(character, rank)) return null;
  const kept: Character = {
    ...createCharacter(rng, heroClassFor(character)),
    talents: character.talents,
    questsUnlocked: character.questsUnlocked,
    talentsUnlocked: character.talentsUnlocked,
    shopUnlocked: character.shopUnlocked,
    servicesUnlocked: character.servicesUnlocked,
    looksUnlocked: character.looksUnlocked,
    trials: character.trials,
    prestige: rank + 1,
  };
  const fresh = { ...kept, currentHealth: effectiveStat(kept, 'health') };
  return {
    character: fresh,
    boss: generateBoss(1, rng, undefined, bossAttackAnchorHealth(1, fresh.starterStats.health, fresh.level), boss),
    habits: rerollAllDamageTypes(habits, rng, heroClassFor(fresh)).map(resetLevelRewards),
  };
}

/**
 * The account after a prestige: one rank up and PRESTIGE_GEMS paid, plus the
 * new rank's special (a free dungeon at I and III, every Mythic skin at V;
 * Deeper roots needs nothing stored). The same object at MAX_PRESTIGE.
 */
export function prestigeAccount(account: Account): Account {
  const rank = prestigeRank(account);
  if (rank >= MAX_PRESTIGE) return account;
  const special = PRESTIGE_RANKS[rank].special;
  const next: Account = { ...account, prestige: rank + 1, gems: account.gems + PRESTIGE_GEMS };
  if (special === 'dungeon') next.freeDungeons = (account.freeDungeons ?? 0) + 1;
  if (special === 'mythic-skin') {
    const owned = account.ownedSkinIds ?? [];
    next.ownedSkinIds = [...owned, ...MYTHIC_SKIN_IDS.filter((id) => !owned.includes(id))];
  }
  return next;
}
