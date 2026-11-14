# Shop Milestone B Implementation Plan (Shop tab + one-time trials)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Trials tab into a gold Shop (featured piece, wares, tonics, restock) under the pinned shopkeeper scene, and make trials one-time per account, so Milestone A + B can go live together.

**Architecture:** Trials stay on `Character.challenges` and are carried through death by `resolvePlayerDeathIfDead`, the same way Milestone A carries talents, so a trial is done once per account and never offered again. The Shop's daily stock lives on `Character.shop`, so a death wipes it for free (spec §6: "New stock when you fall"). All shop rules are pure functions in a new `game-engine/shop.ts`. Every price is in `constants/economy.ts`. A `useShop` composable takes the gold, hands bought items to the existing drop popup, and writes the log. The phone's Shop tab pins a `ShopScene` where the Hero tab pins `HomeBase`.

**Tech Stack:** Vue 3, Pinia, TypeScript, Vitest, SCSS, Lucide icons.

**Spec:** `docs/ideas/2026-11-13-shop-economy.md` (§4 gold shop, §6 death, §7 trials, §11 UI). Build order and Milestone A: `docs/superpowers/plans/2026-11-13-shop-economy.md`. Mock: `docs/mockups/shop-tab-2.html` (scene from B, shop UI from A).

## Global Constraints

- Gold: lost on death. Gems: kept forever. Every free gem source pays once per account.
- Never sold for gold: gems, skill ranks. Nothing random is sold (the stock is visible before you pay; no mystery boxes).
- Purchases are used immediately. No inventory. A bought item goes through the drop popup: it's equipped, swapped in, or dropped.
- Trials: one-time achievements. No relics from trials. Keep the existing 17 trials and the flat `TRIAL_GEMS = 12`.
- Bottom bar: Skills · Quests · **Shop** · Talents · Hero. Shop takes the Trials slot. Trials stay reachable from the stage-edge button and the menu.
- Backdrop: `assets/pixellab/2026-11-12-shop-keeper-3/tile-01.png`, 216 × 116 art px, drawn at 2 CSS px per art px (432 × 232), centred and cropped like `HomeBase`. Nothing is drawn over the shopkeeper.
- Scene: an RPG text box across the bottom, with the speaker's name in its corner. The scene turns cool blue on the Vault tab.
- Shop UI: a plain Shop | Vault switch under the scene. Each tab opens with its featured piece on velvet, then rows. No folder tabs, no binder.
- Persistence goes through the store layer only. No `localStorage` in components.
- Tap targets ≥ 44px, nothing behind hover, safe areas respected. Animations stop under `prefers-reduced-motion`.
- Player copy is short and mysterious. Ware and tonic effects say plainly what they do.
- Pushing `main` deploys live. Commit after each task. Push A + B together only after the user OKs it.

## Decisions taken here (change before starting if wrong)

1. **Trials carry through death on the character.** `challenges` (active ones with their progress, finished ones, and unclaimed ones) and `trialsUnlocked` are kept, the same way `talents` is. Old saves need no migration. Trials finished in runs before B are already gone and can't be recovered.
2. **Trials become a hidden tab.** Tab id `'trials'` stays. Only its bottom-bar button goes. The stage-edge Trials button and the menu item still open it. While it's open, no bottom-bar tab is lit.
3. **The Vault ships shut.** The switch, the cool tint and his Vault line are built, but the Vault body is a sealed notice (`The vault is shut.`). Milestone D fills it.
4. **Prices follow the current boss**, as multiples of `bossGold(boss.index)`, rounded to 5. Ware prices are locked when the stock is drawn. Tonic and restock prices are live.
5. **Stock is per day.** Each day: up to 3 basic items (common/uncommon), 1 rare, and on 1 day in 3 an epic or relic (a relic 1 time in 3 of those). The featured piece on velvet is the epic/relic on days that have one, otherwise the rare. Rarities follow the level's drop shares: nothing is stocked whose drop share is 0% at the hero's level.
6. **Restock** redraws the whole stock, including the epic/relic roll. The fee doubles with each restock and resets with the next day's stock.
7. **Tonics** reuse the existing boost rules: Crit boost and Healing boost are the level-up events' (+20% for 3 days). Added: an EXP boost (+25% for 3 days) and a Healing Draught (heals 25% of max HP, once every 3 days, can't be bought at full health). Only one of each boost can be active at a time.
8. **One tap buys.** No confirm step, as in the mock. The price is on the button.
9. **Buying an epic doesn't finish "Epic find"**, since that trial is about finding one.
10. **Speaker name:** `Shopkeeper` until you name him.
11. **Shop is open from level 1.** No seal, no unlock popup.
12. **Desktop:** a Shop banner and an "Open shop" button in the side column, under Talents. They open a modal with the scene and the wares, the same pattern Talents uses.

