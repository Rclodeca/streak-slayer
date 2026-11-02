# Pixel-cut: design

Date: 2026-11-01. Status: approved direction, not built.

## Intent

The game should feel a little more playful, for wider appeal, without losing the serious RPG look that matches our pixel-art heroes, items and bosses. The user looked at Habitica (bubbly, roomy, simple) as a nudge, not a model.

Pixel-cut keeps the dark Moonlit mood and gives the UI the same hard pixel edges as the art: stepped corners, hard bevels, a lip under things you can press. Skills become cards, and you strike a skill by pressing its damage number.

**Source of truth:** `docs/mockups/pixel-done.html`, option **A (Grey)**. Earlier steps, for context: `playful.html` (option D started the "tap the damage" idea), `strike-press.html` (A, Trim), `trim-full.html`, `trim-rank.html` (C, pips), `trim-looks.html` (E, Pixel-cut).

## Goals

- Match the art: pixel-cut shapes everywhere, no rounded corners.
- A skill reads as an attack you press, not a task you tick.
- Struck and open skills are easy to tell apart at a glance.
- Roomier, more tactile rows on phone.

## Non-goals

- Final colours. We build with the mock's Moonlit values; a colour session comes later.
- Crypt and Hellforge. Not worked on now.
- Minimalist. Dropped.
- Desktop polish beyond "not broken". Phone first.

## Anti-goals

