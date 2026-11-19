# Run sim (real engine) — design

2026-11-18. A reusable balance sim that plays believable, ballpark runs on the real game engine.

## Why

Balance questions keep coming up: unlock pacing, prestige day, death loops, and now a faster EXP curve. The old model (`scripts/balance-sim.mjs`) copies the rules by hand and has drifted from the game (20% level-up heal against the game's 10%, its own stat growth, no item drops). This sim calls `src/game-engine/` directly, so any retune shows up in sims without touching the sim.

## Goals

- Play runs for four players: good, decent, sloppy (the old profiles), and bad (50% of habits done each day).
- Vary habit count, tasks done per week, days, seeds and hero class.
- Use real strikes, misses (with the daily falloff), boss kills, EXP, level rewards (Special/Ult), item drops, deaths (setback), Doom, Ember Heart regen and tasks.
- Give a believable player: class-fitting gear, some utility items, talent buys, health potions when low, slot upgrades at set points.
- Apply "what if" tuning from the command line (`--set KEY=VALUE`) and compare it with the current tuning in one table.
- Print one fixed report (unlock days, prestige day, deaths, kills by prestige, level on set days, gear rarity on day 30) and save it as JSON.

## Non-goals

- Exact play. It's a ballpark.
- Gems, services other than slots, skins, trials, the perfect week, shop stock and prices, revives, freezes, Overdrive, undo.
- Prestige itself: the run stops being measured at the first prestige bar (it keeps playing to `--days`).

## Anti-goals

- Re-implementing combat or EXP rules in the sim. Anything the engine has, the sim calls.
- A sim too slow to run on a whim: a full default set should finish in about a minute.

## Approaches

- **A. Real engine (picked).** A Node script (run with `vite-node`) drives the engine functions in a daily loop, with simple player rules around them. Follows every retune and uses the real items and talents. Costs: the day turnover from the composables (`useDailyRollover`, `useMissedSkillsGate`, `useCombatActions`) is rebuilt in the sim, and runs are slower than the toy model.
- B. Extend the old model: fastest, but every rule is a copy that drifts.
- C. Old loop reading real tables: less drift, but combat still copied.

The user picked A: accuracy first, speed a moderate priority.

## Decisions (the user's)

- Players good, decent, sloppy, bad (50% a day). Tasks per week variable.
- Gear: optimal for the class (a mage keeps magic gear, drops physical), keeps about 1–3 EXP/tank/support items, swaps for higher rarity.
- Shop as one extra boss drop per kill instead of simming the shop.
- Health potions bought now and then when low.
- Talents bought, mostly damage, some tank and support, at random.
- A couple of slot upgrades at set points; other services ignored.
- No gem tracking.

## Calls made in the build (mine)

- **Talents from real gold:** a set share of each kill's gold (`--talent-share`, default 0.6) goes to talents at the engine's real prices; the rest stands in for the shop drop and potions. A gold rebalance then moves talent counts by itself. Pick order: damage shoot mostly (about 70%), tank and support for the rest, at random among buyable nodes.
- **Gear score:** each item's bonuses weighted by what the hero's habits use: a damage stat counts by the share of habits of that type, allDamage by all damage habits, health and healing at fixed lower weights, signature effects a flat bonus by rarity. Utility slots (1 at 4 slots, 2 at 6, 3 at 8) take the best non-damage items. Ties go to higher rarity.
- **Potions:** a Health Potion (`DRAUGHT_HEAL_PCT`) when HP falls under 30%, at most once per potion window (`POTION_STOCK_DAYS`).
- **Slots:** upgrades at bosses 8 and 20 (`--slots`).
- **Day order:** the day's checks and task completions in random order, then the turnover: rewards for bad habits held, then misses (each hit softer by the falloff), quest misses, Doom, regen, death check. Bad habits: given in at the player's miss rate.
- **Habits:** daily habits at random difficulty, made as the app makes them (`createHabit` with the class, healing capped), plus 2 bad habits (`--bad-habits`). No weekly habits yet.
- **Run it:** `npm run sim`, options in `scripts/sim/run.ts`. Each variant runs in its own processes, so `--set` overrides load before the engine.
- **Classes:** warrior, mage and ranger in turn across seeds.

## Left to the builder

File layout under `scripts/sim/`, report formatting, and the JSON shape.
