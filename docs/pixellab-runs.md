# Pixellab run log

Every paid Pixellab generation, what went in and what came out. **Add an entry for every run, the same session it is made** (rule in `CLAUDE.md`). Newest first. Times are UTC. Art lives in `assets/pixellab/` (git-ignored, back it up). See also `docs/ideas/2026-11-11-pixellab-art-plan.md` for the plan and the roster.

Entry template:

- **Run / folder / job id / time**
- **Tool + settings:** tool, canvas, transparent or not, style image (the local file, not the upload id; uploads expire after 3 days), reference images, palette, max colours
- **Description:** exact text
- **Cost + candidates**
- **Result:** what came out, what worked, what didn't
- **Why / what changed from the run before**

## Style images (what each upload really was)

| Upload id | Local file | Used for |
|---|---|---|
| 89910f21 | `assets/pixellab/2026-11-11-heroes/sheet.png` (256x256, chibi-ish hero sheet) | first boss runs; classes |
| 338fe28e | `assets/pixellab/2026-11-11-bosses/sheet.png` (the first boss sheet) | boss run "a" only (wraiths) |
| 8423e6ae | `assets/pixellab/2026-11-11-heroes/sheet.png` (same file as 89910f21) | hero runs 2026-11-11 late |
| 7c521a05 | `assets/pixellab/2026-11-11-heroes-run2/sheet.png` | some warrior runs |
| 88aa7296 | `assets/pixellab/2026-11-11-heroes/sheet.png` | all runs on 2026-11-12 below |
| 25630e04, 2af5bd1d | scratch `sheet256.png`, `sheet256b.png` (session scratchpad, gone) | very first hero tries |
| f7f1a9d3 | a screenshot from `~/Documents` | the very first warrior try |
| e8b00ce0 | `public/sprites/player/warrior.png` | reference image for the chibi warrior |

## 2026-11-12: item art (native 32x32, 2 CSS px per art pixel to match the phone-stage hero)

Items are drawn at 2 CSS px per art pixel (4 device px on 2x, 6 on 3x), like the phone-stage hero (64 cells at 128px) and the bosses. 32x32 is about today's 63px icon.

**Run 1, `2026-11-12-items-swords/`, job 77dadd17-7b85-4b47-acf8-373f50e06904** (calibration)
- Tool + settings: `create_image_pro`, **32x32, transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload e62dbd1c), no reference images, no palette
- Description: `fantasy RPG weapons, one item per tile, centred, filling the canvas: iron sword, steel longsword, curved dagger, glowing runed blade`
- Cost + candidates: **10 generations, 64 candidates**
- Result: 64 clean 32x32 tiles, 16 per type in the order written: iron swords 01-16 (dark, plain), steel longswords 17-32 (bright, gold or dark guards), curved daggers 33-48 (scimitar, sickle and hook shapes), runed blades 49-64 (blue, purple, green and red glowing blades). One outline, no stray pixels, the figure fills the tile. Checked in `gallery.html` (8x) and a 4x preview. `scripts/pixellab-gallery.cjs` now reads the tile size from the PNG header (it was fixed at 85).
- Why: first item run; checks pixel density and outline against the hero before the full batches.
- Finding: the tiles were clean but generic (plain iron/steel swords, none of our items' designs). The description named types, not our items, so run 2 passes the current icons as references.

**Run 2, `2026-11-12-items-swords-refs/`, job 6d98fe8b-de87-456f-9893-c8d739a4f058** (current item art as references)
- Tool + settings: `create_image_pro`, **32x32, transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 60f7c14b), no palette
- Reference images (the 240px current icons, unchanged), each with its usage note:
  1. `public/sprites/items/steel-sword.png` (upload 633f782b): "steel sword: keep its shape, colours and small gold guard"
  2. `public/sprites/items/bloodthorn-blade.png` (24a209cd): "bloodthorn blade: keep the pink crystal blade and crescent guard"
  3. `public/sprites/items/vampiric-fang.png` (8242cc10): "vampiric fang: keep the flame-lit dagger and its orange glow"
  4. `public/sprites/items/chaos-blade.png` (1c681b35): "chaos blade: keep the dark purple blade and its swirling energy"
