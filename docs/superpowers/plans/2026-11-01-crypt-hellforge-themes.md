# Crypt + Hellforge Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the Ashen theme option to **Moonlit** and add two new theme options, **Crypt** and **Hellforge**, which share Ashen's look (type, crests, diamonds, panels) but have their own palettes.

**Architecture:** "Ashen" becomes the name of a *family* of themes. `themes/ashen.scss` keeps every shared rule. Its palette, now hard-coded in SCSS variables and literals, moves into CSS custom properties, so one rule set serves all three themes. The shared rules sit under one family selector, `:root:is([data-theme='moonlit'], [data-theme='crypt'], [data-theme='hellforge'])`, which has the same specificity as today's `:root[data-theme='ashen']`. Each theme file sets that theme's palette tokens. Hellforge's file also adds a few override rules for its iron frames, red buttons and gold titles. Moonlit must render pixel-identically to today.

**Tech Stack:** Vue 3, Pinia, SCSS (Dart Sass ^1.80), Vitest, playwright-cli skill for screenshots.

**Spec:** the user's picks in `docs/mockups/crypt-hellforge-light.html`, i.e. the "Crypt" and "Hellforge, rounded" columns (open it in a browser). The palette tables below are taken from those mockups and are the source of truth.

## Global Constraints

- Theme ids are `'moonlit' | 'crypt' | 'hellforge' | 'minimalist'`. Labels are `Moonlit`, `Crypt`, `Hellforge`, `Minimalist`, listed in that order (the menu picker iterates `THEMES`). The default stays Moonlit.
- A saved `'ashen'` preference (`localStorage['streak-slayer:theme:v1']`) loads as `'moonlit'`.
- Minimalist must not change. The family selector must never match it.
- "Ashen" stays the family's name in the file name (`ashen.scss`), keyframe names (`ashen-embers`, `ashen-fog`, `ashen-check-settle`…) and component comments. Don't rename those.
- Everything stays a web app that works in a Capacitor WebView. Use no `color-mix()`. Write alpha tones as `rgb(var(--x-rgb) / a)` with space-separated triplets.
- Don't add dependencies.
- Moonlit's colour rules (silver = touch, brass = earned, gold = EXP) carry over: Crypt keeps them in neutral silver, and Hellforge maps "touch" to red buttons and bone-gold checks.

## Review Focus

1. **Existing installs:** a player with `'ashen'` saved must open in Moonlit, not fall back to the default by accident or reset other settings. (Task 2 test.)
2. **Moonlit regressions:** the refactor touches about 250 colour sites in the live default theme. Moonlit screenshots must match the pre-refactor baseline pixel for pixel, with reduced motion on. (Task 1 check.)
3. **Popups in the new themes:** `.modal-content` paints `rgba($frame, 0.985)`, and the boss bar and pinned header use the bg/frame tones. In Crypt and Hellforge no popup or bar may keep Moonlit's blue. (Task 3/4 screenshots of the hero popup, skill popup and scrolled pinned header.)
4. **Leftover selectors:** the `@media (prefers-reduced-motion)` block and the `:where(:root[data-theme='ashen'] .panel)` rule at the end of the file name the theme explicitly. They must move to the family selector, or Crypt and Hellforge lose reduced motion and crest positioning. (Task 2 test: no `data-theme='ashen'` left in the compiled CSS.)
5. **Hellforge red buttons:** red fills on every soft button (menu, back, cancel, replace) and primary button need readable bone text. Disabled buttons and spotlight-hint borders (`--accent-solid`) must stay visible on red. (Task 4 screenshots, including a disabled button and a spotlight hint.)

---

## File Structure

