# Talent tree

Status: design approved in chat 2026-11-10; trees reworked the same day (max 3 ranks, repeated II nodes). Built and pushed 2026-11-10: the engine and saving first (da686eb), then the tab, node popup, unlock popup and the feed wording to the Plinths mock, with the base level-up heal cut to 10% in that second push.

## Why

Ranks are the power that lasts: they come from real streaks and survive every death. The game has nothing else that shapes a hero. Level-ups pay a stat bump and an event pick, and every hero of the same class plays about the same.

The talent tree gives each run its own build. You earn points by levelling, spend them on a shared tree, and the tree empties when the hero dies, so the next hero can go a different way.

## Goals

- A different build every run: one run goes deep on crits, the next goes tank.
- Level-ups feel like they buy something you chose.
- Never maxed in a normal run, so the tree never goes stale.
- Works for every class: damage bonuses are mostly mixed, with optional physical/magic/true nodes.

## Non-goals

- Lasting power across deaths. Ranks already do that. (A permanent, paragon-style tree was considered and rejected.)
- Respec. Spent points never move.
- Relics in the tree. Relics stay side-quest rewards and drops.
- Currency, a shop, or changes to trials. Trials stay as they are; the shop is parked.
- Visual design. This doc covers rules, values and engine hooks only.

## Anti-goals

- **Never protects a streak.** Nothing in the tree softens a miss's effect on streaks (see Unbroken below: a dodged hit still resets the streak).
- **Never rivals ranks.** A full shoot is worth about one rare item. Rank I alone doubles a skill.
- **Never sold.** Points are earned only by levelling. No buying points or point boosts (same reason as not selling coins: it makes check-offs worth less). How the tree ties into a paid tier is open, see Monetization.

## Rules

- **Points:** 1 talent point per level gained. A hero at level L has `L - 1` points in all. Points are derived from level, never stored, so a hero already in progress when this ships gets its points automatically.
- **Spending:** each rank costs 1 point. Spent points can't be moved or refunded.
- **Reset:** when the hero dies (the normal run reset), the tree empties. A Phoenix Feather revive keeps the tree, as it keeps level.
- **Unlocking:**
  - The first main node of each shoot is always open.
  - Each later main node opens once the main node before it has at least 1 rank.
  - An offshoot opens once its parent main node has at least 1 rank.
  - The top node (★) opens once every main node in its shoot is at full ranks. Offshoots don't count toward it.
- **Unlock:** the Talents tab opens at **level 5**, with the 4 points earned so far ready to spend. It follows the Quests (level 2) and Trials (level 4) pattern: a lock icon on the tab before then, an unlock popup, and a `talentsUnlocked` flag on the character. A save already past level 5 when this ships gets the popup once.
- **Spend any time.** Points bank until spent. No popup at level-up; the Talents tab shows the unspent count.
- **Ranks:** at most 3 per node. A stat worth more than 3 ranks shows up twice in its shoot: the first node low on the trunk, its "II" copy higher up (Might, then Might II). The copies are separate nodes with their own ranks and the same per-rank value.
- **No offshoots off a shoot's first node.** The first node stands alone, so a new tree opens with three clean choices.
- **Size:** 97 points in all. A typical run (level 15–25) earns 14–24, about a fifth of the tree.

## The tree

Values are per rank unless "Full" says otherwise. Each shoot is listed from its first node (at the foot of the trunk) up to its ★.

### Damage — 39 points, 18 to the top

| Node | Off | Ranks | Per rank | Full |
|---|---|---|---|---|
| **Might** | | 3 | +2% all damage | +6% |
| **Precision** | | 3 | +1% crit chance | +3% |
| ↳ Keen Edge | Precision | 2 | crits deal +0.1× | 2.2× |
| **Brawn** | | 3 | +3% physical damage | +9% |
| ↳ Armor Break | Brawn | 3 | +2% armor pen | +6% |
| **Arcana** | | 3 | +3% magic damage | +9% |
| ↳ Spell Break | Arcana | 3 | +2% magic pen | +6% |
| **Might II** | | 3 | +2% all damage | +6% |
| ↳ Truestrike | Might II | 3 | +4% true damage | +12% |
| ↳ Weekly Might | Might II | 3 | +5% damage from weekly skills | +15% |
| **Precision II** | | 3 | +1% crit chance | +3% |
| ↳ Armor Break II | Precision II | 3 | +2% armor pen | +6% |
| ↳ Spell Break II | Precision II | 3 | +2% magic pen | +6% |
| ★ **Executioner** | | 1 | crits deal +0.5× | |

Main order: Might → Precision → Brawn → Arcana → Might II → Precision II → Executioner.
Shoot totals: all damage +12%, crit chance +6%, armor pen +12%, magic pen +12%.

### Tank — 29 points, 15 to the top

