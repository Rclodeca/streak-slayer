# Game-balance analytics — design

Date: 2026-11-07
Status: reviewed, cut to the lean first version, awaiting owner approval

## Why

StreakSlayer is live at ryanclode.com/streak-slayer/ with a handful of players:
the owner (playing for real on their phone) and a few friends testing it. Every
run lives only in each player's browser, so there is no way to see how anyone
else is progressing. The owner wants to watch runs to tune game balance: where
people die, what they build, how fast they level, and where they lose interest.

The game ships often with balance changes (lifesteal, true damage, boss
scaling, heal ranks), so the data has to say which build of the game it came
from, or before/after comparisons are meaningless.

**This is a lean first version.** It's a hobby project with only a few players
today. The owner decided to build the smallest thing that answers the balance
questions and starts collecting history before real players arrive:
- a daily snapshot, run start/end, item drops, and the backfill
- the plumbing (IDs, versioning, safety) built properly, so the deferred
  events are cheap to add later (about an hour each)

The scaling and cloud-save sections are notes for later, not work for now.

## Goals

- See each player's runs over time, day by day: how a run progressed, how it
  ended, and whether they started another run after dying.
- See balance data per run: hero class, level, boss reached, character stats,
  gear kept and item drops passed on, skills and ranks, habits by damage type,
  and quests by count and difficulty.
- Capture runs that never end in death: a player who quietly stops playing
  must still leave a record of where they stopped.
- Spot boredom/drop-off: checks per day falling, gaps growing, silence.
- Backfill each player's saved top 10 runs once, so existing history counts.
- Every event tagged with the game build, so results can be split by version.
- Free now, and free for years even at a few thousand players. The
  destination is swappable without touching game code.

## Non-goals

- No dashboard page in this build. Viewing is saved SQL queries (see
  Viewing). A dashboard is a later project.
- No ready-made analytics product (PostHog, Google Analytics, Firebase). The
  owner wants tailored numbers they control.
- No accounts, login, or cloud save.
- No per-check play-by-play feed. Daily counts are enough.
- No per-moment milestone events in this build: level-ups, boss kills, ranks,
  boss skills, and habit/quest/trial events. The daily snapshot shows most of
  them a day late. See Deferred.
- No R2 raw archive, cleanup job, or scaling work in this build.
- No region-specific consent flow yet. That is a decision for a public launch.

## Anti-goals (would make this a failure even if it works)

- **Any player-written text leaves the device.** Habit names, quest
  descriptions, hero names — never. Enforced by construction, not by care.
- **Analytics affects play.** A slow or failing network call must never block,
  delay, or break the game, and must work fully offline.
- **The data can be read by anyone.** The game's public code must only be able
  to write events, never read them.
- **Test play pollutes the data.** Local dev, the test suite, and Playwright
  never send.
- **Ties the app to the desktop browser** or breaks a Capacitor WebView (see
  CLAUDE.md).

## Constraints

- Vue 3 + Vite + Pinia, static site on GitHub Pages, PWA, future Capacitor app.
- Persistence stays behind the store layer; components never call
  `localStorage` or the network for this directly.
- Must work offline: events queue on the device and send later.
- Small: no heavy client SDK.

## Decisions

### Destination: Cloudflare Worker + D1

The owner picked this over Supabase and Firebase.

- The game POSTs batches of events to a small Cloudflare Worker. The Worker
  validates them and writes them to a D1 (SQLite) database.
- The game holds no database key. The Worker is the only thing that can
  write, and it exposes no read endpoint.
- The Worker checks every event against the allowlisted shapes below and
  rejects unknown event types and unknown fields. It also caps request size
  and rate per player ID. Cheap limits are enough for now.
- **Free limits:** 100k rows written per day, and a 500 MB maximum per
  database. Each index adds rows written, so with four indexes one event costs
  about 5 rows.
- **Paid limits:** $5/month gives 50M rows written per month and a 10 GB
  maximum per database.
- **Runway, rough** (one snapshot plus 0–2 other events per active player per
  day, ~20% of players active daily):
  - **Friends, and up to about 1k players:** free for years.
  - **About 10k players:** free on writes. Storage hits the 500 MB free cap in
    a few months, then the $5 plan lasts years.
  - **About 100k players:** see the scaling path.
  - **This build:** none of that. It documents where the limits are. The
    owner decided reaching ~100k now is not a requirement.
- **Swap point:** the Worker. To move elsewhere later, change the Worker to
  forward events. The game doesn't change.
- The Worker and SQL live in this repo (for example `analytics/`), deployed
  with Wrangler separately from the GitHub Pages site.
