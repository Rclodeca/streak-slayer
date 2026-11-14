# Three monetization models

Status: superseded by `2026-11-13-shop-economy.md` (gold + gems; Embers dropped). Brainstorm (2026-11-10). Nothing here is decided or built. Follows the shop draft (2026-11-10-shop.md) and the monetization brainstorm (2026-11-09-monetization.md).

All three share one base game so they compare cleanly; each model only differs in what's sold and how. Prices and earn rates are rough first guesses to show the shape. None of them has been simulated.

---

## Shared foundation (all three models)

### Two currencies, neither sold by default
- **Gold** is for this run only. It's spent in the shop and lost on death.
- **Embers** last forever and are earned only by doing habits well. They tie into the rank embers already on the death screen. Model 1 is the only model that also sells them.

### Gold
| Source | Amount (rough) |
|---|---|
| Boss kill (main source) | 50 + 10 × boss number, ±10% |
| Trial claim | 50, plus its relic |
| Finished quest | 5 / 10 / 15 by difficulty, under the existing weekly taper |
| Level-up | **None**, to avoid the EXP boost → level → gold → EXP boost loop |

### The shop (replaces level-up events)
Level-up now gives a talent point, stats and the 10% heal.

| Item | Gold price (rough) | Notes |
|---|---|---|
| Heal 25% | 80, then ×1.5 each buy | 3-day cooldown; the riskiest item |
| Heal boost, Crit boost, EXP boost | 60 each | One of each at a time |
| Reroll a chosen skill's damage type | 40, then +20 each | |
| Overdrive on a chosen skill | 120, then +60 each | Picking the skill makes it stronger than the random event was |
| Special (from its level) / Ult (from its level) | 250 / 400 | Once per run; you pick the skill |
| Enchant a chosen item | 150, then ×1.6 each | Up to today's cap |
| Item slots 5 / 6 / 7 / 8 | 200 / 300 / 500 / 800 | Per run; replaces the level-7 and level-20 events |
| Stock: 3 items | Common 60, rare 250–400, epic 600+ | Rarity follows the drop odds table. Restocks on each boss kill |

Shop placement on phones: a Hero tab section, plus a "Merchant" button on the boss-kill popup, since that's when gold arrives. No sixth tab.

### Embers
Every source is impossible to farm and comes from real consistency or real progress.

| Source | Embers |
|---|---|
| Streak rank-up: I / II / III / IV / V / VI / VII / VIII | 10 / 15 / 20 / 30 / 40 / 60 / 80 / 100 |
| New personal-best boss | 5, plus 25 at every 10th |
| Trial claim | 15 |
| First clear of a dungeon | 50 |
| Perfect week (every good daily done for 7 days) | 10 |

Rough rate: 40–80 a week in the first months, falling to 20–40 a week later as rank-ups slow down.

### Other shared rules
- **Death.** Lost: gold, items, slots, talents, Special/Ult/Overdrive, level. Kept: ranks, streaks, Embers, cosmetics, unlocked content.
- **Revive.** Costs 100 Embers, **one per run**, and puts a mark on the epitaph ("Rose once"). You come back at 50% HP and the boss keeps its HP. Shown on the death screen as a calm second button, with no timer. The Phoenix Feather is removed.
- **Talents.** Reset each run, as built. Respec costs 30 Embers.
- **Trials.** On a boss kill, a new trial arrives if you hold fewer than 2. The free trials at bosses 5 and 10 stay.
- **Rest days.** Free and planned ahead, about 3 rest weeks a year. Never applied after a miss, not counted in the streak, and marked in the history.
- **Dungeons.** A dungeon is a themed chain of 6 fixed bosses with its own stage, a finishing relic and a special fight such as the Twins.
  - A gate appears on the road every 10 bosses: keep going endless or enter a dungeon.
  - Dungeon bosses use the normal boss-number scaling, so no separate scaling is needed.
  - Dying in a dungeon ends the run.
  - The 18 existing stages become 3 starter dungeons.

---

## Model 1: Currency (Embers can be bought)

**Pitch:** everything is earnable by playing well, and money is a shortcut. One currency, one store, no subscription.

### What's sold
Ember packs (rough):

| Price | Embers |
|---|---|
| $0.99 | 100 |
| $4.99 | 550 |
| $9.99 | 1,200 |
| $19.99 | 2,600 |

There's also a one-time **Starter Bundle** for $2.99: 500 Embers plus the Ranger. It's sold once, shown after boss 3.

### The Ember catalog
This is where the model lives or dies.

