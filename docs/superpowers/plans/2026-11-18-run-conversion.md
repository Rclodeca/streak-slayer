# Run Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Old saves convert in place on load with a once-only pre-conversion backup, and a test proves a realistic level-24 old save loads right.

**Architecture:** The conversion itself is the load-time migrations that already run in `initializeStores`. New: `store/preEconomyBackup.ts` copies the raw stored save to a backup key before anything can rewrite it, and records that it did so in a marker key. A legacy-save test pins what the load produces.

**Tech Stack:** Vue 3, Pinia, Vitest (jsdom for store specs), TypeScript.

**Spec:** `docs/superpowers/specs/2026-11-18-run-conversion-design.md`

## Global Constraints

- All persistence goes through `storage` (`src/store/storage.ts`), never `localStorage` directly.
- Save format number stays 5 (`CURRENT_SCHEMA_VERSION`); `Account` gains no field.
- Ranks and slots stay free, no owed trial gems, gold starts at 0: the conversion adds no gem or gold logic.
- The first backup is never overwritten.
- The backup key is not in `saveFile.ts`'s `ENTRY_KEYS` (so export, import and sync never carry it).
- A failed backup write never stops the load.

## Review Focus

- A save that can't be read as a save (schema mismatch, junk text) is still backed up, because the load would otherwise replace it with a fresh run.
- A fresh install with no save writes no backup and is marked converted, so its later saves are never copied as "pre-conversion".
- Loading twice (a reload, `initializeStores` called again) copies nothing the second time and changes no state.
- Importing a save file over a converted install leaves the backup untouched.
- Storage that throws on write (quota) still loads the run.

Design note: the spec says "a marker on the account". This plan uses a marker storage key instead, so the ~15 existing `toEqual` assertions on the account's shape stay untouched, and an install with no save yet is counted too. Behavior is the same; update the spec's "A marker" line when committing Task 1.

---

### Task 1: The backup module

**Files:**
- Create: `src/store/preEconomyBackup.ts`
- Create: `src/store/preEconomyBackup.spec.ts` (`// @vitest-environment jsdom`, like `saveFile.spec.ts`)
- Modify: `docs/superpowers/specs/2026-11-18-run-conversion-design.md` (the "A marker" item: a storage key `streak-slayer:economy-converted`, not an `Account` field)

**Interfaces:**
- Consumes: `storage` from `./storage`; `STORAGE_KEY` from `./plugins/saveState`.
- Produces: `BACKUP_KEY = 'streak-slayer:save:v5:pre-economy'`, `CONVERTED_KEY = 'streak-slayer:economy-converted'`, and `backUpBeforeConversion(): 'fresh' | 'already' | 'backed-up' | 'backup-failed'`.

- [ ] **Step 1: Write the failing tests** in `preEconomyBackup.spec.ts`, each starting from `localStorage.clear()`:
  - `copies the stored save, byte for byte, to BACKUP_KEY and returns 'backed-up'` (store a JSON string with no marker; assert `getItem(BACKUP_KEY)` equals it exactly and `getItem(CONVERTED_KEY)` is `'1'`).
  - `backs up text that is not a readable save` (store `'not json'` and `'{"schemaVersion":4}'` in turn; both end up in `BACKUP_KEY`).
  - `writes no backup for an install with no save, marks it converted, returns 'fresh'` (`getItem(BACKUP_KEY)` is null).
  - `does nothing once marked: a second call returns 'already' and leaves BACKUP_KEY as the first copy` (call, then change the stored save, call again; backup still holds the first text).
  - `still marks converted and returns 'backup-failed' when the backup write throws` (use `setStorageBackend` with a wrapper over a Map whose `setItem` throws for `BACKUP_KEY` only; reset the backend with `setStorageBackend(null)` in `afterEach`).
  - `an import leaves the backup alone`: back up, then `applySaveFile(readSaveFile(buildSaveFile())!.file)` for any valid file (as `saveFile.spec.ts` builds one); `getItem(BACKUP_KEY)` unchanged.

- [ ] **Step 2: Run** `npx vitest run src/store/preEconomyBackup.spec.ts`. Expected: FAIL (module missing).

