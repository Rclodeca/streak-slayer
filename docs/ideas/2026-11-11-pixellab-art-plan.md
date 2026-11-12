# New art with Pixellab: plan (2026-11-11)

Goal: replace the free online art (heroes, bosses, items) with original art in one matching style, generated with the Pixellab MCP. Heroes and bosses are generated and picked; nothing is in the game yet. Subscription: Pixel Apprentice, 2000 generations a month (resets 2026-12-11), about 1895 left.

## What we learned

- **The tool that works:** `create_image_pro` with a style image, a short description of *what* to draw (the style comes from the image), and a small canvas. `create_character` (standard and v3) looked bad: wrong proportions, too many pixels.
- **Style image: the hero sheet** (`assets/pixellab/2026-11-11-heroes/sheet.png`) for everything. A boss sheet as the anchor made bosses too serious and realistic next to the heroes.
- **Canvas size controls the look.** 64px draws the chunky hero style; 85px gives bosses about 1.5x a hero's height; 128px draws realistic, over-detailed figures.
- **Price per call, not per image.** A small canvas buys more candidates for the same price:

  | Canvas | Cost | Candidates |
  |---|---|---|
  | 32x32 | 10 generations | 64 |
  | 64x64 | 10 generations | 16 |
  | 65-84 (e.g. 80x80) | 15 generations | 9 |
  | 85x85 | 15 generations | 16 |
  | 86-128 | 10 generations | 4 |

- **One run, several types.** A description listing 3-4 types ("troll, dragon, serpent, wraith") splits the 16 candidates about evenly between them. One combined run per batch, not one run per type.
- **Wording:**
  - "filling the canvas" makes figures big, but wide ones (dragons) get cut off at the edge.
  - "each whole body in frame" keeps them whole but smaller; add "towering" or "tall" to keep the size.
  - Describe what you want, not what you don't ("jaws closed", not "no fire").
  - A naga has arms, so it gets spears; "coiled serpent" doesn't.
- **Gotcha: candidates are cut from one sheet.** The 16 candidates are one big sheet sliced on a grid, and the model doesn't always draw on the grid, so tiles can chop figures. Fix (free, local): put the tiles back together in order, then split out each figure as a connected blob of pixels, folding small strays (flames, sparks) into the nearest figure. Some runs stay inside their tiles; then each tile is one figure.
- **No facing control.** Figures face forward; bosses are mirrored to face the hero.
- **Small fixes by hand, free.** Eyes were fixed pixel by pixel on a numbered zoom grid of the face (cell names like "K5"), which works better than an AI repaint.
- **Free and good:** `vfx_workbench` effects (crit hit, coin burst, level up, death shatter), worth using later.
- **Rule:** before any paid generation, show every input (style image, exact description, size, number of runs, total cost) and wait for a clear go. Re-confirm after any change.

## Size on the stage

Checked with a mock in the real app (both art sets swapped onto the phone stage):

- **Phone stage:** 1.5 CSS px per art pixel on 2x screens (3 device px), 4/3 CSS px on 3x screens (4 device px). Every pixel is exact, the same two-build rule today's sprites use (`spriteUrl.ts`). On 3x phones the fighters are about 11% smaller.
  - Hero: ~72 CSS px tall on 2x, ~64 on 3x (today ~98).
  - Boss: ~115 CSS px on 2x, ~105 on 3x (today ~120).
  - At 2 CSS px per art pixel the bosses ran into the boss name, HP bar and menu button.
- **Placement:** each fighter centred on its plinth; boss feet 4px below the plinth's top, hero feet 8px below. Bosses mirrored to face left.
- **Odd screen ratios** (some Androids, e.g. 2.625): no pixel art is exact there, today's included. Later fix: size art from the exact device pixel ratio so it always lands on whole pixels.
- Warlord art with a raised greatsword can touch the menu button once mirrored; watch for that when picking.

## Heroes (generated, picks open)

All in `assets/pixellab/` (git-ignored, so back it up):

- `2026-11-11-heroes/fixed/figure-01..16.png`: 4 knights, 4 mages, 4 rangers, 4 mixed. `sheet.png` there is the style anchor.
- `2026-11-11-heroes/eyes/figure-05..08.png`: the final mages (06 and 07 with fixed eyes, 05 and 08 original).
- `2026-11-11-classes/`: 16 rogues, 16 paladins (`fixed/`), 16 necromancers (`whole/`), for possible new classes.
- To do: user picks one per class; colour cleanup if needed.

## Bosses

### Families

Each family has several images. A new boss gets a random image from its family, so a golem always means the same kind of boss but doesn't look identical each time. Names and stages stay per tier.

| Family | Emphasis | Art (kept) | Count |
|---|---|---|---|
| Armored | Armor | Trolls | 4 |
| Warded | Magic resist | Golems | 4 |
| Brute | Physical attack | Horned beasts | 4 |
| Arcane | Magic attack | Liches + dark wizards | 9 |
| Balanced (Drifter) | Nothing | Giant spiders | 6 |
| Tank (Colossus) | Health | Bearded giant kings | 4 |
| **New:** Armor + physical | Armor, physical attack | Warlords (dark + crimson) | 7 |
| **New:** Armor + magic | Armor, magic attack | Dragons | 5 |
| **New:** MR + physical | Magic resist, physical attack | Coiled serpents | 4 |
| **New:** MR + magic | Magic resist, magic attack | Wraiths | 4 |

