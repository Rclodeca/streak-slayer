# Trial sets — design

The trial rework the gem spec left open (`2026-11-17-gem-economy-design.md` §8). Decided with the user 2026-11-18. Replaces the 17 one-off trials in `challenges.ts` with 12 sets of rungs, shown as ledger cards in a Trials modal. Mockups: `docs/mockups/trial-sets.html` (round one, A picked), `docs/mockups/trial-sets-2.html` (A1 picked, in the modal).

## 1. Why

- Fill out the trial budget (275 gems) with content that feels right, not a fixed count of 30: the count falls out of the sets.
- Progression trials ("slay 1 boss, then 5, then 10…") shown as sets in the UI rather than a flat list.
- Front-loaded, as the gem spec wants: low rungs land in a new player's first ~10 days, high rungs months later.
- Trials moved to a top button, so they open as a modal over the app instead of a tab.

**Anti-goals:** a rung that pays less than the one before it; trial gold that loosens climb I's gold budget; paying a save twice for a trial it already claimed.

## 2. The sets

12 sets, 49 rungs, **275 gems** and **4 boss kills of gold** in all. No one-offs: every trial is a rung of a set. Counter sets climb a running count; step sets (First steps, Feats) are short lists of different deeds.

| Set | Rungs (gems) | Gems | Gold |
|---|---|---|---|
| First steps (steps) | Add a good skill (4) · Add a bad habit (4) · Add a quest (4) | 12 | 0.5 kill each |
| Bosses slain | 1 (4) · 5 (4) · 10 (5) · 25 (6) · 50 (7) · 100 (7) · 250 (8) | 41 | 0.5 · 0.5 · 0.5 · 1 kill on rungs 1–25 |
| Longest streak | 3 (4) · 7 (4) · 14 (6) · 30 (6) · 60 (7) · 100 days (8) | 35 | |
| Perfect days | 1 (4) · 3 (4) · 7 (6) · 15 (6) · 30 (7) | 27 | |
| Quests completed | 1 (4) · 3 (4) · 10 (6) · 25 (7) | 21 | |
| Bad habits resisted | 5 (4) · 15 (6) · 50 (7) | 17 | |
| Crits landed | 5 (4) · 25 (6) · 100 (7) | 17 | |
| Enchants | 1 (6) · 3 (6) · 6 (7) · 10 (7) | 26 | |
| Skill ranks raised | 1 (4) · 5 (6) · 15 (7) · 30 (7) | 24 | |
| Epic finds | 1 (6) · 5 (6) · 15 (7) · Own a relic (7) | 26 | |
| Untouched kills | 1 (4) · 5 (6) · 15 (7) | 17 | |
| Feats (steps) | Killing crit (4) · True strike (4) · Early riser (4) | 12 | |

**Pricing by time.** 4 gems for a rung a good player reaches in the first ~10 days (18 rungs), 6 for days 10–60 (16), 7 after (15), 8 for the two longest finishes. That's about the gem spec's 75 / 100 / 100 shape. The timings are rough estimates.

