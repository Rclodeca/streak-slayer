# Shop and Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the gold/gems economy in milestones that each leave the live game whole, starting with the permanent, bought talent tree.

**Architecture:** Gold lives on `Character` (so `createCharacter` on death wipes it for free). Gems, highest level ever and other cross-run progress live in a new `Account` slice with its own store, saved inside the existing v5 save as an optional field. Talent ranks stay on `Character` (every combat function already reads them there) and `resolvePlayerDeathIfDead` carries them into the new run, the way skill ranks survive on habits. Every price lives in one constants file, `economy.ts`, so tuning never touches logic.

**Tech Stack:** Vue 3, Pinia, TypeScript, Vitest, SCSS.

**Spec:** `docs/ideas/2026-11-13-shop-economy.md`

## Global Constraints

- Gold: lost on death. Gems: kept forever, finite free supply, every free source pays once per account.
- Never sold for gold: gems, skill ranks. Nothing random is sold.
- Talent tree: bought, permanent, modest **percentage** bonuses only. Exception (decided 2026-11-13): the tank nodes' flat armor and magic resist stay, since armor already works as a % cut (`armor / (armor + 1500)`).
- Free gems must cover the whole tree plus about one skin and a couple of revives (spec §3).
- Purchases are used immediately. No inventory.
- Streak freezes are set up in advance and never add to a streak or save one after a miss.
- Persistence goes through the store layer (`src/store/storage.ts`), never `localStorage` in components.
- Tap targets ≥ 44px, nothing behind hover, respect safe areas.
- Player copy is short and terse; item/purchase effects say plainly what they do.
- Pushing `main` deploys live. Commit per task; push only at the end of a milestone.

## Review Focus

1. **Existing saves.** A v5 save with no `account` field must load with gems 0, `highestLevel` seeded from the save, and its current talent ranks kept. (Task A3, A4)
2. **Death mid-run.** Gold → 0, items gone, talents and `talentsUnlocked` kept, gems kept. A Phoenix revive changes nothing. (Task A2, A4)
3. **Level milestone paid twice.** Dying and re-reaching level 10 must not pay the level 10 gems again. (Task A3)
4. **Buying with too little.** Short on gold or gems → nothing changes, no negative balance; a double tap buys one rank, not two. (Task A4, A5)
5. **Import/export and sync.** An exported save carries the account; importing an old file without one still works. (Task A3)

---

# Part 1 — Build order

The order is driven by two rules: each milestone must leave the live game coherent (no currency with nothing to buy, no tree with no way to pay), and the open questions in spec §12 block only the milestones that need them.

| # | Milestone | What ships | Blocked on | Push live? |
|---|---|---|---|---|
| **A** | **Rogue Legacy loop** | Gold from bosses, gems from level milestones, permanent bought tree. | Rough price sheet (Task A1). | No: gold has nothing to buy past the gem-gated nodes. Hold for B. |
| **B** | **Shop tab + trial rework** | Shop replaces the Trials tab (gold: basic items, daily rare, rare epic/relic, restock, potion, boosts). Trials become one-time account achievements paying gems/gold/EXP, no relics. Trials stay under the cog. | Shop tab mock pick (`shop-tab-2.html`); new trial list. | **Yes, A + B together.** |
| **C** | **Shop services, fewer level-up events** | Reroll, Overdrive, item slots, enchant, item upgrade move into the Shop. Level-up event choice trimmed or removed. Special/Ult auto at set levels. | §12 "Level-up events" and "Special and Ult". | Yes |
| **D** | **Vault (gems)** | Revive on the death screen (Phoenix Feather removed), streak freeze (in advance), rotating rare + shop-exclusive items, capped gems → gold. Drops made rarer. | §12 revive limit, gold freeze. | Yes |
| **E** | **Skins** | Gem hero/base/arena skins, a few gold grind skins. | Pixellab art runs (show inputs + cost first). | Yes |
| **F** | **Dungeons** | ~6-boss series, first-clear gems, relic at the end, replay fee. Side-bar button. | Its own design spec (entry and play are undecided). | Yes |
| **G** | **Native + Store (phase 1)** | Capacitor wrap, real-money Store in the side bar (hidden early, calm), dungeon and character packs, phone cloud backup. | Capacitor app shells, store accounts, F. | App stores |
| **H** | **Backend (phase 2)** | Sign-in, cloud save, gem ledger, gem packs. | Analytics worker (same Cloudflare stack). | App stores |

