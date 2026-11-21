# App UI Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the app-wide UI pass picked on 2026-11-20 into the real app: gain popup, stage plates, the hanging purse with its gem key, the 3-icon corner strip, the Hero tab's purse in the name plate, new Talents and Prestige tops, and the death screen's brass Revive.

**Architecture:** Every change was tried as CSS/JS injected into the real app inside the mocks, so each task moves one mock's injected rules into the component or theme that owns those elements. Look and colour go in `src/assets/scss/themes/ashen.scss`, which is the selector for every theme. Position and layout go in the component's scoped CSS. Markup changes go in the components. One new component: `GainPopup.vue`.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, Pinia, SCSS, Vitest + @vue/test-utils (jsdom).

**Spec:** the three mocks are the spec. Their defaults are the picks, and their `CSS` strings hold the exact values. Open them on the dev server (`npm run dev`, then `/streak-slayer/docs/mockups/<file>`):
- `docs/mockups/app-ui-pass.html`: gain popup, stage plates, hanging purse + bare +, gem button in the strip, death screen. Ignore the rules for options that were not picked: `mx-icons`, `mx-icons-left`, `mx-purse-bar`, `mx-purse-strip`, `mx-name-right`, `mx-no-plate`, and the silver/outline/teal + styles.
- `docs/mockups/purse-places.html`: Hero tab, option F only (`h-nameStack`, `mx-inname`).
- `docs/mockups/talents-top.html`: Talents C (`tC`) and Prestige A (`pA`).

Decisions not in the mocks are in memory `project_app_ui_from_dungeon_mock.md`.

## Global Constraints

- Phones only (`max-width: 820px`, `usePhoneLayout`). Desktop and tablet stay as they are, apart from dropping "Permanent upgrades." (Task 5).
- The Focus strip (`.fight-stage.focus`) stays as it is: no plates, no purse.
- The stage and its plates are always night: plates use fixed colours (`#07080c`, `#333c52`, `#0c0f15`, `#f0f3f7`, `#9a9ab8`) in every theme. The Talents and Prestige titles sit on the page, so they use `var(--text-h)`.
- Tap targets at least 44px. The bare + gets an invisible 44px box (`::after`, inset `-13px -15px`).
- Respect `env(safe-area-inset-top)` wherever a mock assumed 0 (purse height, Talents/Prestige top padding).
- The gem button in the strip and the purse's + open the Challenges sheet (`TrialsModal`), like "Get gems" on the death screen.
- Player-facing copy, exactly: "Revive at half HP", "Rise again", "Rising again costs", "Get more gems to revive at half HP", "Get gems", "Talents", "Prestige", and aria-labels "Get gems" / "Gems".
- Comments match the codebase: plain-English "why" notes above rules, mock named where a look comes from.
- Commit after each task on `main`. Don't push until every task is done.

## Review Focus

1. **Day-stage scenes** (`.fight-stage.day-stage`, the bright boss backdrops): the theme turns stage names, numbers and stats to dark ink, which would vanish on the dark plates. Names and stats must stay light inside plates on every scene (Task 3 visual check on a day scene).
2. **Tap areas after the blocks swap sides:** the hero's block now sits upper-left and the boss's lower-right. The old step split (`--split-yl/yr`, fed by `measureBlocks`) would hand the hero's plate to the boss's button. Tapping either plate must open its own fighter (Task 3 test).
3. **Long names and big numbers:** a long boss name or hero name ellipsises inside its plate, and the stat line never wraps. The purse widens with 5–6 digit gold without covering the Talents crest row (Tasks 3, 5).
4. **Level-ups, deaths and prestige in the gain popup:** EXP across one or more level-ups counts the whole gain. Any loss (death, Rise again, prestige reset, spending) shows nothing (Task 1 tests).
5. **Status-bar inset:** with `env(safe-area-inset-top)` > 0, the purse, the Talents row and the Prestige title all sit below the inset, and the purse plate's dark fill covers the inset (Task 2, Task 5 visual check with a faked inset).

---

### Task 1: Gain popup

**Files:**
- Create: `src/components/ui/GainPopup.vue`
- Test: `src/components/ui/GainPopup.spec.ts`
- Modify: `src/components/layout/TabBar.vue` (mount it; root gets `position: relative`)
- Modify: `src/components/layout/StagePurse.vue`, `StagePurse.spec.ts` (remove the green `.purse-gain` and its timers and tests)