- Modify `src/assets/scss/themes/ashen.scss`: shared family rules only. Add a `tone()` helper and a `$ashen` selector variable; SCSS palette variables become `var()` expressions; blue-cast literals become tokens.
- Create `src/assets/scss/themes/moonlit.scss`: Moonlit palette tokens (today's values).
- Create `src/assets/scss/themes/crypt.scss`: Crypt palette tokens.
- Create `src/assets/scss/themes/hellforge.scss`: Hellforge palette tokens plus its override rules.
- Create `src/assets/scss/themes/index.scss`: `@use 'ashen'; @use 'moonlit'; @use 'crypt'; @use 'hellforge';`. Order matters: theme files come after the shared rules so equal-specificity overrides win.
- Modify `src/main.ts:17`: import `./assets/scss/themes/index.scss` instead of `ashen.scss`.
- Modify `src/store/themeStore.ts` and `src/store/themeStore.spec.ts`: ids, labels, legacy migration.
- Create `src/assets/scss/themes/themes.spec.ts`: compiles `index.scss` with `sass` and checks tokens and selectors.

## Palette tokens

Every Ashen-family theme declares all of these on `:root[data-theme='<id>']`. Name this list `PALETTE_TOKENS` in the spec test. If the refactor needs another per-theme value (e.g. `$brass-solid` turns out to be used inside `rgba()`), add it here, to all three theme files and to `PALETTE_TOKENS`.

| Token | Moonlit (today) | Crypt | Hellforge |
|---|---|---|---|
| `--bg` / `--bg-rgb` | `#07080c` / `7 8 12` | `#0a0908` / `10 9 8` | `#080504` / `8 5 4` |
| `--text` | `#a9adb6` | `#a9a196` | `#a8937a` |
| `--text-h` | `#e8ebf0` | `#ece6dc` | `#eadbb8` |
| `--border` | `#2a2f3b` | `#2e2a25` | `#3a2a1c` |
| `--code-bg` | `#12141b` | `#14120f` | `#120c09` |
| `--frame` / `--frame-rgb` | `#141720` / `20 23 32` | `#181512` / `24 21 18` | `#1a120e` / `26 18 14` |
| `--panel-fill` | `#141720` | `linear-gradient(#1c1916, #13110f)` | `linear-gradient(#1f1612, #140d0a)` |
| `--ash-rgb` (lines) | `150 141 126` | `170 150 120` | `150 110 70` |
| `--ash-mark` | `#6b6458` | `#6e665a` | `#6e5640` |
| `--ash-deep` | `#5c554a` | `#5e574c` | `#5c4630` |
| `--moon` (touch, light) | `#dbe2ee` | `#e2e0d8` | `#eadbb8` |
| `--moon-solid` | `#a9b4c8` | `#b5b2a8` | `#b8a47a` |
| `--moon-tint-rgb` | `170 185 215` | `215 215 205` | `200 140 80` |
| `--moon-glow-rgb` | `200 214 240` | `232 228 218` | `230 190 120` |
| `--brass` / `--brass-rgb` | `#d2bb85` / `210 187 133` | same as Moonlit | `#d8b45e` / `216 180 94` |
| `--brass-solid` | `#b39a66` | same as Moonlit | `#b08f48` |
| `--check-done` / `--check-done-line` | `#3c4352` / `#566074` | `#3d3934` / `#5a544c` | `#3a2620` / `#5e3c30` |
| `--page-glow` (body::before) | `rgba(150, 170, 210, 0.1)` | `rgba(235, 170, 110, 0.06)` | `rgba(200, 60, 20, 0.07)` |
| `--button-fill` | `linear-gradient(180deg, rgba(190,204,230,.32), rgba(110,124,152,.26))` | `linear-gradient(180deg, rgba(225,222,212,.3), rgba(140,135,125,.24))` | `linear-gradient(180deg, #6a1a12, #3e0c08)` |
| `--button-fill-hover` | `linear-gradient(180deg, rgba(200,214,238,.42), rgba(120,134,162,.34))` | `linear-gradient(180deg, rgba(235,232,222,.4), rgba(150,145,135,.32))` | `linear-gradient(180deg, #7e2216, #4a100a)` |
| `--button-line` | `rgba(190, 204, 230, 0.45)` | `rgba(225, 222, 212, 0.45)` | `#8a3020` |
| `--button-text` | `var(--text-h)` | `var(--text-h)` | `#f2d8c0` |
| `--stage-light` | `radial-gradient(ellipse 45% 55% at 68% 55%, rgba(215,205,185,.15), transparent 72%), radial-gradient(ellipse 90% 30% at 50% 100%, rgba(224,120,58,.18), transparent 70%)` | `radial-gradient(ellipse 40% 38% at 20% 80%, rgba(235,150,70,.24), transparent 70%), radial-gradient(ellipse 55% 45% at 78% 28%, rgba(190,200,225,.11), transparent 70%)` | `radial-gradient(ellipse 75% 32% at 50% 112%, rgba(210,60,20,.26), transparent 70%), radial-gradient(ellipse 55% 45% at 78% 28%, rgba(190,170,150,.06), transparent 70%)` |
| `--boss-sprite-filter` | today's `$boss-sprite-filter` | same rim, glow `drop-shadow(0 0 12px rgba(235,150,70,.3))` | same rim, glow `drop-shadow(0 0 12px rgba(255,80,40,.32))` |
| `--hero-sprite-filter` | today's `$hero-sprite-filter` | `drop-shadow(0 0 18px rgba(0,0,0,.95)) brightness(0.9) contrast(1.05) sepia(0.12)` | `drop-shadow(0 0 16px rgba(0,0,0,.95)) brightness(0.85) sepia(0.15)` |

Only Hellforge sets the soft-button tokens (all three themes read them). The family block defaults them to Moonlit's behaviour: `--soft-fill: tone(moon-tint, 0.14)`, `--soft-fill-hover: tone(moon-tint, 0.22)`, `--soft-text: var(--accent)`, `--soft-line: transparent`. Hellforge sets `--soft-fill: linear-gradient(180deg, #6a1a12, #3e0c08)`, `--soft-fill-hover: linear-gradient(180deg, #7e2216, #4a100a)`, `--soft-text: #f2d8c0`, `--soft-line: #8a3020`.

Shared semantic colours stay in the family block, identical for all three themes: damage, heal, icons, rarity, EXP gold, embers, the bone fog `rgba(205,195,175,…)` / `rgba(215,205,185,…)`, ember `rgba(224,120,58,…)`, crimson blow buttons, opal, and black shadows. The same goes for derived accents: `--accent: var(--moon)`, `--accent-solid: var(--moon-solid)`, `--accent-bg: tone(moon-tint, 0.08)`, `--accent-border: tone(moon-tint, 0.45)`, `--stage-fog: var(--frame)`, `--side-quest-color: var(--moon-solid)`, `--portrait-border: tone(moon-tint, 0.22)`.

---

### Task 1: Tokenise Ashen (still `data-theme='ashen'`), Moonlit pixel-identical

**Files:**
- Modify: `src/assets/scss/themes/ashen.scss`
- Create: `src/assets/scss/themes/moonlit.scss` (selector `:root[data-theme='ashen']` for now), `src/assets/scss/themes/index.scss`
- Modify: `src/main.ts:17`
- Test: `src/assets/scss/themes/themes.spec.ts`

**Interfaces:**
- Produces: `tone($name, $alpha)` in `ashen.scss`, which returns `rgb(var(--<name>-rgb) / <alpha>)` via `@use 'sass:string'` → `string.unquote(...)`. It also produces the token names in the table above, and `themes.spec.ts` with `PALETTE_TOKENS` and a `compileThemes(): string` helper.

- [ ] **Step 1: Take Moonlit baselines before touching code.** Use the playwright-cli skill against `npm run dev` (`http://localhost:5173/streak-slayer/`) at 390×844, deviceScaleFactor 2, `reducedMotion: 'reduce'`, with one fixed save in localStorage (play a few checks to reach a boss, add a quest, then export the save via the menu and reuse it for every run). Capture: the fight view at the top, scrolled with the pinned header, the hero popup, a skill popup, and the high-score list. Save them to the scratchpad as `before-*.png`.

- [ ] **Step 2: Write the failing spec** `themes.spec.ts` (node environment): `compileThemes()` = `compile('src/assets/scss/themes/index.scss').css` from `sass`.
  - `it('declares every palette token for each Ashen theme')`: for each id in `['ashen']` (Task 2 changes this list), collect custom-property names declared in blocks whose selector is exactly `:root[data-theme=<id>]` (accept `'`, `"` or no quotes), and expect them to contain every name in `PALETTE_TOKENS`.
  - `it('declares every custom property it uses')`: every `var(--name` in the compiled CSS is declared in the compiled CSS or in `src/style.css`.
  - `it('never feeds a token to rgba()')`: the compiled CSS has no match for `/rgba?\(\s*var\(/`. Sass passes `rgba($x, a)` through unchanged once `$x` is a `var()`, and the browser then drops the colour silently. Only `tone()` may produce alpha tones.

- [ ] **Step 3: Run it.** `npx vitest run src/assets/scss/themes/themes.spec.ts` → FAIL (index.scss missing).

- [ ] **Step 4: Refactor `ashen.scss`.** Wrap the rules in `#{$ashen} { … }`, with `$ashen: ":root[data-theme='ashen']"` for now (replace every literal `:root[data-theme='ashen']` in the file, including the reduced-motion block and the trailing `:where(...)`).
  - Point the SCSS palette variables at tokens, keeping their names so most rules don't change: `$moon: var(--moon)`, `$moon-solid: var(--moon-solid)`, `$brass: var(--brass)`, `$brass-solid: var(--brass-solid)`, `$ash-mark: var(--ash-mark)`, `$ash-deep: var(--ash-deep)`, `$frame: var(--frame)`, `$line: tone(ash, 0.2)`, `$line-mid: tone(ash, 0.32)`, `$line-faint: tone(ash, 0.08)`, `$touch-line: tone(moon-tint, 0.5)`, `$boss-sprite-filter: var(--boss-sprite-filter)`, `$hero-sprite-filter: var(--hero-sprite-filter)`.
  - Replace each `rgba($moon-tint|$moon-glow|$brass|$frame, a)` with `tone(moon-tint|moon-glow|brass|frame, a)`. Then delete `$moon-tint` and `$moon-glow` outright so a missed use fails to compile. Missed `rgba($brass, …)` or `rgba($frame, …)` uses compile but emit `rgba(var(...), a)`, which the "never feeds a token to rgba()" test catches.
  - Replace each literal `rgba(150, 141, 126, a)` with `tone(ash, a)` and `rgba(7, 8, 12, a)` with `tone(bg, a)`.
  - The stage background (`.fight-stage .stage-bg`, the two radial gradients) becomes `var(--stage-light)`. The `body::before` glow becomes `var(--page-glow)`. The primary-button gradients and border become `--button-fill`, `--button-fill-hover` and `--button-line`, and its `color` becomes `var(--button-text)`. The `diamond-check` `:checked` colours become `--check-done` and `--check-done-line`. `moonlit($frame)` on `.panel` becomes `moonlit(var(--panel-fill))`.
  - In `soft-button`, the default `$fill` becomes `var(--soft-fill)`, the hover background `var(--soft-fill-hover)`, the default `$color` `var(--soft-text)`, and `border: 1px solid var(--soft-line)`.
  - Any literal left with a blue cast (blue channel highest; e.g. `#6a6f7a`, `#0a0b10`, `rgba(70, 82, 108, …)`, `rgba(19, 22, 30, …)`, `rgba(200, 214, 238, …)`) becomes a token named for its role with today's value. Add it to the table, `PALETTE_TOKENS` and `moonlit.scss`.
  - Move the `:root` custom properties that differ per theme into `moonlit.scss`. Keep the shared ones, the family defaults listed above, and the non-colour declarations (`font-size-adjust`, `background: var(--bg)`, …) in the family block. Write `index.scss`, and point `main.ts` at it.

- [ ] **Step 5: Run the spec.** It should PASS. Then run `npm run build` (no Sass errors or deprecation warnings from the new code), `npm run test:unit` and `npm run lint`, which should all pass. Two `HabitList.spec.ts` hint tests are known to be flaky; rerun before investigating.

- [ ] **Step 6: Moonlit pixel check.** Retake the Step 1 screenshots as `after-*.png` and diff them (PIL `ImageChops.difference(...).getbbox()` must be `None` for each). Fix any difference before committing.

- [ ] **Step 7: Commit.** `git add src/assets/scss/themes src/main.ts` with message "Move Ashen's palette into tokens so it can carry more themes".

### Task 2: Rename Ashen → Moonlit, family selector, legacy migration

**Files:**
- Modify: `src/store/themeStore.ts`, `src/store/themeStore.spec.ts`, `src/assets/scss/themes/ashen.scss` (header comment + `$ashen`), `src/assets/scss/themes/moonlit.scss`, `src/assets/scss/themes/themes.spec.ts`

**Interfaces:**
- Consumes: Task 1's `$ashen`, tokens and spec.
- Produces: `type Theme = 'moonlit' | 'crypt' | 'hellforge' | 'minimalist'`; `THEMES` with `{ id, label }`; `ASHEN_FAMILY: Theme[] = ['moonlit', 'crypt', 'hellforge']`, exported from `themeStore.ts` and used by the spec to pick which palettes to check. Tasks 3 and 4 only add theme files. They don't touch the store, since Task 2 already registers all four ids.

- [ ] **Step 1: Write the failing store tests** in `themeStore.spec.ts`:
  - The default theme is `'moonlit'` (replacing both `'ashen'` expectations).
  - `it('loads a saved Ashen choice as Moonlit')`: set storage to `'ashen'`, expect `theme === 'moonlit'`.
  - `it('lists the themes in menu order')`: `THEMES.map(t => t.id)` equals `['moonlit','crypt','hellforge','minimalist']` and the labels equal `['Moonlit','Crypt','Hellforge','Minimalist']`.
  - `applyTheme('moonlit')` stamps `'moonlit'`.
- [ ] **Step 2: Write the failing spec changes** in `themes.spec.ts`. The palette test now loops over `ASHEN_FAMILY`; for now mark the `crypt` and `hellforge` cases `it.todo` or skip them until Tasks 3 and 4. Add `it('no longer mentions the ashen theme id')`: the compiled CSS has no match for `data-theme=['"]?ashen`.
- [ ] **Step 3: Run both specs** → FAIL.
- [ ] **Step 4: Implement.** In the store: the new ids and labels, `ASHEN_FAMILY`, `DEFAULT_THEME = 'moonlit'`, and in `loadTheme` map a saved `'ashen'` to `'moonlit'` before validating. In `ashen.scss`: `$ashen: ":root:is([data-theme='moonlit'], [data-theme='crypt'], [data-theme='hellforge'])"`, and rewrite the header comment to say Ashen is the family (Moonlit, Crypt, Hellforge) whose palettes live in the sibling files. `moonlit.scss` now selects `:root[data-theme='moonlit']`.
- [ ] **Step 5: Run** `npm run test:unit`, `npm run build` and `npm run lint` → PASS. Do a quick Moonlit screenshot diff against Task 1's `before-*` (still identical). Choosing Crypt or Hellforge in the menu at this point shows unstyled Ashen rules with no tokens. That's expected, and Task 3 lands next.
- [ ] **Step 6: Commit** with message "Rename Ashen to Moonlit; Ashen is now the family".

### Task 3: Crypt

**Files:**
- Create: `src/assets/scss/themes/crypt.scss`
- Modify: `src/assets/scss/themes/index.scss`, `themes.spec.ts` (un-skip crypt)

- [ ] **Step 1:** Un-skip the crypt palette case and run it → FAIL (no tokens).
- [ ] **Step 2:** Write `crypt.scss`: `:root[data-theme='crypt'] { … }` with the Crypt column of the table, plus a short header comment (warm stone, candle and moon on the stage, neutral silver to touch, brass earned). Add `@use 'crypt';` to `index.scss`.
- [ ] **Step 3:** Run the spec, `npm run build` and `npm run test:unit` → PASS.
- [ ] **Step 4: Visual check.** Take the Task 1 screenshot set in Crypt and compare it by eye with the "Crypt" column of `docs/mockups/crypt-hellforge-light.html`. No surface may show Moonlit's blue: check the popups, the boss bar, the pinned header, the done checks and the new-hero screen. Fix stray blue by tokenising the literal (see Task 1's blue-cast rule) and re-running the Moonlit diff.
- [ ] **Step 5: Commit** with message "Add the Crypt theme".

