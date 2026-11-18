# Gem Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every placeholder gem number with the balanced price sheet, put the EXP potions on gems (adding Double EXP), split the freeze price by period, and add the perfect-week gem drip.

**Architecture:** Prices stay in `src/game-engine/constants/economy.ts`; the UI already reads them. The potion rules in `shop.ts` learn a gem currency. The perfect week is a small pure rule (`game-engine/perfectWeek.ts`) on the Account, fed by the daily rollover with the weeks its misses fell in, and shown as a line on the daily purse popup.

**Tech Stack:** Vue 3, Pinia, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-17-gem-economy-design.md`

## Global Constraints

- Tree gem bands: ranks 1–3 gold only · 4–20 at 2 · 21–40 at 3 · 41–60 at 4 · 61–163 at 5. Whole tree 689, base tree (97) 359. Tree gold costs unchanged.
- Level milestones: L5, L10, L15, L20 at 4 · L25, L30, L35, L40 at 8 · L45–L70 every 5 at 12. Total 120. Milestones already passed aren't repaid (`recordLevel` already pays only above `highestLevel`).
- One-time sources: trials 275 (15×5, 10×10, 5×20), levels 120, prestige 80 × 5 = 400, free dungeons 2 × 50 (bosses 1–6 pay 4, 5, 7, 9, 11, 14) = 100. Total 895.
- Prices: hero skin 120, home/arena skin 90, revive 15, freeze 2 a day (daily) / 5 a week (weekly), Vault gem items rare 6 / epic 12 / relic 20, Gold Pouch 15 gems, EXP Potion +25% EXP 3 days for 5 gems, Double EXP +100% EXP 3 days for 25 gems.
- Only one EXP boost runs at a time; buying one replaces the other. Crit and Mending potions stay on gold.
- A save's running gold EXP Potion keeps going until it runs out.
- Perfect week: 2 gems for a calendar week in which every due daily and weekly skill was checked. Bad habits don't count against it; frozen days are skipped.
- Player copy is terse (house style); item/potion effects state plainly what they do.
- Trials keep paying `TRIAL_GEMS` (12) until the trial rework; dungeons aren't built, so their numbers are constants only.
- Shop milestones stay local on main: commit, don't push.

## Review Focus

- A save with a gold EXP Potion running when this ships: its EXP Potion row reads active with the right days left, and Double EXP can still be bought and replaces it. → Task 3, `an old gold EXP Potion runs out as it was`.
- The app left closed across a week's turn (last open Saturday, next open Thursday): a skill missed in the gap must not pay a perfect week, even though the rollover only resolves each skill's latest due period. → Task 4, `a miss found after a gap across the turn spoils the watched week`.
- A miss popup never acknowledged (app closed first) is found again the next open, in a new week: it must not spoil the new week. → Task 4, `a miss found again from an earlier week leaves the current one alone`.
- A week with no good skill checked at all (only bad habits, or nothing set up) pays nothing. → Task 4, `pays nothing for a week with no good skill checked`.
- A weekly freeze priced at 5 gems a week while the Services row still shows the cheapest (2) as its price: the picker must show the real total. → Task 2, `a weekly costs 5 gems a week`.

---

### Task 1: The gem price sheet

**Files:**
- Modify: `src/game-engine/constants/economy.ts`
- Modify: `src/game-engine/economy.spec.ts`
- Modify: `src/game-engine/account.spec.ts:8,10,22`, `src/game-engine/vault.spec.ts:27`, `src/components/shop/ShopSection.spec.ts:242-248` (literals that pinned old placeholders)

**Interfaces:**
- Produces (economy.ts): `TALENT_COST(n)` with the new gem bands; `LEVEL_GEM_MILESTONES` to L70; `TRIAL_GEM_TIERS = { easy: { count: 15, gems: 5 }, medium: { count: 10, gems: 10 }, hard: { count: 5, gems: 20 } }`; `PRESTIGE_GEMS = 80`; `FREE_DUNGEONS = 2`; `FREE_DUNGEON_BOSS_GEMS = [4, 5, 7, 9, 11, 14] as const`; `FREE_GEM_SOURCES = { levels, trials, dungeonFirstClears, prestige }` all derived from those; `REVIVE_GEMS = 15`; `SKIN_PRICES = { hero: 120, home: 90, arena: 90 }`; `GEM_WARE_PRICES = { rare: 6, epic: 12, relic: 20 }`; `GOLD_POUCH = { gems: 15, bossKills: 3 }`. `PLANNED_GEM_SINKS` is deleted (only `SKIN_PRICES` and the old test read it).

- [ ] **Step 1: Rewrite the price tests in `economy.spec.ts`**

Replace the `prestige gems` block and the first three `economy price sheet` tests with:

```ts
const sumGems = (from: number, to: number) => {
  let total = 0;
  for (let n = from; n <= to; n++) total += TALENT_COST(n).gems;
  return total;
};
// Every main and offshoot takes one more rank per Deeper roots (two of them); tops don't.
const totalRanks = TALENT_DEFS.reduce((s, d) => s + d.maxRank + (d.kind === 'top' ? 0 : 2), 0);

