// The level each feature opens at, each run: one table to retune them all.
// The level-up popup lists them in this order (LevelUpPopup.vue).

export const UNLOCK_LEVELS = {
  quests: 2,
  talents: 5,
  special: 5,
  ult: 8,
} as const;

export type UnlockId = keyof typeof UNLOCK_LEVELS;
