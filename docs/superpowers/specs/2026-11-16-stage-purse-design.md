# Stage purse — design

Gold and gems on every phone tab, in one small plate beside the menu. Mock: `docs/mockups/currency-placement.html` (picked: round 1's B, rebuilt on real screens).

## Why

Gold and gems showed only on the Shop (two plates over the scene) and on Talents (brass chips in the banner, a different look). Players earn both on the fight tabs and spend them on Shop and Talents, so the balance belongs on every tab, in one place, without costing list height. Currency matters less than the fight, so it stays small.

## What

- **The plate.** One dark plate (the Shop scene's plate look), gold then gems, 14.5px bold serif numbers with 13px icons and a tight gap, no divider. Full numbers (`1,540`). It sits just left of the side rail (4px gap), its top edge level with the rail's top. Same spot on Skills, Quests, Trials, Shop, Talents and Hero.
- **Replaces** the Shop scene's two plates and, on phones, the Talents banner chips. Desktop keeps its own (side column, Talents modal).
- **Focus strip:** no plate. Gains still show.
- **On a gain:** a small green `+N` with the currency's icon rises and fades under the plate (beside the cog on the Focus strip). Spending shows nothing beyond the number changing.
- **Colours:** gold `#f0c64e` and gem `#6fd6ea` (round 1's), as their own tokens `--icon-coin` and `--icon-gem`, used for gold and gems everywhere (icons, gem prices, log, toasts). Light theme gets darker versions for its pale cards; the purse plate is dark in every theme, so it always uses the bright pair.
- **Boss 4px lower** on the arena stage (2 art px): the plate covers the tops of 28 of 51 boss sprites (horns, crowns, weapon tips; no faces). 4px is the most that keeps the boss's feet off the hero's name line.

## Approaches considered

Round 1: plates top-left (A), beside the menu (B), a ledger over the tab bar (C), only when it matters (D). Round 2–5 on real screens: a top HUD bar, the purse in or under the side rail, a ledge under the stage, on the hero's HP bar (small, outlined, or in a dark bar), a slim bar under the stage, an L-shaped rail arm. B won: no list height, nothing moves, one spot on every tab.

## Left to the builder

- The plate is part of the corner slot (AppShell), so FightStage, HomeBase, ShopScene and MenuCorner carry it without changes.
- Gains are watched in the plate's component, not the stores; the first value on mount is not a gain.
