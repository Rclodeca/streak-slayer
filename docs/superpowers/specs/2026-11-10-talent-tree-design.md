# Talent tree

Status: design approved in chat 2026-11-10. Not built. Visuals come later.

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
- **Size:** 87 points in all. A typical run (level 15–25) earns 14–24, about a fifth of the tree.

## The tree

Values are per rank unless "Full" says otherwise. Starting values, to be checked by a sim (see Balance).

### Damage — 35 points, 16 to the top

| Node | Off | Ranks | Per rank | Full |
|---|---|---|---|---|
| **Might** | | 5 | +2% all damage | +10% |
| ↳ Truestrike | Might | 3 | +4% true damage | +12% |
| ↳ Weekly Might | Might | 3 | +5% damage from weekly skills | +15% |
| **Precision** | | 5 | +1% crit chance | +5% |
| ↳ Keen Edge | Precision | 2 | crits deal +0.1× | 2.2× |
| **Brawn** | | 3 | +3% physical damage | +9% |
| ↳ Armor Break | Brawn | 5 | +2% armor pen | +10% |
| **Arcana** | | 3 | +3% magic damage | +9% |
| ↳ Spell Break | Arcana | 5 | +2% magic pen | +10% |
| ★ **Executioner** | | 1 | crits deal 2.5× (2.7× with full Keen Edge) | |

Main order: Might → Precision → Brawn → Arcana → Executioner.

### Tank — 28 points, 20 to the top

| Node | Off | Ranks | Per rank | Full |
|---|---|---|---|---|
| **Vigor** | | 5 | +2% max HP | +10% |
| **Plating** | | 5 | +40 armor | +200 |
| ↳ Iron Hide | Plating | 2 | +25 armor | +50 |
| **Warding** | | 5 | +40 magic resist | +200 |
| ↳ Spell Hide | Warding | 2 | +25 magic resist | +50 |
| **Bulwark** | | 5 | +2% max HP | +10% |
| ↳ Last Stand | Bulwark | 3 | −5% damage taken while below 25% HP | −15% |
| ★ **Unbroken** | | 1 | 10% chance to dodge a boss hit | |

Main order: Vigor → Plating → Warding → Bulwark → Unbroken.

### Support — 24 points, 15 to the top

| Node | Off | Ranks | Per rank | Full |
|---|---|---|---|---|
| **Mending** | | 5 | +3% healing | +15% |
| ↳ Second Wind | Mending | 3 | heal 2% of max HP when a boss falls | 6% |
| **Insight** | | 3 | +2% EXP | +6% |
| ↳ Wisdom | Insight | 2 | +3% quest EXP | +6% |
| **Renewal** | | 5 | +2% level-up heal | 20% → 30% |
| ↳ Scavenger | Renewal | 3 | +5% chance of one extra item when a boss falls | 15% |
| **Leech** | | 2 | +0.5% lifesteal | +1% |
| ★ **Blessed** | | 1 | heal skills can crit, for double healing | |

Main order: Mending → Insight → Renewal → Leech → Blessed. Leech sits last on purpose: lifesteal is strong.

## How each node works