Why this order:

- **A before everything:** the account slice and the gold field are what every later milestone spends from, and the tree is the gold sink the spec leans on most.
- **B right after A, shipped together:** A takes away level-up talent points; B gives gold somewhere to go once the gem key stops the tree, and the Trials tab has to become the Shop at the same time the trials stop being per-run.
- **C before D:** the gold services replace level-up events, which is a design decision you can make by playing B. The Vault is mostly new items on the same Shop frame.
- **E, F, G, H** are content and platform work with their own specs/art runs; none of them change A–D's data.

Parts 2+ (B onward) get their own detailed plan once the milestone before is in, so each plan reads code that exists.

---

# Part 2 — Milestone A, task by task

**Decisions taken here (change before starting if wrong):**

- **Existing talent ranks are kept as permanent.** No refund, no wipe: they already sit on the character, so nothing migrates.
- **Past level milestones pay out once on first load**, from the save's best level (current level or the high-score list, whichever is higher).
- **Talents still open at level 5 the first time**, then stay open across deaths (`talentsUnlocked` is carried).
- **Node price follows the Nth rank bought overall**, not the node's depth, matching the spec's "node 1 is 100 gold, node 2 is 200…".
- **Tank nodes keep their flat armor and magic resist** (+25 per rank). Armor already works as a % cut that doesn't fall behind bosses, so they stay as they are.
- **Icons:** Lucide `Coins` (gold, `--icon-gold`) and `Gem` (violet is taken by Ult, so gems use `--icon-opal` or the nearest existing token). Pixel icons come later with E.

## File map

- Create `src/game-engine/constants/economy.ts` — every Milestone A number.
- Create `src/game-engine/economy.spec.ts` — the gem budget invariant.
- Create `src/game-engine/account.ts` (+ `account.spec.ts`) — `Account` type and pure account rules.
- Create `src/store/accountStore.ts` (+ spec), `src/store/plugins/accountTracking.ts`.
- Create `src/composables/useTalentPurchase.ts` (+ spec).
- Modify `types.ts` (`gold`), `combat.ts` (boss gold, death carry-over), `talents.ts`, `game-engine/index.ts`, `saveState.ts`, `localStoragePersistence.ts`, `store/index.ts`, `useCombatActions.ts`, `activityLogStore.ts`, `ActivityLog.vue`, `TalentSection.vue`, `TalentNodeModal.vue`, `TalentUnlockPopup.vue`, `TabBar.vue`, `statIcons.ts`.

Run all tests with `npm run test:unit`; one file with `npx vitest run <path>`. Two `HabitList.spec.ts` hint tests are known flaky: rerun before chasing them.

---

### Task A1: Price sheet and gem budget

**Files:**
- Create: `src/game-engine/constants/economy.ts`
- Test: `src/game-engine/economy.spec.ts`

**Interfaces:**
- Produces:
  - `bossGold(bossIndex: number): number` — `40 + 10 * bossIndex`, rounded.
  - `TALENT_COST(n: number): { gold: number; gems: number }` — cost of the `n`th rank bought overall (1-based).
    - gold: `100 * n` for `n ≤ 5`, then `500 + 25 * (n - 5)`, capped at `2000`.
    - gems: `0` for `n ≤ 3`; `1` for 4–24; `2` for 25–60; `3` for 61+.
  - `LEVEL_GEM_MILESTONES: readonly { level: number; gems: number }[]` — every 5 levels from 5 to 50, gems `2, 3, 4, 5, 6, 7, 8, 9, 10, 10`.
  - `FREE_GEM_SOURCES: { levels: number; trials: number; dungeonFirstClears: number }` — `levels` summed from the table above (64); `trials: 210` and `dungeonFirstClears: 0` as placeholders until B and F.
  - `PLANNED_GEM_SINKS: { skin: number; revive: number }` — `{ skin: 40, revive: 10 }` placeholders.

