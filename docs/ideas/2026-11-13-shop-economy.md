# Shop and economy plan

Status: agreed plan (2026-11-13). Not built. Numbers are examples to show the shape, not tuned.

Replaces the earlier drafts `2026-11-10-shop.md` and `2026-11-10-monetization-models.md` (Embers are dropped). The Shop | Vault tab mock is `docs/mockups/shop-tab-2.html`.

---

## 1. The shape

- **Gold** is the everyday currency. It comes from bosses, it's lost on death, and it buys things for this run plus the early talent tree.
- **Gems** are the scarce currency. The free supply is finite and tuned exactly. They're kept forever and buy lasting things, revives and a few special items.
- **Real money** buys content packs (the best deal) and gems (for big spenders).
- **Death resets the run**, but the talent tree is permanent. Gold that isn't spent before you die is gone, so players turn it into tree nodes. Every run leaves you a little stronger. (This is the Rogue Legacy loop.)
- Nothing random is sold. No loot boxes, ever.

---

## 2. Real money

| Product | Type | Notes |
|---|---|---|
| Dungeon packs | One-time unlock | The best value: new content, a new relic and lots of gems (first clear). The main buy for low spenders. |
| Character packs | One-time unlock | New hero classes. |
| Gems | Used up | Deliberately worse value than dungeons. For players who want lots of skins. |

---

## 3. Gems

### Where gems come from (finite)
Every source pays once per account, so the total free supply is known and tunable.

| Source | Notes |
|---|---|
| Trials | Trials become one-time achievements (see §7). |
| Dungeon first clear | Each dungeon boss pays a set amount, rising through the dungeon. Replays pay gold and the relic, no gems. |
| Level milestones | Paid on the **highest level ever reached**, not per run, since levels reset on death. |
| New content later | New dungeons or trials can add more free gems. |
| Purchase | Gem packs, and gems inside dungeon packs. |

**Free budget:** enough to finish the whole talent tree, plus about one skin and a couple of revives or streak freezes. Free players can finish the tree. Paying players get there faster and get more cosmetics.

Once a long-time player has earned every free gem, new gems come only from new content or buying. That's intended.

### What gems buy (the Vault)

| Item | Kept? | Notes |
|---|---|---|
| Talent tree nodes (higher up) | Kept | Gold + gems, see §5. |
| Revive | — | One fixed price that never climbs. Maybe one per boss. Offered on the death screen. |
| Streak freeze | Kept until used | Set up **in advance** (vacation, sick day). Frozen days don't add to the streak. It never saves a streak after a miss. |
| Hero skins, base hero skins, arena skins | Kept | Cosmetic. |
| A few rotating rare items | This run | Lost on death. Should come back into the rotation later (open, see §11). |
| A couple of shop-exclusive items | This run | Something for paying players to spend gems on. |
| Gold | This run | A poor exchange rate, shown clearly, so free players don't spend the gem budget meant for the tree. Capped (for example once a day, or a set amount per run) so money tops gold up but can't buy the gold skins outright, and boss kills stay the main source of gold. |

---

## 4. Gold

### Where gold comes from
| Source | Notes |
|---|---|
| Boss kills | The main source. Boss kills come from doing habits, so gold follows real behaviour. |
| Some trials | Some trials pay gold instead of gems. Every trial also pays EXP. |
| Dungeon bosses | A set amount, rising through the dungeon. Paid on replays too. |

### What gold buys (the Shop)

