# Gold Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder gold numbers with the balanced price sheet: every gold price × a prestige price factor, a smaller purse, flat-per-kill talent gold, cheaper slots and first enchant, steeper service climbs, and a Health Potion that shows its heal in HP.

**Architecture:** All gold numbers stay in `src/game-engine/constants/economy.ts`. One helper, `goldPrice(bossKills, bossIndex, prestige)`, prices everything; each price function gains a `prestige` argument. Engine functions that already take a `Character` read `character.prestige ?? 0` themselves, so most composables don't change; talents gain a `bossIndex` argument because their gold is now read at the current boss. A budget test in `economy.spec.ts` pins the spec's climb model.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-17-gold-economy-design.md`

## Global Constraints

- Price factor = 0.8 + 0.1 × prestige rank, the rank clamped to 0–5 and floored (×0.8, 0.9, 1.0, 1.1, 1.2, 1.3).
- Every gold price is `roundPrice(bossKills × bossGold(bossIndex) × factor)`: shop items, potions, restocks, services, slots, talent ranks. The Gold Pouch's payout uses the factor too. The daily purse and the death toll don't.
- `bossGold` stays 40 + 10 × boss index. `roundPrice` stays nearest 5, never under 5, applied after the factor.
- Daily purse: 0.2 boss kills.
- Talent rank gold: 0.5 boss kills, flat for every rank 1–163. Talent gems unchanged (0 for ranks 1–3, then 2/3/4/5 bands).
- Slots 5–8: 2 / 4 / 6 / 8 boss kills.
- Reroll base 2, Overdrive base 5, enchant base 3; all three climb ×2 per one held.
- Item prices (1 / 1.5 / 2.5 / 4 / 6), potions (1), restock (0.5 ×2 per restock) unchanged in boss kills.
- Nothing priced in gems changes.
- Stock already drawn keeps its locked prices; saves keep what they bought; nothing is refunded.
- Player-facing copy is terse; item effects state plainly what they do.

## Review Focus

- **A save with no `prestige` on the character** (from before prestige): prices must use factor 0.8, not NaN. Pinned in Task 1 (`goldPriceFactor(undefined ?? 0)` via a character without `prestige` in shop/services/talents/vault specs).
- **A prestige rank outside 0–5 or fractional** (bad save, debug): the factor clamps like `prestigeRank`. Pinned in Task 1 (`goldPriceFactor(-1)`, `(2.7)`, `(9)`).
- **Talent gold after a death:** death moves the boss power index back 3, so a rank gets cheaper. The price must follow the boss passed in, not ranks bought. Pinned in Task 1 (`nextTalentCost` at boss 10 vs boss 7).
- **Purse vs Pouch:** after a prestige the Pouch pays more, the purse the same. Pinned in Task 1.
- **Health Potion text at full health or 0 max-HP edge:** the HP line still renders a whole number. Pinned in Task 2.

---

### Task 1: The price sheet and the prestige factor

**Files:**
- Modify: `src/game-engine/constants/economy.ts` (header comment, every gold price function, `SERVICE_PRICES`, `SLOT_PRICE_FACTORS`, `TALENT_COST`, `DAILY_PURSE_BOSS_KILLS`, `pouchGold`)
- Modify: `src/game-engine/shop.ts` (`drawStock`, `restockShop`, `tonicState`: pass `character.prestige ?? 0`)
- Modify: `src/game-engine/services.ts` (`serviceState`: pass `character.prestige ?? 0`; `usable`'s `slotPrice(…, 0)` becomes `slotPrice(…, 0, 0)`)
- Modify: `src/game-engine/vault.ts` (`pouchState`: pass `character.prestige ?? 0`)
- Modify: `src/game-engine/talents.ts` (`nextTalentCost`, `canBuyTalent`, `buyTalent` gain `bossIndex`; comment on `talentRanksBought` no longer says the price follows it)
- Modify: `src/game-engine/index.ts` (export `goldPriceFactor`, `goldPrice`)
- Modify: `src/composables/useShop.ts:74` (`restockFee(…, bossStore.boss.index, characterStore.character.prestige ?? 0)`)
- Modify: `src/composables/useTalentPurchase.ts` (pass `bossStore.boss.index` to all three talent calls)
- Test: `src/game-engine/economy.spec.ts`, and update the calls/expectations in `shop.spec.ts`, `services.spec.ts`, `talents.spec.ts`, `vault.spec.ts`, `account.spec.ts`, `src/composables/useShop.spec.ts`, `useVault.spec.ts`, `useDailyPurse.spec.ts`, `src/components/shop/ShopSection.spec.ts`

**Interfaces:**
- Produces (in `constants/economy.ts`):
  - `GOLD_PRICE_FACTOR = { base: 0.8, perRank: 0.1 } as const`
  - `goldPriceFactor(prestige: number): number` — `base + perRank × clamp(floor(prestige), 0, 5)`, rounded to 2 decimals (plain `0.8 + 0.1 * 4` is `1.2000000000000002`, which breaks the `toEqual` below)
  - `goldPrice(bossKills: number, bossIndex: number, prestige: number): number` — `roundPrice(bossKills × bossGold(bossIndex) × goldPriceFactor(prestige))`
  - `warePrice(rarity, bossIndex, prestige)`, `restockFee(restocksToday, bossIndex, prestige)`, `tonicPrice(bossIndex, prestige)`, `servicePrice(id, bought, bossIndex, prestige)`, `slotPrice(upgrades, bossIndex, prestige): number | null`, `pouchGold(bossIndex, prestige)` — all through `goldPrice`
  - `TALENT_RANK_BOSS_KILLS = 0.5`
  - `TALENT_COST(n: number, bossIndex: number, prestige: number): { gold: number; gems: number }` — gold `goldPrice(TALENT_RANK_BOSS_KILLS, bossIndex, prestige)` for every n; gems as today
  - `purseGold(bossIndex)` unchanged signature; `DAILY_PURSE_BOSS_KILLS = 0.2`
  - `SERVICE_PRICES = { reroll: { base: 2, climb: 2 }, overdrive: { base: 5, climb: 2 }, enchant: { base: 3, climb: 2 } }`
  - `SLOT_PRICE_FACTORS = [2, 4, 6, 8] as const`
- Produces (in `talents.ts`): `nextTalentCost(character: Pick<Character, 'talents' | 'prestige'>, bossIndex: number)`, `canBuyTalent(character, gems, id, bossIndex)`, `buyTalent(character, gems, id, bossIndex)`

- [ ] **Step 1: Write the failing tests in `economy.spec.ts`**

Replace the `'the tree costs the spec bands, gold unchanged'` test's gold lines and add a `describe('the gold price sheet')`:

```ts
it('the tree costs the spec gem bands', () => {
  expect([3, 4, 20, 21, 40, 41, 60, 61, 163].map((n) => TALENT_COST(n, 1, 0).gems)).toEqual([0, 2, 2, 3, 3, 4, 4, 5, 5]);
});