it('the tree runs to 163 ranks', () => expect(totalRanks).toBe(163));

it('the tree costs the spec bands, gold unchanged', () => {
  expect([3, 4, 20, 21, 40, 41, 60, 61, 163].map((n) => TALENT_COST(n).gems)).toEqual([0, 2, 2, 3, 3, 4, 4, 5, 5]);
  expect(TALENT_COST(4).gold).toBe(400);
  expect(TALENT_COST(97).gold).toBe(2000);
});

it('the whole tree is 689 gems, the base tree 359', () => {
  expect(sumGems(1, totalRanks)).toBe(689);
  expect(sumGems(1, 97)).toBe(359);
});

it('level milestones run to 70 and pay 120', () => {
  expect(LEVEL_GEM_MILESTONES.map((m) => m.level)).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70]);
  expect(LEVEL_GEM_MILESTONES.map((m) => m.gems)).toEqual([4, 4, 4, 4, 8, 8, 8, 8, 12, 12, 12, 12, 12, 12]);
});

it('the one-time sources total 895', () => {
  expect(FREE_GEM_SOURCES).toEqual({ levels: 120, trials: 275, dungeonFirstClears: 100, prestige: 400 });
});

it('one-time gems cover the tree, a hero skin and two revives, with 56 to spare', () => {
  const oneTime = Object.values(FREE_GEM_SOURCES).reduce((a, b) => a + b, 0);
  const need = sumGems(1, totalRanks) + SKIN_PRICES.hero + 2 * REVIVE_GEMS;
  expect(need).toBe(839);
  expect(oneTime - need).toBe(56);
});

it('prices the gem sinks', () => {
  expect(REVIVE_GEMS).toBe(15);
  expect(SKIN_PRICES).toEqual({ hero: 120, home: 90, arena: 90 });
  expect(GEM_WARE_PRICES).toEqual({ rare: 6, epic: 12, relic: 20 });
  expect(GOLD_POUCH.gems).toBe(15);
});
```

Keep `one-time trials fit the trial budget` and the gold tests below it as they are.

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/game-engine/economy.spec.ts`
Expected: FAIL (old bands, old totals, `SKIN_PRICES`/`GEM_WARE_PRICES` not imported yet in the test or holding old values).

- [ ] **Step 3: Set the numbers in `economy.ts`**

Per the Interfaces block. `TALENT_COST` gems: `n <= 3 ? 0 : n <= 20 ? 2 : n <= 40 ? 3 : n <= 60 ? 4 : 5`. `FREE_GEM_SOURCES.trials` sums `TRIAL_GEM_TIERS`; `dungeonFirstClears` is `FREE_DUNGEONS ×` the sum of `FREE_DUNGEON_BOSS_GEMS`. Fix the stray doc comment above `PRESTIGE_GEMS` (it belongs to `FREE_GEM_SOURCES`) and point the file's header comment at the gem spec instead of "placeholders until playtested". Update `TRIAL_GEMS`'s comment: flat until the trial rework (17 × 12 sits inside 275).

- [ ] **Step 4: Fix the specs that pinned old placeholders**

`account.spec.ts`: L10 pays `4 + 4`, L16 pays `4 + 4 + 4`. `vault.spec.ts:27`: `gems: 15`. `ShopSection.spec.ts` "the Gold Pouch adds gold and takes 5 gems": rename to "…takes the pouch's gems", seed `GOLD_POUCH.gems + 2` gems and expect 2 left.

- [ ] **Step 5: Run the whole suite**

Run: `npx vitest run`
Expected: PASS. Any other failure that pinned an old placeholder number gets the constant, not a new literal. (Two `HabitList.spec.ts` hint tests are known flaky: rerun before chasing them.)

- [ ] **Step 6: Commit**