- Description: `redraw each reference item as a native 32x32 pixel art game icon, keeping its exact design, shape and colours, one item per tile, centred, filling the canvas: steel sword, pink crystal bloodthorn blade, flame-lit vampiric fang dagger, purple void chaos blade`
- Cost + candidates: **10 generations, 64 candidates** (4 references did not change the price)
- Result: 64 tiles, 16 per item in the order given: steel sword 01-16, bloodthorn blade 17-32, vampiric fang 33-48, chaos blade 49-64. Each follows its reference's design and palette (steel blade with gold guard, pink crystal with purple crescent guard, orange flame blade, dark purple blade), unlike run 1's generic swords. The 240px references worked at a 32px canvas. Variants differ mostly in guard shape and effects (sparks, smoke, rings); the plainer ones are closest to the in-game icons. Gallery: `gallery.html` (8x).
- Why / changed from run 1: references added, description names our items instead of generic types.
- Note: these references were our 240px icons, which are downsampled and muddy. The originals (200px painted source art, listed in `CREDITS.md`, files in `assets/`) are sharper, so run 3 uses those.

**Run 3, `2026-11-12-items-sheet16/`, job ba3324be-f0ff-43d4-963a-d659583a2556** (contact-sheet test: 16 items in one run, from the original art)
- Tool + settings: `create_image_pro`, **128x128, transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 7d8fa5bc), no palette
- Reference image (one): a 4x4 contact sheet of the 16 items' original 200px art, 800x800, built in the session scratchpad as `item-sheet-16-originals.png` (copy kept in the run folder), usage "16 item designs in a 4x4 grid, keep each one's shape and colours" (upload b25a18e1). Sources (CREDITS.md), row by row: silver-stiletto (crystal-lance.png), lucky-dagger (8bit-dagger-thief-weapon-005...), echoing-blade (scythe-double-blade.png), assassins-edge (scimitar.png); serrated-ripper (crystal-claws-wolverine.png), runed-warblade (rpg-greatsword-massive-twohanded-blade-214-v5...), warlords-greatsword (steel-broadsword.png), godslayer-greatblade (golden-freeze-ray.png); berserkers-fury (rpg-flaming-sword-fire-enchanted-048...), runeforged-spellblade (crystal-kris-dagger.png), warded-longsword (sai.png), rusty-blade (rusted-hand-axe.png); executioners-axe (steel-battle-axe.png), berserkers-war-axe (battle-axe.png), worldbreaker-maul (war-hammer (1).png), firebird-staff (rpg-phoenix-staff-firebird-wing-017...)
- Description: `redraw all 16 items from the reference sheet as native pixel art game icons on a 4x4 grid of 32x32 cells, same order and positions, keeping each item's exact design, shape and colours, each centred in its cell, clean outline, no extra sparks or particles`
- Cost + candidates: **10 generations, 4 candidates** (each a 128x128 sheet of 16 items)
- Result: **the sheet approach works.** 4 sheets of 128x128 (`sheet-01..04.png`, plus `reference-sheet.png` and a per-item slice in `tiles/<item>-c<N>.png`; `tile-NN.png` = item*4 + candidate for `gallery.html` at 6x, one row per item). All 16 items sit in their own 32x32 cell, in order, keeping their original design and colours. Candidates 2 and 4 have a dark outline like the hero art; 1 and 3 have soft pale edges with little outline. Candidate 4 draws the items larger: 13 of its 16 cells have opaque pixels on the cell border (the figure may be clipped), against 5 of 48 cells in candidates 1-3.
- Why / changed from run 2: sheet of 16 instead of 4 separate references, originals instead of the downsampled icons, asks for no sparks.
- Verdict (user): **looks bad.** Redrawing the old art is dropped; next runs are brand-new designs, one specific description per item.