| Item | Kept? | Notes |
|---|---|---|
| Talent tree nodes (early) | Kept | Gold only at first, see §5. |
| A handful of basic items | This run | |
| One rarer item a day, rotating | This run | |
| An epic or relic, now and then | This run | One at a time, only some days, expensive (a few bosses' worth of gold). Something to save for and a reason to check daily. |
| Health potion | — | Long cooldown. |
| Streak freeze | Kept until used | Maybe. Long cooldown. Same in-advance rule as the gem freeze. |
| Skill damage-type reroll | This run | Pick the skill. |
| Overdrive | This run | Pick the skill. |
| Item slot increases | This run | Per run, sold for gold. |
| Enchant an item | This run | Pick the item. The price climbs steeply with each enchant. A main gold sink, since it grows with every item equipped. |
| Item upgrade | This run | Raise an equipped item one rarity, or reforge its stats. Steep price. |
| Crit boost, heal boost, EXP boost | This run | One of each active at a time. Cheap, bought again and again. |
| Restock the shop | — | Redraw the stock, including the chance at the epic or relic. The fee climbs with each restock. |
| A few gold skins | Kept | Very expensive: something for maxed veterans to grind for. Priced to be affordable within one long run, since gold is lost on death, so owning one shows a long run without dying. Gold-only designs that read as grind badges; the best-looking skins stay gem-only so skins still lure towards gems. |
| Others later | | |

**Never sold for gold:** gems (it would break the finite gem supply) and skill ranks (they stay honest streak rewards).

Everything is used **immediately** on purchase. There's no inventory, matching the current rule that unequipped items are dropped.

---

## 5. Talent tree

- **No more points from levels.** Nodes are bought.
- **Every node is permanent.** It's kept through death.
- **Gold first, gold and gems higher up.** The gem cost should kick in fairly early.
- **Gold is the bulk of every cost, and gems are a small key.** Example: node 1 is 100 gold, node 2 is 200 gold, node 3 is 300 gold, node 4 is 1 gem + 500 gold, and a high node is 3 gems + 2,000 gold. Gems set how far you can go, but each step still takes a lot of gold. Once a veteran has spent every free gem, the gold costs are what's left to grind.
- **Modest percentage power only.** Even a maxed tree gives modest % bonuses, never flat ones. A veteran's real power comes from skill ranks, which is fine.
- The gem cost is the valve between the tree and the gold shop. When a player runs out of gems for the next node, their gold flows to the shop. Tree and shop prices pull from the same gold income, so they're tuned together.
- The talents page must make it clear that upgrades are permanent.

General rule for players: gems usually buy lasting things, gold usually buys run things. It's not strict (the tree is permanent and costs gold, and some Vault items are run-only), so every item says which it is.

---

## 6. Death

**Death resets the run.**

| Lost | Kept |
|---|---|
| Gold | Talent tree |
| Items and relics | Skill ranks and streaks |
| Level | Gems |
| Item slots | Skins |
| Run buys (Overdrive, rerolls, gem-bought items) | Finished trials |
| | Dungeon unlocks and first clears |
| | Unused streak freezes |

The death popup's line ("Your skills keep their power") still fits. A revive (gems, fixed price) is offered on the death screen.

---

## 7. Trials

- **One-time achievements.** Finish one and it's done for good.
- **Rework the list:** many easy ones with small rewards, and fewer hard ones that pay more as they get harder. The total gem payout is part of the finite budget.
- **Rewards:** gems from most, gold from some, EXP from all.
- **No more relics from trials.**
- **Where they live:** under the cog button (already moved). The Trials tab becomes the Shop.

---

## 8. Dungeons

- A series of about 6 hard bosses.
- Each boss drops a set amount of gold and gems, rising through the dungeon. The last boss drops a relic.
- Some dungeons are free. The rest are sold as packs.
- Replayable for the gold and the relic, since relics are lost on death. Gems are first clear only.
- A replay costs a gold entry fee, so the relic farm pays for itself.

---

## 9. Items, relics and drops

- **Drops get rarer** to make up for players being able to buy items.
- **Relics mostly come from dungeons.** Maybe also the occasional shop relic, or very rare drops. Still to work out (§11).
- Losing a gem-bought item on death should be clear before the player buys it.

---

## 10. Backend

**Why one is needed.** Apple and Google restore one-time unlocks (dungeons, character packs) on a new phone, with no server. They don't track a gem balance, so bought gems that live only on the phone are lost on reinstall. The permanent tree, finished trials and earned gems are also months of progress, so a lost save now hurts free players as well as paying ones.

**Cost.** Small. Cloudflare Workers + D1 (next to the planned analytics) has a free tier, with a paid plan around $5 a month. RevenueCat is free up to a revenue threshold. Check current prices before relying on these.

**Two phases:**
1. **No server.** Sell dungeons and character packs only. Gems are earned in-game, not sold. Back up the save with the phone's own cloud backup (iCloud or Google).
2. **Server.** Sign-in, cloud save and a gem ledger. Then gem packs go on sale.

Saves already go through the store layer, so phase 2 swaps the storage without touching the UI.

---

## 11. Open questions

- **Relic sources:** dungeons mostly. Shop, very rare drops? How many dungeons are needed to cover the 17 relics?
- **Gem-bought items lost on death:** do they come back into the rotation later?
- **Gold streak freeze:** sell it at all? Since buys are used immediately, a freeze would be set up when bought.
- **Revive limit:** one per boss, one per run, or no limit at a fixed price?
- **Level-up events:** Overdrive, reroll, item slots and heal move to the shop. Do level-up events go away entirely?
- **Special and Ult:** leaning towards handing them out automatically at set levels (maybe 5 and 8), because they're a fun mechanic every player should get to use. The alternative is selling them for gold in the shop.
- **"Kept" vs "This run" on each item:** how it looks. Visual pass later.
- **Prices and the gem budget:** not tuned. Needs a rough budget (free gems in, gem costs out) before building.

### Parked ideas
- **Gold skill.** A rare new habit skill (maybe a 5% roll on a new skill) that earns gold instead of dealing damage or healing. Gold per check would scale with the boss number. Fun, but not planned yet.
- **Merchant upgrades.** Permanent shop improvements bought with gold, such as one more stock slot or slightly better odds on the daily rare. Kept through death like the tree.
- **Tree respec.** Refund talent nodes and move them, for a climbing gold fee.

---

## 12. Decisions log (2026-11-13)

- Death resets (picked over "death is a setback").
- Free gems finish the whole tree, plus about one skin and a couple of revives or freezes.
- Rare and shop-exclusive items stay in the gem shop, even though they're lost on death.
- Revives are a fixed price that never climbs.
- Streak freezes are set up in advance and never add to the streak count.
- Level-up talent points are removed. Level milestones pay gems instead (finite).
- Trials become one-time achievements.
- Item slots are per run and sold for gold.
- Epics and relics can appear in the gold shop, one at a time, expensive and not every day.
- Dungeons are the most money-efficient purchase. Buying gems directly is for big spenders.
- Every talent tree purchase is permanent. The tree costs gold first, then gold + gems.
- The tree gives modest percentage power only.
- Purchases are used immediately. No inventory for now.
- The Phoenix Feather is removed. Revives are sold for gems instead.
- More gold sinks: enchanting (back from the Nov 10 draft), item upgrades, crit/heal/EXP boosts, shop restocks and a dungeon replay fee.
- Tree costs are mostly gold, with gems as a small key.
- A few very expensive gold skins, affordable within one long run, different from the gem skins.
- Gems can buy gold at a poor, capped rate.
- Rejected: boss prep (paying gold to weaken the current boss), gold-to-gem conversion, skill ranks for gold.
