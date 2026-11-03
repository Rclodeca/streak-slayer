# Side quests as challenges — design

2026-11-03. Mockups: `docs/mockups/pixel-challenges.html` (level-up card, Cards list) and `docs/mockups/pixel-challenges-2.html` (Main / Side tabs).

## Why

Today a side quest is a level-up event: pick it, then type a real-life task, set a difficulty and a due date, and finish it for a hidden relic (miss the date: miss damage, relic forfeit). Making up a task on the spot is awkward at the exact moment you want to play.

Side quests become **optional in-game challenges**, like side quests in an RPG: the game sets the deed, there's no deadline and no penalty, and finishing one pays a relic. Real life stays in the main UI (skills, resist, main quests); challenges are game-side and kept visibly apart from it.

## Goals

- Picking the side-quest event never asks the player to invent anything.
- Every challenge is doable at any point in a run, early or very late.
- Challenges are optional: no due date, no miss damage, no forfeit. They wait until done.
- Real-life tasks and game challenges are never mixed in one list.

## Non-goals / anti-goals

- No second "choose 1 of 3" after the level-up pick. The level-up pick is the only choice.
- No eligibility filter on challenges (they're all always doable; see "Always doable").
- No streak protection or other softening anywhere (standing rule).
- Don't show which relic a challenge pays before it's earned.
- Don't change regular (main) quests.

## How it works

### Getting a challenge (level-up)

- The `side-quest` event stays in `EVENT_DEFS`. When it is among the rolled choices, its card names one **specific challenge**, drawn at random from the challenges the player can be offered (see "Which challenges can be offered").
- Taking the card takes that challenge. A relic is reserved for it at that moment, at random from `availableRelics` — the existing reservation behaviour (`rewardItemId`), so two active challenges never promise the same relic.
- No form, no difficulty, no due date. The old `QuestForm kind="side"` step is removed.
- Eligibility of the event itself is unchanged: quests open (level 3) and at least one relic available. The 5-pick guarantee (`SIDE_QUEST_GUARANTEE_LEVELS`) stays; since a challenge costs nothing to leave sitting, a forced one is harmless.
- The challenge is drawn when the choices are rolled and must stay the same if the popup is reopened or the app reloads. The rolled choices live only in memory today (`options` in `useEventChoice.ts`); persist **only the drawn challenge** (a small new field), not the whole rolled set — other events keep today's behaviour. *(My call.)*

**Card look — option B "Rim"** (pixel-challenges.html, band 1): brass rim round the card, brass-ringed socket with the challenge's icon, a small brass "Side quest" caption above the challenge name, one line saying the deed, and a gift with a "?" at the right edge.

### Holding challenges

- Any number can be active at once.
- The same challenge can't be active twice, and a challenge finished this run isn't offered again this run. With 17 challenges and 17 relics, a run can finish every one and earn every relic.
- Progress counts **from the moment the challenge is taken**, never before — except where the current state already satisfies it as noted per challenge (Untouched, Perfect day).
- Challenges belong to the run, like `earnedRelicIds`; a new run starts with none.

### Finishing one

- The moment a challenge's condition is met it completes on its own: no claim button. The reserved relic is granted through the same path a finished side quest uses today (`characterStore.grantItem` → the item drop / equip popup), and recorded with `recordRelicEarned`.
- The relic stays hidden until then. The active card shows only a gift with "?"; once earned, the card shows the relic's name. (The reveal popup already states plainly what the item does.)
- Completion pays the relic only, no EXP (as side quests do today).

### Where they live — Quests section, "Main | Side" tabs

(pixel-challenges-2.html, option C, with the tabs named Main and Side.)

- Two sunk tabs under the Quests header: **Main** (the existing quest list, unchanged) and **Side** (brass, with a count of active challenges).
- The Side tab swaps the list in place for the challenge cards. No popup.
- The + (new quest) button hides on the Side tab: challenges only come from level-ups.
- Main is the default tab. Remembering the last tab is the builder's call; if remembered, keep it behind a store, not direct `localStorage` (CLAUDE.md).
- Empty Side tab: a short, terse line in the existing `section-empty` style (the builder writes it; keep it mysterious, no mechanics explained).
- While quests are sealed (below level 3) the tabs don't show; the section stays as it is today.

**Challenge card — option A "Cards"** (pixel-challenges.html, band 3, plus the gift from pixel-challenges-2): the raised quest card; a socket with the challenge's icon, the name, one plain line of what to do, then progress — a brass bar with "cur / max" for counted challenges, or a brass status line for state ones (e.g. "Boss 12 · untouched so far"). A gift "?" at the right. Earned cards sink (struck style, as done quests) and show the relic name in place of the gift.

### Removing the old side quest

- Side quests no longer create `Quest` records with `kind: 'side'`. Remove the side-quest form path, the due-date / overdue / forfeit logic for side quests, and the side styling in the quest list.
- Existing saves don't matter (the game is in testing); no migration needed for old side-quest records — dropping them is fine.

## The 17 challenges

Names are the builder's to polish (short, terse — see the memory rule on game text); the deed line states plainly what to do. The mock names ("Hold the line", "Untouched", "Fresh quests") are placeholders. "N" values are my calls, tunable in `TUNING`.

| # | Challenge | Completes when (counted from taking it) |
|---|-----------|------------------------------------------|
| 1 | Perfect day | A day ends with every good daily skill due that day checked off, and no bad habit checked. Weeklies don't count. A day with no good dailies due doesn't count. If today is already perfect when it's taken, today counts. |
| 2 | Three clean days | 3 days in a row end with no bad habit checked off. |
| 3 | Resist bad habits | 5 bad-habit resists land (a bad habit left unchecked through its period). |
| 4 | Early start | A hard good skill is checked off before 12:00 local time. |
| 5 | Streak everything | Every daily habit, good and bad, has a streak of at least 3 at once (the user's "at least 3 days"). Weeklies don't count. If it's already true when taken, it completes at once — holding that honestly is the deed. *(My calls.)* |
| 6 | New good skill | A new good habit is added. |
| 7 | New bad habit | A new bad habit is added. |
| 8 | Fresh quests | 3 new main quests are added. |
| 9 | Rank up | Any skill gains a rank (rank comes from streak milestones). |
| 10 | Enchant | An item is enchanted (the `double-item` event). |
| 11 | Epic find | An epic item drops. |
| 12 | True kill | A boss dies to a hit from a `trueDamage` skill. Torch of Wrath's healing hits and Hunter's Eye crits don't count. *(My call.)* |
| 13 | Untouched | A boss dies without having damaged the player. The current boss counts if it hasn't hit the player yet. |
| 14 | Crit kill | A boss dies to a critical hit. |
| 15 | Quest run | 3 main quests completed on time. |
| 16 | Slay 2 bosses | 2 bosses die. |
| 17 | Land 5 crits | 5 critical hits land on any boss (or bosses). |

The catalog has 17 relics (`rarity: 'relic'` in `itemCatalog.ts`), so 17 challenges match them one for one. The first list had "rank up a skill" and "reach a new streak rank", but in this game they're the same thing (a skill's rank I–VIII comes only from its streak, `RANK_MILESTONES`); Quest run took the duplicate's place, and Slay 2 bosses and Land 5 crits cover the last two relics.

### Additions count at rollover (no add-then-delete farming)

New good skill, New bad habit and Fresh quests don't count an addition when it's made. It counts at the **next day rollover**, and only if it still exists then. A quest that was completed before the rollover still counts, since completing it isn't deleting it. Quest run counts a completed quest only if the quest was added on an earlier day than the one it's completed on, so it must have survived a rollover. Progress shown before the rollover can include pending additions; the builder decides how to show that. *(User's decision: count only at rollover.)*

### What counts as "a hit" (Untouched)

Any damage to the player from the current boss: a missed good habit, a checked bad habit, a missed main quest, and the Rend, Ravage and Doom boss skills. Reflect damage (`reflectedDamage` in combat.ts) does **not** count as a hit. Add a per-boss flag (alongside the existing `playerHasHit`) set the first time the boss damages the player; it resets with each new boss. Damage that a challenge can't attribute to the boss (none today) doesn't count.

### Always doable

No eligibility filter: if a challenge looks impossible right now, the player can make it possible (no habits → add one; every skill at rank VIII → add a habit and rank that one). Streak everything gets harder as the habit list grows; that's accepted — the player can leave the card at level-up.

### Which challenges can be offered

All 17, minus any active or already finished this run. If none are left, the side-quest event isn't eligible (relics also run out at 17, so in practice these coincide).

## Constraints

- Mobile first, Capacitor-safe: tabs and cards at least 44px tall, nothing behind hover, safe areas respected (CLAUDE.md).
- Persistence through the stores, never `localStorage` from components.
- Pixel-cut (Moonlit) look; Lucide icons from the app's set. The challenge icons in the mock (calendar-check, shield-check, swords, plus, chevrons-up) are placeholders the builder may swap within Lucide.
- Engine logic stays pure in `src/game-engine/` (as `events.ts`, `quests.ts` are), with challenge progress driven from the hooks that already exist: `completeHabit`, `missHabit`, bad-habit resolution, boss defeat (`resolveBossDefeatIfDead`), item drop, the double-item event, habit/quest creation, quest completion, and the daily rollover (for day-end checks).

## Left to the builder

- Data shape for challenges and their progress (a new `Character` field or its own store), as long as it persists per run.
- Final challenge names, icons and the empty-tab line (terse).
- Whether the tab choice is remembered.
- Exact progress wording for state challenges (Perfect day, Untouched, Streak everything).
- Test coverage in the repo's usual style (engine specs + component specs).