**Run 4 ("Run D"), `2026-11-12-items-melee-d/`, job e1ef6270-0cc7-4ebc-818f-3a8461e80305** (brand-new designs, no references)
- Tool + settings: `create_image_pro`, **32x32, transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload fd5def41), no reference images, no palette
- Items, in order: Chaos Blade (`chaos-blade`), Worldbreaker Maul (`worldbreaker-maul`), Headsman's Axe (`headsmans-mark`), Echoing Scythe (`echoing-blade`)
- Description: `fantasy RPG weapons, one item per tile, centred, filling the canvas: wavy twisted purple-black flamberge with a swirling void eye in the guard; massive stone maul with a cracked boulder head, glowing cracks and iron bands; tall black poleaxe with a wide crescent blade, a skull pommel and a glowing purple edge; ghostly scythe with a pale translucent blue blade and a faint echo outline beside it`
- Cost + candidates: **10 generations, 64 candidates**
- Result: 64 clean tiles, 16 per item in order (chaos blade 01-16, maul 17-32, headsman's axe 33-48, scythe 49-64). Maul: the strongest, stone heads with iron bands and lava-orange or gold cracks (18-24, 28, 32). Scythe: clear pale-blue ghost blade; 57-64 show the echo outline (a doubled edge). Chaos blade: mostly a straight dark purple sword; wavy in only 02-04, void eye clear in 09-11. Headsman's axe: came out double-bladed, not a single crescent; skull pommel on a few (33, 35). Chaos blade and headsman's axe are very dark and low-contrast on the dark game background.
- Verdict (user): "decent". Next: generate lots of varied new items, the user picks and items get renamed to fit, instead of one design per existing item.
- Why / changed from run 3: new designs written per item (unique silhouette + one signature detail from its name and effect) instead of redrawing the old art; run 1's 4-items-per-32px format, which kept order and came out clean.

**Run 5, `2026-11-12-items-epic-variety/`, job 3e020080-c9e8-4ccd-9005-b02995ca7e82** (varied epic items, not tied to existing items)
- Tool + settings: `create_image_pro`, **32x32, transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload fd5def41), no reference images, no palette
- Description: `epic legendary fantasy RPG loot items, ornate, glowing and unique, each one different, one item per tile, centred, filling the canvas: legendary sword; legendary staff; legendary armor or helm; legendary relic or amulet`
- Cost + candidates: **10 generations, 64 candidates**
- Result: **best item run so far: 64 different items, almost no repeats**, clean outline, bright and readable. It went wider than the four kinds asked for, 8 per row: swords 01-08 (fire, ice, gold, void...), staffs 09-16 (skull, phoenix, lightning, orb...), body armour 17-24 (gold plate, leaf mail, void robe, paladin, ranger coat, crimson plate, frost plate, dark cloak), helms and hats 25-32 (horned, knight, wizard hat, winged, hood with red eyes, crown, gold visor, demon mask), shields 33-40 (scale, spiked, lion, cross, star, round, skull, frost), relics 41-48 (tome, gold orb, chalice, hourglass, rune book, heart, leaf seed, scarab), amulets and rings 49-56 (ruby, red eye, winged, gold locket, emerald ring, green torc, sapphire brooch, rune medallion), mixed 57-64 (axe, hammer, bow, sword, gauntlet, mace, treasure chest, winged boots).
- Why / changed from run 4: loose nouns plus "each one different" for variety (run 4's exact designs gave 16 near-copies per item); the user will pick and rename items to fit.

## 2026-11-12: dark knights + brute beasts (replace the Armored trolls, new Brute art)

All six: `create_image_pro`, **85x85, transparent, style = heroes/sheet.png**, 16 candidates, **15 generations each**. Tiles are 85x85 `tile-NN.png`, a 4x preview `sheet.png` (don't judge quality from it) and a pixelated `gallery.html`, in the folder. Balance after run 6: 1,640 (it includes the two item runs).

**Run 1, `2026-11-12-dark-knights-beasts/`, job f9ba9a14-4d9c-4842-9dbf-0965a7db4115, 08:08**
- Description: `Four towering dark knights in full black plate with closed horned helms, glowing ember visors, tower shields and heavy maces, each whole body in frame, and four towering savage beasts: a tusked war boar, a dire wolf, a hulking cave bear and a spiked ram, each whole body in frame, jaws closed`
- Result: bad. Short, stubby "baby chibi" knights; beasts plain; tiles had stray pieces of neighbours along the edges. Layout: knights 01-08, boars 09-10, wolves 11-12, bears 13-14, rams 15-16.
- Why it failed: I left off the opening that the original boss runs used (`huge menacing fantasy RPG bosses filling the canvas, standing, facing forward`), so the hero sheet's chunky style won.

**Run 2, `2026-11-12-dark-knights-beasts-b/`, job 07b21c1b-e66f-4928-affc-374f55b25b8a**
- Description: `huge menacing fantasy RPG bosses filling the canvas, standing, facing forward: dark armored knight with horned helm, glowing ember visor, tower shield and heavy mace; savage tusked war boar; monstrous dire wolf; hulking cave bear`
- Result: realistic and detailed like the original bosses, 4 of each type (knights 01-04, boars 05-08, wolves 09-12, bears 13-16), clean tiles. **Beasts good (boars, wolves, bears are keepers).** Knights too menacing: lava cracks, spikes, red glow (the "glowing ember visor").
- Changed from run 1: restored the original boss opening.

**Run 3, `2026-11-12-dark-knights-c/`, job db683a3b-8f74-43f0-99c1-9e08dfa6ce35**
- Description: `huge fantasy RPG bosses filling the canvas, standing, facing forward: dark knight in black plate armor with a horned helm, tower shield and heavy mace; dark knight in dark steel armor with a plumed helm and a cloak, kite shield and a morning star; dark knight in battered black plate with a visored helm, round shield and a warhammer; dark knight in black plate with a great helm, tower shield and a spiked club` (knights only)
- Result: chibi again (short, stubby). 05-08 (plumes + capes) were the nicest.
- Changed from run 2: dropped "menacing" and the ember visor to tone it down. **Learned: "menacing" is what keeps the proportions tall.**

**Run 4, `2026-11-12-dark-knights-d/`, job 7c4af253-335a-44d8-a04a-f4f4db01822d**
- Description: same as run 3 with `huge menacing fantasy RPG bosses filling the canvas, ...` restored.
- Result: best knights so far (detailed, bulky, no lava), but short and wide, with a big flat shield covering the body. Not as ornate or tall as the first-run warlords.
- Changed from run 3: "menacing" back in.

**Run 5, `2026-11-12-bosses-variety/`, job 7f147dcb-d947-48d4-9c3a-d2061240c2ea** (open-ended: no types named)
- Description: `huge menacing fantasy RPG bosses filling the canvas, standing, facing forward: a variety of towering bosses`
- Result: the best batch of the day, as good as the original boss run: tall, ornate, sharp. The model picked 16 different bosses: 01 spiked iron knight with a morning star, 02 skeleton king with a skull staff, 03 lava demon-knight with a flaming hammer, 04 mossy rune golem, 05 winged horned demon with a greatsword, 06 purple-robed wraith/sorcerer, 07 red winged dragon-man with a greatsword, 08 armored crab/ogre brute, 09 black winged knight with gold runes and a purple sword, 10 treant with a club, 11 hooded axe brute (barbarian), 12 fat hooded reaper with a scythe, 13 gold armored golem knight with sword and shield, 14 cthulhu fisher-king with two tridents, 15 four-armed purple wraith, 16 lion-headed minotaur with two axes.
- Notes: tiles 13, 15 and 16 have stray pieces of a neighbouring figure along the left edge (clean-up step: keep only the main figure). 01 and 13 are the dark-knight / armored (troll replacement) candidates; 11, 16 and 08 fit Brute.
- Learned: **naming no types gives the best, most varied bosses.** Naming types and loadouts (runs 1-4) pulled the model toward the stubby hero-sheet look. Keep prompts short and open.

**Run 6, `2026-11-12-bosses-control/`, job 2745e728-6c2e-43f0-b5a4-a30c773bc5c8** (control: the original 2026-11-11 boss run repeated exactly)
- Tool + settings: `create_image_pro`, 85x85, transparent (default, as the original), style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 88aa7296), no references, no palette, no seed (the original had none either)
- Description: `huge menacing fantasy RPG bosses filling the canvas, standing, facing forward: dark armored warlord, skeletal lich sorcerer, savage horned beast, ancient stone golem` (word for word the original)
- Cost + candidates: 15 generations, 16 (warlords 01-04, liches 05-08, horned beasts 09-12, golems 13-16)
- Result: same types, same size (figure about 80x80 art px both runs) and same speckle (lone-pixel 44% vs 49%), but **more colourful and less cohesive**: saturation 38.6% vs 29.5%. The original batch shares one muted brown-grey palette; the control gives each figure its own colour (red minotaur, purple/blue liches, lava and crystal golems) and the horned beasts read more cartoonish. Side by side: `assets/pixellab/control-vs-original.html` (3x).
- Saturation across all boss runs: 2026-11-11 runs 29.5 / 36.3 / 42.7 / 33.9 / 38.7%; 2026-11-12 runs 32.6 / 20.8 / 34.0 / 38.6%. No shift between days.
- Finding: **the original run was a lucky draw, not a lost recipe.** Same prompt + same sheet + no seed gives a different-looking batch each time; the original happened to be the most muted and cohesive of all the boss runs. No sign Pixellab's output changed.
- Next lever (not tried): pass a `palette` taken from the original run's colours so every new boss uses the same muted palette.
- User verdict: control 01-04 (dark armored warlords) are decent, to replace the Armored trolls. Overall still noticeably worse than the original run.
- **Used:** 01-04 replaced the trolls as the Armored family on 2026-11-12. They were cleaned to `whole/figure-01..04.png` (2 stray px dropped from 01), set in `scripts/boss-art/families.json` and built with `npm run boss-art` (84x84 art px each). All four are mirrored, the build's default (01, 02 and 04 were briefly set `"mirror": false`, then flipped back).
- Model check: every receipt on both days says `model: pro` with the same style settings, cost and candidates. Job times for 85x85 runs: 2026-11-11 took 119-137s each; 2026-11-12 took 138-287s (about 185s average). That fits a different model but also just a busier queue. Pixellab's help search (free) found no confirmed change to `create_image_pro` on these dates. It says rollouts can cause sudden output changes, and there's no model-version or quality parameter to pin; `seed` exists but isn't promised to reproduce across rollouts.

**Looks "blotchy and fuzzy"? (checked 2026-11-12, after run 5)** Not the art. Measured every tile from the 2026-11-11 boss runs and the 2026-11-12 runs: same colour counts (30-48 average), no soft-alpha pixels, same share of near-duplicate colours. The blur came from how I opened the preview: `sheet.png` is 1360px wide, so a browser shrinks it to fit the window and smooths it. The earlier galleries (`gallery*.html`) use `image-rendering: pixelated`. Use `node scripts/pixellab-gallery.cjs <folder>` to write a crisp `gallery.html` (3x, pixelated) and open that. Each 2026-11-12 folder has one.
- **Update:** the user still found the pixelated gallery "still bad", so the scaling explanation is not the whole story. Second check: single-pixel speckle (pixels sharing their colour with none of their 4 neighbours) is the same everywhere. It's about 40-50% for the 2026-11-11 raw tiles, their `whole/` and `fixed/` picks, the built in-game sprites (46%) and today's runs (39-48%; run 1 is 27% because it's chibi). The 8x crops do show today's armor reading noisier, but the numbers don't back a regression in Pixellab's output. Open question: is the difference in the subjects and how they're shown, or something not yet measured? `assets/pixellab/compare-2026-11-12.html` shows the in-game picks next to run 5 at 2x for a direct look.

**Findings (checked 2026-11-12)**
- The style image is **not** the cause: the original boss run used the same file (heroes/sheet.png, 256x256, unchanged since before the upload). The old and new tiles have the same colour count (about 40-50) and figure size. `compare-old-vs-new.png` in run 4's folder shows old on top, new below, both 3x: same sharpness.
- The real differences are the shape and the details: old bosses are tall and narrow, ornate, with capes and a big polearm and **no shield**; mine have a **tower shield** that eats half the figure. Earlier sheets of mine were 4x while the old sheet was 1x, which also made mine look softer.
- The 7 warlords (Armor + physical family) already look like dark knights.

## 2026-11-11: bosses (all 85x85, 15 generations, 16 candidates)

| Time | Folder | Style | Description |
|---|---|---|---|
| 20:55 | `2026-11-11-bosses/` | heroes/sheet.png | `huge menacing fantasy RPG bosses filling the canvas, standing, facing forward: dark armored warlord, skeletal lich sorcerer, savage horned beast, ancient stone golem` |
| 21:31 | `2026-11-11-bosses-run-a/` | `2026-11-11-bosses/sheet.png` (the boss sheet) | `huge menacing fantasy RPG bosses filling the canvas, standing, facing forward: hulking troll with a spiked club, upright armored dragon breathing fire, giant serpent naga with scales, ghostly hooded wraith` (only the wraiths were kept) |
| 21:38 | `2026-11-11-bosses-run-a2/` | heroes/sheet.png | `huge menacing fantasy RPG bosses filling the canvas, facing forward: hulking troll with a spiked club, dragon crouched on all four legs with jaws closed, giant coiled serpent with a raised head, ghostly hooded wraith` (trolls 01-04 and serpents 09-12 kept) |
| 21:52 | `2026-11-11-bosses-run-b/` | heroes/sheet.png | `huge menacing fantasy RPG bosses, facing forward, each whole body in frame: dragon crouched on all four legs, hooded wandering bandit with a cloak and curved blade, towering bearded giant king in furs with a huge war hammer` (dragons and giant kings kept) |
| 22:02 | `2026-11-11-bosses-run-c/` | heroes/sheet.png | `huge menacing fantasy RPG bosses, facing forward, each whole body in frame: giant hairy spider with glowing eyes; towering warlord in rusted crimson plate with a crested helmet, a tattered cloak and a huge flail; tall dark wizard in hooded robes with a glowing staff` (spiders, warlords, wizards kept) |

Which images were kept per family: see the Families table in the plan doc.

## 2026-11-11: heroes and classes (approximate; folder mapping not verified)

Order from the session transcripts. Hero runs after the first are numbered in the folder names (`heroes-run2` ... `heroes-run13`, `warriors-run3` ... `warriors-run14`); which call made which folder was not recorded.

- 08:25, `create_image_pro` 128x128, style = a screenshot: `warrior with a sword and shield, standing, facing forward`
- 08:36, 64x64: `fantasy RPG heroes, standing, facing forward: warrior with sword and shield, mage with staff and robes, ranger with bow and hood` (this became the hero sheet, `2026-11-11-heroes/`)
- 09:03, 64x64, reference = player warrior sprite: `chibi warrior, standing, facing forward`
- 20:44, three 64x64 runs, style = heroes/sheet.png (folder `2026-11-11-classes/`):
  - `rogue assassin heroes, standing, facing forward: hooded assassin in dark leather with a face mask and twin daggers`
  - `paladin heroes, standing, facing forward: holy knight in silver and gold armor with a warhammer and a sun-emblem shield`
  - `necromancer heroes, standing, facing forward: hooded dark caster in black and purple robes with a skull staff and green soul fire`
- 23:44 to 01:00 (2026-11-12), 64x64, 13 runs with styles heroes/sheet.png or heroes-run2/sheet.png, trying "slightly more impressive", "huge swords", "chibi style", "clean-shaven" wording. Exact text for each is in the Claude Code session transcript `7cbd563f`.
