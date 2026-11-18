# Gem economy — design

Every gem source and every gem price, tuned against a timeline. Decided with the user 2026-11-17. Replaces the placeholder gem numbers in `constants/economy.ts` and the "prices and the gem budget" open question in `docs/ideas/2026-11-13-shop-economy.md` §12. Gold is not balanced yet (see §8).

## 1. Why

The currency systems are built, but every gem number was a placeholder. The gem economy should:
- give a new player a taste early (a revive in week 1, a first skin around the first prestige),
- squeeze in the middle climbs, so gems feel scarce just before each prestige and plentiful just after,
- let a free player finish the whole talent tree and own about one skin in the first year,
- never become a wall: a free player who keeps playing always gets there in the end,
- give paying players sinks that never run out.

**Anti-goals:** a free player stuck for good; gems that pile up unspent; money buying skill ranks or anything that replaces doing the habits.

## 2. Balanced by time

Prices are set from a timeline, not a lifetime total. The pace this design assumes for a good player:
- **One talent rank per level gained.** Prestige sends the hero back to level 1, so every climb counts: five climbs (to 30, 40, 50, 60, 70) are 245 levels against 163 ranks.
- **Prestige at about days 45, 100, 165, 240 and 325** (climbs of about 45, 55, 65, 75 and 85 days). The user's own play (level 24 in 29 days, no EXP potion) is on this curve.

Both are targets the EXP and gold balances must hit (§8).

## 3. Sources

Every source except the perfect week pays once per account.

| Source | Breakdown | Gems |
|---|---|---|
| Trials | 15 easy × 5, 10 medium × 10, 5 hard × 20 (see below) | 275 |
| Level milestones | L5, L10, L15, L20: 4 each · L25, L30, L35, L40: 8 each · L45 to L70 every 5: 12 each. Paid on the best level ever reached | 120 |
| Prestige | 80 at each of the 5 ranks | 400 |
| Free dungeons | 2 dungeons × 50. Bosses 1–6 pay 4, 5, 7, 9, 11, 14 (first clear only) | 100 |
| **One-time total** | | **895** |
| Perfect week | 2 gems, every week, for good | repeats |

**Trials** are front-loaded: the 15 easy ones land in a good player's first ~10 days, the medium ones in days 10–60, and the 5 hard ones spread across months 3–12. That's 30 trials, up from 17. The trial list itself is a separate rework; this sets its total and shape.

**Perfect week** (the one source that never runs out, so a long-time free player is never at zero for good): a calendar week in which every due daily and weekly skill was checked. Bad habits don't count against it, and frozen days are skipped. At most about 104 gems a year; a good player earns about 52. *My call:* the definition. *Left to the builder:* when and how it's paid and shown (in the house terse style).

**Paid dungeons** should pay more than a free dungeon's 50. Settled with the dungeon design.

## 4. Costs

| Cost | Price | Kind |
|---|---|---|
| Talent ranks 1–3 | gold only | once |
| Talent ranks 4–20 | 2 gems each (34) | once |
| Talent ranks 21–40 | 3 each (60) | once |
| Talent ranks 41–60 | 4 each (80) | once |
| Talent ranks 61–97 | 5 each (185) | once |
| Deeper roots I, ranks 98–130 | 5 each (165) | once |
| Deeper roots II, ranks 131–163 | 5 each (165) | once |
| **Whole tree** | **689 gems** (base tree 359) | |
| Hero skin | 120 | once each |
| Home / arena skin | 90 | once each |
| Revive | 15, once per boss | repeats |
| Streak freeze | 2 a day (daily skill), 5 a week (weekly skill) | repeats |
| Vault and shop gem items | rare 6, epic 12, relic 20 | repeats |
| Gold Pouch | 15 gems for 3 boss kills' gold, once a day | repeats |
| EXP Potion | +25% EXP for 3 days, 5 gems | repeats |
| Double EXP | +100% EXP for 3 days, 25 gems | repeats |

The tree's gold costs are unchanged here. They belong to the gold balance.