- **Hosting:** the Worker runs on its free `*.workers.dev` address.
  ryanclode.com's DNS is at GoDaddy, so a route on the owner's own domain would
  mean moving DNS to Cloudflare, which isn't worth it yet.
  - To keep ad and tracker blocklists from catching it, the Worker and path
    are named neutrally (no "analytics", "track" or "telemetry"). For example,
    the Worker could be called `streak-slayer-sync`, with the endpoint at
    `/v1/batch`.
  - The endpoint URL is a build-time config value, so moving to a custom
    domain later is a one-line change.
  - *My call.*
- **Before the native app ships** (the web version on ryanclode.com is
  temporary; the iOS/Android app is the real product):
  - The owner gets a game domain, ideally registered with Cloudflare so its
    DNS is managed there from day one.
  - The Worker gets a custom address on it, for example `api.<game>.com`.
  - The native build points at that address. An app release fixes its
    endpoint for as long as that version stays installed, so the address must
    be permanent before the first store release.
  - The `workers.dev` address keeps working for the web build.
  - The Capacitor origins get added to CORS.
- **Friends moving from the web version to the app** will use Export/Import,
  since app storage is separate. `save_imported` links their web history to
  their app install.
- **Needs from the owner:** a free Cloudflare account, and a logged-in
  Wrangler.

### Identity

- **Two IDs, set up now so cloud saves later don't need a migration:**
  - **`install_id`:** a random UUID made on the device the first time
    analytics runs. It isn't derived from anything about the player.
  - **`player_id`:** for now, always equal to `install_id`. When accounts or
    cloud saves arrive, it becomes one anonymous analytics ID per account,
    shared by all of that account's devices. Even then it is never the
    account ID or email.
  - Queries group by `player_id`, and use `install_id` to tell devices apart.
- **One ID per install, and it does not travel with the save.**
  - Save export (`src/store/saveFile.ts`) is a copy, not a move. If the ID
    travelled, two installs could send as the same player and the timelines
    would mix.
  - Instead, the export file records the exporting install's player ID.
  - On import, the receiving install keeps its own ID and sends a
    `save_imported` event naming the source ID, so queries can join the two
    histories.
  - *My call.*
- **The backfill can't double-count.** A backfilled run's `event_id` is
  derived from its `HighScoreRun.id`, so the same run sent from two installs,
  or twice, is stored once.
- **Short ID shown in the menu** next to the toggle (the first 6–8
  characters). It lets the owner identify their own devices, and a friend can
  read theirs out if their data looks wrong.
- **Run ID:** each run gets a UUID when it starts.
  - It is stored in the **game save** (the character / run state), not in
    analytics-only storage. That way an import or a future cloud save carries
    it, and a run stays one run everywhere.
  - When that run ends, the `HighScoreRun` record reuses the same ID, so the
    high-score entry and the analytics run match.
  - Backfilled runs, which predate this, use the `id` already on each
    `HighScoreRun`.
  - A run already in progress when analytics ships gets an ID on first load.
- **Run number:** counts runs started since analytics turned on, per player.
  Backfilled runs don't get one (the game never counted runs before), so they
  are ordered by `endedDayKey`.

### The owner's own data

- The owner's phone is real play and is **included**, backfill and all.
- Their phone's player ID gets an `owner` tag in the database (not excluded),
  so queries can show results with and without the person who knows every
  mechanic.
- An `ignored_players` table lists IDs to skip, for any laptop test that slips
  through. Saved queries exclude those IDs by default.

### Never sending test data

- Sending is gated by a build-time flag that is on only in the deploy
  workflow's production build. It isn't gated by origin, because a future
  Capacitor app runs from `https://localhost` / `capacitor://localhost`.
- Dev builds, local preview builds, and the test environment never send.
- The Worker's CORS allowlist is the live site origin now. The Capacitor
  origins get added when the app ships.
- In dev, events can be logged to the console instead, so they can be checked
  by eye.
- Unit tests must be able to assert which events fire without any network.

### Toggle and privacy note

- A menu row next to Theme: **Game stats: On/Off**. It's on by default, with
  the short ID under it.
- **Off:**
  - Sends one final `analytics_off` event (envelope only, no other fields),
    so an opt-out isn't misread as a quit. The owner decided this.
  - Then stops sending, drops the rest of the queue, and deletes the player
    ID. If the final event can't be sent right away, it's the one event kept
    and retried.
  - Turning it back on makes a new ID. Backfill does not run again.
- **Deleting a player's data on request** is done by hand by the owner, using
  a saved `delete-player.sql`. There's no in-game delete and no delete
  endpoint, so the Worker stays write-only. The owner decided this.
