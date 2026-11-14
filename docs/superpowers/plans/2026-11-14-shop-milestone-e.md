# Shop Milestone E (Skins) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gem skins for the hero (per class), the home base (Hero tab backdrop) and the fight arena: bought in the Vault, switched in a wardrobe sheet, kept forever.

**Architecture:** A small catalog (`game-engine/skins.ts`) of placeholder skins and pure account rules (buy, wear, what's worn). Owned and worn skins live on the `Account` as optional fields, so old saves load unchanged. A `useSkins` composable runs the rules against the account store and hands every component the sprite to draw; the ~10 places that build `player/${heroClass}` today go through it. The debug backdrop toggles become overrides on top of the worn skin.

**Tech Stack:** Vue 3, Pinia, TypeScript, Vitest, SCSS.

**Spec:** `docs/ideas/2026-11-13-shop-economy.md` §3 (skins are kept, gems), §6 (skins survive death).

**Decided with the user (2026-11-14):**
- "Base" means the home base (the armory on the Hero tab).
- Gold grind skins are out of E. Gold and gem icons stay as they are.
- The catalog is **placeholders** picked at random from art already made: no Pixellab runs. The user designs the real catalog later.
- Switching lives on the Hero tab: tapping the home base scene opens the wardrobe. The Vault has a Skins row that opens the same sheet (desktop has no home base, so this is its way in).

**Decisions taken here (change if wrong):**
- A hero skin belongs to one class. It shows whenever you play that class, and buying one wears it at once ("used immediately").
- Prices: hero 40 gems (`PLANNED_GEM_SINKS.skin`), home 30, arena 30 (`SKIN_PRICES` in `economy.ts`).
- The wardrobe's Hero section has a class switch (Warrior · Mage · Ranger) that opens on the class you're playing.
- High score runs keep the class's default art (no skin saved on a run).
- Buying logs as a `vault-bought` entry (name + gems), no new log kind.

**Placeholders:**
- Heroes: warrior `warriors-run8/tile-12`, `tile-11`; mage `heroes-run4/tile-05`, `tile-06`; ranger `heroes-run13/tile-09`, `heroes-run2/tile-15` (built by `npm run hero-art` into `public/sprites/player/skins/`).
- Home: `stage/arena7b`, `stage/arena6b` (216 x 116, so the hero still stands on row 101).
- Arena: `stage/arena7b`, `stage/arena3` (216 x 108: held to the bottom, dark above, like the testing toggle shows it today).

## Global Constraints

- Gems only. Skins are kept through death and never sold for gold.
- Persistence through the store layer only: the account slice in the main save.
- Tap targets ≥ 44px, nothing behind hover, safe areas respected.
- Copy short and terse. Pixel-cut (Moonlit) look.
- No push: nothing goes live until the whole A–H plan is ready.

## Review Focus

1. **Old saves.** An account without `ownedSkinIds`/`wornSkins` loads, wears the defaults and buys normally. (Task E1)
2. **Too few gems / double tap.** Nothing changes, no negative balance; a second buy of an owned skin spends nothing. (Task E1)
3. **Death.** Owned and worn skins survive a death and the new run's class shows its own worn skin. (Task E1: the account is untouched by death; E2 test on class change)
4. **Skin removed from the catalog** (the placeholders will be replaced). A worn id that's no longer in the catalog falls back to the default art. (Task E1)
5. **Debug toggles.** The testing backdrop buttons still override the stage and home art, and "worn" is one of the stops. (Task E2)

---

### Task E1: Skin catalog and account rules

**Files:**
- Create: `src/game-engine/skins.ts`, `src/game-engine/skins.spec.ts`
- Modify: `src/game-engine/account.ts` (optional fields), `src/game-engine/constants/economy.ts` (`SKIN_PRICES`), `src/game-engine/index.ts` (exports), `src/store/accountStore.ts` (`buySkin`, `wearSkin`)

**Interfaces (produces):**
- `type SkinKind = 'hero' | 'home' | 'arena'`; `type SkinSlot = HeroClass | 'home' | 'arena'`
- `interface SkinDef { id: string; kind: SkinKind; name: string; gems: number; art: string; heroClass?: HeroClass }` (`art` is the sprite path under `sprites/` without `.png`)
- `SKIN_CATALOG: readonly SkinDef[]`, `DEFAULT_SCENE_ART: { home: 'home/armory'; arena: 'stage/arena6b' }`
- `Account.ownedSkinIds?: string[]`, `Account.wornSkins?: Partial<Record<SkinSlot, string>>`
- `skinSlot(skin): SkinSlot`, `skinsFor(slot): SkinDef[]`, `wornSkin(account, slot): SkinDef | null`
- `skinState(account, skin): 'worn' | 'owned' | 'buy' | 'short'`
- `buySkin(account, skinId): { account: Account; skin: SkinDef } | null` (spends gems, owns and wears it)
- `wearSkin(account, slot, skinId: string | null): Account | null` (null = the default; must own it)
- `heroArt(account, heroClass): string` (`player/<class>` or the worn skin's art), `sceneArt(account, 'home' | 'arena'): string`

- [ ] Tests: buy spends `gems` and wears; short → null; owned → null; wear unowned → null; wear null → default; a worn id missing from the catalog → default art; an account with no skin fields reads as defaults; a hero skin of another class can't be worn in this class's slot.
- [ ] Implement, run `npx vitest run src/game-engine/skins.spec.ts`, then the account store actions (`buySkin(id): SkinDef | null`, `wearSkin(slot, id | null): boolean`). Commit.

### Task E2: Draw the worn skins

**Files:**
- Create: `src/composables/useSkins.ts` (+ spec)
- Modify: `PlayerSprite.vue`, `HomeBase.vue`, `BossBar.vue`, `HoodedSpeech.vue`, `DeathScreen.vue`, `NewHeroScreen.vue`, `StageScene.vue`, `store/debugBackdropStore.ts`, `debug/PopupPreview.vue`

**Interfaces:**
- `useSkins()` → `{ heroArtFor(heroClass): string; heroArt: ComputedRef<string>; homeArt: ComputedRef<string>; arenaArt: ComputedRef<string>; buy(id): boolean; wear(slot, id | null): boolean }`. `buy` logs `{ kind: 'vault-bought', name, gems }`.
- `useDebugBackdropStore`: `stage: StageBackdrop | null`, `home: HomeBackdrop | null`, null = the worn skin; toggles cycle null → each backdrop.

- [ ] Tests: worn hero skin shows on `PlayerSprite`/`HomeBase`; class change shows that class's worn skin; worn arena replaces `arena6b` in `StageScene`; debug override wins.
- [ ] `npm run hero-art` builds `scripts/hero-art/skins.json` into `public/sprites/player/skins/<id>.png` + `@3x`. Run it.
- [ ] Run the touched specs, commit.

### Task E3: Wardrobe sheet, Hero tab and Vault entry

**Files:**
- Create: `src/components/character/WardrobeSheet.vue` (+ spec)
- Modify: `HomeBase.vue` (scene is a button that opens it), `VaultWares.vue` (a "Skins" row under For good), `ui/statIcons.ts` (`skins` → Lucide `Shirt`)

- [ ] Sheet: a `Modal` titled "Wardrobe" with three sections, Hero (class switch), Home, Arena. Each is a row of tiles: the default first ("Plain"), then each skin; a tile shows the art, its name, and a 44px button: Worn (disabled), Wear, or the gem price (ShopBuyButton, greyed when short). Buying wears it.
- [ ] Tests: opens from the home base and the Vault row; buy spends and marks Worn; Wear switches; short is disabled; the class switch shows that class's skins.
- [ ] Run `npm run test:unit` (rerun the two flaky HabitList hint tests before chasing them), `npm run build`. Commit, then record E in the build table and the spec's decisions log.