**Every rung is an upgrade** (the user's rule): within a set, a rung's gems are never fewer than the one before, its gold never less, and where gold stops the gems rise. That's why Bosses slain runs 4, 4, 5, 6 (+1 kill), 7. The budget test pins it.

**Gold.** Only the two easiest sets pay gold, all of it landing in climb I. Gold is boss kills × the current boss's gold × the prestige price factor (`goldPrice`), read when the rung is claimed, like every other gold number. 4 kills sits inside climb I's spare (about 6 kills, about 4 with a few deaths); the gold budget test counts it in climb I. This replaces the gold spec's "Trials: none, gems only" line.

**EXP.** *My call:* each claim still pays EXP as a medium quest at the current weekly slot, as trials do today. 49 rungs instead of 17 adds about 32 medium-quest payouts over a year, a few percent of a year's EXP. Worth watching against the prestige pace.

## 3. What each set counts

Counts are per account: kept through death and prestige, as trials are today.

- **First steps:** a good skill, a bad habit, a quest, each added and still there at the next rollover (today's anti-farm rule). Any order; the card shows the first one not done.
- **Bosses slain:** every boss kill.
- **Longest streak:** the longest streak any good daily skill has reached (a high-water mark; a broken streak never lowers it).
- **Perfect days:** days where every due daily skill was checked and no bad habit was (today's Perfect day rule), counted at the day's end.
- **Quests completed:** quests finished on time, made before the day they're finished (today's Quest run rule).
- **Bad habits resisted, Crits landed, Enchants, Skill ranks raised:** each one counts.
- **Epic finds:** each epic item a boss drops. The top rung is **Own a relic**: relics don't drop, so it counts a relic from any source (today, the shop). *My call*, since "find" can't apply.
- **Untouched kills:** each boss killed that never hurt you.
- **Feats:** kill a boss with a crit, kill a boss with a true damage skill, check off a hard skill before noon. Any order.

## 4. Claiming

A card's Claim pays its first rung that's reached and not yet paid. Rungs reached together (an old save, a big day) wait in turn: the card stays ready until each is claimed. The stage's Trials button and the menu count the sets with a rung waiting (the number of Claim buttons).

## 5. The UI: A1 ledger cards in a modal

- **The modal.** Opened from the stage's Trials button on a phone (or the menu's Trials item in Focus mode), and from the menu on wider screens. A phone gets a tall sheet with a strip of the stage left above it; wider screens a centred panel. Trials stops being a tab, and leaves the desktop's main column.
- **A card per set**, cut like today's trial cards: icon socket; the name with the leading rung's prize (gems, and gold where it pays) beside it; the rung's deed; its bar (count / goal) for a counter set. When a rung waits, Claim takes the bar's place and the card wears today's brass rim. At the foot, pips for every rung (brass paid, a glowing ring for waiting, dark ahead), "Rung 3 of 7" and a fold arrow.
- **Tap a card** to fold out its ladder: every rung, with a check for paid ones (struck), a brass ring for the waiting one, and its prize. Only one Claim per card: the ladder shows the waiting rung's prize, not a second button.
- **Order:** sets with a rung waiting first, then the rest in table order, finished sets last (sunk, "All 7 done").
- Copy stays terse; deeds are one plain line.

## 6. Old saves

*My call:* a save with the old trials keeps what it earned and is never paid twice.
- Each old trial maps to a rung (or steps) of a new set: Perfect day → Perfect days 1; Hold the line → resisted 5; Crit streak → crits 5; Twice slain → bosses 1; Quest run → quests 1 and 3; Rank up, Enchanted, Epic find, Untouched → the first rung of their sets; New discipline, Name the enemy, Fresh quests → First steps; Killing crit, True strike, Early riser → Feats. Clean slate and Unbroken are dropped.
- A claimed old trial marks its rungs paid; a finished, unclaimed one leaves them waiting. In-progress counts carry over (3 of 5 resists starts the count at 3).
- Counts start at what the save can show: bosses slain at least the bosses beaten this climb, the longest streak at the best current daily streak. Rungs this reaches beyond the old trials are waiting to claim.
- The old `challenges` field is dropped after the move.

## 7. Approaches considered

- **Layouts** (round one): A ledger cards (picked), B a two-across trophy shelf, C a step track showing the whole ladder. Round two refined A: A1 prize up top (picked), A2 grouped under Ready / Climbing / Done with Claim all, A3 next-rung peek.
- **One-offs beside the sets**: dropped by the user for sets only. The teaching one-offs (add a skill, habit, quest) and the fight moments became the two step sets.
- **Trial count fixed at 30** (the gem spec's shape): dropped; the count follows the content, the budget is shared across it.
- **Trials gems only** (the gold spec): changed by the user to gold on one or two easy sets.
- **Full page vs modal**: modal, since Trials opens from a button, not a tab, and the desktop talents already use one.

## 8. Left to the builder

- Data and engine shape: set defs in `constants/trials.ts` (so `FREE_GEM_SOURCES` can sum them), the logic in `trials.ts`, `Character.trials` per set (count, marks for step rungs, claimed rungs, day-end and rollover bookkeeping).
- The activity log line and claim popup name the rung's deed and its pay.
- Tests: the budget (275, 4 kills, the upgrade rule), each set's counting, migration, the modal list.
