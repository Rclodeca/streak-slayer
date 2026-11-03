# Side Quest Challenges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the player-typed side quest with 17 optional in-game challenges (one per relic) that the level-up card names, that complete on their own, and that live under a Main | Side tab in the Quests section.

**Architecture:** Challenge state lives on `Character` (per run, so a death clears it). A pure engine module `src/game-engine/challenges.ts` owns the catalog, taking a challenge, and `applyChallengeEvent(character, event, todayKey)`, which every existing hook (`completeHabit` path, boss defeat, rollover, item drops, add habit/quest, quest completion) feeds through one `reportChallenge` function in `useCombatActions`. That function pays out finished challenges (relic via `grantItem` → `enqueueDrops`, plus medium quest EXP). The old `kind: 'side'` quest is removed and migrated to a regular quest on load.

**Tech Stack:** Vue 3, Vite, Pinia, SCSS, Vitest, Lucide icons. Work directly on `main`, no worktree (standing preference); commit per task.

**Spec:** `docs/superpowers/specs/2026-11-03-side-quest-challenges-design.md` (mocks: `docs/mockups/pixel-challenges.html`, `pixel-challenges-2.html`). Read it first, and `CLAUDE.md`.

## Global Constraints

- Plain TS engine code in `src/game-engine/`, pure (no Vue, no stores, no `Date.now()`); import everything through `src/game-engine/index.ts`.
- Persistence only through the stores/save slices; no `localStorage` from components. Challenge state rides on `Character`, so no new store and no schema bump (fields optional; an old save loads with none).
- No streak protection or softening anywhere. No eligibility filter on challenges. Don't show which relic a challenge pays until earned.
- Player-facing copy is short and mysterious, no mechanics explained (memory rule); the one plain line per challenge states the deed.
- Mobile/Capacitor-safe: tap targets ≥44px, nothing behind hover, safe areas respected. Pixel-cut (Moonlit) look only; Lucide icons from the existing set.
- Challenges pay `questRewardExp(character, 'medium', questWeekFor(...).completed)` and **never** bump `questWeek` (no weekly slot used).
- Tests: Vitest, in the repo's style (engine specs beside the module, component specs beside the component). Run with `npx vitest run <file>`; full gate is `npx vitest run && npm run lint && npm run build`. Two `HabitList.spec.ts` hint tests are known flaky (~1 in 8): rerun before investigating.
- Commit trailer on every commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

Failure modes the spec implies but no spec line pins; each gets a test in the task named:

1. Rollover/`reportChallenge` day-end run twice for the same day (the 30s watcher + a reload) must not double count → Task 3.
2. Add a habit/quest then delete it before the rollover must not count; one added the same day the rollover runs must not count until the next → Task 3.
3. App closed for days: only the previous day is evaluated, and Clean slate's run resets across a gap (no protection) → Task 3.
4. Reopening/reloading the level-up popup shows the same challenge; if the persisted one is no longer offerable it is redrawn; picking any other event clears it → Task 1 and Task 6.
5. A save with `kind: 'side'` quests (overdue and done ones too) loads as regular quests, relic back in the pool, and a pre-challenges character (`challenges` undefined) works everywhere → Task 4.
6. Finishing a challenge whose relic is already owned (`grantItem` returns null) still completes it, with no crash or double EXP → Task 5.

---

### Task 1: Catalog and taking a challenge (engine)

**Files:**
- Create: `src/game-engine/challenges.ts`, `src/game-engine/challenges.spec.ts`
- Modify: `src/game-engine/types.ts` (Character fields), `src/game-engine/constants/tuning.ts`, `src/game-engine/items.ts` (`availableRelics`), `src/game-engine/events.ts` (side-quest eligibility, `consumeEventPick`), `src/game-engine/index.ts` (exports), `src/game-engine/items.spec.ts`, `src/game-engine/events.spec.ts`, and the three call sites of `availableRelics` (`useEventChoice.ts`, `useCombatActions.ts`, `events.ts`).