**Left for later:** shop services (reroll, Overdrive, slots, enchant, upgrade) are Milestone C. Vault wares are D. A Shop tab pip for new stock is not planned.

## Review Focus

1. **Death mid-run.** Trials (active with progress, done, unclaimed) and the Trials unlock are kept. Gold, stock and the draught cooldown are wiped. The fresh run gets a new stock the same day, not tomorrow. (B1, B6)
2. **Double tap or short on gold.** Two fast taps buy one item and charge once. With too little gold nothing changes and no balance goes negative. (B3, B5)
3. **Slots full.** Buying with every slot full opens the swap popup. The row warns `Swaps one out` before the tap, because declining in the popup loses the item and the gold. (B7)
4. **Day change while the app is open** (including the dev Skip day button). The stock redraws, the restock fee resets, and the draught and boost timers move on. (B3, B6)
5. **Stocked item obtained another way.** An item in today's stock that drops from a boss afterwards shows `Owned` and can't be bought. (B3, B7)

---

## File map

- Create `src/game-engine/shop.ts`, `src/game-engine/shop.spec.ts`: stock, buy, restock, tonics (pure).
- Create `src/composables/useShop.ts`, `useShop.spec.ts`: the store-facing buy/restock/tonic actions.
- Create `src/composables/useCenteredArt.ts`: the whole-px centring that `HomeBase` does today, shared with `ShopScene`.
- Create `src/components/shop/ShopScene.vue`, `ShopSection.vue`, `ShopWares.vue`, `ShopWareRow.vue`, `ShopFeatured.vue`, plus `ShopScene.spec.ts` and `ShopSection.spec.ts`.
- Create `public/sprites/home/shop.png` (a copy of the picked tile).
- Modify: `types.ts`, `constants/economy.ts`, `constants/tuning.ts`, `economy.spec.ts`, `leveling.ts`, `combat.ts`, `challenges.ts` (comments), `index.ts`, `tabStore.ts`, `TabBar.vue`, `AppShell.vue`, `HomeBase.vue`, `SealedNotice.vue`, `TrialUnlockPopup.vue`, `useItemDropQueue.ts`, `ItemDropPopup.vue`, `activityLogStore.ts`, `ActivityLog.vue`, `useHeroStats.ts`, `statIcons.ts`, `bossStore.ts`, `useCombatActions.ts`.

Run all tests with `npm run test:unit`, or one file with `npx vitest run <path>`. Two `HabitList.spec.ts` hint tests are known to be flaky: rerun them before chasing a failure there.

---

### Task B1: Trials are done once per account

