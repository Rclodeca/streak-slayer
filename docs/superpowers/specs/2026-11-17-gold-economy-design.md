# Gold economy — design

Every gold source and every gold price, tuned climb by climb. Decided with the user 2026-11-17, after the gem balance (`2026-11-17-gem-economy-design.md`). Replaces the placeholder gold numbers in `constants/economy.ts`, and the gem spec §8 line "price each talent rank at about one level's gold" (too much: it left nothing for the shop).

## 1. Why

Gold builds the hero for this run. Players should afford most of what they want, but have to pick and choose and manage their gold. The core build is always reachable; the extras compete.

What gold must buy in a climb, in the user's words:
- **Item slots:** crucial.
- **Rerolls:** a few.
- **Enchants:** a couple, getting expensive fast.
- **Overdrive:** a nice to have.
- **Rares and epics:** here and there, to finish a build and grab key items.
- **Health Potions:** here and there to top up, more for less consistent players. Gated more by time (one per 3-day window) than by cost.
- **Talent ranks:** a share of the gold, not all of it. Gems already pace the tree.

**Anti-goals:** the tree eating all the gold; a wall after prestige (today's tree gold climbs with ranks ever bought while gold resets, so the first rank after prestige I costs 1,125 gold against a boss paying 50); gold piling up unspent on the last climb; a large daily purse (today's half a boss kill a day is about 40% of all gold, too much).

## 2. Method

From the user's economy reading:
- **Core build fully covered, extras scarce.** Normal play pays for the whole core build; what's left buys some of the extras, so the player chooses.
- **Time to earn.** Prices are set in days of play for a good player. A good player earns about one boss kill's worth of gold a day, so a price of N boss kills is about N days.
- **Source to sink about 1:1.** Gold earned gets spent. Prestige resets gold and a death takes 25%, so hoarding is already discouraged.

Every gold price is **boss kills × the prestige price factor** (§4). Boss gold rises with the boss (40 + 10 × boss), so prices rise with it: the numbers grow as the hero does, but a kill buys the same share of the shop all climb. The prestige factor is the one thing that moves the gold-to-price ratio.

## 3. Sources

| Source | Gold | Change |
|---|---|---|
| Boss kill | `bossGold` = 40 + 10 × boss index | unchanged |
| Daily purse | **0.2** of a boss kill a day | was 0.5 |
| Gold Pouch (15 gems, once a day) | 3 boss kills × the prestige price factor | was 3 kills flat |
| Trials | 4 boss kills in all, on First steps and the early Bosses slain rungs (all in climb I) | was none; changed with the trial sets, `2026-11-18-trial-sets-design.md` §2 |