- [ ] **Step 1: Write the failing tests**

```ts
it('the tree costs the spec examples', () => {
  expect(TALENT_COST(1)).toEqual({ gold: 100, gems: 0 });
  expect(TALENT_COST(3)).toEqual({ gold: 300, gems: 0 });
  expect(TALENT_COST(4)).toEqual({ gold: 400, gems: 1 });
  expect(TALENT_COST(97)).toEqual({ gold: 2000, gems: 3 });
});
it('free gems finish the tree plus one skin and two revives', () => {
  const totalRanks = TALENT_DEFS.reduce((s, d) => s + d.maxRank, 0);
  let treeGems = 0;
  for (let n = 1; n <= totalRanks; n++) treeGems += TALENT_COST(n).gems;
  const free = FREE_GEM_SOURCES.levels + FREE_GEM_SOURCES.trials + FREE_GEM_SOURCES.dungeonFirstClears;
  const need = treeGems + PLANNED_GEM_SINKS.skin + 2 * PLANNED_GEM_SINKS.revive;
  expect(free).toBeGreaterThanOrEqual(need);
  expect(free).toBeLessThan(need * 1.15); // "tuned exactly": no big surplus
});
it('bossGold rises with the boss', () => expect(bossGold(10)).toBeGreaterThan(bossGold(1)));
```

- [ ] **Step 2: Run, expect FAIL** (`npx vitest run src/game-engine/economy.spec.ts`: module not found)
- [ ] **Step 3: Write `economy.ts`.** If the budget test fails on the placeholders, adjust `trials` (the one number B will own), not the tree. Add a header comment: "Numbers are placeholders until playtested; the spec's budget rule is pinned in economy.spec.ts."
- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** `Add the economy price sheet and pin the free gem budget`

---

### Task A2: Gold from boss kills, lost on death

**Files:**
- Modify: `src/game-engine/types.ts` (`Character.gold?: number`, comment: undefined = 0, a fresh character never sets it so death wipes it)
- Modify: `src/game-engine/combat.ts` (`resolveBossDefeatIfDead`)
- Modify: `src/store/activityLogStore.ts`, `src/components/ui/ActivityLog.vue`, `src/composables/useCombatActions.ts`
- Test: `src/game-engine/combat.spec.ts`

**Interfaces:**
- Consumes: `bossGold` (A1).
- Produces: `characterGold(c: Pick<Character,'gold'>): number` in `combat.ts` (or a new `gold.ts` if you prefer, export from `index.ts`); `resolveBossDefeatIfDead` result gains `goldReward: number`; the `boss-defeated` log entry gains optional `gold?: number`.

- [ ] **Step 1: Failing tests**
  - `resolveBossDefeatIfDead pays bossGold(slain.index)`: kill boss 3 from `gold: 50` → `character.gold === 50 + bossGold(3)`, `goldReward === bossGold(3)`.
  - `a death wipes gold`: `resolvePlayerDeathIfDead` on a dead character with `gold: 900` → `characterGold(result.character) === 0`.
  - `no gold when the boss lives`: `goldReward === 0`.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.** In `useCombatActions.ts` pass `gold: defeatResult.goldReward` into the existing `boss-defeated` log entry; `ActivityLog.vue` shows it after the EXP with the gold icon.
- [ ] **Step 4: Run `combat.spec.ts` and `ActivityLog.spec.ts`, expect PASS**
- [ ] **Step 5: Commit** `Pay gold for every boss kill and lose it on death`

---

### Task A3: Account slice — gems and highest level