**Files:**
- Modify: `src/game-engine/combat.ts` (`resolvePlayerDeathIfDead`), `src/game-engine/types.ts` (rewrite the comments on `challenges` and `trialsUnlocked`: kept through death, each trial done once), `src/game-engine/challenges.ts` (the header and `TRIALS_UNLOCK_LEVEL` comments say "per run" and "each run", which are now wrong)
- Modify: `src/components/quests/TrialUnlockPopup.vue` (the comment says "Shown every run", now "Shown once". The Earn rule's text becomes `Each pays gems, once.`)
- Modify: `src/game-engine/economy.spec.ts`
- Test: `src/game-engine/combat.spec.ts`, `src/game-engine/challenges.spec.ts`

**Interfaces:**
- Produces: no new functions. `resolvePlayerDeathIfDead` now also keeps `challenges` and `trialsUnlocked`.

- [ ] **Step 1: Write the failing tests**
  - `combat.spec.ts` › `a death keeps every trial and the open Trials`: a dead character with `trialsUnlocked: true` and `challenges` holding one active entry (`resist`, progress 3), one claimed (`rank-up`, done), and one unclaimed (`slay-two`, `unclaimed: true`). The fresh character has the same three entries, deep-equal, and `trialsUnlocked: true`.
  - `challenges.spec.ts` › `a trial finished in an earlier run is never offered again`: kill the character from the case above. `offerableChallenges(fresh)` contains none of the three ids.
  - `challenges.spec.ts` › `an unclaimed trial can still be claimed after a death, once`: `claimableChallenges(fresh)` has `slay-two`. After `markChallengeClaimed`, it has none, and a second `markChallengeClaimed` returns the same object.
  - `economy.spec.ts` › `one-time trials fit the trial budget`: `CHALLENGE_DEFS.length * TRIAL_GEMS <= FREE_GEM_SOURCES.trials`.
- [ ] **Step 2: Run, expect FAIL** (`npx vitest run src/game-engine/combat.spec.ts src/game-engine/challenges.spec.ts`: the fresh character has no challenges)
- [ ] **Step 3: Implement.** Add `challenges: character.challenges` and `trialsUnlocked: character.trialsUnlocked` to the `kept` spread in `resolvePlayerDeathIfDead`. Extend its comment ("Talents and trials are kept through death…"). Update the comments listed above.
- [ ] **Step 4: Run `combat.spec.ts`, `challenges.spec.ts`, `economy.spec.ts`, `TrialSection.spec.ts`, expect PASS**
- [ ] **Step 5: Commit** `Keep trials through death so each one pays its gems once`

---

### Task B2: EXP boost status effect

**Files:**
- Modify: `src/game-engine/types.ts` (`ExpBoostStatusEffect`, added to the `StatusEffect` union), `src/game-engine/constants/tuning.ts`, `src/game-engine/leveling.ts`, `src/game-engine/combat.ts`, `src/store/bossStore.ts`, `src/composables/useCombatActions.ts`, `src/composables/useHeroStats.ts`, `src/components/ui/statIcons.ts`, `src/game-engine/index.ts`
- Test: `src/game-engine/leveling.spec.ts`

**Interfaces:**
- Produces:
  - `TUNING.EXP_BOOST_BONUS = 0.25` and `TUNING.EXP_BOOST_DAYS = 3`, next to the Crit/Healing boost entries, with the same style of comment.
  - `interface ExpBoostStatusEffect { type: 'expBoost'; appliedDayKey: string; durationDays: number; bonus: number }`
  - `activeExpBoost(character: Character, currentDayKey: string): ExpBoostStatusEffect | undefined`, which goes through `activeTimedBoost` (widen its type parameter).
  - `applyExpBoost(character: Character, dayKey: string): Character`, which grants or refreshes the boost and replaces any existing one (the same shape as `applyCritBoostEvent`). It lives in `leveling.ts` or `events.ts`, beside the other two.
  - `addExpAndResolveLevelUps(character, expGained, currentDayKey?: string)`: the EXP multiplier becomes `1 + itemBonusPercent(character, 'expGain') / 100 + (boost?.bonus ?? 0)`, an additive bonus, as Crit boost is.
  - `resolveBossDefeatIfDead(character, boss, rng, currentDayKey?: string)` passes the day key on. `bossStore.resolveBossDefeatIfDead` gains the same optional argument.
  - `statIcons`: `expBoost: { icon: Sparkles, color: 'var(--icon-exp)' }`.

- [ ] **Step 1: Write the failing tests** (`leveling.spec.ts`)
  - `an active EXP boost adds 25% EXP`: a level 1 character with `applyExpBoost(c, '2026-11-13')`. Grant 100 EXP with day `'2026-11-13'` → exp `125`.
  - `an expired EXP boost adds nothing`: the same boost, granted 100 EXP with day `'2026-11-16'` (day 4) → exp `100`.
  - `no day key means no boost`: called without the third argument → exp `100`.
  - `applyExpBoost replaces the old boost`: applying it twice leaves exactly one `expBoost` entry.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.** Pass `dailyPeriodKey(debugClockStore.now())` (or the day key already in scope) to the three `addExpAndResolveLevelUps` calls in `useCombatActions.ts` and its one `resolveBossDefeatIfDead` call. In `useHeroStats`, add an `expBoost` effect line (`+25% EXP`, days left, tone `boon`) the same way `critBoost` does.
- [ ] **Step 4: Run `leveling.spec.ts`, `combat.spec.ts`, `useCombatActions.spec.ts`, expect PASS**
- [ ] **Step 5: Commit** `Add an EXP boost status effect`

---

### Task B3: Shop stock, buying and restocking (engine)

**Files:**
- Modify: `src/game-engine/constants/economy.ts`, `src/game-engine/types.ts`, `src/game-engine/index.ts`
- Create: `src/game-engine/shop.ts`
- Test: `src/game-engine/shop.spec.ts`, `src/game-engine/economy.spec.ts`

**Interfaces:**
- Consumes: `bossGold`, `characterGold` (gold.ts), `dropRarityShares`, `ITEM_CATALOG`, `recordRelicEarned`, `pickRandom` (rng.ts).
- Produces in `economy.ts`:
  - `roundPrice(gold: number): number`: rounds to the nearest 5, minimum 5.
  - `SHOP_PRICE_FACTOR: Record<ItemRarity, number>` = `{ common: 1, uncommon: 1.5, rare: 2.5, epic: 4, relic: 6 }` (× `bossGold`).
  - `warePrice(rarity: ItemRarity, bossIndex: number): number` = `roundPrice(SHOP_PRICE_FACTOR[rarity] * bossGold(bossIndex))`.
  - `restockFee(restocksToday: number, bossIndex: number): number` = `roundPrice(0.5 * bossGold(bossIndex) * 2 ** restocksToday)`.
  - `SHOP_STOCK = { basics: 3, featuredChance: 1 / 3, relicShare: 1 / 3 }`.
- Produces in `types.ts`:
  - `interface ShopWare { itemId: string; price: number; sold?: boolean }`
  - `interface ShopStock { dayKey: string; featured: ShopWare | null; wares: ShopWare[]; restocks: number }`
  - `Character.shop?: ShopStock`. Comment: today's stock, which a fresh character never has, so a death redraws it.
- Produces in `shop.ts`:
  - `stockShop(character: Character, bossIndex: number, dayKey: string, rng: Rng): Character`: returns the same object when `character.shop?.dayKey === dayKey`. Otherwise it returns the character with a freshly drawn stock (`restocks: 0`).
  - `restockShop(character: Character, bossIndex: number, rng: Rng): { character: Character; fee: number } | null`: takes `restockFee(shop.restocks, bossIndex)` gold, redraws, and keeps `dayKey` with `restocks + 1`. Returns null with no stock or too little gold.
  - `buyWare(character: Character, itemId: string): { character: Character; item: ItemDef } | null`: takes the locked price, marks the ware `sold`, adds the item to `ownedItemIds`, and runs `recordRelicEarned`. Returns null if the item isn't in stock, is already sold, is already owned, or costs more gold than the character has.
  - `wareState(character: Character, ware: ShopWare): 'buy' | 'short' | 'sold' | 'owned'`: what a row shows.
- The draw rule (not set by the tests' shape, so spelled out):
  1. Pool = catalog items not in `ownedItemIds`. A rarity is allowed only if its `dropRarityShares(level)` share is above 0. Relics count as allowed whenever epics are.
  2. Basics: up to `SHOP_STOCK.basics` distinct items, picked at random from the allowed common and uncommon items.
  3. Rare: one allowed rare, if any.
  4. Special: if epics are allowed and `rng() < featuredChance`, a relic (when `rng() < relicShare` and one is left) or else an epic.
  5. `featured` = special ?? rare ?? null. `wares` = basics, plus the rare when a special took the velvet.
  6. Prices = `warePrice(item.rarity, bossIndex)` at draw time.

- [ ] **Step 1: Write the failing tests** (`shop.spec.ts`, with a seeded `createRng` for each case)
  - `stockShop draws once a day`: the same day key returns the same object. The next day returns a new stock with `restocks: 0`.
  - `a level 1 stock holds only what drops at level 1`: every stocked rarity has a share above 0 at level 1, and `featured` is never an epic or relic.
  - `a featured epic or relic leaves the rare in the rows`: the special is forced (an rng that returns 0 first). The featured rarity is epic or relic, and `wares` contains exactly one rare.
  - `stock never offers an owned item`.
  - `prices lock at draw time`: draw at boss 3, then call `wareState` with boss 9 in play. The price is still `warePrice(r, 3)`.
  - `buyWare takes the gold and hands over the item`: with `gold: 1000`, buying the featured item → gold `1000 - price`, the item in `ownedItemIds`, the ware `sold`.
  - `buyWare twice buys once`: the second call returns `null`, and gold is charged once.
  - `short on gold buys nothing`: `null`, and the character is unchanged.
  - `a stocked item that dropped meanwhile reads owned`: add its id to `ownedItemIds`. `wareState` returns `'owned'` and `buyWare` returns `null`.
  - `buying a relic records it earned`: `earnedRelicIds` contains it.
  - `restock doubles its fee and resets next day`: fees at boss 5 are `restockFee(0,5)`, then `restockFee(1,5)`. After `stockShop` for the next day, the next fee is `restockFee(0,5)` again.
  - `restock with too little gold does nothing`: `null`.
- [ ] **Step 2: Write the failing tests** (`economy.spec.ts`)
  - `ware prices climb with rarity and the boss`: `warePrice('common', 1) < warePrice('rare', 1) < warePrice('relic', 1)`, and `warePrice('rare', 10) > warePrice('rare', 1)`.
  - `an epic costs a few bosses' worth`: `warePrice('epic', i) / bossGold(i)` is between 3 and 5 for i = 1, 10, 30.
  - `roundPrice rounds to 5`: `roundPrice(52) === 50`, `roundPrice(1) === 5`.
- [ ] **Step 3: Run, expect FAIL** (module not found)
- [ ] **Step 4: Implement `economy.ts` additions and `shop.ts`**, and export them from `index.ts`.
- [ ] **Step 5: Run `shop.spec.ts`, `economy.spec.ts`, expect PASS**
- [ ] **Step 6: Commit** `Add the shop's daily stock, buying and restocking`

---

### Task B4: Tonics (engine)

**Files:**
- Modify: `src/game-engine/shop.ts`, `src/game-engine/types.ts` (`Character.draughtDayKey?: string`, the day the last Healing Draught was drunk), `src/game-engine/constants/economy.ts`, `src/game-engine/constants/tuning.ts`
- Test: `src/game-engine/shop.spec.ts`

**Interfaces:**
- Consumes: `activeCritBoost`, `activeHealBoost`, `activeExpBoost`, `applyCritBoostEvent`, `applyHealBoostEvent`, `applyExpBoost` (B2), `effectiveStat`, `daysBetweenDayKeys`.
- Produces:
  - `TUNING.DRAUGHT_HEAL_PCT = 25` and `TUNING.DRAUGHT_COOLDOWN_DAYS = 3`.
  - `tonicPrice(bossIndex: number): number` = `roundPrice(bossGold(bossIndex))` in `economy.ts`.
  - `type TonicId = 'draught' | 'crit' | 'heal' | 'exp'`
  - `TONIC_DEFS: readonly { id: TonicId; name: string; effect: string; icon: string }[]` (`icon` is a `statIcons` key), with names `Healing Draught`, `Hawk Tonic`, `Verdant Tonic`, `Scholar's Tonic`. Effects are built from TUNING: `Heal 25% of max HP.`, `+20% crit chance for 3 days.`, `+20% healing for 3 days.`, `+25% EXP for 3 days.` Icons: `healing`, `critBoost`, `healBoost`, `expBoost`.
  - `tonicState(character: Character, id: TonicId, bossIndex: number, dayKey: string): { price: number; status: 'buy' | 'short' | 'active' | 'cooldown' | 'full'; daysLeft: number }`. `active` means a boost is running. `cooldown` means the draught was drunk within 3 days. `full` means the draught at full health. `daysLeft` matters for active and cooldown.
  - `buyTonic(character: Character, id: TonicId, bossIndex: number, dayKey: string): { character: Character; healed?: number } | null`. Returns null unless the status is `buy`.

- [ ] **Step 1: Write the failing tests**
  - `the draught heals 25% and then rests 3 days`: at half health, buy on `'2026-11-13'`. Health rises by 25% of max and gold drops by `tonicPrice`. On `'2026-11-15'` the status is `cooldown` with `daysLeft 1`. On `'2026-11-16'` it's `buy` again.
  - `no draught at full health`: status `full`, and `buyTonic` returns `null`.
  - `one of each boost at a time`: buy `crit`, and on the same day its status is `active` with `daysLeft 3`. `heal` can still be bought.
  - `the EXP tonic grants the EXP boost`: `activeExpBoost` is set after buying.
  - `a death clears the draught cooldown`: a fresh character from `resolvePlayerDeathIfDead` has no `draughtDayKey` (it isn't in the kept spread).
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run `shop.spec.ts`, expect PASS**
- [ ] **Step 5: Commit** `Sell tonics: a healing draught and crit, healing and EXP boosts`

---

### Task B5: `useShop`, the drop popup and the log

**Files:**
- Create: `src/composables/useShop.ts`, `src/composables/useShop.spec.ts`
- Modify: `src/composables/useItemDropQueue.ts`, `src/components/ui/ItemDropPopup.vue`, `src/store/activityLogStore.ts`, `src/components/ui/ActivityLog.vue`
- Test: `src/components/ui/ItemDropPopup.spec.ts`, `src/components/ui/ActivityLog.spec.ts`

**Interfaces:**
- Consumes: B3/B4 engine functions, `useCharacterStore`, `useBossStore`, `useDebugClockStore`, `useItemDropQueue`, `useActivityLogStore`, `createRng` (a module-level `rng`, as in `useCombatActions`).
- Produces:
  - `useItemDropQueue().enqueueDrops(items, droppedBy?, bought?: boolean)`, plus `bought: ComputedRef<boolean>` for the front item.
  - Log kinds: `{ kind: 'shop-bought'; name: string; gold: number }` and `{ kind: 'shop-restocked'; gold: number }`.
  - `useShop(): { stock: ComputedRef<ShopStock | null>; todayKey: ComputedRef<string>; ensureStock(): void; buy(itemId: string): boolean; restock(): boolean; restockPrice: ComputedRef<number>; buyTonic(id: TonicId): boolean; tonic(id: TonicId): ReturnType<typeof tonicState>; slotsFull: ComputedRef<boolean> }`
    - `ensureStock` runs `stockShop` with the current boss index and today's key, and sets the character only when the result is a new object.
    - `buy` sets the character, then `enqueueDrops([item], undefined, true)`, then logs `shop-bought`. It does **not** report `epic-dropped`.
    - `buyTonic` logs `shop-bought` with the tonic's name. The draught also logs the existing `event-heal` amount.

- [ ] **Step 1: Write the failing tests**
  - `useShop.spec.ts` › `buying an item queues it as bought and logs it`: after `buy(featuredId)`, the queue's `current` is the item, `bought` is `true`, and the newest log entry is `shop-bought` with the price.
  - `useShop.spec.ts` › `a quick double tap buys once`: `buy(id)` twice → `true`, then `false`. One log entry and one charge.
  - `useShop.spec.ts` › `a fresh run gets a fresh stock the same day`: stock, then kill the hero (`resolvePlayerDeathIfDead` through the store), then `ensureStock()` → `stock.value` is non-null with today's key.
  - `ItemDropPopup.spec.ts` › `a bought item says Bought! and names no boss`: title `Bought!`, no "Spoils of" line.
  - `ActivityLog.spec.ts` › `shop entries show the item and the gold`.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.** Log copy: `Bought {name}`, followed by the gold chip, and `Restocked`, followed by the gold chip, in the same row shape as the `boss-defeated` gold.
- [ ] **Step 4: Run the four spec files, expect PASS**
- [ ] **Step 5: Commit** `Add useShop: buy, restock and tonics, with bought items through the drop popup`

---

### Task B6: Shop tab, scene and Trials without a tab

**Files:**
- Create: `src/composables/useCenteredArt.ts`, `src/components/shop/ShopScene.vue`, `src/components/shop/ShopSection.vue`, `src/components/shop/ShopScene.spec.ts`
- Create: `public/sprites/home/shop.png` (`cp assets/pixellab/2026-11-12-shop-keeper-3/tile-01.png public/sprites/home/shop.png`)
- Modify: `src/components/character/HomeBase.vue` (uses `useCenteredArt`), `src/store/tabStore.ts`, `src/components/layout/TabBar.vue`, `src/components/layout/AppShell.vue`, `src/components/quests/SealedNotice.vue`
- Test: `TabBar.spec.ts`, `AppShell.spec.ts`, `HomeBase.spec.ts`

**Interfaces:**
- Produces:
  - `useCenteredArt(artWidth: number): { frame: Ref<HTMLElement | null>; offset: Ref<number> }`. This is HomeBase's `place()` and ResizeObserver code moved as is (`Math.floor((width - artWidth) / 2)`).
  - `TabId` gains `'shop'`. `useTabStore` gains `shopSide: 'shop' | 'vault'` (default `'shop'`, not remembered) and `selectShopSide(side)`.
  - `ShopScene.vue`, with a default slot for the menu (as in `HomeBase`): the art, a purse plate top-left (`CurrencyChips` `showZero`, gold from the character, gems from the account), and the text box. The box shows the line and the speaker `Shopkeeper` in its corner. The line is `Back again? Still breathing, I see.` on Shop and `Gems. Not yet.` on Vault. The cool tint (the mock's `.art .tint`, blend mode `color`) fades in on Vault.
  - `ShopSection.vue`: the Shop | Vault switch (`role="tablist"`, two ≥ 44px buttons with `Store` and `Gem` icons) and then the body for the current side. Shop side: `ShopWares` (B7; until B7 lands, an empty placeholder `<div>`). Vault side: `SealedNotice` with `text="The vault is shut."`.
  - `SealedNotice` gains an optional `text` prop that replaces `Sealed until level {{ level }}`. `level` becomes optional.
- TabBar: `TABS` becomes skills, quests, `{ id: 'shop', label: 'Shop', icon: Store }`, talents, hero. The Shop tab is never sealed. The `trials` sealing and badges leave TabBar. `useTrialsBadge` stays on the stage-edge button.
- AppShell: `topBar` returns `ShopScene` on the phone Shop tab. `trialsButton` also shows on `'shop'`. A `<div class="tab-panel" :class="{ current: tabStore.tab === 'shop' }"><ShopSection /></div>` panel is added on phones. The trials panel and its seen-watch stay as they are.

- [ ] **Step 1: Write the failing tests**
  - `TabBar.spec.ts` › `the bar is Skills, Quests, Shop, Talents, Hero`: labels in that order, and no Trials tab. Update or delete the old Trials badge tests (the badge is covered on the stage button in AppShell.spec).
  - `AppShell.spec.ts` › `the Shop tab pins the shop scene with the menu and Trials button`: select `'shop'` on a phone with trials open → `.shop-scene` is rendered, `.fight-stage` is not, and `.stage-trials` is present.
  - `AppShell.spec.ts` › `Trials still open from the stage button`: click `.stage-trials` → `tabStore.tab === 'trials'` and the trials panel is current.
  - `ShopScene.spec.ts` › `Vault cools the scene and changes his line`: `selectShopSide('vault')` → the root has class `vaulted` and the line reads `Gems. Not yet.`
  - `ShopScene.spec.ts` › `the purse shows gold and gems`: character `gold: 340`, account gems 7 → both shown.
  - `HomeBase.spec.ts` passes unchanged after the refactor.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.** Scene styles are scoped and the same in every theme (night art, near-black plates), copied from HomeBase's `.plate` and the mock's `.strip`. Pin it like `.home-base` (`z-index: 8`, `env(safe-area-inset-top)`). The text box's blinking ▾ stops under `prefers-reduced-motion`. Mark the art `alt=""` and give the section `aria-label="Shop"`.
- [ ] **Step 4: Run the four spec files, then `npm run build`, expect PASS** (the precache test picks up `shop.png` by itself)
- [ ] **Step 5: Commit** `Replace the Trials tab with the Shop tab and its shopkeeper scene`

---

### Task B7: Wares, tonics and restock rows, and the desktop Shop

**Files:**
- Create: `src/components/shop/ShopWares.vue`, `ShopFeatured.vue`, `ShopWareRow.vue`, `src/components/shop/ShopSection.spec.ts`
- Modify: `src/components/shop/ShopSection.vue` (desktop banner + modal), `src/components/layout/AppShell.vue` (desktop `<ShopSection v-if="!isPhone" />` under `TalentSection` in `.side`), `src/assets/scss/themes/ashen.scss` and `light.scss` (the Pixel-cut look for the rows, following how the trial cards are styled there)

**Interfaces:**
- Consumes: `useShop` (B5), `TONIC_DEFS` and `tonicState` (B4), `CurrencyChips`, `SectionTitle`, `spriteUrl`, and the existing item-art CSS vars for 32 × 32 art at 2 CSS px.
- Layout, from the top of the Shop side:
  1. `ShopFeatured`: velvet well with the item art at 96px (3 CSS px per art px, the mock's size; whole device pixels on 2x and 3x screens), on a rarity-tinted radial and a soft bob. A ribbon (`Rare of the day`, `Epic of the day` or `Relic of the day`). Name, bonus line, `effectText`. A foot with `Gone when you fall` and a Buy button that shows the price. If `featured` is null, nothing is drawn.
  2. `SectionTitle title="Wares"`, then a `ShopWareRow` per ware: a socket with the art, the name, the bonus line, and a Buy button with the price.
  3. `SectionTitle title="Tonics"`, then a `ShopWareRow` per `TONIC_DEFS` entry: the icon in the socket, the name, the effect line, and a button whose state reads `Buy`+price, `{n}d left` (active), `Again in {n}d` (cooldown) or `Full health`.
  4. The restock row: icon `RefreshCw`, `Restock`, `New wares, now.`, and the button with `restockPrice`.
  5. A note: `New stock each dawn, and when you fall.`
- Button states: `buy` enabled. `short` disabled, with the price in `--broke`. `sold` shows `Sold`. `owned` shows `Owned`. When `slotsFull` is true and the state is `buy`, item rows (not tonics) add the small line `Swaps one out`.
- Desktop: `ShopSection` without phone layout renders `SectionTitle title="Shop"`, the purse and an `Open shop` button. The button opens `Modal title="Shop" max-width="460px"` holding `ShopScene` (no menu slot) and the switch and body.
- `ShopWares` calls `ensureStock` from `watch(() => characterStore.character.shop?.dayKey !== todayKey.value, (stale) => stale && ensureStock(), { immediate: true })`. This covers first load, a day change, a death, and the dev Skip day button.

- [ ] **Step 1: Write the failing tests** (`ShopSection.spec.ts`)
  - `the Shop opens on the featured piece, then wares, then tonics`: the DOM order is `.shop-featured`, `Wares`, `Tonics`, restock.
  - `tapping Buy buys the ware and marks it Sold`: gold `1000`. Click the first ware's Buy → gold drops by its price and the button reads `Sold`.
  - `too little gold disables Buy`: gold `0` → every Buy button is `disabled`.
  - `full slots warn before buying`: equipped count = `maxEquipSlots` → item rows show `Swaps one out`, tonic rows don't.
  - `an active boost shows days left`: an active crit boost → the Hawk Tonic button reads `3d left` and is disabled.
  - `the Vault side shows the shut vault`: click Vault → the text `The vault is shut.` shows and no ware rows remain.
  - `a day change redraws the stock`: move the debug clock a day → `character.shop.dayKey` is the new key.
  - `desktop shows an Open shop button that opens the modal`.
- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement.** Match the mock's measurements: 52px row sockets, 120px velvet, Buy ≥ 44px tall and ≥ 76px wide in rows. Use theme tokens (`--card`, `--card-hi`, `--card-lo`, the rarity colours) so Light, Dark and Dusk all work. The bob animation stops under `prefers-reduced-motion`.
- [ ] **Step 4: Run `ShopSection.spec.ts`, then `npm run test:unit`, `npm run lint` and `npm run build`, expect PASS**
- [ ] **Step 5: Commit** `Fill the Shop: featured piece, wares, tonics and restock, and a desktop Shop`

---

### Milestone B done when

- [ ] `npm run test:unit`, `npm run lint` and `npm run build` all pass.
- [ ] In the dev server on a 375px phone: the bottom bar reads Skills · Quests · Shop · Talents · Hero. The Shop scene is crisp, centred and cropped evenly. The text box doesn't cover his face. Vault cools the scene. Kill a boss, buy a common (it's equipped or the swap popup opens), buy a tonic, and restock twice (the fee doubles). Skip a day (new stock, fee reset). Finish and claim a trial, then die: the trial stays done, isn't offered again, and the Shop has a new stock.
- [ ] Desktop: the side column has the Shop banner, and its modal works.
- [ ] Update `docs/ideas/2026-11-13-shop-economy.md` §12 only where B settled something (stock rules, tonic numbers), and mark B built in the build-order table of `docs/superpowers/plans/2026-11-13-shop-economy.md`.
- [ ] **Ask the user before pushing.** Pushing deploys Milestones A and B live together.