```bash
git add src/game-engine/constants/economy.ts src/game-engine/economy.spec.ts src/game-engine/account.spec.ts src/game-engine/vault.spec.ts src/components/shop/ShopSection.spec.ts
git commit -m "Set the gem price sheet: tree 689, milestones to L70, prestige 80, skins 120/90, revive 15, Vault 6/12/20, pouch 15"
```

---

### Task 2: Streak freeze at 2 a day, 5 a week

**Files:**
- Modify: `src/game-engine/constants/economy.ts` (`FREEZE`)
- Modify: `src/game-engine/freeze.ts:19-25`
- Modify: `src/components/shop/ShopServices.vue:91,122`
- Test: `src/game-engine/freeze.spec.ts`, `src/components/shop/FreezePicker.spec.ts`

**Interfaces:**
- Produces: `FREEZE = { gemsPerDay: 2, gemsPerWeek: 5, maxDays: 7, maxLeadDays: 30, maxWeeks: 4, maxLeadWeeks: 4 }` (`gemsPerPeriod` removed). `freezeCost(habit, fromDayKey, count)` unchanged in signature.

- [ ] **Step 1: Update the weekly test and add the picker test**

`freeze.spec.ts:61`: rename to `freezes whole weeks from next week at 5 gems a week`; the two-week buy expects `gemsSpent` 10. In `FreezePicker.spec.ts` add `a weekly costs 5 gems a week`: a weekly skill picked, one week, the Freeze button's price `aria-label` is `5 gems`; two weeks reads `10 gems`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/game-engine/freeze.spec.ts src/components/shop/FreezePicker.spec.ts`
Expected: FAIL (weekly still 2 a week).

- [ ] **Step 3: Split the price**

`freezeCost` charges `FREEZE.gemsPerWeek` per new week for a weekly, `FREEZE.gemsPerDay` per new day for a daily; update its doc comment. `ShopServices.vue` reads `FREEZE.gemsPerDay` (the cheapest freeze) for the row price and the short check.

- [ ] **Step 4: Run the suite**

Run: `npx vitest run`
Expected: PASS, and `npx vue-tsc -b` clean (no `gemsPerPeriod` left).

- [ ] **Step 5: Commit**

```bash
git add src/game-engine/constants/economy.ts src/game-engine/freeze.ts src/game-engine/freeze.spec.ts src/components/shop/ShopServices.vue src/components/shop/FreezePicker.spec.ts
git commit -m "Price a weekly skill's freeze at 5 gems a week"
```

---

### Task 3: EXP potions for gems, and Double EXP

**Files:**
- Modify: `src/game-engine/constants/tuning.ts:186-190`, `src/game-engine/constants/economy.ts`
- Modify: `src/game-engine/leveling.ts:137-146` (`applyExpBoost`)
- Modify: `src/game-engine/shop.ts:149-218` (`TonicId`, `TONIC_DEFS`, `tonicState`, `buyTonic`)
- Modify: `src/composables/useShop.ts:38-44,106-123`
- Modify: `src/components/shop/ShopItems.vue:54-67,108-120`
- Test: `src/game-engine/shop.spec.ts`, `src/composables/useShop.spec.ts`, `src/components/shop/ShopSection.spec.ts`

**Interfaces:**
- Consumes: `accountStore.spendGems(gems): boolean`; `activityLogStore` entry `{ kind: 'vault-bought'; name; gems }`.
- Produces:
  - `TUNING.DOUBLE_EXP_BONUS = 1`, `TUNING.DOUBLE_EXP_DAYS = 3`.
  - `GEM_POTION_PRICES = { exp: 5, 'double-exp': 25 } as const` in economy.ts.
  - `TonicId = 'draught' | 'crit' | 'heal' | 'exp' | 'double-exp'`.
  - `TONIC_DEFS` gains `{ id: 'double-exp', name: 'Double EXP', effect: '+100% EXP for 3 days.' (from TUNING), art: 'potions/exp' }` after the EXP Potion. It reuses the EXP Potion's sprite until it has its own (art is a separate Pixellab run).
  - `applyExpBoost(character, dayKey, bonus = TUNING.EXP_BOOST_BONUS, durationDays = TUNING.EXP_BOOST_DAYS): Character` (still replaces any running EXP boost).
  - `tonicState(character, id, bossIndex, dayKey, gems: number): { price: number; currency: 'gold' | 'gems'; status: 'buy' | 'short' | 'out' | 'active' | 'full'; daysLeft: number }`
  - `buyTonic(character, id, bossIndex, dayKey, gems: number): { character: Character; healed?: number; gemsSpent: number } | null` — a gem potion leaves gold alone; the caller spends `gemsSpent`.