| Node | Off | Ranks | Per rank | Full |
|---|---|---|---|---|
| **Vigor** | | 3 | +3% max HP | +9% |
| **Plating** | | 3 | +25 armor | +75 |
| ↳ Iron Hide | Plating | 2 | +25 armor | +50 |
| **Warding** | | 3 | +25 magic resist | +75 |
| ↳ Spell Hide | Warding | 2 | +25 magic resist | +50 |
| **Vigor II** | | 3 | +3% max HP | +9% |
| ↳ Last Stand | Vigor II | 3 | −5% damage taken while below 25% HP | −15% |
| **Bastion** | | 3 | +25 armor and +25 magic resist | +75 each |
| ↳ Plating II | Bastion | 3 | +25 armor | +75 |
| ↳ Warding II | Bastion | 3 | +25 magic resist | +75 |
| ★ **Unbroken** | | 1 | 10% chance to dodge a boss hit | |

Main order: Vigor → Plating → Warding → Vigor II → Bastion → Unbroken.
Shoot totals: max HP +18%, armor +275, magic resist +275. (Bulwark was cut: it was the same stat as Vigor.)

### Support — 29 points, 17 to the top

| Node | Off | Ranks | Per rank | Full |
|---|---|---|---|---|
| **Mending** | | 3 | +3% healing | +9% |
| **Renewal** | | 3 | level-ups heal +2% of max HP | +6% |
| ↳ Scavenger | Renewal | 3 | +5% chance of one extra item when a boss falls | 15% |
| **Insight** | | 3 | +2% EXP | +6% |
| ↳ Wisdom | Insight | 2 | +3% quest EXP | +6% |
| ↳ Waymark | Insight | 3 | +5% EXP from streak milestones | +15% |
| **Mending II** | | 3 | +3% healing | +9% |
| ↳ Second Wind | Mending II | 3 | heal +2% of max HP when a boss falls | +6% |
| **Renewal II** | | 3 | level-ups heal +2% of max HP | +6% |
| **Leech** | | 2 | +0.5% lifesteal | +1% |
| ★ **Blessed** | | 1 | heal skills can crit, for double healing | |

Main order: Mending → Renewal → Insight → Mending II → Renewal II → Leech → Blessed. Leech sits last on purpose: lifesteal is strong.
Shoot totals: healing +18%, level-up heal +12%.

## How each node works

