# Prestige design

Date: 2026-11-17. Replaces "death resets the run" in the shop plan (`docs/ideas/2026-11-13-shop-economy.md` §6).

## 1. Why

A full reset on every death made veterans look like new players, and the user worried they would quit. So:

- **Death becomes a setback.** It still stings, but it isn't the end of the run.
- **Prestige is the reset.** The player chooses it. It pays out permanent power, gives a reason to try the other classes, and shows status.

Skill ranks and talents stay the main long-term power. Prestige is a small ladder of five steps on top of them.

## 2. Goals, non-goals, anti-goals

**Goals**
- Every rank feels like real power or real progress: stats, gems, and one special thing.
- The first prestige is reachable for a decent new player, and each later climb asks more.
- The ladder is simple and linear. There's nothing to choose inside it.

**Non-goals**
- Dungeons. Two ranks unlock dungeons, but dungeons have their own design (Milestone F).
- The prestige screen and popups. They need a mock round first (see §8).
- Final gem amounts. 50 gems per rank is a placeholder.

**Anti-goals** (failure even if it works)
- **Death that doesn't sting.** No perk softens the death setback.
- **Hidden boss buffs for prestiged players.** Bosses are not touched. If prestige proves too strong, shrink the buffs, so the numbers players see stay true.
- **Anything that protects a streak** (see the "never protect a streak" rule).

## 3. Death (the setback)