**Files:**
- Create: `src/game-engine/account.ts`, `src/game-engine/account.spec.ts`
- Create: `src/store/accountStore.ts`, `src/store/accountStore.spec.ts`
- Create: `src/store/plugins/accountTracking.ts`
- Modify: `src/store/plugins/saveState.ts` (`account?: Account`, same "optional, added after v5" comment precedent), `localStoragePersistence.ts` (write + subscribe), `src/store/index.ts`, `src/game-engine/index.ts`
- Test: `src/store/index.spec.ts`, `src/store/saveFile.spec.ts`

**Interfaces:**
- Consumes: `LEVEL_GEM_MILESTONES` (A1).
- Produces:
  - `interface Account { gems: number; highestLevel: number }`
  - `createAccount(): Account` → `{ gems: 0, highestLevel: 1 }`
  - `recordLevel(account: Account, level: number): { account: Account; gemsPaid: number }` — pays every milestone with `highestLevel < m.level <= level`, raises `highestLevel`; never lowers it.
  - `spendGems(account: Account, gems: number): Account | null` — null if short.
  - `useAccountStore`: state `{ account }`, actions `initFromSave(saved: Account | null, seedLevel: number)`, `recordLevel(level): number`, `spendGems(n): boolean`.
  - `setupAccountTracking(pinia)` — subscribes to the character store and calls `recordLevel` on every level change; logs `{ kind: 'gems', amount, reason: 'level' }` when it pays.

- [ ] **Step 1: Failing tests (`account.spec.ts`)**
  - `recordLevel(createAccount(), 10)` → `gemsPaid === 2 + 3`, `highestLevel === 10`.
  - `a milestone pays once`: record 10, then 4 (death), then 10 again → second call pays 0.
  - `jumping several milestones pays all of them`: 1 → 16 pays `2 + 3 + 4`.
  - `spendGems` with too few → `null`; exact → `gems: 0`.
- [ ] **Step 2: Failing tests (`index.spec.ts`)**
  - `an old v5 save without account loads with 0 gems and pays its past milestones once`: save with `character.level: 12` → gems `2 + 3`, `highestLevel 12`; reload → still `2 + 3`.
  - Seed uses `max(character.level, best level in the high-score list)`.
- [ ] **Step 3: Failing test (`saveFile.spec.ts`)**: export → import round-trips `account`; importing a file without `account` succeeds.
- [ ] **Step 4: Run, expect FAIL**
- [ ] **Step 5: Implement.** In `initializeStores`, call `setupAccountTracking` after the character store hydrates (same reason `setupHighScoreTracking` waits). Add the `gems` log kind.
- [ ] **Step 6: Run the four spec files, expect PASS**
- [ ] **Step 7: Commit** `Add the account slice: gems kept forever, level milestones pay once`

---

### Task A4: Talents bought and kept through death

**Files:**
- Modify: `src/game-engine/talents.ts`, `src/game-engine/combat.ts` (`resolvePlayerDeathIfDead`), `src/game-engine/types.ts` (rewrite the `talents` / `talentsUnlocked` comments: bought, kept through death), `src/game-engine/index.ts`
- Test: `src/game-engine/talents.spec.ts`, `src/game-engine/combat.spec.ts`

**Interfaces:**
- Consumes: `TALENT_COST` (A1), `characterGold` (A2).
- Removes: `talentPointsTotal`, `talentPointsUnspent`, `canSpendTalent`, `spendTalent`. Keep `talentPointsSpent` renamed `talentRanksBought` and `talentPointsInShoot` renamed `talentRanksInShoot`.
- Produces:
  - `nextTalentCost(c: Pick<Character,'talents'>): { gold: number; gems: number }` = `TALENT_COST(talentRanksBought(c) + 1)`
  - `canBuyTalent(c: Character, gems: number, id: TalentId): boolean` — tab open, node open, not full, gold and gems both enough.
  - `buyTalent(c: Character, gems: number, id: TalentId): { character: Character; gemsSpent: number } | null` — takes the gold off the character, adds the rank; null if `!canBuyTalent`.