describe('the gold price sheet', () => {
  it('prices rise 0.1 per prestige rank from 0.8, clamped to the ladder', () => {
    expect([0, 1, 2, 3, 4, 5].map(goldPriceFactor)).toEqual([0.8, 0.9, 1, 1.1, 1.2, 1.3]);
    expect(goldPriceFactor(-1)).toBe(0.8);
    expect(goldPriceFactor(2.7)).toBe(1);
    expect(goldPriceFactor(9)).toBe(1.3);
  });

  it('a price is boss kills at the current boss, times the factor, rounded to 5', () => {
    expect(goldPrice(1, 10, 2)).toBe(140); // 140 × 1.0
    expect(goldPrice(1, 10, 0)).toBe(110); // 112 → 110
    expect(goldPrice(0.5, 1, 0)).toBe(20);
  });

  it('a talent rank is half a kill, whatever ranks came before', () => {
    expect(TALENT_COST(1, 20, 2).gold).toBe(120);
    expect(TALENT_COST(150, 20, 2).gold).toBe(120);
    expect(TALENT_COST(150, 20, 4).gold).toBe(145); // 144 → 145
  });

  it('slots, services and the climbs follow the spec', () => {
    expect([0, 1, 2, 3].map((u) => slotPrice(u, 10, 2))).toEqual([280, 560, 840, 1120]);
    expect(slotPrice(4, 10, 2)).toBeNull();
    expect([0, 1, 2].map((b) => servicePrice('enchant', b, 10, 2))).toEqual([420, 840, 1680]);
    expect([0, 1].map((b) => servicePrice('reroll', b, 10, 2))).toEqual([280, 560]);
    expect([0, 1].map((b) => servicePrice('overdrive', b, 10, 2))).toEqual([700, 1400]);
  });

  it('the Pouch pays more after a prestige; the purse does not', () => {
    expect(pouchGold(10, 4)).toBeGreaterThan(pouchGold(10, 0));
    expect(purseGold(10)).toBe(30); // 0.2 × 140 = 28 → 30
  });
});
```

Update the `'economy gold sheet'` describe's `warePrice` calls to pass prestige `2` (factor 1), keeping their assertions.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/game-engine/economy.spec.ts`
Expected: FAIL (`goldPriceFactor` / `goldPrice` not exported; slot and enchant prices differ).