These follow the existing engine (`src/game-engine/`). Where a node meets an item effect, the rule is given. Calls marked *(Claude's call)* were not discussed and can be changed.

**Stat nodes** (Might and Might II, Truestrike, Precision and Precision II, Brawn, Arcana, Armor Break and Armor Break II, Spell Break and Spell Break II, Vigor and Vigor II, Plating and Plating II, Iron Hide, Warding and Warding II, Spell Hide, Bastion (both armor and magic resist), Mending and Mending II, Insight, Leech) add to the same totals equipped items feed today: percent nodes add to `itemBonusPercent`'s stat (`allDamage`, `trueDamage`, `critChance`, `physicalDamage`, `magicDamage`, `armorPen`, `magicPen`, `health`, `healing`, `expGain`, `lifesteal`), and flat nodes add to `itemFlatBonus`'s (`armor`, `magicResist`). So they get the same caps and counters: pen still clamps at `ARMOR_MAGIC_PEN_CAP_PCT`, Sever still stops lifesteal, Sunder still halves armor and magic resist. Enchanting and the Double event apply to items only, never to talents. *(Claude's call: the cleanest route is one helper that sums items + talents, used wherever `itemBonusPercent`/`itemFlatBonus` are read for these stats.)*

**Weekly Might:** multiplies damage (not healing) from weekly skills, on top of `WEEKLY_BONUS_MULTIPLIER`. Stacks multiplicatively with Moonwell Staff.

**Keen Edge and Executioner:** everything stacks. They add to whatever crit multiplier a hit already has: `CRIT_MULTIPLIER` (2×) for most crits, Voidcaller's Scepter's 3× for magic crits. Full Keen Edge plus Executioner adds +0.7×, so 2.7× for most crits and 3.7× for Scepter magic crits. Boss crits (Frenzy) are unaffected.

**Last Stand:** checks HP before the hit lands. Applies to boss hits (missed skills and quests) and to boss-skill HP hits (Rend, Ravage, Doom).

**Unbroken:** each boss hit from a missed skill, a missed quest, or "Give in" on a bad habit (all go through `bossStrike` in `combat.ts`) has a 10% chance to deal no damage. *(Claude's call to include Give in: it's the same hit, and the streak still resets.)* A dodged hit:
- still resets the missed skill's streak and still counts as a miss everywhere else;
- doesn't trigger the boss's lifesteal or Bloodlust heal, and doesn't use up Dawnguard Helm for the day;
- shows as a dodge in the hit feed and popups (wording decided with the visuals).

Boss skills (Rend, Ravage, Doom and the rest) can't be dodged. Roll the dodge every strike so the rng sequence stays stable, as the boss crit roll already does.

**Waymark:** multiplies the EXP a streak milestone pays (`milestoneExp` in `combat.ts`), on top of Banner of Endurance's double EXP. Plain check-off EXP is untouched.

**Second Wind:** when a boss falls, heal 2% of max HP per rank. Stacks with Soul Lantern's 30% (36% with both).

**Renewal and Renewal II:** the per-level heal gains 2% of max HP per rank. Everything stacks: base 10% + Sage's Codex 20% + Renewal 12% = 42% at most (see Changes outside the tree).

**Wisdom:** multiplies quest EXP, on top of Quill's double EXP.

**Scavenger:** on each boss kill, one roll at 5% per rank for one extra item drop. It may go past `ITEM_DROP_MAX_COUNT`. At most one extra item per kill.

**Blessed:** heal skills (which never crit today) roll a crit at the hero's normal crit chance. A heal crit is a flat 2×: Keen Edge and Executioner raise damage crits only. Blind stops heal crits too, as it stops damage crits. Overhealing from a heal crit still counts for Wellspring.

## Changes outside the tree

The level-up heal is reworked so its sources add up:

- **Base level-up heal** (`LEVEL_UP_HEAL_PCT`): 20% → **10%** of max HP.
- **Sage's Codex** (`sages-insight`): from "heal 40% instead of 20%" to **+20%** on top of the base. New effect text: "Level-ups heal +20% of max HP." `SAGES_INSIGHT_LEVEL_UP_HEAL_PCT` becomes a bonus (20), not a replacement (40).
- **Renewal** and **Renewal II** add up to +12% on top.

So a level-up heals 10% alone, 30% with the Codex, and 42% with the Codex and both Renewals full. This is a small cut for heroes without the Codex (20% → 10%) and for Codex holders without Renewal (40% → 30%), which the user chose.

## Where it lives

**Phone:** a fifth bottom tab, **Talents** (lucide `Anvil` icon, also on the tab's banner and the unlock popup's emblem), between Trials and Hero: Skills · Quests · Trials · Talents · Hero. Five tabs at 375px are 75px each, so tap targets are fine. `TabId` in `src/store/tabStore.ts` gains `'talents'`. The stage drops to the Focus strip on this tab, as it does on Hero.

**Badge:** the tab shows the unspent point count as a number (1, 2, 3…), not a dot. It goes away at 0.

**Spending:** tap a node to see what it does. Spending a rank needs a confirm, since it can't be undone. *(Claude's call: the exact confirm pattern is part of the visual design.)*

**Layout (picked 2026-11-10, `docs/mockups/pixel-talents.html`, Plinths):** one shoot at a time. The shoot's trunk grows up from its first node to its ★, offshoots branching to the sides (a lone offshoot alternates sides up the trunk, starting on the right; a pair takes both sides), and the trunk and branches turn brass up to the nodes with ranks. Three stone plinths at the foot of the tree (Damage · Tank · Support, each with its points spent) pick the shoot, in thumb reach; a brass root runs from the trunk into the picked plinth. The Talents banner with the unspent points stays pinned at the top and the plinths at the foot, above the bottom tab bar; only the tree scrolls between them. The tab opens scrolled to the bottom. A single merged tree with all three shoots was tried and rejected.

**Wider screens** show every list at once. Talents sits in the right column, under the progress boxes and above the log, as the banner, the points and an "Open tree" button; the tree opens in a modal, its plinths at the foot. Locked tabs (Quests, Trials, Talents) can't be tapped on a phone.

**Copy:** node names are short. Effects state plainly what they do, the same as item effects.

## Saving

- The character gains `talents?: Partial<Record<TalentId, number>>` (ranks per node). Optional, so old saves load with an empty tree and nothing else changes.
- Unspent points = `(level − 1) − sum of ranks`. Never stored.
- A new character (`createCharacter`, and the run reset after a death) starts with no talents.
- Reads and writes go through `characterStore`, like the rest of the character, never `localStorage` directly.
- The save file export/import carries talents with the character.

## Balance

At level 20 a hero can have about +10–15% power that today's boss tuning doesn't expect. That's intended: the user wanted a small player buff anyway. No balance sim and no boss retuning.

Known lopsided spots, accepted for now:
- **Pen nodes** add little against normal bosses (10–35% resist) and a lot against heavily armored or warded ones. Points can't move, so pen is a gamble on which bosses come.

## Rollout

Nothing goes live until the visuals are done. Pushing main deploys, and the first live push hands every hero `level − 1` points at once, which can't be taken back once spent. Order:

1. **Visual mock** of the Talents tab and the unlock popup (Pixel-cut, Moonlit), picked before any UI is built.
2. **Engine and saving**, with tests. Fine to push: nothing reads it yet.
3. **The tab and unlock popup**, built to the picked mock. This is the push that turns it on.

## Monetization

Open. Under the one-time purchase model (Model B in `docs/ideas/2026-11-09-monetization.md`), one option is: the free game gets the main nodes, and the full game adds offshoots and top nodes. Build the whole tree as free for now. Don't hard-code a paid split.

## Left to the builder

- Talent ids and the data shape of the tree definition (a constants file next to `itemCatalog.ts` fits the codebase).
- Test coverage, in the style of the existing `*.spec.ts` files.
- Where each node's effect is wired in, within the rules above.
- Whether current HP rises when a Vigor rank raises max HP (copy what equipping a health item does).
- Whether a dodge counts as being hit for trials like "Untouched" (copy how boss skills only flag a hit that does damage).
