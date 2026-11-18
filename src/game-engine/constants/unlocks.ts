// The level each feature opens at: one table to retune them all. Once open, a
// feature stays open for good, through death and prestige.
// The level-up popup lists them in this order (LevelUpPopup.vue).

export const UNLOCK_LEVELS = {
  quests: 2,
  special: 4,
  talents: 5,
  shop: 7,
  ult: 8,
  services: 9,
  looks: 10,
} as const;

export type UnlockId = keyof typeof UNLOCK_LEVELS;