**EXP potions move to gems.** EXP is the main speed knob: levels drive tree ranks, prestige timing and level gems. The EXP Potion was a gold tonic priced at one boss kill's gold, cheap enough to run all the time. Now both potions cost gems. Free players use them now and then, for example to push for a prestige bar; paying players can keep them running (about 50 or 250 gems a month), which gives them a sink once their tree is full. Double EXP costs a little more per day of EXP gained, on purpose. Only one EXP boost is active at a time, as with the other boosts: buying one replaces the other. The October balance sim ran +100% EXP and fights stayed steady (about 1.4 days a boss), so Double EXP can't run away. Crit and heal boosts stay on gold, since they're power for this run, not faster progress.

## 5. The timeline

A good free player, front-loaded trials, perfect weeks half the time, every gem not spent on the tree counted as spare. From a rough day-by-day model; it ignores deaths. Spare is measured just after each prestige payout, so the squeeze just before each one is a bit tighter.

| When | Tree rank | Earned | Spent on tree | Spare |
|---|---|---|---|---|
| Week 1 | 4 | 57 | 2 | 55 |
| Month 1 | 19 | 135 | 32 | 103 |
| Prestige I (day 45) | 29 | 263 | 61 | 202 |
| Prestige II (day 100) | 68 | 467 | 214 | 253 |
| Prestige III (day 165) | 117 | 599 | 459 | 140 |
| Prestige IV (day 240) | 163 (full) | 785 | 689 | 96 |
| Prestige V (day 325) | 163 | 921 | 689 | 232 |
| Year 1 | 163 | 947 | 689 | 258 |
| Later years | | +about 52 a year | | |

The shape this gives:
- **Week 1:** a revive, with the tree on pace.
- **Prestige I:** a hero skin, with the tree still on pace.
- **Prestige III–IV:** the squeeze. A player who spent the early surplus on skins feels it here, and their tree runs a couple of months behind until they earn it back. Their gold flows to the Shop meanwhile, as the shop economy plan intends. That's also where buying gems makes sense.
- **After the ladder:** only perfect weeks, about one skin every two years, unless new content (dungeons, trials) adds gems.

## 6. Budget test

`economy.spec.ts` pins the rule: the one-time gems (895) cover the whole tree (689), one hero skin (120) and two revives (30). That's 839, with 56 to spare. Perfect weeks are left out of the test.

## 7. Approaches considered

- **Lifetime totals** (the first pass): tune so everything sums to an exact total. Dropped because it hid the timing: gems arrived early while the tree's gem costs came late, so a tight total still felt flooded early and dry later.
- **Strictly finite gems** (the shop plan's original rule) **vs a capped habit drip.** The user picked the drip (the perfect week). A purely finite supply leaves a long-time free player at zero forever, which falls hardest on the streak freeze, the one fair way to keep a streak through a trip.
- **Tree price:** 871 and 805 (top ranks at 6–8 gems) made a wall at prestige IV once the pace was one rank per level. 509 never squeezed. 689 squeezes without a wall.
- **Gem sources:** prestige ran between 50 and 100 a rank, and dungeons between 50 and 100 each. The settled split leans on trials (front-loaded) and prestige.
- **Gold EXP Potion kept beside a gem one:** dropped, since it would let gold buy the speed-up.

## 8. Left for other work

- **The EXP and boss-curve balance:** hit the §2 prestige pace.
- **The gold balance:** done, see `2026-11-17-gold-economy-design.md`. A rank is half a boss kill of gold, not a level's gold (that left nothing for the shop); steep service climbs replace the EXP Potion as gold sinks.
- **The trial rework:** 30 trials in the §3 shape, totalling 275.
- **The dungeon design:** free dungeons pay §3's amounts; paid dungeons pay more.
- **Gem pack prices** (real money), once the backend exists.

## 9. Left to the builder

- Level milestones now run to level 70. *My call:* milestones a save has already passed aren't repaid at the new amounts. `recordLevel` already only pays levels above `highestLevel`.
- Saves that bought the old gold EXP Potion keep it until it runs out.
- The Gold Pouch, Vault and skin prices change only in constants. The UI already reads them.