*My call:* purse at 0.2 (about 20% of a climb's gold). The user said half a kill was too much; 0.2 is the number the model below uses.

*My call:* the Gold Pouch scales with the prestige price factor, so a gem buys the same share of the shop on every climb (the gem-to-gold anchor stays fixed).

## 4. The prestige price factor

Prices rise after each prestige; boss gold doesn't drop. The user picked raising prices over cutting gold, so prestige never makes a boss pay less.

**Price factor = 0.8 + 0.1 × prestige rank** (the account's rank, 0–5):

| Climb | To level | Prestige rank | Price factor |
|---|---|---|---|
| I | 30 | 0 | ×0.80 |
| II | 40 | I | ×0.9 |
| III | 50 | II | ×1.0 |
| IV | 60 | III | ×1.1 |
| V | 70 | IV | ×1.2 |
| Mythic (endless) | — | V | ×1.3 |

Climb I is cheapest: it teaches the loop, and the user worried it's the hardest climb. Later climbs are longer (more bosses, more gold) while most of the core list is the same size, so prices rise to keep them about as tight. The slope was first 0.12; with a few deaths that left climb III covering the core and nothing else, so it came down to 0.1.

It applies to every gold price: shop items, potions, restocks, services, slots, talent ranks, and the Gold Pouch's payout. Not to the death toll (a share of carried gold) or anything priced in gems.

## 5. Prices

In boss kills at the current boss, before the price factor. **Bold** = changed.

| Thing | Price | Climbs by | Kind |
|---|---|---|---|
| Talent rank | **0.5** | flat (every rank, 1–163) | once, permanent |
| Slot 5 / 6 / 7 / 8 | **2 / 4 / 6 / 8** | — | per run |
| Reroll | 2 | **×2** per reroll this turn (was ×1.5), back to 2 next turn | repeats |
| Overdrive | 5 | **×2** per skill holding it (was ×1.5) | per run |
| Enchant | **3** (was 10) | ×2 per enchanted worn item | per run |
| Common / uncommon / rare / epic / relic | 1 / 1.5 / 2.5 / 4 / 6 | — | repeats |
| Health, Crit, Mending Potion | 1 | — (one per 3-day window) | repeats |
| Restock | 0.5 | ×2 per restock that day | repeats |

**Talent ranks:** the gold part no longer climbs with ranks bought; the gems do that (2/3/4/5 bands, unchanged). Ranks 1–3 stay gold only. The price is read at the current boss, like every other gold price. At about one rank per level and about 1.1 bosses per level, the tree takes roughly a third of a climb's gold.

**Steep climbs** (reroll, Overdrive and enchant all ×2) give the last climbs somewhere to put their gold. Enchants run 3, 6, 12, 24, 48…, so the fifth or sixth is always out of reach; the endless Mythic climb can't max them.

**Time to earn** (a good player, climb III where the factor is 1): Health Potion ~1 day · reroll ~2 · rare ~2.5, epic ~4 · 1st enchant ~3, 2nd ~6, 3rd ~12 · slots ~2, 4, 6, 8 days · talent rank ~half a day. Climb I runs about 20% faster, climb V about 20% slower.

**Health Potion shows its heal in HP** ("Heal 2,400 HP", not "Heal 25% of max HP"), so its rising price reads as a bigger potion. *My call*, agreed in passing.

## 6. The climb model

A good player: prestige at about days 45, 100, 165, 240 and 325 (the gem spec's pace), one talent rank per level gained, about 0.4 Health Potions per 3-day window, no deaths. Gold = boss kills + purse, in kills. Core = 4 slots, the climb's talent ranks, potions (0.4 per whole 3-day window: floor(days / 3) × 0.4), 2 rerolls (on different turns, 2 each), 1 enchant. Extras are bought in this order after it, while gold lasts: 2nd enchant (6), Overdrive (5), a 3rd reroll (2), rare, rare, epic, rare (2.5 / 2.5 / 4 / 2.5), 3rd enchant (12), 2nd Overdrive (10), epic (4). That full list is 50.5 kills.

| Climb | Days | Bosses | Ranks bought | Gold earned (kills) | Spare after the core | Extras it buys |
|---|---|---|---|---|---|---|
| I | 45 | ~34 | 29 | 43 | 6.3 | a 2nd enchant |
| II | 55 | ~44 | 39 | 55 | 7.4 | a 2nd enchant |
| III | 65 | ~52 | 49 | 65 | 5.1 | Overdrive |
| IV | 75 | ~62 | 46 | 77 | 10.0 | a 2nd enchant, a 3rd reroll |
| V | 85 | ~72 | 0 (tree full) | 89 | 36.0 | most of the list; the 3rd enchant and on out of reach |

**A realistic run** (the same player with 2, 3, 3, 2 and 2 deaths, each taking about 0.8 of a kill: 25% of the ~3 kills usually carried):

| Climb | Ends | Has at the end | Spare after the core |
|---|---|---|---|
| I | day 45, L30 | 8 slots · talent rank 29 · 1 enchant · 2 rerolls · ~6 potions drunk | 4.2: a rare and a reroll |
| II | day 100, L40 | 8 slots · rank 68 · 1 enchant · 2 rerolls · ~7 potions | 4.7: a rare and a reroll |
| III | day 165, L50 | 8 slots · rank 117 · 1 enchant · 2 rerolls · ~8 potions | 2.7: a rare, or a reroll |
| IV | day 240, L60 | 8 slots · tree full (163) · 1 enchant · 2 rerolls · ~10 potions | 8.5: a 2nd enchant and a reroll, or two epics |
| V | day 325, L70 | 8 slots · 2–3 enchants · 1–2 Overdrives · rerolls · ~11 potions | 34.6: the 4th enchant (24) still out of reach |

The real player trades the listed extra for one or two others (a rare and an epic instead of a 2nd enchant, say). Deaths take 25% of carried gold, so a player who dies or misses often covers the core and little else; they also need more potions. That's the intended squeeze for an inconsistent player.

## 7. Budget test

`economy.spec.ts` pins the §6 model, the way it pins the gem budget: for each climb I–V, the gold earned (bosses + purse, in raw kills, no rounding) divided by the price factor covers the core, and doesn't cover the core plus the full §6 extras list (a choice is always left). The test carries its own climb table (days, bosses, ranks), so it fails if a price, the purse or the factor moves too far. *My call:* it pins only those two bounds; §6's "Extras it buys" column is illustrative (its margins are under a kill), not a target.

## 8. Approaches considered

- **A share of the whole wishlist** (two thirds of everything): dropped for the core-plus-extras rule; a share of a catalog breaks as the catalog grows, and players only want their build.
- **Tree ranks at one level's gold** (the gem spec's line): the tree would take all the gold.
- **Trial gold** for the easy and medium trials: fixed climb I, but did nothing for later climbs. Not needed once prices rise per prestige.
- **Tree gold rising in bands per rank:** kept climbs II–IV tight but couldn't touch climb V, where the tree is already full.
- **Boss gold dropping per prestige:** the same maths as rising prices, but players would see boss 1 pay less after a prestige, which works against prestige feeling big. Rejected for rising prices.
- **Generous early, tight late within each climb** (prices rising a little faster than boss gold near the prestige bar): raised, not picked. Left open; it can be added on top later.

## 9. Left to the builder

- Where the price factor lives (a helper next to `bossGold`, reading the account's prestige rank) and how it reaches each price; `nextTalentCost` needs the current boss and the prestige rank now.
- Rounding stays `roundPrice` (nearest 5, never under 5), applied after the factor.
- Prices already locked into today's shop stock keep their price; the next draw uses the new rules.
- Saves keep the ranks, slots and enchants they bought; nothing is refunded.
- Stale comments: `constants/economy.ts`'s header ("placeholders until the gold balance") and the gem spec §8 gold line point here once it's built.