**Interfaces:**
- Produces: `<GainPopup />`, no props. It watches `characterGold(characterStore.character)`, `accountStore.account.gems`, and `characterStore.character.level` + `.exp`.

Behaviour (from `gainPopup()` in app-ui-pass.html):
- Increases add to a pending total. 400ms after the last change, the pending gains show in one plate, in the order EXP, gold, gems. Each part is `+N` with its icon (`StatIcon` gold/gems, 15px), and EXP is `+N` followed by a small "EXP".
- The plate hides 1900ms after it shows. A new flush while it's showing replaces the text and restarts the 1900ms.
- An EXP gain across a level-up = the rest of every level passed (`expToNextLevel(L) - exp` for the first, `expToNextLevel(L)` for any full level skipped) + the new `exp`.
- Decreases (spending, death toll, prestige reset, level loss) add nothing.
- Numbers use `Math.round(n).toLocaleString('en-US')`.
- Look (`.mx-gain` in the mock): absolute, `bottom: calc(100% + 14px)`, centred (`left: 50%`, `translate(-50%, …)`), `z-index: 70`, `pointer-events: none`. Padding `8px 14px`, gap 12px, background `#07080c`, clip-path `var(--px2)`, box-shadow `inset 2px 2px 0 #333c52, inset -2px -2px 0 #0c0f15`, `700 14px` Alegreya Sans, `#f0f3f7`. EXP colour `var(--exp-color)`, its "EXP" `800 11px`, letter-spacing `.1em`. It shows with opacity 0→1 and `translateY(10px)`→0 over .2s, and with no movement under `prefers-reduced-motion`. `role="status"`.

- [ ] **Step 1: Write the failing tests** in `GainPopup.spec.ts`, using fake timers, Pinia set up as in `StagePurse.spec.ts`:
  - `shows nothing at mount` → no visible `.gain-popup.show`.
  - `merges gains within 400ms into one plate`: gold +50, then 200ms later gems +3. Advance 400ms → text contains `+50` and `+3`, and only one `.gain-popup` exists.
  - `counts EXP across a level-up`: level 3 / exp 80 → level 4 / exp 20 → text contains `+${expToNextLevel(3) - 80 + 20}` and `EXP`.
  - `ignores spending and losses`: gold 1540 → 900, level 5 → 4 → no `.show` after 2s.
  - `hides 1.9s after showing` → `.show` present at 400ms, gone at 400 + 1900ms.
