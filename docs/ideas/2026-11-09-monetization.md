# Monetization brainstorm

Status: hypothetical brainstorm (2026-11-09). Nothing here is decided or built.

## The rule

Don't fake real life. Anything that only helps the *character* is fair game, even sold: revives (like the Phoenix Feather), HP and EXP consumables, help against bosses. Killing bosses and not dying are just the game.

Never sell anything that makes real habit progress look better than it was. A 50-day streak must mean 50 real days.

## What Habitica sells (for reference)

Prices are from memory and may be out of date.

- **Gems** (real money, about 4 per $1): outfits, backgrounds, quest scrolls (pet eggs), hatching potions (pet recolors), seasonal event outfits, a task reroll, a character restart.
- **Subscription** (about $5/month, cheaper for longer terms):
  - A monthly mystery outfit set you only get if subscribed that month. This is the main hook.
  - Hourglasses to buy past sets.
  - Gems bought with gold, with a cap that grows the longer you stay subscribed.
  - Twice as many daily drops.
  - Longer task history.
- **Group plans** (about $9/month plus about $3 per member): a shared task board for families or teams.

Why it works:
- **Collecting:** hundreds of pets, mounts and outfits.
- **Scarcity:** monthly and seasonal items go away.
- **Being seen:** avatars show in party chat and guilds.

StreakSlayer has none of these yet. Unequipped gear is dropped, nothing is time-limited, and nobody else sees your hero. That's why a Pro made of cosmetics alone feels flat.

## Art cost

Rough market prices, not quotes:

| Art | Rough price |
|---|---|
| Freelance pixel item icon | $10–40 each (100 items ≈ $1–4k) |
| Static character or boss sprite | $50–200 (animated costs much more) |
| Full background scene | $100–500 |
| itch.io asset packs | $5–30 for hundreds of sprites (generic look, check the license) |
| AI art | Cheap. Apple and Google allow it. Style consistency is hard, and some indie players push back. |

A collection loop doesn't need much new art. Most of Habitica's collection is recolors: about 20 base pets times hatching potions, and each potion is a palette swap. Cheap options in code:

- **Hero dyes:** palette swaps of the existing sprites.
- **Elite boss variants:** a recolor plus a name and a modifier.
- **Banner cloth:** colors and patterns (the banners are already code).
- **Shine effects:** like the opal enchanted shine (already code).

## The ideas

### 1. Skill tree — base game (top pick)