- [ ] **Step 3: Implement the price sheet in `constants/economy.ts`**

Add `GOLD_PRICE_FACTOR`, `goldPriceFactor`, `goldPrice`, `TALENT_RANK_BOSS_KILLS`; route every gold price function through `goldPrice` with the new `prestige` argument; set the constants per the Interfaces block. Replace the file header's "the gold numbers are placeholders until the gold balance" with a pointer to `docs/superpowers/specs/2026-11-17-gold-economy-design.md` and its budget test. Update the doc comments that state numbers (purse, slots, services, talent cost).

- [ ] **Step 4: Run `economy.spec.ts` to verify it passes**

Run: `npx vitest run src/game-engine/economy.spec.ts`
Expected: PASS

- [ ] **Step 5: Add the engine-level tests**

- `shop.spec.ts`: a hero with `prestige: 2` gets stock priced `warePrice(rarity, boss, 2)`; a hero with no `prestige` gets `warePrice(rarity, boss, 0)`; `tonicState(...).price` for `'draught'` equals `tonicPrice(boss, prestige)`.
- `services.spec.ts`: `serviceState(...).price` for `'slot'` with `prestige: 3` equals `slotPrice(0, boss, 3)`; the existing "prices climb with each one held" test expects ×2 steps.
- `talents.spec.ts`: `nextTalentCost(hero, 10).gold > nextTalentCost(hero, 7).gold` (a death's boss step-back makes it cheaper); `nextTalentCost(withTalents(hero, { might: 3 }), 10).gold === nextTalentCost(hero, 10).gold`; `nextTalentCost(hero, 10)` equals `TALENT_COST(1, 10, hero.prestige ?? 0)`.
- `vault.spec.ts`: `pouchState(...).gold` with `prestige: 4` equals `pouchGold(boss, 4)`.

- [ ] **Step 6: Thread `prestige` (and talents' `bossIndex`) through the engine and composables**

Per the Files list. Then update every existing spec call site listed under Test to the new signatures, and any hard-coded expected prices to the new values (compute them from the exported helpers, not literals, where the test isn't about the number itself).

- [ ] **Step 7: Run the full suite and the type check**

Run: `npx vitest run && npx vue-tsc -b`
Expected: PASS, no type errors. (Known flakes: two `HabitList.spec.ts` hint tests fail ~1 in 8 runs; rerun first. `CharacterPanel.spec` Sunder copy test was already failing before this work.)

- [ ] **Step 8: Commit**

```bash
git add src/game-engine src/composables src/components/shop/ShopSection.spec.ts
git commit -m "Price all gold by boss kills times a prestige factor: cheaper slots and tree, a smaller purse, services climbing x2"
```

---

### Task 2: The Health Potion shows its heal in HP

**Files:**
- Modify: `src/game-engine/shop.ts` (add `tonicEffect`)
- Modify: `src/game-engine/index.ts` (export it)
- Modify: `src/components/shop/ShopItems.vue:54-66` (the `potions` computed uses `tonicEffect(characterStore.character, def.id)` for `effect`)
- Test: `src/game-engine/shop.spec.ts`

**Interfaces:**
- Consumes: `effectiveStat(character, 'health')`, `TUNING.DRAUGHT_HEAL_PCT` (25), `formatCompact` from `format.ts`
- Produces: `tonicEffect(character: Character, id: TonicId): string` — for `'draught'`: `` `Heal ${formatCompact(max × DRAUGHT_HEAL_PCT / 100)} HP.` ``; every other id returns its `TONIC_DEFS` `effect` unchanged

- [ ] **Step 1: Write the failing test**

```ts
describe('tonicEffect', () => {
  it('the Health Potion names its heal in HP', () => {
    const hero = makeCharacter();
    const heal = (effectiveStat(hero, 'health') * TUNING.DRAUGHT_HEAL_PCT) / 100;
    expect(tonicEffect(hero, 'draught')).toBe(`Heal ${formatCompact(heal)} HP.`);
  });

  it('still names it at full health', () => {
    const hero = makeCharacter();
    expect(tonicEffect({ ...hero, currentHealth: effectiveStat(hero, 'health') }, 'draught')).toMatch(/^Heal \d[\d.]*K? HP\.$/);
  });

  it('other potions keep their line', () => {
    expect(tonicEffect(makeCharacter(), 'crit')).toBe(TONIC_DEFS.find((d) => d.id === 'crit')!.effect);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/game-engine/shop.spec.ts -t tonicEffect`
Expected: FAIL (`tonicEffect` not defined)

- [ ] **Step 3: Implement `tonicEffect` in `shop.ts` and use it in `ShopItems.vue`**

- [ ] **Step 4: Run the shop specs to verify they pass**

Run: `npx vitest run src/game-engine/shop.spec.ts src/components/shop`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game-engine/shop.ts src/game-engine/shop.spec.ts src/game-engine/index.ts src/components/shop/ShopItems.vue
git commit -m "Show the Health Potion's heal in HP, so its rising price reads as a bigger potion"
```

---

### Task 3: The gold budget test

**Files:**
- Modify: `src/game-engine/economy.spec.ts` (new `describe('the gold budget')`)
- Modify: `docs/superpowers/specs/2026-11-17-gem-economy-design.md` §8 (the gold line points to the gold spec: "Done: see `2026-11-17-gold-economy-design.md`; a rank is half a boss kill, not a level's gold")

**Interfaces:**
- Consumes: `SLOT_PRICE_FACTORS`, `SERVICE_PRICES`, `SHOP_PRICE_FACTOR`, `TALENT_RANK_BOSS_KILLS`, `DAILY_PURSE_BOSS_KILLS`, `goldPriceFactor` from Task 1

- [ ] **Step 1: Write the test** (spec §6–7; all in raw boss kills, no rounding)

```ts
describe('the gold budget', () => {
  // The spec §6 climbs: a good player, one talent rank per level gained, no deaths.
  const CLIMBS = [
    { prestige: 0, days: 45, bosses: 34, ranks: 29 },
    { prestige: 1, days: 55, bosses: 44, ranks: 39 },
    { prestige: 2, days: 65, bosses: 52, ranks: 49 },
    { prestige: 3, days: 75, bosses: 62, ranks: 46 },
    { prestige: 4, days: 85, bosses: 72, ranks: 0 },
  ];
  const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);
  const svc = (id: keyof typeof SERVICE_PRICES, n: number) => SERVICE_PRICES[id].base * SERVICE_PRICES[id].climb ** n;
  const core = (c: (typeof CLIMBS)[number]) =>
    sum(SLOT_PRICE_FACTORS) +
    TALENT_RANK_BOSS_KILLS * c.ranks +
    Math.floor(c.days / 3) * 0.4 * 1 + // Health Potions: 0.4 per 3-day window, one kill each
    2 * SERVICE_PRICES.reroll.base + // two rerolls on different turns
    svc('enchant', 0);
  // §6's full extras list, in order: 2nd enchant, Overdrive, a 3rd reroll, rare, rare, epic, rare, 3rd enchant, 2nd Overdrive, epic.
  const { rare, epic } = SHOP_PRICE_FACTOR;
  const extras = sum([svc('enchant', 1), svc('overdrive', 0), SERVICE_PRICES.reroll.base, rare, rare, epic, rare, svc('enchant', 2), svc('overdrive', 1), epic]);
  const earned = (c: (typeof CLIMBS)[number]) => (c.bosses + DAILY_PURSE_BOSS_KILLS * c.days) / goldPriceFactor(c.prestige);

  it('the full extras list is 50.5 kills', () => expect(extras).toBe(50.5));

  it.each(CLIMBS)('climb at prestige $prestige covers its core build', (c) => expect(earned(c)).toBeGreaterThanOrEqual(core(c)));

  it.each(CLIMBS)('climb at prestige $prestige leaves a choice: not every extra', (c) => expect(earned(c)).toBeLessThan(core(c) + extras));
});
```

- [ ] **Step 2: Run it to verify it passes against Task 1's numbers**

Run: `npx vitest run src/game-engine/economy.spec.ts -t "gold budget"`
Expected: PASS, 11 tests. Then, as a check that it bites, temporarily set `DAILY_PURSE_BOSS_KILLS` to 0 and confirm a "covers its core" case fails; restore it.

- [ ] **Step 3: Update the gem spec §8 gold line**

- [ ] **Step 4: Commit**

```bash
git add src/game-engine/economy.spec.ts docs/superpowers/specs/2026-11-17-gem-economy-design.md
git commit -m "Pin the gold budget: every climb covers its core build and leaves a choice among the extras"
```