| Category | Items | Price in Embers |
|---|---|---|
| **Content** (permanent unlocks) | Dungeons 4+ | 300 each (starters free) |
| | Classes: Ranger, Paladin, Necromancer, … | 400–600 each (Warrior and Mage free) |
| **Run help** (consumable) | Revive | 100, 1 per run |
| | Shop restock | 15 |
| | Talent respec | 30 |
| **Cosmetics** (permanent) | Hero dyes | 60 |
| | Banner cloth | 80 |
| | Portrait frames | 80 |
| | Epitaph styles | 100 |
| | Death scene variants (the hooded-figure scenes) | 100 |
| | Boss-stage skins | 150 |
| | Extra themes (today's themes stay free) | 200 |
| **Not for sale at any price** | Gold, permanent power, talent points, lasting slots, streak anything | — |

### How earning compares to prices
- A dungeon is about 5–6 weeks of play. A class is about 2–3 months.
- A revive is about 2 weeks. Runs last weeks, so earned Embers usually cover it.
- Buying is a shortcut, never the only way.

### Why people keep paying
- Cosmetic collection across dyes, cloth, frames and stages. The banners and shines are already code, so most of it is cheap recolors.
- Content released slowly: a new dungeon or class every few months, priced in Embers.
- A revive late in a deep run. This is the moment of greatest pull.

### Game changes needed
- Shared foundation.
- An Ember ledger on a server.
- A store screen.
- Hooks for cosmetic slots: dye, frame, epitaph style, death scene.

### Infrastructure and ongoing work
- **A server is required.** Apple and Google don't restore consumable purchases, so bought Embers must live on a server tied to an account. Otherwise reinstalling wipes them and refund requests follow.
- Sign in with Apple/Google.
- RevenueCat (or similar) for purchase receipts.
- A Cloudflare Worker + D1 ledger. It can sit next to the planned analytics.
- **Ongoing:** price tuning, earn-rate tuning, support tickets ("my Embers vanished"), plus new cosmetics and content to keep the store fresh.

### Risks built into the design
- **Weak repeat demand on purpose.** With power off the menu, money comes from cosmetics and unlocks. Cosmetics only sell when someone else sees them, and today nobody does.
- **Pressure to slow earning.** Once Embers are both earned and sold, every slow week tempts you to stretch earning out so buying looks better. Players notice this quickly.
- **Revenue swings.** A few big buyers carry the revenue. A solo dev's income would jump around.
- **No loot boxes ever.** Random packs mean odds disclosure and bans in some countries.

### Open questions
- Should classes be sold directly for cash too, outside the currency? This is a common hybrid.
- Can restock or respec be bought before day 1 of a run, or only mid-run?
- Does the Starter Bundle include a dungeon or a class?

---

## Model 2: Pro subscription (no currency sales)

**Pitch:** the base game is complete and generous. **Pro** is the living game: a new season every 3 months, a small monthly gift, co-op, deeper stats and sync. Embers exist but are never sold.

### Price
- $3.99/month or $24.99/year, with a 7-day free trial.
- Optional lifetime at about $59. It caps your upside, but some players want it.
- No ads.

### Free vs Pro
| Free (forever) | Pro |
|---|---|
| Endless mode | Seasons: every ~3 months, one new dungeon with its own relic and special fight |
| Warrior, Mage, Ranger | Back catalog of every past season's dungeon |
| Full talent tree | A new class every ~2 seasons (Paladin, Necromancer, …) |
| Gold shop, Embers, the one revive | **Monthly gift:** one cosmetic (dye, cloth or frame), claimable only that month |
| 3 starter dungeons | **Pro mode:** Ascension levels, harder modifiers, marked on the epitaph |
| All habit types | Co-op party boss (host needs Pro, friends join free), later |
| Rest days | Deep stats: heatmaps, best/worst weekdays, which habits cause deaths |
| Basic stats (current streaks, last 30 days) | Cloud sync across devices |
| Save export/import | |

### The monthly gift is the hook
- It's Habitica's mystery-set idea at recolor cost.
- Seasons are too slow to justify a monthly charge on their own. The gift gives every month a visible "you got something."
- Missing a month's gift is fine. Older gifts don't come back, which creates a gentle sense of scarcity.

### When Pro lapses
**Never hold habits hostage.**
- Claimed cosmetics stay.
- A Pro dungeon in progress can be finished. New Pro dungeons are closed.
- A Pro-class run plays out. The next run picks a free class.
- Sync stops, local data stays, and export always works.
- Deep stats are hidden but the data is kept, so they come back if Pro is renewed.
- Ascension marks already on epitaphs stay.

### When to offer the trial
- At the first season gate (boss ~10), after the player has cleared a free dungeon and knows what one is.
- On the death screen? **No.** Never sell at the moment of death.

### Why people keep paying
- The season gives a reason to come back.
- The monthly gift makes each charge visible.
- Co-op makes friends part of the reason to stay. That's the strongest pull, but it comes later.

### Game changes needed
- Shared foundation.
- Entitlement checks with an offline grace period of about 7 days.
- Season content pipeline.
- Ascension modifiers.
- Analytics views.
- Sync.
- Co-op last.

### Infrastructure and ongoing work
- **A server is required** for accounts, sync and entitlements. RevenueCat for subscriptions. Cloudflare Workers + D1.
- **The content treadmill is the real cost:** 4 dungeons a year plus 12 monthly gifts, and a class every 6 months.
- Recolored elite bosses, boss skills already in the engine, and the existing stages keep each season to maybe 1–2 weeks of work. It's still a schedule you can't miss without a wave of "nothing new, still charging" reviews.
- Support load: cancellations, refunds after a forgotten charge, "Pro didn't unlock".

### Risks built into the design
- Subscription fatigue in habit apps is real.
- The free game has to be good enough to keep people, while Pro still feels worth it. If the free game is too generous, the conversion rate stays very low.
- Solo-dev burnout on a quarterly deadline.
- Co-op is the feature that sells subscriptions best and also the most expensive to build. Without it, Pro is content plus stats.

### Open questions
- Should Pro include a small Ember bonus? Claude's take: no, because that quietly sells currency.
- Lifetime: yes or no?
- Does Ascension belong to Pro or to everyone, with Pro getting extra levels?

---

## Model 3: One-time purchases (no subscription, no server)

**Pitch:** a complete, honest game you buy once, like Streaks on iOS (a one-time ~$5.99 habit app, from memory). The free part is a real habit app forever. The paid part is the rest of the game.

### Products (the whole store)
| Product | Price | What it is |
|---|---|---|
| **Full Game** | $7.99 | Everything below the free line, forever |
| **Supporter Pack** | $2.99 | A dye set, a banner cloth set and a portrait frame set. All recolors, a tip jar for fans |
| **Expansion** (later, optional) | $3.99 each | 2 new dungeons plus 1 class. At most one a year |

All of these are non-consumable, so Apple and Google restore them on a new phone. No server is needed.

### Free vs Full
| Free | Full Game |
|---|---|
| Endless mode, forever | All launch dungeons (about 4 more) |
| Warrior, Mage, Ranger | 2 extra classes |
| Talent tree up to each shoot's midpoint | Upper halves of all three shoots, including the ★ capstones |
| Gold shop, Embers, the one revive | Ascension (harder modifiers, epitaph marks) |
| First starter dungeon | Deep stats |
| All habit types | Full Ember cosmetic catalog (dyes, frames, stage skins, death scenes) |
| Rest days | |
| Basic stats | |
| Save export/import | |

- **What's sealed is visible.** Capstone nodes show as sealed, and the second dungeon gate shows a locked door. Players see exactly what they'd buy, without nagging.
- **Pitch moment:** clearing the first dungeon (around boss 10–16, roughly 3–5 weeks in). By then the habit has stuck and the player knows what a dungeon is.
- Habit tracking never locks.

### Embers stay, earned only
- They pay for the revive, respec and cosmetics. Free players get a small cosmetic set, and Full unlocks the rest of the catalog for Embers.
- Lost phone means lost Embers, but nobody paid for them, so there are no refunds. Export plus native storage with OS backup (Capacitor) covers most cases.

### Keeping it alive without updates
- Endless scaling plus Ascension levels.
- Date-based events from the phone's clock: a Halloween boss recolor, a New Year trial. Coded once, they return every year.
- Trials as lasting achievements.
- About one small rebuild a year for Apple/Google SDK minimums.

### Why people pay
- Curiosity and completeness: sealed capstones, locked dungeon doors, extra classes.
- No repeat pull, on purpose. Revenue comes from new players, not old ones.

### Game changes needed
- Shared foundation.
- A "sealed" state for nodes, gates and classes.
- A store screen with 2–3 products.
- Restore purchases.
- Ascension.
- Analytics views.

### Infrastructure and ongoing work
- No server, no accounts.
- Capacitor in-app purchase plugin or RevenueCat's free tier for non-consumables.
- Ongoing: the annual rebuild, plus optional expansions if sales justify them.

### Risks built into the design
- Low ceiling: about $8–11 per paying player, ever.
- Income depends on a steady flow of new players, which means store discovery and marketing. Habit apps are a crowded category.
- If the free part is too complete, few people buy. If it's too thin, people leave in week one.
- No co-op, social features or sync, so it misses the stickiest habit-app features.

### Open questions
- Where's the free tree line: midpoint, or the ★ capstones only?
- One free dungeon or two?
- A launch discount, say $4.99 for the first month?

---

## At a glance (facts, not verdicts)

| | 1. Currency | 2. Pro subscription | 3. One-time |
|---|---|---|---|
| Sold | Embers (plus one bundle) | Monthly or yearly access | 2–3 unlocks |
| Server and accounts | Required | Required | None |
| Ongoing content | Store refreshes | Quarterly seasons plus monthly gifts | Optional expansions |
| Revenue shape | Swingy, a few big buyers | Steady, recurring | One spike per new player |
| Ceiling per player | Unlimited | ~$25/year | ~$11 |
| Lost-phone story | Server restores Embers | Account restores everything | Stores restore unlocks; Embers via backup |
| Pressure to stretch earning | High | Low | None |
| Social / co-op possible | Yes (has a server) | Yes, it's the big feature | No |
| Biggest build cost | Ledger plus cosmetic catalog | Seasons pipeline plus sync, then co-op | Sealed states plus Ascension |