These follow the existing engine (`src/game-engine/`). Where a node meets an item effect, the rule is given. Calls marked *(Claude's call)* were not discussed and can be changed.

**Stat nodes** (Might, Truestrike, Precision, Brawn, Arcana, Armor Break, Spell Break, Vigor, Bulwark, Plating, Iron Hide, Warding, Spell Hide, Mending, Insight, Leech) add to the same totals equipped items feed today: percent nodes add to `itemBonusPercent`'s stat (`allDamage`, `trueDamage`, `critChance`, `physicalDamage`, `magicDamage`, `armorPen`, `magicPen`, `health`, `healing`, `expGain`, `lifesteal`), and flat nodes add to `itemFlatBonus`'s (`armor`, `magicResist`). So they get the same caps and counters: pen still clamps at `ARMOR_MAGIC_PEN_CAP_PCT`, Sever still stops lifesteal, Sunder still halves armor and magic resist. Enchanting and the Double event apply to items only, never to talents. *(Claude's call: the cleanest route is one helper that sums items + talents, used wherever `itemBonusPercent`/`itemFlatBonus` are read for these stats.)*

**Weekly Might:** multiplies damage (not healing) from weekly skills, on top of `WEEKLY_BONUS_MULTIPLIER`. Stacks multiplicatively with Moonwell Staff.

**Keen Edge and Executioner:** the hero's crit multiplier becomes `CRIT_MULTIPLIER` (2) + 0.1 per Keen Edge rank, or 2.5 + 0.1 per Keen Edge rank with Executioner. Voidcaller's Scepter's magic crits use whichever is higher, its 3× or this. *(Claude's call.)* Boss crits (Frenzy) are unaffected.

**Last Stand:** checks HP before the hit lands. Applies to boss hits (missed skills and quests) and to boss-skill HP hits (Rend, Ravage, Doom).

**Unbroken:** each boss hit from a missed skill, a missed quest, or "Give in" on a bad habit (all go through `bossStrike` in `combat.ts`) has a 10% chance to deal no damage. *(Claude's call to include Give in: it's the same hit, and the streak still resets.)* A dodged hit:
- still resets the missed skill's streak and still counts as a miss everywhere else;
- doesn't trigger the boss's lifesteal or Bloodlust heal, and doesn't use up Dawnguard Helm for the day;
- shows as a dodge in the hit feed and popups (wording decided with the visuals).

Boss skills (Rend, Ravage, Doom and the rest) can't be dodged. Roll the dodge every strike so the rng sequence stays stable, as the boss crit roll already does.

**Second Wind:** when a boss falls, heal 2% of max HP per rank. With Soul Lantern equipped, use whichever is higher, not both. *(Claude's call.)*

**Renewal:** the per-level heal (`LEVEL_UP_HEAL_PCT`, 20%) gains 2% per rank. With Sage's Codex (40%), use whichever is higher.

**Wisdom:** multiplies quest EXP, on top of Quill's double EXP.

**Scavenger:** on each boss kill, one roll at 5% per rank for one extra item drop. It may go past `ITEM_DROP_MAX_COUNT`. At most one extra item per kill.

**Blessed:** heal skills (which never crit today) roll a crit at the hero's crit chance + 10%. A heal crit is a flat 2×: Keen Edge and Executioner raise damage crits only. Blind stops heal crits too, as it stops damage crits. Overhealing from a heal crit still counts for Wellspring. *(Claude's call: the +10% wasn't in the shortlist the user approved, but a review raised that without it Blessed almost never fires for a hero who skips the Damage crit nodes. Drop it if unwanted.)*

## Where it lives

**Phone:** a fifth bottom tab, **Talents**, between Trials and Hero: Skills · Quests · Trials · Talents · Hero. Five tabs at 375px are 75px each, so tap targets are fine. `TabId` in `src/store/tabStore.ts` gains `'talents'`. Whether the stage drops to the Focus strip on this tab, as it does on Hero, is decided with the visuals.

**Badge:** the tab shows the unspent point count as a number (1, 2, 3…), not a dot. It goes away at 0.

**Spending:** tap a node to see what it does. Spending a rank needs a confirm, since it can't be undone. *(Claude's call: the exact confirm pattern is part of the visual design.)*

**Wider screens** show every list at once today. Where the tree sits there is decided with the visuals.

**Copy:** node names are short. Effects state plainly what they do, the same as item effects.

## Saving

- The character gains `talents?: Partial<Record<TalentId, number>>` (ranks per node). Optional, so old saves load with an empty tree and nothing else changes.
- Unspent points = `(level − 1) − sum of ranks`. Never stored.
- A new character (`createCharacter`, and the run reset after a death) starts with no talents.
- Reads and writes go through `characterStore`, like the rest of the character, never `localStorage` directly.
- The save file export/import carries talents with the character.

## Balance

At level 20 a hero can have about +10–15% power that today's boss tuning doesn't expect. Before shipping, run one quick time-capped sim (tiny model, hard time cap) on a sensible pick order per shoot, against the current boss scaling. If deaths drop clearly, nudge boss HP or the node values, and recompute `EXPECTED_LEVEL_BY_BOSS_INDEX` if EXP changes enough to move it (Insight and Wisdom add up to about +6–12% EXP).

Known lopsided spots, accepted for now:
- **Pen nodes** add little against normal bosses (10–35% resist) and a lot against heavily armored or warded ones. Points can't move, so pen is a gamble on which bosses come.
- **Top node costs differ:** Support 15, Damage 16, Tank 20.

## Rollout

Nothing goes live until the visuals are done and the sim is in. Pushing main deploys, and the first live push hands every hero `level − 1` points at once, which can't be taken back once spent. Order:

1. **Visual mock** of the Talents tab and the unlock popup (Pixel-cut, Moonlit), picked before any UI is built.
2. **Engine and saving**, with tests. Fine to push: nothing reads it yet.
3. **Balance sim**, then any value changes.
4. **The tab and unlock popup**, built to the picked mock. This is the push that turns it on.

## Monetization

Open. Under the one-time purchase model (Model B in `docs/ideas/2026-11-09-monetization.md`), one option is: the free game gets the main nodes, and the full game adds offshoots and top nodes. Build the whole tree as free for now. Don't hard-code a paid split.

## Left to the builder

- Talent ids and the data shape of the tree definition (a constants file next to `itemCatalog.ts` fits the codebase).
- Test coverage, in the style of the existing `*.spec.ts` files.
- Where each node's effect is wired in, within the rules above.
- Whether current HP rises when a Vigor/Bulwark rank raises max HP (copy what equipping a health item does).
- Whether a dodge counts as being hit for trials like "Untouched" (copy how boss skills only flag a hit that does damage).
