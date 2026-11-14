# Shop Milestone C Implementation Plan (shop services, no level-up events)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the level-up events' lasting rewards into the Shop as gold services (slots, reroll, Overdrive, enchant), hand out Special and Ult automatically at levels 5 and 8, make every trial live from level 1, and delete the level-up event popup.

**Architecture:** Service rules are pure functions in a new `game-engine/services.ts`, priced from `constants/economy.ts` as multiples of the current boss's gold (the Milestone B rule). Per-run service counters live on `Character` (`slotUpgrades`, `serviceBuys`), so a death wipes them for free. A `useServices` composable runs them against the stores, and the Shop tab gets a Services section plus a picker modal for the buys that need a target. Trials are seeded onto `Character.challenges` (already kept through death), so all 17 exist from the first day. The event system is removed last, once nothing depends on it.

**Tech Stack:** Vue 3, Pinia, TypeScript, Vitest, SCSS, Lucide icons.

**Spec:** `docs/ideas/2026-11-13-shop-economy.md` (§4 gold shop, §6 death, §7 trials, decisions 2026-11-14). Build order: `docs/superpowers/plans/2026-11-13-shop-economy.md`. Previous milestone: `docs/superpowers/plans/2026-11-13-shop-milestone-b.md`. Mock: `docs/mockups/shop-tab-2.html` (its Services section).

## Global Constraints

- Gold: lost on death. Services are paid in gold only. Never sold for gold: gems, skill ranks. Nothing random is sold, except that a reroll's result is random by nature.
- Purchases are used immediately. No inventory.
- Death resets the run: slots, rerolls, Overdrive, enchants and their price climbs are lost. Special and Ult are cleared by the death and handed out again at levels 5 and 8 (`resetLevelRewards` already does this).
- Level-up events are removed. A level-up still heals `TUNING.LEVEL_UP_HEAL_PCT`% and is still written to the log.
- Special at level 5, Ult at level 8, handed out. Trials: all 17 available from level 1, no unlock, no card hands them out.
- Persistence goes through the store layer only.
- Tap targets ≥ 44px, nothing behind hover, safe areas respected.
- Player copy is short and mysterious; a service says plainly what it does.
- **Do not push.** Nothing goes live until the whole A–H plan is ready (decided 2026-11-14). Commit per task.

## Decisions taken here (change before starting if wrong)

