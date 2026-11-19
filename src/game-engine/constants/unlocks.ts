// The level each feature opens at: one table to retune them all. Once open, a
// feature stays open for good, through death and prestige.
// The level-up popup lists them in this order (LevelUpPopup.vue).

export const UNLOCK_LEVELS = {
  // Placed by the day a typical player reaches them on the 2026-11-18 curve
  // (npm run sim): Talents about day 3, Shop 5, Ult 6, Services 8, Looks 10.
  quests: 2,
  special: 3,
  talents: 5,
  shop: 7,
  ult: 8,
  services: 10,
  looks: 12,
} as const;

export type UnlockId = keyof typeof UNLOCK_LEVELS;