**Interfaces:**
- Produces (all exported from the barrel):
  - `type ChallengeId = 'perfect-day' | 'clean-days' | 'resist' | 'early-start' | 'streak-all' | 'new-good' | 'new-bad' | 'fresh-quests' | 'rank-up' | 'enchant' | 'epic-find' | 'true-kill' | 'untouched' | 'crit-kill' | 'quest-run' | 'slay-two' | 'land-crits'`
  - `interface ChallengeDef { id: ChallengeId; name: string; deed: string; goal: number; icon: string }`; `const CHALLENGE_DEFS: readonly ChallengeDef[]` (17); `function getChallengeDef(id: ChallengeId): ChallengeDef`
  - `interface PendingAddition { id: string; dayKey: string }`
  - `interface ChallengeEntry { id: ChallengeId; relicId: string; takenDayKey: string; progress: number; lastDayKey?: string; pending?: PendingAddition[]; doneDayKey?: string }`
  - `Character` gains optional `challenges?: ChallengeEntry[]` (active and done, for the run), `offeredChallengeId?: ChallengeId`, `lastBadCheckDayKey?: string`.
  - `function offerableChallenges(character: Character): ChallengeDef[]` — all 17 minus any entry (active or done) in `character.challenges`.
  - `function drawChallenge(character: Character, rng: Rng): ChallengeId | null` — random offerable, `null` if none.
  - `function takeChallenge(character: Character, id: ChallengeId, rng: Rng, todayKey: string): Character` — appends `{ id, relicId, takenDayKey: todayKey, progress: 0 }`, `relicId` drawn with `rng` from `availableRelics(character)`, clears `offeredChallengeId`. No-op (same character) if `id` is already an entry or no relic is available.
  - `function activeChallenges(character: Character): ChallengeEntry[]` (no `doneDayKey`) and `function doneChallenges(character: Character): ChallengeEntry[]`.
  - `availableRelics(character: Character): ItemDef[]` — **signature change**: drops the `quests` param; "promised" now means `relicId` of active (not done) challenge entries.