- [ ] **Step 3: Implement `backUpBeforeConversion` in `src/store/preEconomyBackup.ts`.** Order: if `CONVERTED_KEY` is set return `'already'`; read the raw save at `STORAGE_KEY`; null raw → set the marker, return `'fresh'`; otherwise try to write `BACKUP_KEY` (catch → `'backup-failed'`), then set the marker (catch and ignore), return `'backed-up'` or `'backup-failed'`. Do not parse the raw text.

- [ ] **Step 4: Run** the same command. Expected: all PASS.

- [ ] **Step 5: Commit** `git add src/store/preEconomyBackup.ts src/store/preEconomyBackup.spec.ts docs/superpowers/specs/2026-11-18-run-conversion-design.md && git commit -m "Back up an old save once before it is converted, and mark the install converted"` (end the message with the Co-Authored-By line from the session's attribution reminder).

---

### Task 2: Wire it in and pin a legacy load

**Files:**
- Modify: `src/store/index.ts` (call before `loadSaveState()`, i.e. as the first thing after `setActivePinia(targetPinia)`)
- Create: `src/store/legacyConversion.spec.ts` (`// @vitest-environment jsdom`, same setup as `index.spec.ts`: `localStorage.clear()`, `setActivePinia(createPinia())`, fake timers)

**Interfaces:**
- Consumes: `backUpBeforeConversion`, `BACKUP_KEY` (Task 1); `initializeStores`; `STORAGE_KEY`, `CURRENT_SCHEMA_VERSION`; `createCharacter`, `generateBoss`, `createHabit`, `createRng`, `STARTING_GEMS`, `characterGold`, `TALENT_DEFS` from `../game-engine`.
- Produces: nothing later tasks use.

- [ ] **Step 1: Write the failing test file.** Fixture `legacySave()`: a `createCharacter(rng)` set to level 24 with `talentsUnlocked: true`, `talents` holding 23 ranks (fill `TALENT_DEFS` main nodes in order, respecting `maxRank`, so every rank is on an unlocked node), `takenEventIds: ['item-slots', 'item-slots-2']`, `pendingEventPicks: 0`, `challenges` of two finished-and-claimed old trials (`new-good` and `rank-up`, `doneDayKey` set, no `unclaimed`), with `slotUpgrades`, `shopUnlocked`, `servicesUnlocked`, `looksUnlocked`, `trials`, `gold`, `shop` and `prestige` deleted; `generateBoss(27, rng)`; two habits; no `account`. Stored as `JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, character, boss, habits })`. Tests:
  - `keeps the ranks and the slots`: `talents` ranks sum to 23 after load; `slotUpgrades` is 4; the old event fields are gone.
  - `opens the shop gates by level`: `shopUnlocked`, `servicesUnlocked`, `looksUnlocked` all true.
  - `credits the old trials without paying gems for them`: some `trials` entry has a non-empty `claimed`; `account.gems` is `STARTING_GEMS + 16` (milestones 5, 10, 15, 20) and `highestLevel` is 24.
  - `starts gold at 0`: `characterGold(character)` is 0.
  - `backs the old save up byte for byte`: `localStorage.getItem(BACKUP_KEY)` equals the stored text.
  - `a second load changes nothing`: advance timers 300 ms to flush the write, snapshot character, account, habits, trials and the backup; `setActivePinia(createPinia())`; `initializeStores()` again; everything `toEqual` the snapshot.

- [ ] **Step 2: Run** `npx vitest run src/store/legacyConversion.spec.ts`. Expected: the backup and second-load tests FAIL (not wired); if any of the others fail, that is a real conversion bug: stop and report it to the user before changing engine code.

- [ ] **Step 3: Call `backUpBeforeConversion()` in `initializeStores`** (`src/store/index.ts`), with a one-line comment that it runs before anything can rewrite the save.

- [ ] **Step 4: Run** `npx vitest run src/store`. Expected: all PASS.

- [ ] **Step 5: Commit** `git add src/store/index.ts src/store/legacyConversion.spec.ts && git commit -m "Run the backup before the stores load, and pin how a level-24 old save converts"` (with the Co-Authored-By line).

---

### Task 3: Whole-suite check

- [ ] **Step 1: Run** `npm run test:unit`. Expected: pass, except the two known-flaky `HabitList.spec.ts` hint tests (rerun once) and the `CharacterPanel` Sunder text test, which was failing before this work. Report any other failure.
- [ ] **Step 2: Run** `npm run build`. Expected: exits 0.
- [ ] **Step 3: Report** the results to the user. Do not push.