Decided 2026-11-17. When the hero falls (and the player doesn't revive):

| Lost | Kept |
|---|---|
| 3 levels (never below level 1) | Everything else in the run: the remaining gold, the other items, item slots, Overdrive, enchants |
| 25% of carried gold | Talents, skill ranks, streaks, gems, skins, trials, unused freezes |
| 1 random equipped item | The boss number shown |
| Boss power: the next boss is made at the power of the boss 3 back | |

- The engine needs a **boss power index** that is separate from the boss number shown. Every boss stat that is made from the index (health, attack, resists, skills, gold, drops, and the shop and service prices priced off boss gold) reads the power index. The shown number reads the boss number.
- My call, from the user's "boss number unchanged": the hero dies to boss #N at power P. The next boss is a new random boss, still shown as **#N**, made at power **P − 3** (never below 1). After that, each kill raises both by 1, so the gap stays until prestige, and each death widens it by 3.
- The gem revive on the death screen stays at 10 gems and half HP, and is now open on every fall while the gems cover it, with no once-per-boss limit (the user, 2026-11-17).
- The death popup's copy ("Your skills keep their power") and the bonfire scenes need a look, because the run no longer ends. Left to the builder, in the house terse style.

## 4. Prestige

### When

Prestige is **optional**. The next rank opens once the hero's **current** level reaches its bar:

| Rank | Title | Bar |
|---|---|---|
| I | Veteran | Level 30 |
| II | Veteran | Level 40 |
| III | Ascendant | Level 50 |
| IV | Ascendant | Level 60 |
| V | Mythic | Level 70 |

The bar uses the current level, not the best level ever reached. A death that drops the hero back under the bar closes prestige again until they climb back. There is no level cap. After rank V, the hero keeps climbing until the boss curve stops them.

### What prestige resets

Prestige is a new run. Everything that the old full death reset now resets on prestige:

| Reset | Kept |
|---|---|
| Level to 1 | Talents (every rank bought) |
| Gold | Skill ranks and streaks |
| Items and relics | Gems, skins, Mythic skin |
| Item slots (back to 4) | Finished and unclaimed trials |
| Run buys (Overdrive, enchants, rerolls, gem-bought items) | Unused streak freezes |
| Boss number and boss power back to 1 | Dungeon unlocks and first clears |
| Special/Ult flags (handed out again at 5 and 8) | `highestLevel`, so level gem milestones never pay twice |

- The player picks **any class** on the new-hero screen. The existing `heroPending` flow already handles this.
- Skills' damage types are re-rolled for the class picked, as a death does today.

### What each rank gives

Every rank:
- **+20% all damage, +10% max HP, +5% EXP gain.** These add into the same sum as every other % bonus, from items and talents (`itemBonusPercent` / `talentBonusPercent`), using the existing `allDamage`, `health` and `expGain` stats. No separate multiplier and no special case. At rank V the totals are +100%, +50% and +25%.
- **50 gems**, paid at the moment of prestige. This is a placeholder. Add it to `FREE_GEM_SOURCES` as `prestige: 250`.
- My call: the free-gem budget test in `economy.spec.ts` keeps checking the **base** tree, one skin and two revives against the sources from before prestige. Prestige gems sit outside that check. They pay for the Deeper roots ranks, and those amounts get tuned later with the gem numbers.

Plus one special per rank:

| Rank | Special |
|---|---|
| I Veteran | **A free dungeon** unlocked |
| II Veteran | **Deeper roots:** every talent node except the tops gets +1 max rank |
| III Ascendant | **A second free dungeon** unlocked |
| IV Ascendant | **Deeper roots II:** +1 max rank again |
| V Mythic | **Mythic skin** |

The dungeons come first so players can try dungeons early.

### Deeper roots

- The max rank of a node is its base max plus the number of Deeper roots unlocked (0, 1 or 2). Nodes at 3 go to 4, then 5. Nodes at 2 (Keen Edge, Iron Hide, Spell Hide, Wisdom, Leech) go to 3, then 4.
- The top nodes (Executioner, Unbroken, Blessed) stay at 1 rank.
- A top node still opens once every main node of its shoot reaches its **base** max. Otherwise a Deeper roots rank would re-lock a top the player was about to buy.
- New ranks use the usual rising price (`TALENT_COST(n)`). They're the ranks bought late, so they cost the most gems, which is where the prestige gems go.

### Free dungeons

- Ranks I and III record a dungeon unlock on the account now. Until dungeons ship, those two ranks pay stats and gems only.
- **Open, for the dungeon design:** which dungeons these are, and what "free" means next to the paid dungeon packs.

### Mythic skin

- My call: one Mythic hero skin per class (warrior, cleric/Mage, ranger), so a Mythic player has one for whichever class they play. It's owned on the account and switched in the Wardrobe like any skin.
- The art is a Pixellab run: show every input and the cost first, and wait for a clear yes. Until the art exists, use a placeholder skin.

## 5. Constraints

- The engine stays pure. The rank lives on `Account.prestige`, which already exists. The stat math takes a Character, so the builder picks how the rank reaches it (for example, copied onto the Character when prestiging, or passed in). Either way, all saving goes through the store layer.
- Saves from before this change: a missing `prestige` means rank 0. A save mid-run is untouched. The death setback applies from the next death.
- The display is already built (`prestige.ts`, `PrestigeNumeral.vue`, `usePrestige.ts`, titles Veteran / Ascendant / Mythic). Prestiging only raises `account.prestige`.

## 6. Approaches considered

| Approach | Trade-off | Picked? |
|---|---|---|
| Softer-death and head-start perks (lose fewer levels, start with a slot) | They make death sting less, which works against the consequence | No (the user) |
| Growing perks (better level growth, stronger skill ranks) | Strong and compounding, but harder to read and to tune | No |
| **Flat stats + gems + one special per rank** | Easy to read, and each rank still has a highlight | **Yes** |
| A separate prestige multiplier | Avoids items and talents watering it down, but adds a rule that exists nowhere else | No (the user: same as every other % bonus) |
| Hidden boss buffs per rank | Stops the game getting easy, but takes back the reward and makes the numbers lie | No (the boss curve already outgrows fixed bonuses: past boss 51 each boss has 9% more HP, so +20% buys about 2 bosses) |
| Prestige bar at 50 every time | Simple, but the first climb is the hardest and later climbs get easier | No; the bar rises 30 to 70 instead |

## 7. Decided by the user

- 5 linear ranks. Each gives +20% all damage, +10% max HP, +5% EXP and 50 gems, plus one special.
- The specials, in order: dungeon, Deeper roots, dungeon, Deeper roots II, Mythic skin.
- The % bonuses stack like every other % bonus.
- The bars are levels 30, 40, 50, 60 and 70.
- Death stings: −3 levels, 25% of gold, 1 item, and boss power 3 back. No perk softens it.
- No hidden boss buffs.

## 8. Left to the builder or still open

- **The prestige screen** (a tab, or part of the Talents tab) and **the prestige moment popup**: mock first, in the Pixel-cut (Moonlit) look. Fit the Mythic skin into the reveal.
- My call: once deaths stop resetting the run, prestige is the only way to start over or change class. So the first build ships the engine and store, plus a **plain temporary Prestige button** on the Talents tab (behind a confirm). The real screen replaces it after the mock round. Nothing goes live until the whole shop plan is pushed anyway.
- **Done 2026-11-17:** the mock round picked **A · Crown plinth** (`docs/mockups/prestige-tree.html`: a fourth plinth on the Talents tab that opens the ladder) and **A · The statue** (`docs/mockups/prestige-popup.html`: the confirm popup). Both were built in place of the temporary button, along with a featured prestige card on the level-up popup. The Mythic skins use placeholder art until the Pixellab run.
- **The epitaph list (the user, 2026-11-17):** it records a run at each **prestige**, not at a death. Each entry also shows how many deaths that climb took. "Best boss" uses the boss number shown, which only goes up on kills. The bonfire return scene still keys off whether any runs are saved. The user will rework this page later, so build it plainly.
- The death popup's new copy, and how the bonfire screen reads now that the run continues.
- What a stage or level-up shows when prestige opens (a level-up popup unlock line is the obvious place, since `UNLOCK_LEVELS` already lists unlocks).
- Gem amounts, and whether the stat sizes need trimming after play.
- A time-capped sim of a new player reaching level 30 is suggested but not required before building.