51 images in all. Where they are (`assets/pixellab/`):

- Armored: `2026-11-11-bosses-run-a2/whole/` 01-04
- Warded: `2026-11-11-bosses/whole/` 13-16
- Brute: `2026-11-11-bosses/whole/` 09-12
- Arcane:
  - liches: `2026-11-11-bosses/eyes/` 05-08 (eyes hand-fixed)
  - wizards: `2026-11-11-bosses-run-c/whole/` 03, 06, 09, 12, 15
- Drifter: `2026-11-11-bosses-run-c/whole/` 01, 04, 07, 10, 13, 16
- Colossus: `2026-11-11-bosses-run-b/whole/` 09, 11, 12, 15
- Armor + physical: `2026-11-11-bosses/whole/` 01-04, plus `2026-11-11-bosses-run-c/whole/` 02, 05, 14
- Armor + magic: `2026-11-11-bosses-run-b/whole/` 01-04, 13
- MR + physical: `2026-11-11-bosses-run-a2/whole/` 09-12
- MR + magic: `2026-11-11-bosses-run-a/tiles-boxed/` 13-16 (drawn with the boss sheet, a little more detailed)

Rejected art is kept in each run's `rejected/` folder.

### Hybrid balance (not decided)

- Armor + physical is hard for physical builds twice over (hard to hurt and hits them hard); MR + magic does the same to magic builds. Runs lean one damage type, so these could wall a run.
- Suggestion: hybrids get two tiers (base and 3x), about 2x each stat instead of 3-5x, and are a little rarer.
- Check with a small, time-capped sim first.

### To build (built 2026-11-11, uncommitted: items 1-4; heroes not started)

1. Hybrid families in the engine: personalities, stats, names, weights.
2. Boss art by family:
   - pick a random image when a boss is made;
   - save it on the boss (so a reload keeps it) and on high-score runs;
   - never the same image twice in a row.
3. Stage scenes for the four new families (painted in code, free).
4. Sprite pipeline for native pixel art (below).

### Making more

85x85 canvas, hero sheet, one run per batch of 3-4 types, 15 generations per run. Ideas for later families: demons, vampires, treants, krakens, mimics.

## Items

- **Size:** 32x32 at 2 CSS px per art pixel = a 64 CSS px icon (today 63), 4 device px on 2x and 6 on 3x. Today's 40 grid would be finer than the new heroes. 32 only looked distorted before because it shrank big painted art; native 32 art won't.
- **Style image:** the hero `sheet.png` at first, then the best icons from the first item batch.
- **One batch per type** (~94 items), 64 candidates each:
  - Swords and blades: "fantasy swords and daggers, from rusty iron to glowing legendary blades"
  - Heavy weapons: axes, maces, hammers
  - Ranged: bows, crossbows, longbows
  - Magic: staffs, wands, rods
  - Armor: shields, chest armor, helmets
  - Trinkets and relics: rings, amulets, charms, hourglasses, censers
- Pick the best match for each named item (Bloodthorn Blade, Crystal Longbow ...). A distinctive item that no batch covers: a dedicated one-image run, `create_image_pro_flash`, 5 generations.
- **Cost:** ~6 batches x 10 = 60 generations, plan for 60-100.

## After every batch (free, local)

1. Rebuild the sheet from the tiles and split out whole figures.
2. Fix small flaws by hand (numbered zoom grid).
3. User picks.
4. Add credits to `CREDITS.md`.

## Pipeline changes needed

- `npm run sprites` resamples painted art to 1.5 CSS px per art pixel with a 2x and a @3x build. Native pixel art should be scaled by whole steps instead (3 device px per art pixel for the 2x build, 4 for @3x), not resampled. Check how the phone stage's base-build sizing combines with that when wiring it up.
- Boss sprites are drawn mirrored (flip in the build, not in CSS, so effects and hit areas stay simple).
- Built for bosses as `npm run boss-art` (`scripts/boss-art/`, picks in `families.json`): ×3 and ×4 files per image, padded to multiples of 6 so 4/3 CSS px per art pixel stays exact; `<img srcset="x.png 2x, x@3x.png 3x">` sizes them (`spriteSrcset`). Hero placement (feet 8px below the plinth) waits for hero art.
- Items: `npm run item-icons -- --grid 32` and the `main.scss` slot sizes per grid; check whether Pixellab's own outline makes the pipeline's added outline redundant.
- The scratch scripts (tiles -> sheet, blob split, tile boxing, eye grid) go under `scripts/` when this starts.

## Budget

Used so far: 38 trial generations, then 30 (hero classes) + 75 (bosses) on the subscription. Items need about 60-100 more; plenty left this month.