### Task 4: Hellforge

**Files:**
- Create: `src/assets/scss/themes/hellforge.scss`
- Modify: `src/assets/scss/themes/index.scss`, `themes.spec.ts` (un-skip hellforge)

- [ ] **Step 1:** Un-skip the hellforge palette case → FAIL.
- [ ] **Step 2:** Write `hellforge.scss`. It contains the Hellforge column of the table and the four soft-button tokens, plus these overrides under `:root[data-theme='hellforge']`. They have equal specificity to the family rules and win because the file loads later.
  - `.panel`: `border: 2px solid #5c4630; box-shadow: 0 0 0 1px #000, inset 0 0 0 1px rgba(0,0,0,.6), inset 0 0 18px rgba(0,0,0,.6), 0 24px 50px -24px rgba(0,0,0,.95);`
  - `.modal-content`: `border: 2px solid #5c4630; box-shadow: 0 0 0 1px #000, inset 0 0 18px rgba(0,0,0,.6), 0 40px 80px -30px #000;`
  - Gold titles: `.panel h2, .modal-header h3, .fight-stage .boss-name, .fight-stage .name-line { color: var(--brass); }`
  - Header comment: black leather in bronze-edged iron, low dim hellfire, blood-red buttons, gold titles; corners are Moonlit's (6px panels and buttons).
  - Add `@use 'hellforge';` to `index.scss`.
- [ ] **Step 3:** Run the spec, `npm run build` and `npm run test:unit` → PASS.
- [ ] **Step 4: Visual check.** Take the Task 1 set in Hellforge, plus a disabled button and a spotlight hint (a new save shows the "+ New habit" hint). Compare with the "Hellforge, rounded" column of the mockup. The text on every red button must be readable, and a disabled button must read as disabled. If the red "taking a blow" ok-button can't be told from the ordinary primary buttons, say so in the handoff; don't redesign it.
- [ ] **Step 5: Commit** with message "Add the Hellforge theme".

## Not in this plan

Per-boss stage backgrounds (`docs/mockups/boss-stages.html`). `--stage-light` is the hook they will override later, per boss.