- One plain line explains it, for example "Sends anonymous game stats. Never
  your habits or quests." Exact copy is the builder's, kept terse per the
  game's text style.
- The owner tells friends it's on.
- **Note for a public launch (not this build):** a persistent ID makes this
  pseudonymous personal data under EU rules. A launch needs a privacy policy,
  app-store privacy labels, and possibly asking first in some regions.

### Version tagging

- The deploy workflow stamps the commit short hash into the build (for example
  via a Vite `define` set from `GITHUB_SHA`).
- Every event carries it as `build`.
- Local builds carry `dev`, but they don't send anyway.

## Events

Every event has a common envelope:

| Field | Notes |
|---|---|
| `event_id` | UUID made on the device. The Worker ignores duplicates, so retries are safe |
| `schema_version` | integer, starts at 1. Bumped whenever an event's shape changes, so old and new rows can be read side by side |
| `install_id` | see Identity |
| `player_id` | see Identity |
| `run_id` | the current run. Absent only where a run doesn't apply |
| `run_number` | see Identity |
| `build` | commit short hash |
| `type` | one of the types below |
| `client_ts` | device time, ISO |
| `day_key` | the game's `dailyPeriodKey` at the moment |
| `received_ts` | set by the Worker, not the client |

Type-specific fields follow. No field anywhere carries free text. Item and
boss identifiers are catalog IDs, never anything typed by the player.

**Common shapes:**
- **Character sheet:** level, EXP, current and max HP, effective
  physical/magic/healing/health/trueDamage, crit chance, equipped item IDs
  (with enchanted flags), max equip slots, and active status effects (for
  example Wounds).
- **Habits summary:** counts by good/bad × daily/weekly × damage type, ranks
  per habit (as a list with no names), and which habits are special, ult or
  overdrive.
- **Quest summary:** open quests by difficulty and overdue count.

| Type | When | Extra fields |
|---|---|---|
| `run_start` | a hero is chosen on the new-hero screen | hero class (and whether it came from the Fate wheel), starting stats |
| `run_end` | the death screen is triggered, before any reset | boss index, boss personality, level, days lived, what killed them (habit miss / quest miss / bad-habit give-in / boss skill), full character sheet, habits summary |
| `item_offered` | an item drop resolves | item ID, rarity, source (boss / quest / trial / event), outcome (auto-equipped / swapped in for X / passed on) |
| `daily_snapshot` | at most once per game day, when the app opens or a day rolls over in a session | boss index, boss HP %, character sheet, habits summary, quest summary, checks done yesterday (good checks, bad give-ins, misses). The yesterday counts may be derived from habit state rather than a new counter; that's the builder's call |
| `backfill_run` | once per player, at first enable | one per saved top-10 run: boss index, boss personality, level, started/ended day keys, days lived, stats, habits (period, damage type, good/bad, streak, rank, **no name**), items (ID, equipped, enchanted, **no name**), hero class |
| `analytics_on` | toggle turned on, or first run | none. Marks the start of the window, which helps read silence |
| `analytics_off` | toggle turned off | none |
| `save_imported` | a save file is imported | the source install's player ID from the file, if present |

Progress and boredom are **derived later in SQL** from consecutive snapshots,
never detected on the device:
- levels and bosses gained between days
- checks per day trending down
- gaps between snapshots
- habit counts flat for a long time
- silence for N days without a `run_end`

## Sending

- Events go into a small queue held by a store (persisted locally, capped at
  for example 500 events with the oldest dropped).
- **Flushes:** on app open, after a batch of new events (debounced), and when
  the page goes hidden (`fetch` with `keepalive`).
- Failed sends stay queued and retry on the next flush. They never throw into
  game code.
- The analytics module is called from the places that already know about
  these moments:
  - `useCombatActions` (death)
  - `useItemDropQueue` (drops)
  - `NewHeroScreen` / `chooseHero` (run start)
  - app start and daily rollover (snapshot)
  - save import
- It builds its own clean events. It never forwards activity-log entries,
  which contain habit and quest text.
- Adding a deferred event later should only mean one new event shape, one
  call at the right hook, and the Worker's allowlist entry.

## Storage (D1)

- One `events` table:
  - Envelope columns are typed columns, with indexes on `player_id`,
    `run_id`, `type` and `build`.
  - Type-specific fields go in a JSON column.
  - `event_id` is the primary key, so duplicates are ignored.
- A `players` table with optional tags (`owner`), and the `ignored_players`
  table.
- The schema is a migration file in the repo.
- Nothing is ever pruned in this build.

## Viewing

Saved queries live as `.sql` files in the repo, run with Wrangler or pasted
into the D1 console. The first set:

1. **Per-player timeline:** runs in order with day-by-day snapshots, plus how
   the run ended, gaps, and whether a new run followed.