- [ ] **Step 1: Write the failing rule tests in `shop.spec.ts`**

```ts
describe('EXP potions for gems', () => {
  it('the EXP Potion costs 5 gems and leaves gold alone', () => {
    expect(tonicState(c, 'exp', 4, DAY, 5)).toMatchObject({ price: 5, currency: 'gems', status: 'buy' });
    const bought = buyTonic(c, 'exp', 4, DAY, 5)!;
    expect(bought.gemsSpent).toBe(5);
    expect(characterGold(bought.character)).toBe(characterGold(c));
    expect(activeExpBoost(bought.character, DAY)).toMatchObject({ bonus: 0.25, durationDays: 3 });
  });

  it('Double EXP costs 25 gems for +100% EXP over 3 days', () => {
    expect(tonicState(c, 'double-exp', 4, DAY, 24).status).toBe('short');
    const bought = buyTonic(c, 'double-exp', 4, DAY, 25)!;
    expect(bought.gemsSpent).toBe(25);
    expect(activeExpBoost(bought.character, DAY)).toMatchObject({ bonus: 1, durationDays: 3 });
  });

  it('buying one EXP potion replaces the other', () => {
    const single = buyTonic(c, 'exp', 4, DAY, 99)!.character;
    expect(tonicState(single, 'double-exp', 4, DAY, 99).status).toBe('buy');
    const doubled = buyTonic(single, 'double-exp', 4, DAY, 99)!.character;
    expect(doubled.statusEffects!.filter((e) => e.type === 'expBoost')).toHaveLength(1);
    expect(activeExpBoost(doubled, DAY)!.bonus).toBe(1);
  });

  it('an old gold EXP Potion runs out as it was', () => {
    const old = applyExpBoost(c, addDaysToDayKey(DAY, -1)); // bought yesterday, under the old gold price
    expect(tonicState(old, 'exp', 4, DAY, 0)).toMatchObject({ status: 'active', daysLeft: 2 });
    expect(tonicState(old, 'double-exp', 4, DAY, 25).status).toBe('buy');
  });

  it('crit and mending stay on gold', () => {
    expect(tonicState(c, 'crit', 4, DAY, 0)).toMatchObject({ currency: 'gold', price: tonicPrice(4) });
  });
});
```