- Tuning added to `TUNING.CHALLENGES`: `RESISTS: 5, CLEAN_DAYS: 3, FRESH_QUESTS: 3, QUEST_RUN: 3, SLAY_BOSSES: 2, LAND_CRITS: 5, STREAK_EVERYTHING_MIN: 3, EARLY_START_HOUR: 12` (the spec's N values).

The catalog (names are terse and may be polished; `goal` is 1 for one-shot challenges; icons are Lucide kebab names):

| id | name | deed line | goal | icon |
|----|------|-----------|------|------|
| perfect-day | Perfect day | Check off every daily skill in a day, and no bad habit. | 1 | calendar-check |
| clean-days | Clean slate | Go 3 days in a row without a bad habit. | 3 | shield-check |
| resist | Hold the line | Resist 5 bad habits. | 5 | shield |
| early-start | Early riser | Check off a hard skill before noon. | 1 | sunrise |
| streak-all | Unbroken | Every daily skill on a 3-day streak at once. | 1 | flame |
| new-good | New discipline | Add a good skill and keep it a day. | 1 | plus |
| new-bad | Name the enemy | Add a bad habit and keep it a day. | 1 | skull |
| fresh-quests | Fresh quests | Add 3 quests and keep them a day. | 3 | scroll-text |
| rank-up | Rank up | Raise a skill's rank. | 1 | chevrons-up |
| enchant | Enchanted | Enchant an item. | 1 | sparkles |
| epic-find | Epic find | Find an epic item. | 1 | gem |
| true-kill | True strike | Kill a boss with a true damage skill. | 1 | crosshair |
| untouched | Untouched | Kill a boss that never hurt you. | 1 | swords |
| crit-kill | Killing crit | Kill a boss with a critical hit. | 1 | zap |
| quest-run | Quest run | Complete 3 quests on time. | 3 | list-checks |
| slay-two | Twice slain | Slay 2 bosses. | 2 | trophy |
| land-crits | Crit streak | Land 5 critical hits. | 5 | target |

- [ ] **Step 1: Write failing tests in `challenges.spec.ts`**: `CHALLENGE_DEFS` has 17 unique ids and equals the count of `rarity: 'relic'` items in `ITEM_CATALOG`; `offerableChallenges` drops active and done entries; `drawChallenge` returns `null` when all 17 are entries; `takeChallenge` reserves a relic that is not in `earnedRelicIds` and not promised to another active entry (take all 17 in a loop with varying rng, assert 17 distinct `relicId`s and a 18th take is a no-op); `takeChallenge` of an id already held returns the same object and clears nothing. Update `items.spec.ts` for the one-arg `availableRelics` (a promised relic = an active entry's `relicId`; a done entry's relic is not "promised"). In `events.spec.ts`: `side-quest` is eligible only when `questsOpen`, `offerableChallenges` is non-empty and `availableRelics` is non-empty; `consumeEventPick` clears `offeredChallengeId`.
- [ ] **Step 2: Run** `npx vitest run src/game-engine` — Expected: FAIL (module missing / signature mismatch).
- [ ] **Step 3: Implement** the types, tuning block, `challenges.ts` (defs table above as data; the functions above), the one-arg `availableRelics`, the new `isEligible` for `side-quest` in `events.ts`, and `consumeEventPick` dropping `offeredChallengeId`. Update the three `availableRelics` call sites to the new signature (in `useCombatActions.completeQuest` the fallback becomes `availableRelics(characterStore.character)`; Task 4 deletes that branch). Export everything from `index.ts`.
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS (fix any other spec that called the old two-arg form).
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add the challenge catalog and taking a challenge to the engine"`

---

### Task 2: "Hit the player" flag on the boss (engine)

**Files:**
- Modify: `src/game-engine/types.ts` (`Boss.hurtPlayer?: true`), `src/game-engine/combat.ts` (`missHabit`), `src/game-engine/bossSkills.ts` (Rend, Ravage landing; `resolveDoom`), `src/game-engine/quests.ts` or `useCombatActions.failQuest` (quest miss), `src/game-engine/boss.ts` if `generateBoss` needs nothing (a new boss has no flag, which is the reset).
- Test: `combat.spec.ts`, `bossSkills.spec.ts`, `useCombatActions.spec.ts`.

**Interfaces:**
- Produces: `Boss.hurtPlayer?: true`, set the first time the current boss damages the player. Set by: `missHabit` (any boss damage, whether from a missed good habit or a checked bad habit), a *landed* Rend or Ravage, a landed Doom (`resolveDoom` when `amount` is returned), and `failQuest` (a missed main quest). **Not** set by Reflect damage (`reflectedDamage` in `resolveCompletion`), and not by a Rend/Ravage that was resisted or did nothing.

- [ ] **Step 1: Write failing tests**: `missHabit(...)` returns a `boss` with `hurtPlayer: true` (and a boss that was already hurt stays so); a completion with Reflect active leaves `boss.hurtPlayer` undefined; Rend/Ravage `outcome: 'landed'` sets it, a resisted outcome does not; `resolveDoom` setting `amount` sets it; `failQuest` in `useCombatActions.spec.ts` sets it on `bossStore.boss`; `resolveBossDefeatIfDead`'s next boss has no flag.
- [ ] **Step 2: Run** `npx vitest run src/game-engine/combat.spec.ts src/game-engine/bossSkills.spec.ts src/composables/useCombatActions.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** the flag at each site above. In `missHabit` the boss is currently returned unchanged unless it healed, so build `{ ...boss, hurtPlayer: true }` always.
- [ ] **Step 4: Run** the same command plus `npx vitest run` — Expected: PASS (some spec may assert `boss` identity after `missHabit`; update to `toMatchObject`).
- [ ] **Step 5: Commit** — `git commit -am "Flag a boss once it has hurt the player"`

---

### Task 3: Challenge events, day-end and progress text (engine)

**Files:**
- Modify: `src/game-engine/challenges.ts`, `src/game-engine/types.ts` (`Quest.createdDayKey?: string`), `src/game-engine/index.ts`
- Test: `src/game-engine/challenges.spec.ts`

**Interfaces:**
- Consumes: Task 1's types/helpers; Task 2's `Boss.hurtPlayer`; `isDueOn(habit, date)`, `dailyPeriodKey`, `daysBetweenDayKeys`, `Habit.createdDayKey`, `lastCompletedPeriodKey`, `streakCount`.
- Produces:
  - ```ts
    type ChallengeEvent =
      | { type: 'habit-checked'; habit: Habit; hour: number }   // a live good-habit tap; hour is the local hour 0-23
      | { type: 'bad-resisted' }                                 // a bad habit left unchecked through its period
      | { type: 'crit-landed' } | { type: 'rank-up' } | { type: 'enchanted' } | { type: 'epic-dropped' }
      | { type: 'boss-defeated'; boss: Boss; byTrueSkill: boolean; byCrit: boolean } // boss = the slain boss
      | { type: 'habit-added'; habit: Habit } | { type: 'quest-added'; questId: string }
      | { type: 'quest-completed'; createdDayKey?: string }      // an on-time completion
      | { type: 'state-changed'; habits: Habit[] }               // evaluates Unbroken
      | { type: 'day-end'; endedDate: Date; habits: Habit[]; quests: Quest[] };
    ```
  - `function applyChallengeEvent(character: Character, event: ChallengeEvent, todayKey: string): { character: Character; completed: ChallengeEntry[] }` — only active entries react; a completed entry gets `doneDayKey: todayKey`; same object back when nothing changed.
  - `function recordBadCheck(character: Character, dayKey: string): Character` (sets `lastBadCheckDayKey`).
  - `type ChallengeProgress = { kind: 'bar'; cur: number; max: number } | { kind: 'text'; text: string }` and `function challengeProgress(entry: ChallengeEntry, ctx: { habits: Habit[]; boss: Boss; todayDate: Date }): ChallengeProgress` — bars for counted challenges (`goal > 1`: Clean slate, Hold the line, Fresh quests, Quest run, Twice slain, Crit streak), brass status text for state ones (see below), nothing mystical for one-shots (a text line is fine: Early riser "Before noon" is not needed — use `{kind:'text', text:'Not yet'}`).
- Rules (from the spec; tests pin each):
  - Counted: `resist` +1 per `bad-resisted`; `land-crits` +1 per `crit-landed`; `slay-two` +1 per `boss-defeated`; `quest-run` +1 per `quest-completed` whose `createdDayKey` is `undefined` or earlier than `todayKey`; the one-shots complete at once on `early-start` (`habit.difficulty==='hard' && !habit.isBad && hour < TUNING.CHALLENGES.EARLY_START_HOUR`), `rank-up`, `enchant`, `epic-find`, `true-kill` (`byTrueSkill`), `crit-kill` (`byCrit`), `untouched` (`!boss.hurtPlayer`).
  - `streak-all` on `state-changed` (and on being taken): at least one daily habit and every daily (good and bad, weeklies ignored) has `streakCount >= STREAK_EVERYTHING_MIN`.
  - Additions: `habit-added` / `quest-added` push `{ id, dayKey: todayKey }` onto `pending` of the matching active entry (`new-good` for a non-bad habit, `new-bad` for a bad one, `fresh-quests`) — only entries already taken. On `day-end`, each pending item counts only if `dayKey < todayKey` and its id still exists in `habits`/`quests`; items that no longer exist are dropped; counted ones leave `pending` and add to `progress` (`new-good`/`new-bad` complete at 1, `fresh-quests` at 3). The day-end runs before `clearDone`, so a quest finished today still counts.
  - Day challenges on `day-end` (D = `dailyPeriodKey(endedDate)`; only if `D >= takenDayKey` and `lastDayKey` is unset or `< D`; set `lastDayKey = D` afterward): **Perfect day** — at least one good daily due on D (`isDueOn`, not created on D), all of them have `lastCompletedPeriodKey === D`, and `character.lastBadCheckDayKey !== D` → complete. **Clean slate** — if `lastDayKey` exists and `daysBetweenDayKeys(lastDayKey, D) > 1` reset `progress` to 0 first; then `lastBadCheckDayKey === D` resets progress to 0, otherwise +1; complete at 3.
  - Progress text for state challenges: Perfect day `"<n> of <m> done today"` (good dailies due today with `lastCompletedPeriodKey` = today), Unbroken `"<n> of <m> at 3+"`, Untouched `"Boss <index> · untouched so far"` / `"Boss <index> · struck"` by `hurtPlayer`. Keep these terse.

- [ ] **Step 1: Write failing tests** for each rule above, plus the three Review Focus items owned here: (a) `day-end` for the same `endedDate` twice leaves `progress` unchanged the second time; (b) a pending addition deleted before the day-end doesn't count, and one added on `todayKey` itself doesn't count; (c) a gap (`lastDayKey` two days before D) resets Clean slate. Also: nothing reacts for a challenge taken after the event day (`D < takenDayKey` for Perfect day); `applyChallengeEvent` on a character with `challenges` undefined returns it unchanged.
- [ ] **Step 2: Run** `npx vitest run src/game-engine/challenges.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `applyChallengeEvent` as a reducer over active entries with one small handler per challenge id (table-driven, not one giant switch body), `recordBadCheck`, `challengeProgress`, and `Quest.createdDayKey`; export from the barrel.
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add challenge events, day-end checks and progress text to the engine"`

---

### Task 4: Retire the old side quest

**Files:**
- Modify: `src/game-engine/types.ts` (remove `QuestKind`, `Quest.kind`, `Quest.rewardItemId`), `src/game-engine/quests.ts` (`createQuest` loses `kind`/`rewardItemId`; `migrateQuest` strips them), `src/game-engine/index.ts`, `src/store/questStore.ts`, `src/composables/useCombatActions.ts` (`completeQuest` side branch, the "side" wording in its doc), `src/composables/useQuestMissGate.ts` (`kind`, `rewardText`), `src/components/quests/QuestDetailModal.vue`, `QuestMissPopup.vue`, `QuestForm.vue` (drop the `kind` prop and its side copy), `QuestSection.vue` (side class), `src/assets/scss/themes/ashen.scss` (the `.quest-item.side`, `.quest-detail.side`, `.miss-side` / `li.card .side` rules and the `--side-quest-color` variable if now unused), `docs`-free.
- Test: `quests.spec.ts`, `questStore.spec.ts`, `useCombatActions.spec.ts`, `useQuestMissGate.spec.ts`, `QuestDetailModal.spec.ts`.

**Interfaces:**
- Produces: `Quest` is `{ id, description, difficulty, dueDateKey, createdDayKey?, overdue?, doneDayKey? }`; `createQuest(description: string, difficulty: Difficulty, dueDateKey: string): Quest`; `migrateQuest(quest: unknown-shaped saved quest): Quest` removes `kind`, `rewardItemId`, `bossIndexAtOffer` and is idempotent; `questStore.addQuest(description, difficulty, dueDateKey, createdDayKey?: string)`.
- `EventChoiceModal.vue` still imports `QuestForm` with `kind="side"` until Task 6 — keep the build green by doing the minimum there (remove the `quest` step and the `QuestForm` import in this task, leave the side card inert) or by landing Task 6 right after; the final state is defined by Task 6.

- [ ] **Step 1: Write failing tests**: `migrateQuest` on `{ kind: 'side', rewardItemId: 'x', overdue: true, doneDayKey: 'd', dueDateKey, description, difficulty }` returns a quest with no `kind`/`rewardItemId` but with `overdue`, `doneDayKey`, `description`, `difficulty`, `dueDateKey` kept, and migrating twice is equal; `questStore.initFromSave` applies it; `completeQuest` on a (migrated) overdue ex-side quest pays half EXP and takes no weekly slot, on an on-time one pays the next slot like any regular quest; `QuestDetailModal` has no mystery/side branch.
- [ ] **Step 2: Run** `npx vitest run src/game-engine src/store src/composables src/components/quests` — Expected: FAIL.
- [ ] **Step 3: Implement** the removals listed above. `completeQuest` keeps only the regular path (overdue half-EXP, weekly count). Delete now-dead helpers and strings; grep for `'side'`, `kind`, `rewardItemId`, `QuestKind` and `side-quest-color` to confirm nothing is left except the `side-quest` **event id**.
- [ ] **Step 4: Run** `npx vitest run && npm run lint && npx vue-tsc -b` — Expected: PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Retire the player-typed side quest; old ones load as regular quests"`

---

### Task 5: Feed the engine from the game and pay out

**Files:**
- Modify: `src/composables/useCombatActions.ts`, `src/composables/useDailyRollover.ts`, `src/composables/useEventChoice.ts` (enchant and item-drop hooks only), `src/components/quests/QuestSection.vue` (quest add), `src/store/activityLogStore.ts` + `src/components/ui/ActivityLog.vue` (new entry kind)
- Test: `src/composables/useCombatActions.spec.ts`, `useDailyRollover.spec.ts`, `useEventChoice.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–3 (`applyChallengeEvent`, `recordBadCheck`, `ChallengeEvent`, `activeChallenges`).
- Produces in `useCombatActions()` (return object): `reportChallenge(event: ChallengeEvent, todayKey?: string): void` (default `dailyPeriodKey(debugClockStore.now())`) and `addQuest(description: string, difficulty: Difficulty, dueDateKey: string): Quest`. Activity log entry `{ kind: 'challenge-completed'; name: string; amount: number; itemName?: string }`.
- `reportChallenge` = read `characterStore.character`, `applyChallengeEvent`, `setCharacter`, then `payChallenge` for each `completed` entry: `characterStore.grantItem(entry.relicId)` (a `null` result — relic already owned — still completes, just no item), `enqueueDrops([item])` when granted, EXP = `questRewardExp(character, 'medium', questWeekFor(character.questWeek, weeklyPeriodKey(now)).completed)` through `addExpAndResolveLevelUps` + `logLevelUpIfAny` + `grantEventPicks` (do **not** call `recordQuestCompletion`), a `challenge-completed` log entry, and `useQuestCompleteQueue().enqueue({ description: <challenge name>, difficulty: 'medium', amount })` for the usual EXP feedback.

Hook points (each a one-line `reportChallenge` call, ordered so payouts never use a stale character snapshot — read `characterStore.character` fresh after any report):
- `applyReward`: after the rank-up log and EXP block and **before** `const beforeDefeat` — `crit-landed` if `result.wasCrit`, `rank-up` if rank rose, and for a live tap of a good habit `habit-checked` (hour = `debugClockStore.now().getHours()`; passed in via the `stampPeriodKey` branch so rollover resolutions and Overdrive uses don't fire it). After the defeat is applied — `boss-defeated` (`boss: slain`, `byTrueSkill: habit.damageType === 'trueDamage'`, `byCrit: result.wasCrit ?? false`) and `epic-dropped` if any `itemsDropped` has `rarity === 'epic'`. On every exit of `applyReward` (defeat or not) — `state-changed` with `habitStore.habits`.
- `checkOffHabit` for a bad habit: `characterStore.setCharacter(recordBadCheck(characterStore.character, dayKey))` after `applyPenalty`.
- `checkAvoidedHabit`: `bad-resisted` (only when the habit is bad and its outcome is the reward).
- `addHabit`: `habit-added` with the stamped habit. `addQuest` (new): creates the quest with `createdDayKey` = today's key, then `quest-added`; `QuestSection.onAdd` calls it instead of `questStore.addQuest`.
- `completeQuest` on-time regular path: `quest-completed` with `createdDayKey: quest.createdDayKey`. Not on the overdue path.
- `useEventChoice.choose`: `enchanted` when `double-item` returned an item; `epic-dropped` for an `item-drop` event result with an epic.
- `useDailyRollover`: before `questStore.clearDone(todayKey)`, `reportChallenge({ type: 'day-end', endedDate: new Date(now.getTime() - MS_PER_DAY), habits: habitStore.habits, quests: questStore.quests }, todayKey)`.

- [ ] **Step 1: Write failing tests** (composable specs, store-backed, as the existing ones are): a live crit completion advances a taken `land-crits`; a boss kill with `hurtPlayer` unset completes a taken `untouched`, pays EXP = the medium slot amount, grants the relic into `ownedItemIds`/`earnedRelicIds`, and leaves `questWeek` unchanged; the same kill with `hurtPlayer: true` does not; a bad-habit check sets `lastBadCheckDayKey`; `checkAvoidedHabit` advances `resist`; `addHabit` then deleting the habit before `useDailyRollover` at the next day leaves `new-good` at 0, keeping it counts; `useDailyRollover` twice for the same day doesn't double `clean-days`; a completed challenge whose relic is already owned completes without error and without granting twice; a character with `challenges` undefined goes through every hook unchanged.
- [ ] **Step 2: Run** `npx vitest run src/composables` — Expected: FAIL.
- [ ] **Step 3: Implement** `reportChallenge`, the payout helper, the new log entry (and its `ActivityLog.vue` line: terse, e.g. the name and the EXP), `addQuest`, and every hook above.
- [ ] **Step 4: Run** `npx vitest run && npm run lint` — Expected: PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Feed challenge progress from play and pay out relic and EXP"`

---

### Task 6: Level-up card names a challenge

**Files:**
- Modify: `src/composables/useEventChoice.ts`, `src/components/events/EventChoiceModal.vue`, `src/components/ui/statIcons.ts` (only if the card needs a shared icon helper)
- Create: `src/components/quests/challengeIcons.ts` (Lucide component per `ChallengeDef.icon`; verify each name exists in `lucide-vue-next`, swapping within Lucide if not)
- Test: `useEventChoice.spec.ts`, a new `EventChoiceModal` spec if none exists.

**Interfaces:**
- Consumes: `drawChallenge`, `offerableChallenges`, `takeChallenge`, `getChallengeDef`, Task 5's `reportChallenge`.
- Produces from `useEventChoice()`: `offeredChallenge: ComputedRef<ChallengeDef | null>` (from `character.offeredChallengeId`) and `chooseSideQuest(): void` — the new no-argument form that takes the challenge. The old `chooseSideQuest(description, difficulty, dueDateKey)` and the modal's `quest` step are gone.
- `ensureChoices`, when it rolls options that include `side-quest`: keep `offeredChallengeId` if it is still in `offerableChallenges(character)`, otherwise set it to `drawChallenge(character, rng)`. `chooseSideQuest`: `takeChallenge(character, id, rng, todayKey)` → `setCharacter`, then `finish('side-quest')`, then `reportChallenge({ type: 'state-changed', habits })` so Unbroken completes at once if already true. Every other pick clears `offeredChallengeId` through `consumeEventPick` (Task 1).

- [ ] **Step 1: Write failing tests**: the rolled `side-quest` option sets `offeredChallengeId`, and calling `ensureChoices` again after `options` is reset (simulating a reload) keeps the same id; if that id became non-offerable it is redrawn; picking `heal` instead clears it; `chooseSideQuest()` appends an active entry with a reserved relic, spends the pick, and creates no `Quest`; with Unbroken's condition already true the entry completes immediately (one pay-out); modal spec: the side card shows the challenge name, its deed line and a gift "?", and tapping it takes the challenge with no form step.
- [ ] **Step 2: Run** `npx vitest run src/composables/useEventChoice.spec.ts src/components/events` — Expected: FAIL.
- [ ] **Step 3: Implement** per the interfaces. Card markup for **Rim** (pixel-challenges.html, band 1): button `.card.side` → socket with the challenge icon, small "Side quest" caption, challenge name, deed line, gift "?" at the right edge. Styling belongs to Task 8; use class names `card side`, `side-caption`, `side-socket`, `side-gift`.
- [ ] **Step 4: Run** `npx vitest run && npm run lint && npx vue-tsc -b` — Expected: PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Level-up side-quest card names a challenge and takes it directly"`

---

### Task 7: Main | Side tabs and challenge cards

**Files:**
- Create: `src/components/quests/ChallengeList.vue`, `src/components/quests/ChallengeList.spec.ts`, `src/components/quests/QuestSection.spec.ts`
- Modify: `src/components/quests/QuestSection.vue`

**Interfaces:**
- Consumes: `character.challenges`, `activeChallenges`, `doneChallenges`, `getChallengeDef`, `challengeProgress`, `ITEM_CATALOG` (relic name once done), `challengeIcons.ts` (Task 6), `useHabitStore`, `useBossStore`, `useDebugClockStore`.
- Produces: `ChallengeList.vue` (no props; reads stores): one `<li class="challenge">` per entry — active first, done last (`done` class, struck style); each has the icon socket, name, deed line, then progress (`.challenge-bar` with `cur / max`, or `.challenge-status` text from `challengeProgress`) and, at the right, a gift "?" while active or the relic name once done. Empty state: a `<p class="section-empty">` with a terse line (builder's wording, e.g. "Nothing sworn."). `QuestSection.vue`: when `open`, render two tabs under the header (`role="tablist"`, buttons `Main` and `Side`, the Side one showing the count of active challenges, each ≥44px tall); Main shows the existing list; Side shows `ChallengeList`; the "+" add button is hidden on the Side tab. The tab choice is a local `ref` (not remembered). While sealed (`!open`) no tabs show and the section is exactly as today.

- [ ] **Step 1: Write failing tests**: `QuestSection` — sealed shows no tabs; open shows Main selected with the quest list and the + button; clicking Side swaps to the challenge list, hides +, and the Side tab shows the active count; `ChallengeList` — a counted entry renders "2 / 5", a state entry renders its status text, an active card shows a gift "?" and no relic name, a done card shows the relic's name, an empty `challenges` renders the empty line, a character with `challenges` undefined renders the empty line.
- [ ] **Step 2: Run** `npx vitest run src/components/quests` — Expected: FAIL.
- [ ] **Step 3: Implement** the component and the tab wiring. Scoped classes `quest-tabs`, `quest-tab`, `quest-tab.side`, `.tab-count`, `challenge`, `challenge-socket`, `challenge-body`, `challenge-gift`; the Pixel-cut skin comes in Task 8.
- [ ] **Step 4: Run** `npx vitest run && npm run lint && npx vue-tsc -b` — Expected: PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add Main and Side tabs with challenge cards to the Quests section"`

---

### Task 8: Pixel-cut look for the tabs, cards and level-up card

**Files:**
- Modify: `src/assets/scss/themes/ashen.scss` (where the Pixel-cut quest card, `.quest-item` and event `li.card` rules live — read them first and match their mixins/tokens: `$brass`, `--px`/clip-path pixel corners, `@include socket(...)`), plus any scoped fallbacks in the two components.
- Reference: `docs/mockups/pixel-challenges.html` (Rim look, band 1; Cards, band 3) and `pixel-challenges-2.html` (option C tabs, `.tabs`/`.tab`/`.c`/`.prog`/`.gf` rules are the target styles).

- [ ] **Step 1: Style** (a) the level-up side card: brass rim, brass-ringed socket, small brass "Side quest" caption, gift "?" at the right; (b) `.quest-tabs`: two sunk tabs, Main default, Side in brass with a brass count chip; (c) `.challenge` cards: raised quest-card look, socket with icon, brass progress bar with `cur / max`, brass status line, gift "?", and the sunk/struck done style that shows the relic name. All targets ≥44px; no hover-only affordance; respect safe areas as the section already does.
- [ ] **Step 2: Run** `npm run dev` and look at it with Playwright or a browser at 375×812: sealed section, Main tab, Side tab with 0, 3 active and 1 done challenge (seed via the debug popup preview or by writing the character through the store in the console), and a level-up pick that offers the side card (use `PopupPreview.vue`'s level-up preview if it can show the card; otherwise set `pendingEventPicks` in the console). Fix anything clipped, overflowing, or below 44px.
- [ ] **Step 3: Run** `npx vitest run && npm run lint && npm run build` — Expected: PASS.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "Give the challenge tabs, cards and level-up card the Pixel-cut look"`

---

### Task 9: Final verification and notes

- [ ] **Step 1: Full gate** — `npx vitest run && npm run lint && npm run build`. Expected: all pass (rerun once if only the two known `HabitList.spec.ts` hint tests fail). Report any failure with its output instead of retrying past it.
- [ ] **Step 2: Play through once** in `npm run dev` with the debug skip-day button: take a challenge at level-up, add a habit, skip a day, see it count; check Untouched against a boss kill and a missed habit; confirm the relic reveal popup and the EXP feedback appear on completion.
- [ ] **Step 3: Update notes** — rewrite `memory/project_side_quest_challenges.md` (built, commit range, anything deferred) and its line in `MEMORY.md`; add the feature to `PROGRESS.md` if that file lists shipped features.
- [ ] **Step 4: Commit** the notes if they live in the repo. Do not push; ask first (pushing `main` deploys).