- Bubbly or cute (the Sprout, Crystal, Overworld and Pocket styles were rejected earlier, and D's big bright cards were "too bubbly and large").
- Losing the serious RPG feel.
- Struck vs open hard to tell (the reason for option A).
- Blur, heavy filters or costly animation on mid-range Android.
- Tap targets under ~44px, or anything important behind hover.
- Explaining mechanics in UI text.

## Decisions (the user's)

1. **Scope.** Pixel-cut replaces the current Ashen look, for the Moonlit theme. The current look survives in git: tag `ashen-classic` on 12da0c4, the last commit before the switch, which includes Moonlit, Crypt, Hellforge and Minimalist. The user may sell other themes later, so the tag matters. Minimalist is dropped.
2. **Skill rows are cards.** One card per skill, about 52px tall, 7px apart, padding 6px 8px 6px 12px. No panel frame around the Skills, Resist or Quests lists: each is a section title (with its add button) over its cards.
3. **Press to strike.** The skill checkbox goes. The damage number on the right is the button: the type's icon plus the number (formatCompact), raised on a 3px lip. Pressing drops the face onto the lip, and it stays down until the period ends.
4. **Open button.** A flat damage-type colour face (`color-mix(var(--c) 88%, #000)`), with pixel highlights (light top and left edges, dark bottom and right) and a darker lip (`color-mix(var(--c) 36%, #000)`). White number. True damage (pale face) gets dark text.
5. **Struck (option A).** The button loses all colour: face `#1b1f28`, lip `#111319`, number and icon `#5b606b`. The card drops dark and flat (`#0e1117`, bevel `#161a24` / `#07090d`). Name `#5b606b`; streak and pips at 45%.
6. **Open cards lifted.** Card `#1b2030`, bevel `inset 2px 2px 0 #333c52, inset -2px -2px 0 #0c0f15`, 3px lip `#05060a`, names `#f0f3f7`.
7. **Rank pips.** The rank plate goes. Rank (0 to 8, never lost) shows as tiny brass squares under the name: 4px, 4px apart, one per rank, with an extra 4px gap after the fourth.
8. **Streak** stays beside the button: flame plus count, hidden under 3 as now.
9. **Resist** uses the same cards but quieter: card `#161a24`, dim name, the button a dark face (`#1d2230`) on a red lip with a red-tinted number. Struck follows option A. Pressing a Resist card still means you gave in. It hurts you, as `checkOffHabit` → `applyPenalty` does now, and the boss is struck at rollover only if you never pressed it.
10. **Resting** skills (under the Daily fold) are flat: no lip, can't be pressed, dim number, the next due day beside the streak.
11. **Quests** use the same cards with a plain square checkbox on the left (20px, 2px border, pixel-cut corners), no diamond. The reward stays a label on the right: sparkles "+EXP", or a gift "+Item" for side quests. Completing a quest still removes it.
12. **Shapes.** Stepped corners of 3px on cards and panels, 2px on buttons, checkboxes, the menu and add buttons, made with `clip-path` polygons (see the mock's `--px` / `--px2`). Bevels are 2px inset shadows. No rounded box corners: frames, cards, buttons, inputs, chips and bars are stepped or square. Natural round shapes stay round, as in the mock: dots (quest difficulty pips, Overdrive charge dots), rings (ProgressSummary, level-up), ellipses (the hero platform) and the death-screen embers (my call on the reviewer's question).
13. **Icons:** the app's own Lucide set (`src/components/ui/statIcons.ts`), no new icons.
14. **Order** doesn't change: healing, physical, magic, true; Resting folds under Daily; Resist is due daily, weekly, then resting; quests by soonest due.

## Behaviour to carry over (my calls; the user reviews these in the built app)

- **Tap targets.** Tapping the button strikes, through the same `checkOffHabit` path. Tapping anywhere else on the card opens the skill popup, as now. The button's tap area is at least 44px tall, even though its visible face is about 37px.
- **Overdrive.** A struck skill with charges left stays fully grey and pressed: the user ruled on 2026-11-01 that a checked Overdrive skill reads as spent. Its button keeps the existing Overdrive halo and stays tappable, and a tap fires `activateOverdrive`.
- **Landing.** The old shadow sweep (`.veil`) and the type-coloured row flash go. In their place, the button flashes its type colour for a moment as it goes down, then fades to grey (about 0.6s). Resist buttons flash red instead, as Ashen does today (ashen.scss, around line 805), because giving in is a blow taken, not a skill landed. With reduced motion there is no flash.
- **Rank-up flare** stays: the sweep and the "Rank N" ghost rising. The new pip appears with it.
- **The Special/Ult sigil** stays after the name's last word, so it never wraps alone.
- **Undo** (menu) pops the button back up.
- **First check-off hints** target the press button instead of the check zone. Today both hints share one `text` prop, "Check it off." (HabitList.vue, around line 179). They get their own text: "Strike it." for good habits and "Tap it." for bad ones. A bad habit's press means giving in, so "Strike it." would teach a new player the opposite of what happens. Titles and rules lines are unchanged. Copy is my call; the user reviews it.
- **Accessibility.** It's a real `<button>` with `aria-label` "Complete {name}" / "Overdrive {name}" as now, `aria-pressed` once struck, and disabled when resting or spent with no Overdrive left.

## The rest of the UI

The mock only shows the main screen. The build makes the pieces reusable and applies them everywhere: pixel-cut frame and corners, bevel, lip and press, square checkbox, struck grey. Then the user reviews each screen in the real app and asks for tweaks. Apply them to:

- **Main screen:** top bar and menu button, FightStage blocks (square HP bars), BossBar, ActivityLog (a pixel-cut panel), ProgressSummary (desktop).
- **Modals:** `ui/Modal.vue` and everything built on it (AddHabitModal, HabitStatsModal, QuestDetailModal, QuestForm, EventChoiceModal, RerollSkillRow).
- **Popups:** ItemDropPopup, QuestCompletePopup, QuestMissPopup, QuestUnlockPopup, BossSkillPopup, MissedSkillsPopup (its checkboxes become the square checkbox), ReviveNotice, DeathScreen, SpotlightHint.
- **Pages and menus:** HighScorePage, NewHeroScreen, AppMenu panel.
- **Controls:** every button gets 2px pixel corners. Primary (filled silver) buttons get the lip and press. Outline buttons (like "+ New habit") stay outlined. DayPicker chips and text inputs get pixel corners.
- **Diamonds:** the diamond as a check is retired. Crest diamonds on panel edges go with the panel frames. Any other diamond is the builder's call, flagged in review.

## Constraints

- From CLAUDE.md: mobile first, safe areas, ~44px tap targets, nothing behind hover, persistence stays behind the store layer, assets bundled locally, keep animation cheap on mid-range Android. `clip-path` polygons and inset shadows are fine; avoid blur and `filter` on rows.
- Colours come from tokens, not hard-coded values in components, so the later colour session only touches the palette.
- Player-facing text stays terse (see the feedback memory on UI text).

## Left to the builder

- **Where the CSS goes.** Evolving `src/assets/scss/themes/ashen.scss` in place looks cheapest: its family selector already outranks scoped styles, and the tag keeps the old version. Splitting it up is fine too.
- **Themes and the menu.** Theme handling in `store/themeStore.ts`: remove `minimalist`, `crypt` and `hellforge` from the list, and load a saved value for any of them as `moonlit`, the way `'ashen'` already loads as `moonlit`. Hide the menu's Theme section while only one theme is left. Whether to delete the Crypt/Hellforge palette files or leave them unused is your call.
- **Minimalist's base styles.** The components' scoped styles are the base layer under the theme. Keep them; don't refactor them now.
- **Components.** How to split them: for example, a press-button component, and a pips component replacing `RankDiamonds.vue`.
- **Exact values** where the mock is silent, and the desktop layout.
- **Tests.** Update the HabitListItem / HabitList specs for the button. Two HabitList hint tests are already flaky (about 1 in 8 runs), so rerun before chasing them.