1. **Item upgrade is left out of C** (user's call, 2026-11-14). It gets its own design later.
2. **All 17 trials are live from the start.** `challenges` is seeded with every trial that isn't held yet, with `takenDayKey` = that day. The Trials unlock popup, `FIRST_TRIAL`, the milestone free trials, the active cap and the "New" tag and pip go. The claim count stays.
3. **Reroll, Overdrive and enchant pick their target** (spec §4: "pick the skill", "pick the item"). Reroll takes any skill, Overdrive a good skill without it, enchant an equipped item that isn't enchanted. A slot needs no pick.
4. **No enchant cap.** `DOUBLE_ITEM_MAX` (2) goes: the climbing price is the limit now.
5. **Prices** are multiples of `bossGold(boss.index)`, rounded to 5, live (not locked). Reroll 2×, Overdrive 5×, enchant 10×, climbing ×1.5, ×1.5 and ×2 for each one already bought this run. Slots come in two steps: 4 → 6 at 15× and 6 → 8 at 30×. Placeholders until playtested.
6. **Slots have no level gate** (the events needed levels 7 and 20). The price is the gate.
7. **Existing saves:** a save that bought slots through events keeps them (`slotUpgrades` is derived from `takenEventIds` once). Pending event picks and the offered cards in an old save are dropped, not paid out. A hero already at level 5 or 8 with no Special or Ult gets it on load.
8. **The enchant reveal screen** ("Enchanted!" with the item) stays, as its own small modal.
9. **No level-up popup.** The level-up line in the log and the heal stay. Nothing else is shown.
10. **Where the slot service sits:** the Shop's Services section, in gold (spec), not the Vault where the old mock had it.

## Review Focus

1. **Death mid-run.** Slots back to 4, climbs back to the first price, Overdrive and enchants gone, Special/Ult cleared and handed out again at 5 and 8. Trials, talents and gems kept. (C1, C5)
2. **Double tap or short on gold.** One tap buys one service; short on gold changes nothing and never goes negative. A target that vanished between open and confirm (skill deleted, item dropped) buys nothing. (C1, C3)
3. **Nothing to pick.** No good skill without Overdrive, no equipped item to enchant, no skill at all, slots already 8: the row says so and can't be bought. (C1, C3)
4. **Old saves.** A save with `takenEventIds: ['item-slots']` keeps 6 slots; one with pending picks loads clean; one at level 9 with no Special or Ult gets both; one with no trials gets all 17. (C4, C5, C6)
5. **Special/Ult need a home.** At level 5 with only weekly skills there's no daily to take Special; it must arrive once a daily skill exists, not be lost. (C5)

---

## File map

- Create `src/game-engine/services.ts`, `services.spec.ts`: service state, prices' use, buys (pure).
- Create `src/composables/useServices.ts`, `useServices.spec.ts`: the store-facing buys and the enchant reveal.
- Create `src/components/shop/ShopServicePicker.vue` (+ `ShopServicePicker.spec.ts`): the pick-a-skill or pick-an-item modal.
- Create `src/components/shop/EnchantReveal.vue`: the "Enchanted!" screen, moved out of `EventChoiceModal`.
- Modify: `constants/economy.ts`, `economy.spec.ts`, `constants/tuning.ts`, `types.ts`, `character.ts`, `items.ts` (`maxEquipSlots`), `shop.ts` (export `standing`), `challenges.ts`, `challenges.spec.ts`, `levelRewards.ts`, `leveling.ts`, `combat.ts`, `index.ts`, `store/index.ts`, `characterStore.ts`, `activityLogStore.ts`, `ActivityLog.vue`, `ShopWares.vue`, `ShopWareRow.vue`, `TrialSection.vue`, `ChallengeList.vue`, `AppShell.vue`, `useModalPriority.ts`, `useCombatActions.ts`, `useHabitStore`/`habitStore.ts`, `useTrialsBadge.ts`, `statIcons.ts`, `PopupPreview.vue`, the theme SCSS that styles the event modal.
- Delete (C6): `events.ts`, `events.spec.ts`, `useEventChoice.ts`, `useEventChoice.spec.ts`, `EventChoiceModal.vue`, `EventChoiceModal.spec.ts`, `TrialUnlockPopup.vue`, `trialSeenStore.ts` (+ spec), `ShopServicePicker` stays.

Run all tests with `npm run test:unit`, or one file with `npx vitest run <path>`. Two `HabitList.spec.ts` hint tests are known to be flaky: rerun them before chasing a failure there. `npx vue-tsc -b` lists compile errors.

---

### Task C1: Service prices and rules

**Files:**
- Modify: `src/game-engine/constants/economy.ts`, `src/game-engine/types.ts`, `src/game-engine/items.ts`, `src/game-engine/shop.ts` (export `standing`), `src/game-engine/index.ts`
- Create: `src/game-engine/services.ts`
- Test: `src/game-engine/services.spec.ts`, `src/game-engine/items.spec.ts`

**Interfaces:**
- Produces in `economy.ts`:
  - `SERVICE_PRICES: Record<'reroll' | 'overdrive' | 'enchant', { base: number; climb: number }>` = `{ reroll: { base: 2, climb: 1.5 }, overdrive: { base: 5, climb: 1.5 }, enchant: { base: 10, climb: 2 } }`
  - `servicePrice(id: 'reroll' | 'overdrive' | 'enchant', bought: number, bossIndex: number): number` = `roundPrice(base * bossGold(bossIndex) * climb ** bought)`
  - `SLOT_PRICE_FACTORS: readonly [15, 30]` and `slotPrice(upgrades: number, bossIndex: number): number | null` (null at 2 upgrades)
- Produces in `types.ts`: `Character.slotUpgrades?: number` (0–2 bought this run; a fresh character has none), `Character.serviceBuys?: { reroll?: number; overdrive?: number; enchant?: number }` (what's been bought this run; a fresh character has none).
- Produces in `items.ts`: `slotUpgradesOf(c: Pick<Character,'slotUpgrades'|'takenEventIds'>): number` — `slotUpgrades` when set, else 2 for `'item-slots-2'` in `takenEventIds`, 1 for `'item-slots'`, else 0. `maxEquipSlots` becomes `4 + 2 * slotUpgradesOf(c)`.
- Produces in `services.ts`:
  - `type ServiceId = 'reroll' | 'overdrive' | 'enchant' | 'slot'`
  - `SERVICE_DEFS: readonly { id: ServiceId; name: string; effect: string; icon: string }[]` — names `Reroll`, `Overdrive`, `Enchant`, `Item slots`; effects `Reroll one skill's damage type.`, `One skill can be used 2 extra times a period.` (from `TUNING.OVERDRIVE_MAX_EXTRA_USES`), `Double one worn item's bonuses.` (from `TUNING.DOUBLED_ITEM_MULTIPLIER`), `Two more item slots.`; icons are `statIcons` keys `reroll`, `streak`, `itemDoubled`, `slots`.
  - `serviceState(character: Character, habits: Habit[], id: ServiceId, bossIndex: number): { price: number; status: 'buy' | 'short' | 'none' | 'maxed'; bought: number }` — `none`: nothing to pick (no skill, no good skill without Overdrive, no enchantable equipped item); `maxed`: slots at 8 (price 0). `bought` is the count this run (`serviceBuys`, or `slotUpgrades` for the slot).
  - `rerollTargets(habits): Habit[]` (every skill), `overdriveTargets(habits): Habit[]` (good, not `isOverdrive`), `enchantTargets(character): ItemDef[]` (= `doublableItems`).
  - `buyReroll(character, habits, habitId, bossIndex, rng): { character: Character; habits: Habit[]; habit: Habit } | null`
  - `buyOverdrive(character, habits, habitId, bossIndex): { character: Character; habits: Habit[]; habit: Habit } | null`
  - `buyEnchant(character, itemId, bossIndex): { character: Character; item: ItemDef } | null`
  - `buySlot(character, bossIndex): { character: Character; slots: number } | null`
  - Every buy returns null when the hero has fallen (`standing`), is short on gold, or the target is not in its targets list. Each takes the price off `gold`, adds one to `serviceBuys` (the slot to `slotUpgrades`) and does nothing else to the character.

- [ ] **Step 1: Write the failing tests** (`services.spec.ts`, helpers from `shop.spec.ts`)
  - `prices climb with each buy`: boss 10 (gold 140), `servicePrice('enchant', 0, 10) === 1400`, `servicePrice('enchant', 1, 10) === 2800`; `servicePrice('reroll', 0, 10) === 280`, `(..., 2, 10) === 630`.
  - `slotPrice(0, 10) === 2100`, `slotPrice(1, 10) === 4200`, `slotPrice(2, 10) === null`.
  - `buyReroll takes the price and changes only that skill's type`: gold 1000, boss 1 → gold `1000 - 100`, `serviceBuys.reroll === 1`, every other habit deep-equal, the chosen one's `damageType` differs.
  - `buyOverdrive sets isOverdrive on the picked skill`, rejects a bad habit and one that already has it (null, gold unchanged).
  - `buyEnchant adds the item to doubledItemIds`, rejects an item that isn't equipped or is already enchanted; a fifth enchant is allowed (no cap).
  - `buySlot goes 4 → 6 → 8 then refuses`; a character with `takenEventIds: ['item-slots']` and no `slotUpgrades` buys from 6 to 8 and `slotUpgrades` becomes 2.
  - `short on gold buys nothing` for all four (null).
  - `a fallen hero buys nothing` (`currentHealth: 0`).
  - `serviceState reads none / maxed / short / buy` for the four cases in Review Focus 3.
  - `items.spec.ts`: `maxEquipSlots({ slotUpgrades: 1 }) === 6`, `({ takenEventIds: ['item-slots-2'] }) === 8`, `({}) === 4`.
- [ ] **Step 2: Run, expect FAIL** (`npx vitest run src/game-engine/services.spec.ts src/game-engine/items.spec.ts`: module not found / not a function)
- [ ] **Step 3: Implement.** `services.ts` follows `shop.ts`: gold comes from `characterGold`, `standing` is exported from `shop.ts`. Rerolling reuses `rerollDamageType(habit, rng, true, excludeHealing, heroClass)` with `excludeHealing = !healingAllowed(others, habits.length)`, exactly as `applyRerollSkillEvent` does today. Enchanting appends to `equippedDoubledItemIds(character)` like `applyDoubleItemEvent`. Overdrive sets `{ ...habit, isOverdrive: true }`.
- [ ] **Step 4: Run, expect PASS**; run `npx vue-tsc -b` for the export changes.
- [ ] **Step 5: Commit** `Add shop services: slots, reroll, Overdrive and enchant, priced by the boss and climbing`

---

### Task C2: Buying services against the stores

**Files:**
- Create: `src/composables/useServices.ts`, `src/composables/useServices.spec.ts`
- Modify: `src/store/activityLogStore.ts`, `src/components/ui/ActivityLog.vue` (entries: reuse `skill-rerolled`, `overdrive-granted`, `item-doubled`, `item-slots-gained`; each gains optional `gold?: number`, shown with the gold icon the way `boss-defeated` does)
- Test: `src/composables/useServices.spec.ts`, `src/components/ui/ActivityLog.spec.ts`

**Interfaces:**
- Consumes: everything `services.ts` produces (C1).
- Produces: `useServices(): { state(id: ServiceId): ReturnType<typeof serviceState>; buyReroll(habitId: string): boolean; buyOverdrive(habitId: string): boolean; buyEnchant(itemId: string): boolean; buySlot(): boolean; revealed: Ref<ItemDef | null>; dismissReveal(): void }`.
  - Each `buy*` runs the pure buy, writes the character (and `habitStore.setHabits` for the skill buys), logs one entry with the gold paid, and returns false (nothing spent) on null.
  - `buyEnchant` also sets `revealed` and calls `reportChallenge({ type: 'enchanted' })` (from `useCombatActions`), after the buy is written.
  - `revealed` is module-scoped, like `useItemDropQueue`'s state, because the reveal modal is mounted once.

- [ ] **Step 1: Write the failing tests** (`useServices.spec.ts`, with a real Pinia as `useShop.spec.ts` does)
  - `buyEnchant pays, enchants, logs and reveals`: gold and `doubledItemIds` change, one `item-doubled` log entry with the gold, `revealed.value?.id` is the item, and the `enchant` trial (held on the character) is done and unclaimed.
  - `a double tap buys once`: two `buySlot()` calls with gold for one return `true, false`; slots 6.
  - `buyReroll on a skill deleted meanwhile buys nothing`: the habit id isn't in the store → false, gold unchanged.
  - `short on gold`: false, no log entry.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.** The double-tap guard: a pure buy can't repeat on its own for skills and items (the second call fails its target or gold check) but `buySlot` can if gold covers two steps, so it needs no guard; the climb already prices the second.
- [ ] **Step 4: Run both spec files, expect PASS**
- [ ] **Step 5: Commit** `Run the shop services against the stores and log what they cost`

---

### Task C3: Services on the Shop tab

**Files:**
- Create: `src/components/shop/ShopServicePicker.vue`, `ShopServicePicker.spec.ts`, `EnchantReveal.vue`
- Modify: `src/components/shop/ShopWares.vue`, `ShopWareRow.vue` (`kind` gains `'service'`; a small `climb` line, `Bought N this run`, under the text when N > 0), `src/components/layout/AppShell.vue` (mount `EnchantReveal`), `src/composables/useModalPriority.ts` (`enchantRevealVisible`), `src/components/ui/statIcons.ts` if an icon is missing, theme SCSS for the new rows/picker (copy the look of `.shop-ware-row` and the old event modal's reroll list)
- Test: `ShopServicePicker.spec.ts`, `ShopSection.spec.ts`, `useModalPriority.spec.ts`

**Interfaces:**
- Consumes: `useServices` (C2), `SERVICE_DEFS`, `rerollTargets`, `overdriveTargets`, `enchantTargets`.
- Produces: `ShopServicePicker` props `{ modelValue: boolean; service: 'reroll' | 'overdrive' | 'enchant' }`, emits `update:modelValue`. A modal: the target list (skills grouped Daily/Weekly with `RerollSkillRow`; items as the Hero tab's item rows), tap to pick, a confirm button `Reroll {name}` / `Overdrive {name}` / `Enchant {name}` showing the price, disabled with `Pick a skill` / `Pick an item` until picked. Confirming calls the `useServices` buy and closes.
- `useModalPriority()` also returns `enchantRevealVisible`: `revealed !== null` and none of the higher-priority popups showing (same list as `eventChoiceVisible` today).

- [ ] **Step 1: Write the failing tests**
  - `ShopSection.spec.ts`: the Shop side lists `Services` with four rows (`Reroll`, `Overdrive`, `Enchant`, `Item slots`) after the tonics and before the restock note; a row short on gold reads as short; `Item slots` at 8 reads `Full`; with no skill, Reroll reads `No skills`.
  - `ShopServicePicker.spec.ts`: confirm is disabled until a target is tapped; tapping a picked target again unpicks it; confirming Overdrive on a skill sets `isOverdrive` in the habit store and closes; the enchant list shows only worn, unenchanted items.
  - `useModalPriority.spec.ts`: `enchantRevealVisible` is false while an item drop is showing.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.** Row copy: the def's `effect` as text, label `Bought {n}` is replaced by the price climbing, so no pips (the mock's pips are left out). The slot row's text names the step: `4 → 6 slots`. Item slots buys in one tap, no picker.
- [ ] **Step 4: Run the three spec files, expect PASS**
- [ ] **Step 5: Commit** `Sell reroll, Overdrive, enchant and item slots in the Shop's Services section`

---

### Task C4: Every trial live from level 1

**Files:**
- Modify: `src/game-engine/challenges.ts`, `src/game-engine/types.ts` (comments), `src/game-engine/index.ts`, `src/game-engine/combat.ts` (`resolvePlayerDeathIfDead` stops carrying `trialsUnlocked`), `src/game-engine/character.ts` (drop `trialsUnlocked: false`), `src/store/index.ts`, `src/store/characterStore.ts` (drop `unlockTrials`), `src/composables/useCombatActions.ts` (drop the `milestoneTrial` call), `src/components/quests/TrialSection.vue`, `ChallengeList.vue`, `src/components/layout/AppShell.vue`, `src/composables/useTrialsBadge.ts`, `src/composables/useModalPriority.ts`
- Delete: `TrialUnlockPopup.vue`, `SealedNotice` use in `TrialSection` (the component stays: the Vault uses it), `src/store/trialSeenStore.ts` + spec
- Test: `src/game-engine/challenges.spec.ts`, `src/store/index.spec.ts`, `src/game-engine/combat.spec.ts`

**Interfaces:**
- Produces: `seedChallenges(character: Character, todayKey: string): Character` — adds an entry (`takenChallenge` shape: `{ id, takenDayKey: todayKey, progress: 0 }`) for every `CHALLENGE_DEFS` id the character doesn't hold; the same character back when it holds all of them.
- Removes: `TRIALS_UNLOCK_LEVEL`, `FIRST_TRIAL`, `TRIAL_MILESTONE_BOSSES`, `MILESTONE_ACTIVE_CAP`, `trialsOpen`, `trialUnlockPending`, `unlockTrials`, `migrateTrialUnlock`, `milestoneTrial`, `offerableChallenges`, `drawChallenge`, `takeChallenge` (the event used them), and `Character.trialsUnlocked`.
- `initializeStores` seeds trials after the save loads, using today's key. After a death the carried `challenges` already hold all 17, so nothing is added. A character with a trial missing (a new trial added later) is topped up on load.

- [ ] **Step 1: Write the failing tests**
  - `challenges.spec.ts` › `seedChallenges gives every trial once`: from `challenges: undefined` → 17 entries, all `progress: 0`, `takenDayKey` today; a second call returns the same object; an existing finished entry (`rank-up`, done) is untouched.
  - `store/index.spec.ts` › `a new account starts with every trial live` and `an old save with two trials gets the other fifteen and keeps its two entries unchanged`.
  - `combat.spec.ts`: the death test keeps all 17 entries (replace the one that checked `trialsUnlocked`).
  - `challenges.spec.ts` › `a trial taken today counts today's events`: seed, then `applyChallengeEvent(..., { type: 'rank-up' }, today)` completes `rank-up` (the handlers need no change).
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.** `TrialSection` is just the header and `ChallengeList`; no seal. The stage's Trials button and the menu entry show from level 1 (`trialsButton`/`trialsInMenu` drop `trialsOpen`). `useTrialsBadge` keeps only `claimCount`; remove `newTrial`, the `New` tag in `ChallengeList` and the debug pip toggle that fed it. Old comments saying "per run", "taken from the side-quest card" and "unlock" are rewritten.
- [ ] **Step 4: Run `npm run test:unit`, then `npx vue-tsc -b`, expect PASS**
- [ ] **Step 5: Commit** `Make every trial live from level 1 and drop the Trials unlock`

---

### Task C5: Special at level 5, Ult at level 8, handed out

**Files:**
- Modify: `src/game-engine/constants/tuning.ts` (`SPECIAL_LEVEL: 5`, `ULT_LEVEL: 8`, comments no longer say "event"), `src/game-engine/levelRewards.ts`, `src/game-engine/index.ts`, `src/composables/useCombatActions.ts`, `src/store/habitStore.ts`, `src/store/index.ts`
- Test: `src/game-engine/levelRewards.spec.ts`, `src/composables/useCombatActions.spec.ts`, `src/store/habitStore.spec.ts`, `src/store/index.spec.ts`

**Interfaces:**
- Produces: `grantLevelRewards(habits: Habit[], level: number, rng: Rng): { habits: Habit[]; special?: Habit; ult?: Habit }` — runs `assignSpecialIfEligible` then `assignUltIfEligible`; the same `habits` array back when nothing is granted; `special`/`ult` name the habit that just got it.
- Call sites: after every level gain in `useCombatActions` (the four places that call `grantEventPicks` today, replaced by one `handOutLevelRewards()` that reads the current level), after a habit is added or its period changed (`habitStore`, so a daily skill added at level 5 takes the Special, Review Focus 5), and once on load in `initializeStores` (Decision 7). Each grant writes `special-assigned` / `ult-assigned` to the log.

- [ ] **Step 1: Write the failing tests**
  - `levelRewards.spec.ts` › `grantLevelRewards`: level 4 grants nothing and returns the same array; level 5 with one daily and one weekly grants only the Special; level 8 grants the Ult; level 8 with only dailies grants the Special alone and the Ult stays open; a second call grants nothing.
  - `useCombatActions.spec.ts`: a kill that takes the hero from level 4 to 5 sets `isSpecial` on a daily good skill and logs `special-assigned`.
  - `habitStore.spec.ts`: at level 8 with only weekly skills, adding a daily skill gives it the Special (no Ult change).
  - `index.spec.ts`: a save at level 9 with neither flag loads with both granted once (reload grants nothing new).
  - `a death clears them and level 5 hands them out again` (`resolvePlayerDeathIfDead` then `grantLevelRewards` at level 5).
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.** The habit store needs the character level: take it as an argument to the hand-out function the store action calls, with the component or composable that adds a habit passing it (follow how the add flow already reaches `useCombatActions.reportChallenge`).
- [ ] **Step 4: Run the four spec files, expect PASS**
- [ ] **Step 5: Commit** `Hand out Special at level 5 and Ult at level 8`

---

### Task C6: Retire the level-up events

**Files:**
- Delete: `src/game-engine/events.ts`, `events.spec.ts`, `src/composables/useEventChoice.ts`, `useEventChoice.spec.ts`, `src/components/events/EventChoiceModal.vue`, `EventChoiceModal.spec.ts`, and `grantEventPicks` in `useCombatActions.ts`
- Modify: `src/game-engine/leveling.ts` (take `applyCritBoostEvent` and `applyHealBoostEvent` from `events.ts`, renamed `applyCritBoost` and `applyHealBoost` beside `applyExpBoost`), `src/game-engine/shop.ts` (imports), `src/game-engine/types.ts` (remove `takenEventIds`, `pendingEventPicks`, `offeredEventIds`, `offeredChallengeId`, `sideQuestPicksMissed` from the type), `src/game-engine/character.ts`, `src/game-engine/items.ts` (`slotUpgradesOf` no longer reads `takenEventIds`), `src/game-engine/constants/tuning.ts` (remove `SIDE_QUEST_GUARANTEE_LEVELS`, `DOUBLE_ITEM_MAX`, `DOUBLE_ITEM_MIN_LEVEL`, `EVENT_HEAL_PCT` if unused), `src/game-engine/index.ts`, `src/store/index.ts`, `src/composables/useModalPriority.ts`, `src/components/layout/AppShell.vue`, `src/components/ui/statIcons.ts` (`EVENT_ICON`), `src/components/debug/PopupPreview.vue`, the theme SCSS blocks for the event modal
- Test: `src/store/index.spec.ts`, `src/composables/useModalPriority.spec.ts`

**Interfaces:**
- Produces: `migrateLevelEvents(character: Character): Character` in `character.ts` — for a save that still carries `takenEventIds`, sets `slotUpgrades` (2 for `'item-slots-2'`, 1 for `'item-slots'`, else 0, unless it is already set) and removes `takenEventIds`, `pendingEventPicks`, `offeredEventIds`, `offeredChallengeId` and `sideQuestPicksMissed`; the same character back when none are present. It reads the old fields through a loose cast, since the type no longer has them. It replaces `migrateEventState` in `initializeStores`, and `slotUpgradesOf` becomes `character.slotUpgrades ?? 0`.

- [ ] **Step 1: Write the failing tests**
  - `index.spec.ts` › `a save with item-slots keeps 6 slots`, `a save with pending picks and offered cards loads without them`, `a save with no old fields is untouched`.
  - `useModalPriority.spec.ts`: drop the event cases; the enchant reveal case from C3 stays.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.** Do the moves before the deletes: `leveling.ts` gets the boosts, `shop.ts` points at them, then delete `events.ts` and follow `npx vue-tsc -b` to the rest. Remove `takenEventIds` from `createCharacter`. Anything the compiler flags that still names an event (log text, comments, `ActivityLog` entry kinds whose only source was the events: `event-heal`, `heal-boost-gained`, `crit-boost-gained` are also written by the shop, so they stay) is reworded, not deleted blindly.
- [ ] **Step 4: Run `npm run test:unit`, `npm run lint`, `npx vue-tsc -b`, expect PASS**
- [ ] **Step 5: Commit** `Remove the level-up events: their rewards are Shop services or handed out`

---

### Task C7: Docs and the full pass

**Files:**
- Modify: `docs/ideas/2026-11-13-shop-economy.md` (decisions log: C built, upgrade deferred; §4 table marks Item upgrade as not built), `docs/superpowers/plans/2026-11-13-shop-economy.md` (Milestone C row: built, with the item upgrade left for later), `docs/superpowers/plans/2026-11-13-shop-milestone-b.md` (its "Left for later" line points at this plan)

- [ ] **Step 1: Update the three docs** as above, one line each.
- [ ] **Step 2: Run `npm run test:unit`, `npm run lint`, `npm run build`, expect PASS** (rerun the two flaky `HabitList.spec.ts` hint tests before chasing them).
- [ ] **Step 3: Update the memory** (`project_shop_economy.md`): C built, not pushed, item upgrade deferred.
- [ ] **Step 4: Commit** `Record Milestone C in the shop plan`

---

### Milestone C done when

- [ ] `npm run test:unit`, `npm run lint`, `npm run build` all pass.
- [ ] In the dev server: level to 5 and 8 and see Special and Ult land with a log line; no popup on a level-up; the Shop's Services buy a slot, reroll a skill, Overdrive a skill and enchant an item (with the reveal), each price climbing; die and see slots 4, prices reset, Special and Ult cleared, trials kept.
- [ ] **Do not push.** Next is Milestone D (the Vault), planned from the code as it stands.