2. **Where runs end:** died vs. went silent (no event for 7+ days) vs. opted
   out, by boss index, split by build.
3. **Build picks:** hero class, gear kept, items passed on by rarity, and the
   damage-type mix of habits.
4. **Stats at boss N** by class (for example average stats when reaching
   boss 5).

Also:
- `delete-player.sql`, for hand deletion on request
- `db-size.sql`, the early warning for the free storage cap

All queries exclude `ignored_players`. Queries offer an owner-included and an
owner-excluded variant where it matters.

## Scaling path (not built now; written down so there are no surprises)

The game-side code and event shapes stay the same at every step. Only the
collector and what sits behind it change.

These figures assume the lean event set. Each deferred event added later
moves them toward the bigger figures discussed during design.

| Players (≈20% active daily) | What breaks first | What to do | Rough cost |
|---|---|---|---|
| Friends → ~1k | nothing | nothing | $0 |
| ~10k | 500 MB free database cap after a few months | Workers Paid plan | $5/mo |
| ~10k + time | DB heads toward the 10 GB paid cap over years | add the R2 raw archive, then a nightly scheduled job that rolls raw events into per-player-day and per-run summaries and prunes raw rows older than ~90 days | $5–10/mo, a day or two of work |
| ~100k | raw data ~40 MB/day, so 10 GB fills in about 8 months without pruning | the archive + cleanup job above become required (90 days of raw ≈ 3.6 GB fits). If many deferred events have been added by then: sample `daily_snapshot` (for example 10% of players; run start/end and drops stay at 100%), or have the Worker forward raw data to an analytics database (ClickHouse, BigQuery) | $10–30/mo lean; $20–100/mo with many events, about a week of work |

**R2 raw archive (when the cleanup job is built):**
- Every accepted batch is also written as one file to an R2 bucket.
- It is insurance: D1 can then be pruned or replaced, and any future database
  can be filled by replaying the archive.
- R2's free tier is 10 GB with no download fees.

**Early warning:** `db-size.sql`.

**Non-technical work at public scale**, likely bigger than the database work:
- a privacy policy and app-store privacy labels
- possibly asking first in the EU
- an in-game delete path instead of deleting by hand
- stronger checks against faked events

## Future cloud saves / device migration (not built now)

**What cloud saves would need:**
- accounts (for example email login, or Sign in with Apple/Google; Apple
  requires Sign in with Apple if other social logins are offered)
- a save service that can read and write
- a rule for two devices playing the same run

**Rule: the save service is a separate service from this collector**, even if
both run on Cloudflare. The collector stays write-only, and analytics is never
keyed on an account or email.

**This design keeps that path open:**
- the `install_id` / `player_id` split
- the run ID living in the game save
- `schema_version` on every event
- persistence staying behind the store layer

**When accounts arrive**, the account's save holds its analytics `player_id`.
Each device keeps its own `install_id`.

## Deferred events (add when a real question needs them)

Each is about an hour of work once the plumbing exists:

| Type | When | Fields |
|---|---|---|
| `level_up` | level gained | new level, stat deltas |
| `boss_killed` | boss defeated | boss index, personality, days spent on that boss |
| `boss_skill` | a boss skill fires | skill ID, outcome (landed/failed/resisted), amount |
| `skill_rank_up` | a habit ranks up | new rank, period, damage type |
| `skill_assigned` | special / ult / overdrive granted | which kind, period, damage type |
| `habit_added` / `habit_removed` | habit created or deleted | good/bad, period, damage type, difficulty, days due count |
| `quest_added` / `quest_done` / `quest_missed` | quest lifecycle | difficulty, days until due / overdue |
| `trial_claimed` | a trial is claimed | trial (challenge) ID, reward item ID if any |
| `revive` | a Phoenix Feather (or similar) saves the hero | item ID |

The same rule applies to these: no free text.

## Left to the builder

- Exact module/file layout on the game side, and how it hooks into the
  existing composables and stores.
- Worker framework details, rate-limit numbers, and the batch size cap.
- Exact queue size and flush debounce.
- Exact menu copy, within the terse style rule.
- Whether `run_end` also fires a final `daily_snapshot`, or the run_end
  carries enough on its own.
- How to stamp the build hash into the Vite build.

## Rollout

1. The owner creates a Cloudflare account and logs Wrangler in. Then deploy
   the Worker and D1 with the schema.
2. Ship the game change. On next open, each friend's device makes an ID,
   sends `analytics_on`, backfills its top-10 runs, and starts sending.
3. The owner tags their phone's ID as `owner`, and adds any laptop test IDs to
   `ignored_players`.
