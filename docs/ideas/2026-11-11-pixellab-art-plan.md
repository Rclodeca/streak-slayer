# New art with Pixellab: plan (2026-11-11)

Goal: replace the free online art (heroes, bosses, items) with original art in one matching style, generated with the Pixellab MCP. Nothing here is built yet. Needs a Pixellab subscription: the trial's 40 generations are spent (38 used, 2 left).

## What we learned on the trial

- **The tool that works:** `create_image_pro` with a style image, a short description of *what* to draw (the style comes from the image), and a small canvas. `create_character` (standard and v3) looked bad: wrong proportions, too many pixels for chibi.
- **Canvas size controls the look.** At 128px the model draws realistic adults with too much detail; at 64px it draws the chunky, big-headed style of the reference sheet.
- **Price per call, not per image.** A small canvas buys more candidates for the same price:

  | Canvas | Cost | Candidates |
  |---|---|---|
  | 32x32 | 10 generations | 64 |
  | 64x64 | 10 generations | 16 |
  | 65-84 (e.g. 80x80) | 15 generations | 9 |
  | 86-128 | 10 generations | 4 |

- **A clean style image matters.** The blurry screenshot of the reference sheet gave muddy colours (~250 per figure). Use crisp Pixellab output as the anchor from now on.
- **A labelled reference image keeps a design.** Passing the current warrior as a `reference_images` entry ("character design: ...") gave 16 versions of him in the new style.
- **One call, one description.** You can't ask for a different thing per candidate, but a broad description ("warriors, mages and rangers") spreads variety across them.
- **Gotcha: candidates are cut from one sheet.** The 16 (or 64) candidates are one big sheet sliced on a grid, and the model doesn't draw on the grid, so tiles chop figures. Fix (free, local): put the tiles back together in order, then split out each figure as a connected blob of pixels. Done for the hero batch.
- **No facing control.** Figures mostly face forward.
- **Free and good:** `vfx_workbench` effects (crit hit, coin burst, level up, death shatter), worth using later.
- **Rule:** before any paid generation, show every input (style image, description, size, cost) and wait for a clear go.

## Pixel size in the app

One art pixel must land on whole device pixels on phones.

- New heroes and bosses: **3 CSS px per art pixel** = 6 device px on 2x, 9 on 3x. One build works on every phone (no @3x files).
- Hero: ~48 px tall in a 64 box -> ~144 CSS px on screen (today 148).
- Boss box today is 192 CSS px = exactly 64 art px.

## Heroes (done)

- Batch kept: `assets/pixellab/2026-11-11-heroes/` (assets/ is git-ignored, so back it up).
  - `fixed/figure-01..16.png`: whole figures, each centred and foot-aligned in a 64 box. 4 knights, 4 mages, 4 rangers, 4 mixed (viking, witch, white-hooded archer, big-shield knight).
  - `sheet.png`: the rebuilt 256x256 sheet: **use this as the style anchor for bosses and items.**
  - `hero-01..16.png`: the original chopped tiles.
- To do: user feedback was "a good bit less chibi". A rerun would say "heroic proportions, slightly stylised" in the description (10 generations).
- To do: colour cleanup (free), and pick one per class.

## Bosses

Bosses must use the same pixel size as the heroes, so "larger" means more pixels tall.

- **Size:** start with the 64 box, bosses filling it (~58-62 px tall, ~180 CSS px, 1.3-1.5x the hero). Fits today's stage. Optional 80 box (~220 CSS px) for the rare 5x set pieces, which needs the stage layout adjusted.
- **Style image:** the hero `sheet.png`.
- **One batch per family** (18 bosses: armored, warded, brute, arcane in base/3x/4x/5x, plus balanced and tank):
  - Armored: "towering armored warlord bosses, dark plate, glowing eyes, from rusted brute to golden juggernaut"
  - Arcane: "sorcerer bosses, from robed adept to void-calling eldritch caster"
  - Brute: "savage beast and berserker bosses, from wild brute to apex monster"
  - Warded: "magical guardian bosses, from stone warden to radiant ethereal sovereign"
  - Mixed: "hooded rogue boss and huge troll chief boss"
- **Cost:** ~5 batches x 10 = 50 generations, plan for 60-80 with retries.
- They don't need to look like today's bosses.

## Items

- **Size:** 32x32, shown at 2 CSS px per art pixel = a 64 CSS px icon (today 63), 4 device px on 2x and 6 on 3x. Today's 40 grid would be twice as fine as the new heroes. 32 only looked distorted before because it shrank big painted art; native 32 art won't.
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
2. Colour cleanup to a small palette.
3. User picks.
4. Add credits to `CREDITS.md`.

## Pipeline changes needed

- `npm run sprites` resamples art to 1.5 CSS px per art pixel with two builds. New hero/boss art at 3 CSS px needs a path that copies native art 1:1 (no resampling, one build), plus the stage/hero sizes updated to match.
- Items: `npm run item-icons -- --grid 32` and the `main.scss` slot sizes per grid; check whether Pixellab's own outline makes the pipeline's added outline redundant.
- The split script (tiles -> whole figures) was a scratch file; add it under `scripts/` when this starts.

## Budget

Roughly 110-180 generations for bosses and items together. Check a plan's monthly generations against that. Plans (as quoted by Pixellab's help on 2026-11-11): Pixel Apprentice $12/mo, Pixel Artisan $24/mo, Pixel Architect $50/mo.