Existing `tonicState`/`buyTonic` calls in the file gain a `gems` argument (`0` where gold is what's tested).

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/game-engine/shop.spec.ts`
Expected: FAIL (no `double-exp`, EXP Potion priced in gold).

- [ ] **Step 3: Implement the rules**

`tonicState`: gem potions (`id in GEM_POTION_PRICES`) price from `GEM_POTION_PRICES` and check `gems`; the rest keep `tonicPrice(bossIndex)` and gold. The running `expBoost` makes only its own row `active`: `exp` when its bonus isn't `DOUBLE_EXP_BONUS`, `double-exp` when it is, so the other row stays buyable. `out` (bought this potion window) is unchanged and applies to both. `buyTonic`: deduct gold only for gold potions; `double-exp` calls `applyExpBoost(paid, dayKey, TUNING.DOUBLE_EXP_BONUS, TUNING.DOUBLE_EXP_DAYS)`.

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run src/game-engine/shop.spec.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing store and UI tests**

`useShop.spec.ts`: `a gem potion spends the account's gems and logs a Vault buy` — 30 gems, `buyTonic('double-exp')` is true, gems 5, gold unchanged, last log entry `{ kind: 'vault-bought', name: 'Double EXP', gems: 25 }`; with 4 gems `buyTonic('exp')` is false and nothing is spent. `ShopSection.spec.ts`: `the EXP potions are priced in gems` — the EXP Potion row's `.price` `aria-label` is `5 gems`, Double EXP's is `25 gems`.

- [ ] **Step 6: Run them to see them fail**

Run: `npx vitest run src/composables/useShop.spec.ts src/components/shop/ShopSection.spec.ts`
Expected: FAIL.

- [ ] **Step 7: Wire the store and the row**

`useShop.tonic` and `buyTonic` pass `accountStore.account.gems`; `buyTonic` spends `result.gemsSpent` first (return false, nothing set, if that fails), then sets the character, and logs `vault-bought` for a gem potion or `shop-bought` for a gold one. Add `'double-exp'` to `TONIC_DONE` (`+100% EXP · 3 days`, from TUNING) and `TONIC_TONES` (`var(--icon-exp)`). `ShopItems.vue` passes `:currency="potion.currency"` to `ShopWareRow`.

- [ ] **Step 8: Run the suite and the type check**

Run: `npx vitest run && npx vue-tsc -b`
Expected: PASS, no type errors (every `Record<TonicId, …>` has `double-exp`).

- [ ] **Step 9: Commit**

```bash
git add src/game-engine/constants/tuning.ts src/game-engine/constants/economy.ts src/game-engine/leveling.ts src/game-engine/shop.ts src/game-engine/shop.spec.ts src/composables/useShop.ts src/composables/useShop.spec.ts src/components/shop/ShopItems.vue src/components/shop/ShopSection.spec.ts
git commit -m "Sell the EXP Potion for 5 gems and add Double EXP for 25; one EXP boost at a time"
```

---

### Task 4: The perfect week rule

**Files:**
- Create: `src/game-engine/perfectWeek.ts`, `src/game-engine/perfectWeek.spec.ts`
- Modify: `src/game-engine/time.ts` (add `weekKeyOfDayKey`), `src/game-engine/time.spec.ts`
- Modify: `src/game-engine/account.ts` (`Account.perfectWeek`), `src/game-engine/constants/economy.ts` (`PERFECT_WEEK_GEMS = 2`), `src/game-engine/index.ts` (exports)

**Interfaces:**
- Produces:
  - `weekKeyOfDayKey(dayKey: string): string` — the `YYYY-Www` key `weeklyPeriodKey` gives for that business day.
  - `Account.perfectWeek?: { weekKey: string; spoiled: boolean }` — the week being watched. Missing until the first rollover.
  - `missWeekKey(habit: Habit, missedKey: string): string` — the week a missed period falls in: a weekly's key as is, a daily's day key through `weekKeyOfDayKey`.
  - `settlePerfectWeek(account: Account, nowWeekKey: string, missedWeekKeys: string[], habits: Habit[]): { account: Account; gemsPaid: number }`

The rule. The rollover only resolves each skill's latest due period, so a miss it finds after the app sat closed may stand for any day since the last open:
- No watch yet: watch `nowWeekKey`, spoiled if `missedWeekKeys` includes it. Pay nothing.
- Same week: the watch is spoiled if `missedWeekKeys` includes `nowWeekKey`. A miss from an earlier week, found again because its popup was never acknowledged, leaves it alone.
- A later week (the turn): the watched week was perfect unless it was already spoiled or any found miss falls in it or later (week keys sort as text). It also needs a good skill checked in it: some `!isBad` habit whose `lastCompletedPeriodKey` lies in it (via `missWeekKey`). This works because the first rollover of a new week runs on open, before anything is checked. Pay `PERFECT_WEEK_GEMS` if perfect, then watch `nowWeekKey`, spoiled if `missedWeekKeys` includes it.

- [ ] **Step 1: Write the failing tests**

`time.spec.ts`: `weekKeyOfDayKey` gives `2026-W47` for `2026-11-16` and `2026-11-22`, `2026-W48` for `2026-11-23`, and matches `weeklyPeriodKey` for the same day.

`perfectWeek.spec.ts`, with a good daily `checked` (`lastCompletedPeriodKey: '2026-11-21'`, in W47) and an account watching `{ weekKey: '2026-W47', spoiled: false }` unless a test says otherwise:
- `starts watching on a first rollover, paying nothing`: no watch, now W47, no misses → watch `{ '2026-W47', false }`, 0 paid.
- `pays 2 gems at the turn after a week with no miss and a skill checked`: now W48, no misses → `gemsPaid` 2, gems +2, watch `{ '2026-W48', false }`.
- `pays once`: settle the result again at W48 → 0 paid.
- `a miss during the week spoils it`: settle at W47 with `['2026-W47']`, then at W48 with none → 0 paid.
- `a Sunday miss found on Monday spoils the week that ended`: now W48, misses `['2026-W47']` → 0 paid, watch `{ '2026-W48', false }`.
- `a miss found after a gap across the turn spoils the watched week`: now W48, misses `['2026-W48']` → 0 paid, watch `{ '2026-W48', true }`.
- `a miss found again from an earlier week leaves the current one alone`: watching W48, now W48, misses `['2026-W47']` → watch stays `{ '2026-W48', false }`.
- `pays nothing for a week with no good skill checked`: habits `[]`, and separately only a bad habit completed in W47 → 0 paid both times.
- `missWeekKey` gives a weekly's key as is and a daily's day key's week.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/game-engine/perfectWeek.spec.ts src/game-engine/time.spec.ts`
Expected: FAIL (module and helper don't exist).

- [ ] **Step 3: Implement**

`weekKeyOfDayKey` builds a Date safely inside that Pacific business day (e.g. 20:00 UTC on the key's date) and calls `weeklyPeriodKey`. `perfectWeek.ts` follows the rule above. Its header comment states the rule in a few lines, as `freeze.ts` does. Export the new names from `index.ts`.

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run src/game-engine/perfectWeek.spec.ts src/game-engine/time.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game-engine/perfectWeek.ts src/game-engine/perfectWeek.spec.ts src/game-engine/time.ts src/game-engine/time.spec.ts src/game-engine/account.ts src/game-engine/constants/economy.ts src/game-engine/index.ts
git commit -m "Add the perfect week rule: 2 gems for a week with every due skill checked"
```

---

### Task 5: Pay and show the perfect week

**Files:**
- Modify: `src/store/accountStore.ts` (action), `src/store/activityLogStore.ts:41-42` (reason)
- Modify: `src/composables/useDailyRollover.ts:79-104`
- Modify: `src/composables/useDailyPurse.ts`, `src/components/ui/DailyPursePopup.vue`
- Modify: `src/components/ui/ActivityLog.vue:102-104`
- Test: `src/composables/useDailyRollover.spec.ts`, `src/composables/useDailyPurse.spec.ts`

**Interfaces:**
- Consumes: `settlePerfectWeek`, `missWeekKey`, `weeklyPeriodKey` (Task 4).
- Produces:
  - `accountStore.settlePerfectWeek(nowWeekKey: string, missedWeekKeys: string[], habits: Habit[]): number` (gems paid).
  - Log entry `{ kind: 'gems'; amount: number; reason: 'level' | 'perfect-week' }`.
  - `useDailyPurse()` gains `weekGems: ComputedRef<number>` and `noticeWeek(gems: number): void`. Module-scoped like `dayKey`; `claim()` clears it.

- [ ] **Step 1: Write the failing rollover tests**

In `useDailyRollover.spec.ts`, with now Monday `2026-11-23` midday Pacific and the account watching `{ '2026-W47', false }`:
- `pays a perfect week on the first open of the next week`: a good daily completed and checked Sunday `2026-11-22` → gems +2, a `{ kind: 'gems', amount: 2, reason: 'perfect-week' }` log entry, `useDailyPurse().weekGems.value` 2.
- `a daily missed on Sunday spoils it`: last completed Saturday, last checked Sunday (opened, not done) → no gems.
- `a frozen Sunday doesn't spoil it`: last completed Saturday, `frozenDayKeys: ['2026-11-22']` → gems +2.
- `a missed weekly spoils it`: plus a weekly last completed `2026-W46` → no gems.
- `a bad habit given in doesn't spoil it`: plus a bad habit completed in W47 → gems +2.

In `useDailyPurse.spec.ts`: `claim clears the week's gems`: `noticeWeek(2)`, `claim()` → `weekGems` 0.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/composables/useDailyRollover.spec.ts src/composables/useDailyPurse.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Wire it**

In the rollover loop, a good habit whose resolved key wasn't completed (the `queueMiss` branch) adds `missWeekKey(habit, keyToResolve)` to `missedWeeks`. After the loop and before `useDailyPurse().notice(todayKey)`: `accountStore.settlePerfectWeek(weeklyPeriodKey(now), missedWeeks, habitStore.habits)`. If it paid, log the entry and call `noticeWeek`. The store action wraps the rule like `recordLevel` does.

- [ ] **Step 4: Show it**

`DailyPursePopup.vue`: when `weekGems > 0`, a line under the purse's line: gem `StatIcon`, `+2` in bold, then `Perfect week`. Same sunk-well look as the gold, smaller. `ActivityLog.vue`: a `perfect-week` gems entry reads `Perfect week +2 gems`; level entries read as now.

- [ ] **Step 5: Run the suite, the type check and lint**

Run: `npx vitest run && npx vue-tsc -b && npx eslint .`
Expected: PASS, clean.

- [ ] **Step 6: Commit**

```bash
git add src/store/accountStore.ts src/store/activityLogStore.ts src/composables/useDailyRollover.ts src/composables/useDailyRollover.spec.ts src/composables/useDailyPurse.ts src/composables/useDailyPurse.spec.ts src/components/ui/DailyPursePopup.vue src/components/ui/ActivityLog.vue
git commit -m "Pay the perfect week at the turn of the week and show it on the daily purse"
```
