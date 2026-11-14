// Entry point for the Pinia layer: creates the Pinia instance, and exposes
// `initializeStores()` to hydrate all four stores from a save (or bootstrap
// fresh) and wire up debounced localStorage persistence.

import { createPinia, getActivePinia, setActivePinia, type Pinia } from 'pinia';
import { applyBossAttackEase, applyRankRebalance, createRng, dailyPeriodKey, migrateLevelEvents, grantLevelRewards, migrateQuestUnlock, pruneFrozenDays, seedChallenges } from '../game-engine';
import { useAccountStore } from './accountStore';
import { useActivityLogStore } from './activityLogStore';
import { useBossStore } from './bossStore';
import { useCharacterStore } from './characterStore';
import { useDebugClockStore } from './debugClockStore';
import { useHabitStore } from './habitStore';
import { useHighScoreStore } from './highScoreStore';
import { useHintStore } from './hintStore';
import { useQuestStore } from './questStore';
import { setupAccountTracking } from './plugins/accountTracking';
import { setupHighScoreTracking } from './plugins/highScoreTracking';
import { setupPersistence } from './plugins/localStoragePersistence';
import { loadSaveState } from './plugins/saveState';

export const pinia = createPinia();

/**
 * Loads any existing save (starting fresh on a schema mismatch or no save),
 * hydrates all four stores from it using a single shared `Rng` for this
 * session, and registers the debounced persistence subscriptions.
 *
 * Defaults to whichever Pinia instance is currently active (e.g. one a test
 * set up via `setActivePinia(createPinia())` before calling this), falling
 * back to this module's own `pinia` singleton only if none is active — so
 * this never silently overrides a caller's own active instance.
 */
export function initializeStores(targetPinia: Pinia = getActivePinia() ?? pinia) {
  setActivePinia(targetPinia);

  const saved = loadSaveState();
  const rng = createRng();

  const characterStore = useCharacterStore(targetPinia);
  const bossStore = useBossStore(targetPinia);
  const habitStore = useHabitStore(targetPinia);
  const activityLogStore = useActivityLogStore(targetPinia);
  const questStore = useQuestStore(targetPinia);
  const accountStore = useAccountStore(targetPinia);

  // Wired up BEFORE the initFromSave calls below (not after), so a
  // one-time, in-place migration those calls perform (e.g.
  // applyDamagePoolRebalance, applyRankRebalance, migrateCharacter's trueDamage
  // backfill, migrateHabitDamageType, migrateHabitRank) gets captured by the debounced writer immediately instead of
  // only persisting on some later, unrelated mutation — otherwise a player
  // who closes the tab right after load, before anything else mutates
  // state, would never persist the migration and it would silently
  // re-apply (and for applyDamagePoolRebalance, re-cut) on the next load.
  // setupHighScoreTracking stays AFTER initFromSave below (unlike
  // setupPersistence) — it reads bossStore.boss.index immediately at setup
  // time, so wiring it early would record the pre-hydration default boss
  // (index 1) instead of the actually-loaded one.
  setupPersistence(targetPinia);

  characterStore.initFromSave(saved?.character ?? null, rng);
  bossStore.initFromSave(saved?.boss ?? null, rng);
  habitStore.initFromSave(saved?.habits ?? null, rng);
  activityLogStore.initFromSave(saved?.activityLog ?? null);
  questStore.initFromSave(saved?.quests ?? null);
  // A save from before accounts is paid its past milestones from its best
  // level so far: this run's, or a finished run's on the high-score list.
  const bestRunLevel = Math.max(0, ...useHighScoreStore(targetPinia).topRuns.map((run) => run.level));
  accountStore.initFromSave(saved?.account ?? null, Math.max(characterStore.character.level, bestRunLevel));
  // Frozen days long past are dropped from each skill's streak freeze.
  const loadDayKey = dailyPeriodKey(useDebugClockStore(targetPinia).now());
  const pruned = habitStore.habits.map((habit) => pruneFrozenDays(habit, loadDayKey));
  if (pruned.some((habit, i) => habit !== habitStore.habits[i])) habitStore.setHabits(pruned);
  const rebalanced = applyRankRebalance(characterStore.character, bossStore.boss);
  characterStore.setCharacter(rebalanced.character);
  bossStore.setBoss(rebalanced.boss);
  const eased = applyBossAttackEase(characterStore.character, bossStore.boss);
  characterStore.setCharacter(eased.character);
  bossStore.setBoss(eased.boss);
  characterStore.setCharacter(migrateLevelEvents(characterStore.character));
  characterStore.setCharacter(migrateQuestUnlock(characterStore.character, questStore.quests.length > 0));
  // A save from before Special and Ult were handed out: a hero at level 5 or 8 that holds none gets it now.
  habitStore.setHabits(grantLevelRewards(habitStore.habits, characterStore.character.level, rng).habits);
  // Every trial is live from the start; a load tops up any the save doesn't hold.
  characterStore.setCharacter(seedChallenges(characterStore.character, dailyPeriodKey(useDebugClockStore(targetPinia).now())));

  setupHighScoreTracking(targetPinia, dailyPeriodKey(useDebugClockStore(targetPinia).now()));
  // After hydration too: wired earlier, loading the save's character would
  // read as a level-up and log gems for it.
  setupAccountTracking(targetPinia);
  useHintStore(targetPinia).settle(habitStore.habits.length > 0);

  return { characterStore, bossStore, habitStore, activityLogStore, questStore, accountStore };
}

export { useActivityLogStore, useBossStore, useCharacterStore, useHabitStore };
export { useQuestStore } from './questStore';
export { useHighScoreStore } from './highScoreStore';