- [ ] **Step 2:** Run `npx vitest run src/components/ui/GainPopup.spec.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement `GainPopup.vue`. Mount it as the first child of `.tab-bar` in `TabBar.vue`.
- [ ] **Step 4:** In `StagePurse.vue`, delete the gain list, its timers and watches, `.purse-gain` and its keyframes. In `StagePurse.spec.ts`, delete the gain tests.
- [ ] **Step 5:** Run `npx vitest run src/components/ui/GainPopup.spec.ts src/components/layout`. Expected: PASS.
- [ ] **Step 6:** Commit `Show gold, gem and EXP gains in one plate above the tab bar`.

### Task 2: Hanging purse, bare +, gem button in the strip

**Files:**
- Modify: `src/components/layout/StagePurse.vue` (new look, + key, drop the `plate` prop and `.bare` mode), `StagePurse.spec.ts`
- Modify: `src/components/layout/AppShell.vue` (render the purse outside the corner slot, add the strip's gem button, wire both to `showTrials`), `AppShell.spec.ts`
- Modify: `src/components/character/HomeBase.vue` (only the old comment on `.home-name`'s `top: 6px` that mentions the purse beside the menu)

**Interfaces:**
- Produces: `StagePurse` emits `get-gems` (no payload) from its `+` (`button.purse-plus`, `aria-label="Get gems"`). No props.
- Produces: AppShell's strip button `button.stage-trials.stage-gems`, `aria-label="Gems"`, lucide `Gem` with an `icon-rim` copy like the Gift button. It sits after Challenges, shows only where `cornerRoom`, and opens `showTrials`.

Values (`html.mx-bars:not(.mx-icons-left) .stage-purse …` and the `mx-plus-bare` rules in app-ui-pass.html):
- AppShell renders `<StagePurse v-if="isPhone && cornerRoom && tabStore.tab !== 'hero'" @get-gems="showTrials = true" />` as a child of `.layout`, not in the `<component :is="topBar">` slot. That keeps the stage's FLIP from carrying it and keeps it off the Focus strip.
- `.stage-purse`: `position: fixed; top: 0; left: calc(8px + env(safe-area-inset-left, 0px)); z-index: 9` (above the stage/home base at 8, below popups); `pointer-events: none`.
- `.purse-plate`: height `calc(26px + env(safe-area-inset-top, 0px))`, padding `env(safe-area-inset-top, 0px) 8px 0 12px`, background `rgba(7, 8, 12, 0.88)`, box-shadow `inset 1px 0 0 #333c52, inset -1px 0 0 #333c52, inset 0 -1px 0 #333c52`, clip-path `polygon(0 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px))`. The counts keep today's font and icons.
- `.purse-plus` (inside the gems' `.purse-count`): 14×18px, margin-left 8px, no background, `#dfe0f0`, `800 17px/1` Alegreya Sans, `pointer-events: auto`. `::before` is a hairline: `left: -5px; top: 2px; bottom: 2px; width: 1px; #333c52`. `::after` is the tap box: `inset: -13px -15px`.

- [ ] **Step 1: Write the failing tests.**
  - StagePurse: `the + asks for gems` → click `.purse-plus` → `emitted('get-gems')` has length 1. Keep `shows the gold and gems on one plate, in full`. Delete the `plate: false` test.
  - AppShell (phone): `the purse sits outside the corner slot` → `.stage-purse` is not inside `.stage-menu`. `no purse on the Hero tab` → after `tabStore.select('hero')`, `.stage-purse` doesn't exist. `the strip's gem button opens the Challenges` → click `.stage-gems` → TrialsModal open. `the purse's + opens the Challenges` → same check through `.purse-plus`.
- [ ] **Step 2:** Run `npx vitest run src/components/layout`. Expected: the new tests FAIL.
- [ ] **Step 3:** Implement the purse and strip changes.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Visual check** at 390px on `/streak-slayer/screen-frame.html?s=purse` (playwright-cli): Habits, Tasks and Shop show the purse hanging flush from the top edge, its left edge 8px in, the + after the gems. The strip shows cog, Challenges and gem. The Focus strip shows no purse.
- [ ] **Step 6:** Commit `Hang the purse from the top-left with a gem key, and add a gem button to the corner strip`.

### Task 3: Stage plates

**Files:**
- Modify: `src/components/fight/FightStage.vue` (phone full-stage positions and the tap split), `FightStage.spec.ts`
- Modify: `src/assets/scss/themes/ashen.scss` (plate look, in the fight-stage section after the existing `.fight-stage` rules, under `@media (max-width: 820px)` and `.fight-stage:not(.focus)`)

**Interfaces:**
- Consumes: the existing markup of `BossPanel.vue` / `CharacterPanel.vue` (`.boss-block`, `.boss-name`, `.boss-number`, `.name-tail`, `.stat-summary`, `.hero-block`, `.name-line`, `.hero-name`, `.name-prestige`, `.level-number`, `.health-bar*`). No markup changes.

Values (the `html.mx-bars …` rules in app-ui-pass.html, with `--mx-plate-alpha` = .75 and `mx-stats` on):
- **Positions** (FightStage.vue, phone, `:not(.focus)`, via `:deep`):
  - Both blocks: `top: auto; gap: 2px; padding: 3px 5px 4px`.
  - Boss block: `bottom: 0; left: auto; right: 8px; width: 52%`.
  - Hero block: `bottom: 120px; left: 8px; right: auto; width: 40%`.
  - `.boss-figure { translate: 0 -18px; }`. Use the `translate` property, not `transform`: the FLIP animates `transform`.
- **Tap split** (phone full stage): a plain vertical split, the hero's half on the left. Set `--split-x: 44%; --split-x2: 44%; --split-yl: 0px; --split-ym: 100%; --split-yr: 100%` on `.stage-inner` for the phone full stage. The hero block ends at 42% and the boss block starts at 46% (at 390px). Leave the desktop and Focus split rules as they are. `measureBlocks` stays, because desktop still reads `--hero-top`.
- **Look** (ashen.scss):
  - Plate: background `rgba(7, 8, 12, .75)`, clip-path `var(--px2)`, box-shadow `inset 2px 2px 0 #333c52, inset -2px -2px 0 #0c0f15`. No `text-shadow` on the blocks or anything inside them; this beats the `:has(.arena-img)` outline rule.
  - `.boss-name`, `.name-line`: `700 12.5px/1.25` Alegreya, letter-spacing 0, no uppercase, `#f0f3f7`, nowrap, ellipsis. `.hero-name`, `.name-tail`: `font: inherit`, letter-spacing 0, no uppercase.
  - `.boss-number`, `.level-number`: `800 10.5px` Alegreya Sans, letter-spacing `.08em`, `#9a9ab8`. `.level-number` also gets margin-left 6px and `::before { content: 'Lv '; }`.
  - Chevrons (`.name-line::after`, `.name-tail::after`): 5×5px, margin-left 6px.
  - `.hero-block .name-prestige { order: -1; margin: 0 5px 0 0; }`.
  - Bars: `.health-bar` height 14px. `.health-bar-label` `800 10.5px/1` Alegreya Sans. The hero's `.health-bar-fill` is `#3f9a55`, box-shadow `inset 0 2px 0 #6fca7f, inset 0 -2px 0 #24603a`. The boss stays red.
  - Boss `.stat-summary`: flex, nowrap, gap 8px, margin `1px 0 0`, 10.5px, `overflow: hidden`, nowrap.
  - Day stage: inside the plates, `.boss-name`/`.name-line` stay `#f0f3f7`, the numbers `#9a9ab8`, `.stat-summary` `#f0f3f7` with icons unfiltered. Scope it so this wins over the `.fight-stage.day-stage` block.

- [ ] **Step 1: Write the failing test** in `FightStage.spec.ts`: `phone full stage splits the tap areas down the middle` → mount at phone width, full stage → `.stage-inner`'s inline/computed `--split-yl` is `0px` and `--split-x` is `44%`. If jsdom can't read scoped custom properties, assert the class/state that selects them, and rely on the visual check in Step 4.
- [ ] **Step 2:** Run `npx vitest run src/components/fight src/components/boss src/components/character`. Expected: the new test FAILs.
- [ ] **Step 3:** Implement the positions, split and look.
- [ ] **Step 4: Visual check** at 390px (`?s=purse`, claim the purse, then check off a habit): it should match the mock's "New" frame. Tap each plate and confirm the right details popup opens. Check a day-scene boss (set `bossStore.boss.personality` to a scene with `day: true` in `src/components/fight/stage/scenes.ts`): the plate text is light. Switch Focus mode on and off: the strip is unchanged and the glide doesn't jump.
- [ ] **Step 5:** Run the same command. Expected: PASS.
- [ ] **Step 6:** Commit `Put the fighters' names and bars on dark plates on the phone stage`.

### Task 4: Hero tab: the purse in the name plate (F)

**Files:**
- Modify: `src/components/character/HomeBase.vue`, `HomeBase.spec.ts`

**Interfaces:**
- Consumes: `characterGold`, `useAccountStore`, `StatIcon` (as StagePurse uses them).

Markup and values (`html.h-nameStack …` and `.mx-inname` in purse-places.html):
- `.home-name.plate` becomes a `div` holding the existing `h2.home-heading` (who + `PrestigeNumeral`) and a new `p.home-purse` with two `.home-count` spans: gold, then gems, each with a `StatIcon` (12px) and `toLocaleString('en-US')`. The `p` has `aria-label` "`N gold, N gems`". No + on this tab.
- The plate is a grid, so it's only as wide as its widest row: `display: grid; grid-template-columns: auto auto; justify-content: start; align-items: center; column-gap: 8px; row-gap: 5px`. The purse spans `grid-column: 1 / -1`.
- `.home-purse`: `position: relative`, flex, gap 10px, padding-top 5px, margin 0, `font-family: var(--serif)`, 13.5px, weight 700, `line-height: 1`, letter-spacing 0, no uppercase, `#f0f3f7`, with `--icon-coin: #f0c64e; --icon-gem: #6fd6ea`. `::before` is the hairline across the plate's inner width: `left: 0; right: 0; top: 0; height: 1px; background: #333c52`. `.home-count`: inline-flex, gap 4px.
- The plate stays at `left: 12px; top: 6px` (no purse above it on this tab).

- [ ] **Step 1: Write the failing tests:** `shows gold and gems in the name plate, under the name` → `.home-name .home-purse` text contains the gold and gems counts, and `.home-purse` comes after `.home-heading`. `has no gem key on the Hero tab` → no `.purse-plus` in the wrapper. Update existing tests that read `h2.home-name` to use `.home-heading`.
- [ ] **Step 2:** Run `npx vitest run src/components/character/HomeBase.spec.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Visual check:** Hero tab at 390px with no prestige and with Prestige III (`accountStore.setPrestige(3)`). It should match purse-places.html option F. There's no gap right of the purse, and the title and numeral stay on the top row.
- [ ] **Step 6:** Commit `Carry the purse in the Hero tab's name plate`.

### Task 5: Talents top (C) and Prestige top (A)

**Files:**
- Modify: `src/components/talents/TalentSection.vue`, `TalentSection.spec.ts`
- Modify: `src/assets/scss/themes/ashen.scss` (the phone `.talent-header` / `.talent-band` block near line 5244, `.prestige-back`)
- Modify: `src/components/layout/AppShell.vue` (only `.scroll-body.talents-view`'s top padding, if the header's pull needs it)

**Interfaces:**
- Consumes: `PrestigeCrest` (unchanged; `@open` opens the Prestige page), `TALENTS_TAB_ICON`, `SectionTitle` (desktop only now).

Talents, phone (`tC` in talents-top.html):
- The header row holds the crest and a plain title: `<div class="talent-header talent-top"><PrestigeCrest @open="prestigeOpen = true" /><h2 class="talent-title">Talents</h2></div>`. No `.talent-band` on phones.
- The header keeps today's pinned role: full-bleed (`margin` pulls it to the screen's top and side edges as today), `background: var(--bg)` and its fade shadow, because the tree scrolls under it. Content starts `32px` below the safe-area top: `padding: calc(32px + env(safe-area-inset-top, 0px)) 8px 0`.
- Layout: `display: grid; grid-template-areas: 'row'`. Both children are in `row`: the crest `justify-self: start` with its left edge 8px from the screen edge (4px further left than the mock's band, so the seal starts 12px in), and the title `justify-self: center` (centred on the screen), `align-self: center`.
- `.talent-title`: `600 15px` Cinzel, letter-spacing `.26em`, `text-indent: .26em`, uppercase, `var(--text-h)`, margin 0. At `max-width: 360px`: 13px.
- The crest looks exactly as today (seal, "Prestige" over "Lv 30" / "Ready" to its right, ready glow).
- Delete `<p class="talent-kept">Permanent upgrades.</p>` everywhere (desktop keeps its band with only the crest), and its theme rule.

Prestige page, phone (`pA`):
- `<div class="talent-header prestige-head"><button class="prestige-back" …/><h2 class="talent-title prestige-title">Prestige</h2></div>`. The `SectionTitle` banner goes.
- `.prestige-head`: the same pinned, full-bleed background as above, `padding: calc(34px + env(safe-area-inset-top, 0px)) 0 0`, `justify-content: center`, flex-wrap. `.prestige-back` is absolute at `left: 0.75rem`, top level with the title row, 44×44, chevron `var(--moon)` as today.
- `.prestige-title`: 19px, letter-spacing `.3em`, `text-indent: .3em`, min-height 44px (centres it on the back key).
- `::after`: `content: ''; flex: 0 0 100%; height: 1px; margin-top: 4px; background: linear-gradient(90deg, transparent, #8a7340, transparent) center / 150px 1px no-repeat`.

- [ ] **Step 1: Write the failing tests** (phone mount, as the existing phone tests do):
  - `the crest and a plain Talents title share the top row` → `.talent-top .prestige-crest` exists, and `.talent-top .talent-title` reads `Talents`.
  - `no Permanent upgrades note` → text doesn't contain `Permanent upgrades.`. This replaces the line-56 assertion.
  - `the Prestige page has a plain title and a back key` → after clicking the crest, `.prestige-head .prestige-title` reads `Prestige`, there's no `.prestige-head .section-title`, and clicking `.prestige-back` returns to the tree.
  - Move the line-315 crest assertion from `.talent-band` to `.talent-top` for phones.
- [ ] **Step 2:** Run `npx vitest run src/components/talents`. Expected: the new tests FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Visual check** at 390px against talents-top.html (Talents C, Prestige A) at no prestige, Prestige III and ready. Also at 360px (no overlap between the crest and the title) and with a faked inset (`--sat`/devtools device with a notch): the row clears the purse, and the tree still fades under the header.
- [ ] **Step 6:** Commit `Redraw the Talents and Prestige tops round the hanging purse`.

### Task 6: Death screen

**Files:**
- Modify: `src/components/ui/DeathScreen.vue`, `DeathScreen.spec.ts`

Markup (the `newDeath()` script and `.mx-death`/`.mx-acts` rules in app-ui-pass.html):
- The revive card, its h3, its "Fight on…" line and the `or` divider go. The Rise again card stays and loses its h3. It opens with `<p class="cost-label">Rising again costs</p>`, then the drop and losses as today. Remove `aria-label="Rising again costs"` from `.losses`; the visible label replaces it.
- After the card, `<div class="acts">` sits at the foot (`margin-top: auto; padding-top: 16px`, flex column, gap 8px). In order:
  - `buy`: `button.revive-button` "Revive at half HP" + `.revive-price` (gem icon + `REVIVE_GEMS`).
  - `short`: `p.short` "Get more gems to revive at half HP", then `p.gems-held` (centred; `.count` reads "`held / REVIVE_GEMS`" + a gem `StatIcon`; then the bar), then `button.gems-button` "Get gems".
  - Always: `button.rise-button` "Rise again".
- `.setback`: `min-height: 100%` so the actions sit at the foot.

Values:
- `.cost-label`: margin `0 0 -2px`, `700 11px` Alegreya Sans, letter-spacing `.16em`, uppercase, `#9a9ab8`.
- `.revive-button`, `.gems-button`: min-height 50px, background `#c7a560`, `#231c0c`, border 0, box-shadow `inset 0 2px 0 rgba(255,255,255,.3), inset 0 -3px 0 #6e5a2f`, `800 16px` Alegreya Sans, letter-spacing `.04em`, `clip-path: var(--px2)`. `.revive-price` and its icon are `#13505e`.
- `.rise-button`: min-height 48px, transparent, `#dfe0f0`, border 0, box-shadow `inset 0 0 0 2px #4a4a70`.
- `.short`: margin 0, centred, 14.5px, `#d3d4e4`.
- `.gems-held`: `justify-content: center`. `.bar`: max-width 160px, height 10px, background `#222338`, box-shadow `inset 0 0 0 1px #3a3b5c, inset 0 2px 0 rgba(0,0,0,.35)`. The fill stays `var(--icon-gem)`.

- [ ] **Step 1: Write the failing tests**, then update the old ones:
  - `with gems, Revive at half HP comes first and Rise again under it` → the buttons in `.acts` in order are `.revive-button` ("Revive at half HP" + price) then `.rise-button`.
  - `labels what rising again costs` → `.rise-path .cost-label` reads `Rising again costs`.
  - `short of gems, says why and offers Get gems` → `.short` text, `.gems-held .count` reads `${REVIVE_GEMS - 5} / ${REVIVE_GEMS}`, `.gems-button` opens the Challenges (keep the existing test's check).
  - Delete the `.or` assertion (line 129). Keep the restart and revive behaviour tests.
- [ ] **Step 2:** Run `npx vitest run src/components/ui/DeathScreen.spec.ts`. Expected: the new tests FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Visual check:** `?s=fire` and `?s=fire-short` at 390px. They should match the mock's death "New" frame.
- [ ] **Step 6:** Commit `Make Revive the brass key on the death screen, Rise again under it`.

### Task 7: Whole-app check and notes

- [ ] **Step 1:** Run `npm run test:unit`. Expected: all PASS. The two `HabitList.spec.ts` hint tests are known to flake about 1 in 8 runs (memory `project_flaky_habitlist_hint_tests.md`), so rerun once before investigating them.
- [ ] **Step 2:** Run `npm run build` and `npm run lint`. Expected: no errors.
- [ ] **Step 3:** Run a phone pass at 390px through every tab, Focus mode on and off, a kill (EXP + gold in one plate), the daily purse claim, a level-up, death with and without gems, and Prestige I/III/V. Note anything that differs from the mocks.
- [ ] **Step 4:** Update memory `project_app_ui_from_dungeon_mock.md` (built, commit hashes, not pushed) and `MEMORY.md`'s line for it.
- [ ] **Step 5:** Report to the user, and wait for their go before pushing.