- **Name:** "Skills" already means habits, so call it **Talents** or **Path**.
- **What it fixes:** It gives level-ups meaning. If it stays across deaths, it makes dying feel less like losing everything, which is the main reason people quit roguelikes (Hades' mirror works this way).
- **Classes:** It's also how classes could differ: each class gets its own branches.
- **Points or currency:** both. Points at level-up, currency for a permanent tier.

### 2. Currency and shop — base game, don't sell the currency (yet)

- **Earning:** coins come from checking off habits, so doing habits feeds the shop.
- **Why not sell coins:** if coins can be bought, checking a habit pays out less, because money is a shortcut to the same reward. Selling currency also turns every shop price into a real-money decision and means tuning a mobile-style economy.
- **What the shop sells:** consumables, rerolls, permanent talent tiers, cosmetics like dyes.
- **Don't take free things away to sell them.** People notice and hate it. The exception is before the app store launch: that's a fresh start, so rebalance freely then.

### 3. Streak freeze for vacation — free, planned ahead only

- **Honest version:** you set it before you leave ("pause Reading June 3–10"). It never applies itself after a miss. Paused days don't add to the count; the streak just waits.
- **Show it:** mark paused days in the history so the record stays honest.
- **Don't sell it:** charging so a streak survives a vacation feels like extortion (see the complaints Duolingo gets).
- **Sick days:** these can't be planned, so they're the hard case. Leave them out at first.

### 4. Consumables (HP, EXP, temporary boosts) — shop, for coins

- **Balance:** consumables will shift the tuned balance. Price them high or limit how many can be active at once.
- **Shop-only items:** fine too.

### 5. Revives — OK, with limits

They don't fake real life, but dying is the punishment for skipping habits. If you can always buy your way out, the punishment stops mattering and the game motivates less.

Possible limits:
- One revive per run.
- Rising cost for each one.
- A mark on the epitaph showing the run was revived.

Easy revives also make the Phoenix Feather feel less special as a drop.

### 6. Multiplayer — strongest Pro feature, most expensive to build

- **How it works:** a party fights one boss together. Everyone's habits deal damage, and everyone's misses hurt the whole party.
- **Why:** it's Habitica's stickiest feature, because friends see when you slip.
- **Pricing:** "the host needs Pro, friends join free" (like Habitica group plans or Jackbox).
- **Cost:** accounts, sync and a server. The planned Cloudflare analytics setup is a starting point.
- **No chat at first.** Chat means moderation and app store reporting rules. Use preset reactions instead.
- **Cheating:** matters less in small groups of real friends, who keep each other honest.

### 7. Habit analytics — Pro

- **Free:** current streak and the last 30 days.
- **Pro:** heatmaps, best and worst weekdays, trends, how each habit relates to your deaths.
- **Why Pro:** cheap to build (the data is already on the device), doesn't touch the game, and paying for stats is normal in habit apps.

### 8. Two bosses at once — not a standalone feature

- Crowded on a phone screen, and complicated (how do you pick a target?).
- Better as one special fight inside a dungeon ("the Twins").

### 9. More habit types — base game (important)

- **Why base:** the more of someone's real life fits in the app, the longer they stay, and staying is what sells Pro. Locking habit types would make the free app worse at its main job.
- **Counted habits** ("read 20 pages"): damage scales with how much you did. Going past the target gives a small bonus with a cap.
- **Tally habits** (water, no penalty for skipping): need a daily cap, or someone taps 50 times. That's the same crit-fishing the undo rule guards against, so tallies shouldn't roll crits.

### 10. Social profiles — friends only, no public leaderboards

- Scores can't be trusted (anyone can check everything off), so a public ranking would fill with fakes and mean nothing.
- A showcase for friends works: hero, epitaphs, top skills, like a Steam profile.
- It comes along naturally with multiplayer.

### 11. More classes — after the skill tree

- The tree is what makes classes play differently. Without it, a class is just different starting stats.
- Base them on the item rules (magic glass cannon vs physical sustain). Examples:
  - Paladin: sustain and heals.
  - Necromancer: gains power from resisting bad habits.
- Each class only needs one hero sprite, which is cheap. Selling a class (Pro or one-off) is fair, like DLC characters.

### 12. Dungeons and multi-part quests — the best "why keep paying"

- **Dungeons:** themed sets of 5–10 bosses with a reward for finishing. They give structure instead of an endless line of random bosses. The 18 existing boss stages already make about 3 starter dungeons.
- **Pro dungeons:** a new one each season is StreakSlayer's version of Habitica's monthly mystery item: a reason to stay subscribed, not just to subscribe once. Recolored elite bosses keep the art cost down.
- **Scaling:** boss scaling would need to fit inside a dungeon.
- **Multi-part quests:** quests with steps, like a project with subtasks. Base game, not Pro.

## Two models

Model A needs a server and ongoing work. Model B is a one-and-done release with minimal maintenance. Pick one.

## Model A: subscription (with a server)

| Free | Pro |
|---|---|
| Full game, all current classes | Co-op party boss (host pays) |
| Talent tree | Deep analytics |
| Shop, coins, consumables, limited revives | A new dungeon each season, plus a back catalog |
| Counted, tally and multi-step quests | Extra classes |
| Planned rest days | Dyes and banner cosmetics |
| Starter dungeons | Cloud sync |

Rough pricing from the first pass:
- **Pro:** about $2.99/month or $19.99/year.
- **Lifetime:** about $39.
- **No ads.**

Suggested order:
1. **Talents, coins and the shop.** Deepens the base game. Pro can't sell until people love the free game.
2. **Dungeons.** Structure now, Pro content later.
3. **New habit types.**
4. **Multiplayer and Pro,** after the app store launch.

## Model B: one-time purchase (no server)

For a release with minimal ongoing work. No multiplayer, social profiles or cloud sync.

### Why not a subscription here

- **People expect something new each month.** With no server and no new content, Pro would feel like rent, which leads to "nothing new, still charging" reviews.
- **Subscriptions bring their own work:** billing questions, cancellations, refund requests after a forgotten charge.
- **One-time unlocks are simpler.** Apple and Google restore one-time purchases on a new phone themselves, so no server is needed.

### Products

- **Free:** enough of the game to build the habit and get attached.
- **Full Game,** one-time (about $6.99–9.99): everything else, forever.
- **Supporter Pack,** optional (about $2.99): dyes and banner cloth, all recolors, so no new art. A tip jar for fans.

Two or three products at most, all one-time unlocks. Don't sell coins or revives for money: a lost phone would mean lost purchases and support work.

### Free vs Full

| Free | Full Game |
|---|---|
| Endless mode (random bosses that keep scaling, like the current game) | Dungeons (after the first one) |
| The first dungeon, or its first few bosses | Extra classes |
| All habit types (yes/no, counted, tally) | The full talent tree |
| Warrior, Mage, Ranger | Deep analytics |
| The first branches of the talent tree | New Game+ with harder modifiers |
| Shop, coins, consumables | Supporter Pack is sold separately |
| Planned rest days | |
| Basic stats | |

- **Why endless is free:** free players get the full habit loop forever, so the app is useful from day one and habit tracking never locks.
- **Why dungeons are paid:** they're designed content with themes, fixed bosses and finishing rewards, so they're easy to pay for.
- **Habit types stay free:** people decide in the first week whether the app fits their life. If they can't add a water habit, they leave before they ever see the Full Game.

Caveats:
- **Free players need a taste of dungeons,** or they won't know what they'd buy. Trials or the hero level could point them to the free one.
- **Dungeons need something endless can't give:** dungeon-only bosses and stages, an item or relic for finishing each one, themed fights like the Twins. Make it rewards and variety, not raw power, so endless doesn't feel like the weaker version.

### Keeping it alive without updates

- **Endless mode:** bosses keep coming with harder modifiers. The boss scaling already does most of this.
- **New Game+ / ascension:** start over with chosen modifiers, with a mark on the epitaph.
- **Date-based events with no server:** the app reads the phone's date. For example, a Halloween boss recolor in late October, or a New Year trial. Coded once, they come back every year.
- **Trials as achievements:** this layer already exists.
- **Backups:** replace cloud sync with save file export/import (already in the menu) plus the phone's own backup.

"One and done" still isn't zero work. Apple and Google raise their minimum SDK about once a year, and Google hides apps that fall behind from new users. Plan on about one small rebuild a year.

Suggested order:
1. **Talents, coins and the shop.**
2. **Dungeons.**
3. **New habit types.**
4. **The Full Game unlock,** last.

## Rejected or parked

- **Capping free habits at 3–5:** the most common paywall in habit apps. It works financially, but it fights the game, since more habits mean more fighting. Skip it.
- **A Pro made only of cosmetics, sync and insights:** the user said they wouldn't buy it. It needs a reason to come back each month (dungeons) and other people (multiplayer).
- **Selling coins for real money:** parked. Revisit only once the shop economy is tuned.

## Open questions

- Model A (subscription + server) or Model B (one-time, no server)?
- Model B: is the free taste the whole first dungeon or only its first few bosses?
- Should talents stay across deaths, reset each run, or both (two tiers)?
- What exactly is in the shop, and what are the coin sources and sinks?
- Revive limits: one per run, rising cost, an epitaph mark, or a mix?
- Rest days: how many per year? Per habit or all habits? Sick days ever?
- Co-op: how a party boss scales with party size, and what happens when one member dies.
- Dungeons: how many bosses each, what the finishing reward is, and how boss scaling carries between dungeons.
- Which art route: recolors only, asset packs, commissions, or AI?