- [ ] **Step 1: Failing tests (`talents.spec.ts`)** — replace the points tests:
  - `the first rank costs 100 gold`: `gold: 150` buy `might` → `gold: 50`, rank 1, `gemsSpent: 0`.
  - `the fourth rank needs a gem`: 3 ranks bought, `gold: 1000`, `gems: 0` → `null`; with `gems: 1` → `gemsSpent: 1`, `gold: 600`.
  - `short on gold buys nothing`: `gold: 99` → `null`.
  - `levels no longer give anything`: a level 30 character with `gold: 0` can't buy.
  - Keep every `isTalentUnlocked` test unchanged.
- [ ] **Step 2: Failing tests (`combat.spec.ts`)**
  - `a death keeps talents and the open tab`: dead character with `talents: { might: 3 }, talentsUnlocked: true` → fresh character has both.
- [ ] **Step 3: Run, expect FAIL**
- [ ] **Step 4: Implement.** In `resolvePlayerDeathIfDead`, spread `talents` and `talentsUnlocked` from the dead character onto `freshCharacter`. Fix every compile error from the removed functions (`npx vue-tsc -b` lists them; the UI ones are Task A5, so stub them to the new names here and let A5 restyle).
- [ ] **Step 5: Run `talents.spec.ts`, `talents.effects.spec.ts`, `combat.spec.ts`, expect PASS**
- [ ] **Step 6: Commit** `Buy talents with gold and gems and keep them through death`

---

### Task A5: Talents page buys with gold and gems

**Files:**
- Create: `src/composables/useTalentPurchase.ts`, `src/composables/useTalentPurchase.spec.ts`
- Modify: `src/components/talents/TalentNodeModal.vue`, `TalentSection.vue`, `TalentTree.vue`, `TalentUnlockPopup.vue`, `src/components/layout/TabBar.vue`, `src/components/ui/statIcons.ts`
- Test: `TalentSection.spec.ts`, `TalentUnlockPopup.spec.ts`, `TabBar.spec.ts`

**Interfaces:**
- Consumes: `buyTalent`, `canBuyTalent`, `nextTalentCost` (A4); `useAccountStore` (A3).
- Produces: `useTalentPurchase(): { cost: ComputedRef<{gold:number;gems:number}>; canBuy(id: TalentId): boolean; buy(id: TalentId): boolean }` — `buy` runs `buyTalent`, `clampHealthToMax`, sets the character, then `accountStore.spendGems(gemsSpent)`.
- Icons: `gold` (Lucide `Coins`) and `gems` (Lucide `Gem`, not Ult's violet) in `statIcons.ts`.

- [ ] **Step 1: Failing tests**
  - `useTalentPurchase.spec.ts`: `buy` takes gold from the character and gems from the account in one go; `buy` twice in a row with gold for one → second returns `false`, one rank.
  - `TalentSection.spec.ts`: header shows gold and gem counts and the line `Kept through death.`; no "points" text.
  - `TalentNodeModal` (in `TalentSection.spec.ts`): button reads the cost (`400` gold, `1` gem); disabled and labelled `Not enough` when short.
  - `TabBar.spec.ts`: talents tab pip shows when the next rank is affordable on some open node, none otherwise; no number badge.
  - `TalentUnlockPopup.spec.ts`: copy no longer mentions points.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.** Copy (terse): unlock popup line `Gold buys talents. They stay when you fall.`; modal button `Learn` + cost chips. Cost chips use the existing plate style; button ≥ 44px tall.
- [ ] **Step 4: Run the four spec files, then `npm run test:unit` and `npm run build`, expect PASS**
- [ ] **Step 5: Commit** `Show gold and gem prices on the talents page and buy ranks with them`

---

### Milestone A done when

- [ ] `npm run test:unit`, `npm run lint`, `npm run build` all pass.
- [ ] In the dev server: kill a boss → gold in the log and talents header; buy 3 ranks; the 4th asks for a gem; level to 5 → 2 gems; die → gold 0, ranks and gems kept, tree still open.
- [ ] **Do not push.** Write the Milestone B plan next; push A + B together.
