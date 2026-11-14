# Shop Milestone D Implementation Plan (the Vault)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the Vault: a gem revive on the death screen (the Phoenix Feather's leftover code goes), a streak freeze set up in advance, a rotating gem stock from the item catalog and a capped Gold Pouch. Boss drops also get rarer.

**Architecture:** Gem rules are pure functions. The revive lives in `combat.ts`, the freeze in `account.ts` (frozen days are account state, kept through death) and the Vault stock and pouch in a new `vault.ts` beside `shop.ts`. Per-run marks (`revivedAtBoss`, `vault`, `pouchDayKey`) live on `Character`, so a death wipes them for free. A frozen day makes every skill rest: `isDueOn` takes the frozen days, so the rollover, check-offs and the habit list all follow without new rules. `useVault` runs the buys against the stores, and the Vault side of the Shop tab replaces the "vault is shut" notice.

**Tech Stack:** Vue 3, Pinia, TypeScript, Vitest, SCSS, Lucide icons.

**Spec:** `docs/ideas/2026-11-13-shop-economy.md` (§3 Vault, §6 death, §9 drops, §12 open questions). Build order: `docs/superpowers/plans/2026-11-13-shop-economy.md`. Previous milestone: `docs/superpowers/plans/2026-11-14-shop-milestone-c.md`. Mock: `docs/mockups/shop-tab-2.html` (A's Vault: featured on velvet, then "For good" and "For this run").

## Global Constraints

- Gems: kept forever, finite free supply. Free gems must still cover the whole tree plus one skin and two revives (`economy.spec.ts`).
- Revive: one fixed gem price that never climbs, offered on the death screen.
- Streak freeze: set up **in advance**. Frozen days don't add to a streak and never save one after a miss.
- Purchases are used immediately. No inventory. Gem-bought items are lost on death, and the row says so before the buy.
- Nothing random is sold: the Vault sells named items, so the player sees what they buy.
- Persistence goes through the store layer only.
- Tap targets ≥ 44px, nothing behind hover, safe areas respected.
- Player copy is short and mysterious; a ware says plainly what it does.
- **Do not push.** Nothing goes live until the whole A–H plan is ready. Commit per task.

## Decisions taken here (change before starting if wrong)

1. **One revive per boss** (user's pick, 2026-11-14). After a revive, dying to the same boss is final. The limit resets when that boss dies.
2. **The freeze is sold for gems only** (user's pick). No gold freeze.
3. **The Vault stock comes from the existing catalog** (user's pick). Shop-only exclusives wait for their own design and a Pixellab run.
4. **Drops: fewer items per boss** (user's pick), with the same rarity odds. A boss kill drops on 2 kills in 3, and boss 1 always drops (the first find of every run stays). The count is 1, or 2 from boss 4 on (the cap falls from 3 to 2). Scavenger is unchanged.
5. **Revive:** 10 gems, back at half max health, against the same boss, with nothing else changed. It appears on the bonfire screen above "Rise again". The old `ReviveNotice` toast is kept with new copy.
6. **Freeze rules** (changed after the build, 2026-11-14: the user made the freeze per skill):
   - A freeze is bought for **one skill**, picked in the picker. Only that skill rests. Bad habits can't be frozen: they never miss on their own.
   - A daily freezes by the day: 1 to 7 days, from tomorrow at the earliest and no more than 30 days out.
   - A weekly freezes by the whole week: 1 to 4 weeks, from next week at the earliest and no more than 4 weeks out. A week under way can't be frozen.
   - Each frozen day or week costs 2 gems. Periods already frozen aren't charged again. There's no cancel and no refund.
   - A frozen skill can't be checked, has no miss, and its streak neither grows nor breaks. The freeze lives on the skill (`Habit.frozenDayKeys`), so a death keeps it, and deleting the skill loses it.
   - The rollover looks back past frozen periods, so a freeze never hides a real miss on the day before it.
   - Quests, the Doom and trials are not touched, except that Perfect day leaves out a skill frozen that day.
7. **Vault stock:** a new draw every 3 days, and after a death. It holds an epic or relic on velvet (a relic 1 time in 3 when one is left) and one rare in the rows. Prices: rare 5, epic 10, relic 15 gems. It draws only unowned items that aren't in the gold shop's stock, by the same level rule as the gold shop.
8. **Gold Pouch:** 5 gems for 3 boss kills' gold at the current boss, once a day. The pouch's day mark is on `Character`, so a death resets it, but the gold it bought is lost with the death anyway.
9. **The death screen** offers no "get gems" link yet. The Store comes with Milestone G.
10. **Copy:**
    - Revive button: `Revive` with the gem price; under it, `Half health. Once per foe.`
    - Freeze row: `Skills rest on the days you pick. Streaks hold, but don't grow.`
    - Pouch row: `{gold} gold, now. Once a day.`
    - Vault sections: `For good` (sub line `Never lost`) and `For this run` (sub line `Lost when you fall`).
    - The shopkeeper's Vault line goes from `Gems. Not yet.` to `Gems. Now we talk.` (the mock).

## Review Focus

1. **A freeze bought for today.** A late-night buy for the day under way is refused, and so is any start before tomorrow (next week, for a weekly). A frozen day never turns a miss already detected into a rest. (D4)
2. **Revive twice.** A double tap spends 10 gems once. A second death to the same boss offers only "Rise again". A revive with 9 gems is disabled and spends nothing. (D2)
3. **Death.** It wipes the Vault stock, the pouch mark and the revive mark. Frozen days, gems, trials and talents are kept. (D2, D3, D4)
4. **Revive and queued hits** (added after the build). A revive is offered only once every hit queued that day has landed: the missed-quest popup shows over a death and the death screen waits for it, and a due Doom on a fallen hero is spent without a hit.
5. **Old saves.** An account with no `frozenDayKeys` and a character with no `vault`, `pouchDayKey` or `revivedAtBoss` load unchanged. An exported save round-trips the frozen days. (D3, D4)

---

## File map

- Create `src/game-engine/vault.ts`, `vault.spec.ts`: the Vault stock, its buys and the pouch (pure).
- Create `src/composables/useVault.ts`, `useVault.spec.ts`: the Vault run against the stores, and the freeze buy.
- Create `src/components/shop/VaultWares.vue`, `FreezePicker.vue` (+ `FreezePicker.spec.ts`).
- Modify:
  - Engine: `constants/economy.ts`, `economy.spec.ts`, `constants/tuning.ts`, `types.ts`, `account.ts`, `combat.ts`, `items.ts`, `habits.ts`, `time.ts`, `shop.ts` (export the stock pool rule), `index.ts`.
  - Composables: `useCombatActions.ts`, `useDailyRollover.ts`, `useMissedSkillsGate.ts` (comment).
  - Stores: `accountStore.ts`, `activityLogStore.ts`, `store/index.ts`.
  - Components: `ActivityLog.vue`, `DeathScreen.vue`, `ReviveNotice.vue`, `ShopCounter.vue`, `ShopScene.vue`, `ShopFeatured.vue`, `ShopWareRow.vue`, `ShopBuyButton.vue`, `HabitList.vue`, `HabitListItem.vue`, `ProgressSummary.vue`, `TabBar.vue`, `statIcons.ts`.
  - Styles: the theme SCSS for the new rows and picker.

Run all tests with `npm run test:unit`, or one file with `npx vitest run <path>`. Two `HabitList.spec.ts` hint tests are known to be flaky: rerun them before chasing a failure there. `npx vue-tsc -b` lists compile errors.

---

### Task D1: Rarer boss drops

**Files:**
- Modify: `src/game-engine/constants/tuning.ts` (`ITEM_DROP_MAX_COUNT: 2`, new `ITEM_DROP_CHANCE: 2 / 3`, comment `bosses 1-3 drop 1 item, 4+ drop 2, on 2 kills in 3; boss 1 always`), `src/game-engine/items.ts`, `src/game-engine/combat.ts`, `src/game-engine/index.ts`
- Test: `src/game-engine/items.spec.ts`, `src/game-engine/combat.spec.ts`

**Interfaces:**
- Produces: `rollsBossDrop(bossIndex: number, rng: Rng): boolean` in `items.ts`. It always draws one `rng()`, so the sequence stays stable, and returns true for boss 1 or when the roll is under `ITEM_DROP_CHANCE`.
- `resolveBossDefeatIfDead` calls it before `rollItemDrops`. On false, `dropped` is `[]`. Scavenger still rolls.

- [ ] **Step 1: Write the failing tests**
  - `items.spec.ts` › `rollsBossDrop`: boss 1 with `rng = () => 0.99` → true; boss 5 with `() => 0.99` → false and with `() => 0.1` → true.
  - `items.spec.ts` › `rollItemDrops caps at two`: boss 12 with plenty unowned → length 2.
  - `combat.spec.ts` › `a kill that misses its drop roll drops nothing but still pays gold and EXP`.
- [ ] **Step 2: Run, expect FAIL** (`npx vitest run src/game-engine/items.spec.ts src/game-engine/combat.spec.ts`)
- [ ] **Step 3: Implement.** Then run `npm run test:unit`. Tests that assumed a drop on every kill (in `combat.spec.ts`, `useCombatActions.spec.ts` and the smoke test) get an rng that passes the roll. Don't change what they assert.
- [ ] **Step 4: Run `npm run test:unit`, expect PASS**
- [ ] **Step 5: Commit** `Make boss drops rarer: two kills in three, at most two items`

---

### Task D2: Revive for gems on the death screen

**Files:**
- Modify:
  - Engine: `src/game-engine/constants/economy.ts` (`REVIVE_GEMS = 10`; `PLANNED_GEM_SINKS` keeps only `skin`), `economy.spec.ts` (the budget uses `REVIVE_GEMS`), `src/game-engine/types.ts`, `src/game-engine/combat.ts`, `src/game-engine/index.ts`.
  - Composables and stores: `src/composables/useCombatActions.ts`, `useMissedSkillsGate.ts` (the Feather comment), `src/store/activityLogStore.ts`.
  - Components: `src/components/ui/ActivityLog.vue`, `DeathScreen.vue`, `ReviveNotice.vue` (copy `Revived at half health.`).
- Test: `src/game-engine/combat.spec.ts`, `src/composables/useCombatActions.spec.ts`, `src/components/ui/DeathScreen.spec.ts` (create if missing), `talents.effects.spec.ts` and `useUndoCheck.spec.ts` (their Feather cases)

**Interfaces:**
- Consumes: `useAccountStore().spendGems` / `.account.gems`.
- Removes: `reviveWithFeatherIfEquipped`, `REVIVE_ITEM_ID`.
- Produces:
  - `Character.revivedAtBoss?: number`: the boss index this run last revived against. A fresh character has none.
  - `reviveState(character: Character, boss: Boss, gems: number): 'buy' | 'short' | 'spent' | 'standing'`. `standing` means the hero is not fallen (rounded HP > 0). `spent` means `revivedAtBoss === boss.index`.
  - `reviveForGems(character, boss, gems): { character: Character; gemsSpent: number } | null`. It returns null unless the state is `buy`. It sets `currentHealth` to half of `effectiveStat(character, 'health')` and `revivedAtBoss: boss.index`.
  - `useCombatActions().revive(): boolean`. It runs `reviveForGems`, spends the gems, then writes the character. It dismisses the death screen, shows `ReviveNotice` and logs `{ kind: 'revived', gems }`. It returns false, with nothing spent, on null.
  - `landBossStrike` simply calls `triggerDeath()` on a death.

- [ ] **Step 1: Write the failing tests**
  - `combat.spec.ts` › `reviveForGems`:
    - With 10 gems: half health, `revivedAtBoss` set, `gemsSpent: 10`, and level, gold, items and boss untouched.
    - With 9 gems: null.
    - A standing hero: null.
    - A second revive against the same boss index: `spent`, null.
    - After `resolveBossDefeatIfDead` moves to the next boss, the state is `buy` again.
  - `combat.spec.ts` › `a death wipes the revive mark` (`resolvePlayerDeathIfDead` → no `revivedAtBoss`).
  - `useCombatActions.spec.ts` › `revive spends the gems once`: two `revive()` calls → `true, false`, gems down 10, death screen closed, one `revived` log entry.
  - `DeathScreen.spec.ts`:
    - On the fire phase, `Revive` shows the price, and tapping it with gems closes the screen.
    - With too few gems it's disabled.
    - When `spent`, only `Rise again` shows.
  - Rewrite the Feather cases: `talents.effects.spec.ts` keeps its tree through a gem revive; `useUndoCheck.spec.ts` drops the Feather half of its case.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.** The revive button sits above `Rise again` with the gem chip (`StatIcon name="gems"`). Under it is the line `Half health. Once per foe.` The button is ≥ 44px. `ActivityLog.vue` shows `revived` with the gem icon, as `gems` entries are shown.
- [ ] **Step 4: Run the spec files above and `npx vue-tsc -b`, expect PASS**
- [ ] **Step 5: Commit** `Offer a gem revive on the death screen, once per boss, and retire the Phoenix Feather code`

---

### Task D3: Vault stock and the Gold Pouch

**Files:**
- Modify: `src/game-engine/constants/economy.ts`, `src/game-engine/types.ts`, `src/game-engine/shop.ts`, `src/game-engine/index.ts`, `src/store/activityLogStore.ts`, `src/components/ui/ActivityLog.vue`
- Create: `src/game-engine/vault.ts`, `vault.spec.ts`, `src/composables/useVault.ts`, `useVault.spec.ts`

**Interfaces:**
- Produces in `economy.ts`:
  - `VAULT_PRICES = { rare: 5, epic: 10, relic: 15 }`
  - `VAULT_STOCK_DAYS = 3`
  - `GOLD_POUCH = { gems: 5, bossKills: 3 }`
  - `pouchGold(bossIndex: number): number` = `roundPrice(3 * bossGold(bossIndex))`
- Produces in `shop.ts`: `stockPool(character: Character): (rarities: ItemRarity[]) => ItemDef[]`. This is `drawStock`'s unowned-and-allowed filter, exported so `drawStock` and the Vault share it.
- Produces in `types.ts`:
  - `VaultWare = { itemId: string; gems: number; sold?: true }`
  - `Character.vault?: { windowKey: string; featured: VaultWare | null; wares: VaultWare[] }`
  - `Character.pouchDayKey?: string`
  - Both are per run; a fresh character has neither.
- Produces in `vault.ts`:
  - `vaultWindowKey(dayKey: string): string`: the first day of `dayKey`'s 3-day window. Windows are counted from `'2026-01-01'` with `daysBetweenDayKeys` / `addDaysToDayKey`.
  - `stockVault(character, dayKey, rng): Character`: the same character when `vault.windowKey` matches. Otherwise it draws a new stock (Decision 7) that leaves out ids in `character.shop`.
  - `vaultWareState(character, gems, ware): 'buy' | 'short' | 'sold' | 'owned'`
  - `buyVaultWare(character, gems, itemId): { character: Character; item: ItemDef; gemsSpent: number } | null`. It marks the ware sold and adds the item to `ownedItemIds` via `recordRelicEarned`. It returns null for a fallen hero (`standing`), an item not in stock, or a state other than `buy`.
  - `pouchState(character, gems, bossIndex, dayKey): { gems: number; gold: number; status: 'buy' | 'short' | 'cooldown' }`
  - `buyPouch(character, gems, bossIndex, dayKey): { character: Character; gold: number; gemsSpent: number } | null`. It adds the gold and sets `pouchDayKey`.
- Produces: `useVault(): { stock: ComputedRef<Character['vault'] | null>; ensureStock(): void; buy(itemId: string): boolean; pouch: ComputedRef<ReturnType<typeof pouchState>>; buyPouch(): boolean }`.
  - Every buy computes the pure result first, then `accountStore.spendGems(gemsSpent)`, then writes the character.
  - A bought item goes to `enqueueDrops([item], undefined, true)` as the gold shop's does.
  - Every buy logs `{ kind: 'vault-bought', name, gems, gold? }`.

- [ ] **Step 1: Write the failing tests**
  - `vault.spec.ts`:
    - `vaultWindowKey('2026-01-01') === vaultWindowKey('2026-01-03')` and `!== vaultWindowKey('2026-01-04')`.
    - `stockVault` keeps the stock inside a window and redraws in the next one.
    - It never stocks an owned item or one in `character.shop`.
    - At level 1 it stocks no epic (the level rule).
    - `buyVaultWare`: with 10 gems an epic is bought (`gemsSpent: 10`, sold, owned); with 9 gems: null; a sold ware: null; a fallen hero: null.
    - `buyPouch`: at boss 10 it adds `pouchGold(10)` (420) for 5 gems. A second buy the same day reads `cooldown` and returns null; the next day it reads `buy`.
    - `a death wipes vault and pouchDayKey` (`resolvePlayerDeathIfDead`).
  - `useVault.spec.ts`:
    - `buy spends gems from the account and opens the drop popup`.
    - `a double tap buys once`.
    - `short on gems: false, gems and character unchanged`.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.** `drawStock` switches to `stockPool`, with no change to what it draws (its tests must still pass untouched).
- [ ] **Step 4: Run `vault.spec.ts`, `useVault.spec.ts`, `shop.spec.ts`, `ActivityLog.spec.ts`, expect PASS**
- [ ] **Step 5: Commit** `Add the Vault's rotating stock and the Gold Pouch, bought with gems`

---

### Task D4: Streak freeze rules

**Files:**
- Modify:
  - Engine: `src/game-engine/constants/economy.ts`, `src/game-engine/constants/tuning.ts` (`WEEK_FREEZE_MIN_DAYS: 4`), `src/game-engine/account.ts`, `src/game-engine/time.ts`, `src/game-engine/habits.ts`, `src/game-engine/index.ts`.
  - Stores: `src/store/accountStore.ts`, `src/store/index.ts` (prune on load).
  - Composables: `src/composables/useDailyRollover.ts`, `src/composables/useCombatActions.ts`.
- Test: `src/game-engine/account.spec.ts`, `src/game-engine/habits.spec.ts`, `src/composables/useDailyRollover.spec.ts`, `src/composables/useCombatActions.spec.ts`, `src/store/saveFile.spec.ts`

**Interfaces:**
- Produces in `economy.ts`: `FREEZE = { gemsPerDay: 2, maxDays: 7, maxLeadDays: 30 }`.
- Produces in `account.ts`:
  - `Account.frozenDayKeys?: string[]`: sorted, unique. Old saves have none.
  - `frozenDays(account): readonly string[]` = `account.frozenDayKeys ?? []`
  - `freezeCost(account, fromDayKey, days): number` = `FREEZE.gemsPerDay` × the days in the range not already frozen.
  - `buyFreeze(account, todayKey, fromDayKey, days): { account: Account; gemsSpent: number } | null`. It returns null when:
    - `daysBetweenDayKeys(todayKey, fromDayKey)` is < 1 or > `maxLeadDays`;
    - `days` is outside 1–`maxDays`;
    - the cost is 0;
    - the account is short on gems.
  - `pruneFrozenDays(account, todayKey): Account`: drops keys more than 14 days before today, and returns the same account when nothing goes.
- Produces in `time.ts`: `weekDayKeys(date: Date): string[]`, the 7 daily keys that share `date`'s `weeklyPeriodKey`.
- Produces in `habits.ts`: `isDueOn(habit, date, frozenDayKeys: readonly string[] = [])`.
  - A daily is false when its day key is frozen.
  - A weekly is false when at least `WEEK_FREEZE_MIN_DAYS` of `weekDayKeys(date)` are frozen.
  - The set-day rule is unchanged.
- Produces in `accountStore.ts`: `buyFreeze(todayKey, fromDayKey, days): number | null` (the gems spent) and `pruneFrozenDays(todayKey)`.
- Call sites that pass `frozenDays(accountStore.account)`:
  - `useDailyRollover.periodKeyToResolve`: a non-set-day habit's previous period resolves only if `isDueOn(habit, <a date in that period>, frozen)`; otherwise it's stamped with no outcome.
  - The two `isDueOn` guards in `useCombatActions`.
  - `useDailyRollover` skips the `day-end` trial report when the ended day is frozen.
  - `useCombatActions.landDoom` returns early when today is frozen.

- [ ] **Step 1: Write the failing tests**
  - `account.spec.ts` › `buyFreeze`:
    - From tomorrow for 3 days with 6 gems: 3 keys, `gemsSpent: 6`.
    - From today: null.
    - From 31 days out: null.
    - 8 days: null.
    - Overlapping an existing freeze by 2 of 3 days: charges 2.
    - Fully overlapping: null.
    - Short: null.
  - `account.spec.ts` › `pruneFrozenDays drops old keys and keeps yesterday's`.
  - `habits.spec.ts` › `isDueOn with frozen days`:
    - A daily on a frozen day is not due.
    - A set-day habit on a frozen due day is not due.
    - A weekly with 3 frozen days that week is due; with 4 it is not.
    - Fri–Mon across a week boundary leaves both weeklies due.
  - `useDailyRollover.spec.ts`:
    - `yesterday frozen: no miss queued, streak unchanged, stamped`.
    - `a bad habit on a frozen day pays no reward`.
    - `a frozen day does not report day-end`.
  - `useCombatActions.spec.ts`:
    - `a skill can't be checked on a frozen day` (no damage, streak unchanged).
    - `a due Doom waits out a frozen day and lands the day after`.
  - `saveFile.spec.ts` › export → import round-trips `frozenDayKeys`; an account without it loads.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.** `initializeStores` calls `pruneFrozenDays` after the account loads. `resolvePlayerDeathIfDead` needs no change: frozen days live on the account.
- [ ] **Step 4: Run the six spec files, then `npm run test:unit`, expect PASS**
- [ ] **Step 5: Commit** `Add the streak freeze: frozen days rest every skill, bought ahead with gems`

---

### Task D5: Frozen days in the habit list

**Files:**
- Modify: `src/components/habits/HabitList.vue`, `HabitListItem.vue`, `src/components/layout/ProgressSummary.vue`, `TabBar.vue`, `src/components/ui/statIcons.ts` (`freeze`: Lucide `Snowflake`, `--icon-opal`), theme SCSS
- Test: `src/components/habits/HabitList.spec.ts`, `src/components/layout/ProgressSummary.spec.ts`, `src/components/layout/TabBar.spec.ts`

**Interfaces:**
- Consumes: `isDueOn(..., frozenDays(account))` (D4).
- Every `isDueOn` call in these components passes the frozen days. A frozen skill reads as resting. Its rest label is the freeze icon and `Frozen` in place of the next due weekday.

- [ ] **Step 1: Write the failing tests**
  - `HabitList.spec.ts` › `a frozen day greys every daily and shows Frozen`, and the strike button is disabled.
  - `ProgressSummary.spec.ts` › `Daily done leaves out frozen skills`.
  - `TabBar.spec.ts` › `no skills count on a frozen day`.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the three spec files, expect PASS**
- [ ] **Step 5: Commit** `Show frozen days as resting in the skill list`

---

### Task D6: The Vault side of the Shop

**Files:**
- Create: `src/components/shop/VaultWares.vue`, `FreezePicker.vue`, `FreezePicker.spec.ts`
- Modify: `src/components/shop/ShopCounter.vue` (`VaultWares` replaces `SealedNotice`), `ShopScene.vue` (Vault line), `ShopBuyButton.vue` / `ShopWareRow.vue` / `ShopFeatured.vue` (`currency?: 'gold' | 'gems'`, default `'gold'`; `ShopFeatured` also takes `ribbon?` and `keep?` so the Vault can say `Vault relic` / `Vault epic`), theme SCSS
- Test: `src/components/shop/ShopSection.spec.ts`, `ShopScene.spec.ts`, `FreezePicker.spec.ts`

**Interfaces:**
- Consumes: `useVault` (D3), `useAccountStore().buyFreeze`, `freezeCost`, `frozenDays` (D4).
- `VaultWares` lays out the Vault, top to bottom:
  - The featured ware on velvet.
  - `For good · Never lost`, with the Streak Freeze row. When days ahead are frozen, its `warn` line reads `Frozen: Nov 20 – Nov 24` (the next run of frozen days).
  - `For this run · Lost when you fall`, with the rare row and the Gold Pouch row.
  - The note `New wares every 3 days, and when you fall.`
  - It calls `ensureStock` on a stale window, like `ShopWares`' watch.
- `FreezePicker` props: `{ modelValue: boolean }`; emits `update:modelValue`. It is a modal with:
  - a `Starts` stepper (1–30 days ahead, showing the date, e.g. `Thu, Nov 20`);
  - a `Days` stepper (1–7);
  - a confirm button `Freeze` with the gem cost from `freezeCost`, disabled when it's 0 or short.
  - Confirming calls `accountStore.buyFreeze`, logs `{ kind: 'freeze-bought', fromDayKey, days, gems }` and closes. Every stepper button is ≥ 44px.

- [ ] **Step 1: Write the failing tests**
  - `ShopSection.spec.ts`:
    - The Vault side shows the featured ware with a gem price, `For good` with `Streak Freeze`, and `For this run` with a rare and `Gold Pouch`.
    - Buying the pouch adds gold and takes 5 gems.
    - The sealed notice is gone.
  - `ShopScene.spec.ts`: the Vault line reads `Gems. Now we talk.`
  - `FreezePicker.spec.ts`:
    - It defaults to tomorrow, 1 day, 2 gems.
    - 3 days costs 6.
    - Confirming with 6 gems freezes three days and closes.
    - With 1 gem the button is disabled.
    - Days already frozen are not charged.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.** Follow the mock's A layout (velvet, `For good` and `For this run` sub-banners) with the existing Shop row styles. The Vault's cold blue comes from the existing `.vaulted` scene tint and the mock's `--gem` colour, mapped to the nearest theme token.
- [ ] **Step 4: Run the three spec files, then `npm run test:unit`, expect PASS**
- [ ] **Step 5: Commit** `Open the Vault: rotating gem wares, the Gold Pouch and the streak freeze`

---

### Task D7: Docs and the full pass

**Files:**
- Modify:
  - `docs/ideas/2026-11-13-shop-economy.md`: §12 records the revive limit (one per boss) and the gold freeze (none); the decisions log gets "D built"; §3 says the exclusives are deferred.
  - `docs/superpowers/plans/2026-11-13-shop-economy.md`: the Milestone D row reads built, with the exclusives deferred.

- [ ] **Step 1: Update both docs**, one line each.
- [ ] **Step 2: Run `npm run test:unit`, `npm run lint`, `npm run build`, expect PASS.** Rerun the two flaky hint tests before chasing them.
- [ ] **Step 3: Update the memory** (`project_shop_economy.md`): D built, not pushed, exclusives deferred.
- [ ] **Step 4: Commit** `Record Milestone D in the shop plan`

---

### Milestone D done when

- [ ] `npm run test:unit`, `npm run lint`, `npm run build` all pass.
- [ ] In the dev server, all of these work:
  - Die, revive for 10 gems at half health, then die to the same boss: only "Rise again" is offered.
  - Buy a 3-day freeze from tomorrow, skip days with the dev clock, and see the skills rest and the streaks hold.
  - Buy the Vault's rare and the pouch.
  - Die again and see the Vault restock while the freeze and the gems are kept.
- [ ] **Do not push.** Next is Milestone E (skins), which needs Pixellab art runs (show the inputs and cost first).
