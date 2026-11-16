# Pixellab run log

Every paid Pixellab generation, what went in and what came out. **Add an entry for every run, the same session it is made** (rule in `CLAUDE.md`). Newest first. Times are UTC. Art lives in `assets/pixellab/` (git-ignored, back it up). See also `docs/ideas/2026-11-11-pixellab-art-plan.md` for the plan and the roster, and `docs/pixellab-scenes.md` for how to make a scene (the armory).

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
| 524ea01d | `assets/pixellab/2026-11-11-heroes/sheet.png` | armory home base, 2026-11-12 |
| 4704fb7e | `assets/pixellab/2026-11-11-heroes/sheet.png` | boss arena, 2026-11-12 |
| 25630e04, 2af5bd1d | scratch `sheet256.png`, `sheet256b.png` (session scratchpad, gone) | very first hero tries |
| f7f1a9d3 | a screenshot from `~/Documents` | the very first warrior try |
| e8b00ce0 | `public/sprites/player/warrior.png` | reference image for the chibi warrior |

## Standard backdrop size: 216 x 116

**Every background (fight-stage arenas, the Hero tab armory, future dungeons and shop backdrops) is 216 x 116 art px**, drawn at 2 CSS px per art pixel (432 x 232), held to the bottom of its box, sides cropped evenly on narrow phones. 116 rows is the phone fight stage's backdrop box at 390 wide (the painted scene's canvas height); the Hero tab's frame was raised to the same 232px. A notched iPhone's status-bar inset above it is a dark bar, not art. On the stage the hero's feet land on row 108 and the boss's on row 86; on the Hero tab the hero's feet are on row 101. Generate new backdrops at 216 x 116 directly. An older 216 x 108 tile is brought to size with the 8-row floor inpaint (`node scripts/pixellab-floor-pad.cjs <tile> <out-dir>`, then the `inpaint_image` call under "Run 6 extended to 216x116" below), which worked well; the 216x148 extension was horrible and must not be repeated. How-to: `docs/pixellab-scenes.md` section 1.

## 2026-11-15: skill art for the Skills tab mocks (`docs/mockups/skills-fresh.html`)

Four runs to support five fresh Skills tab looks (spellbook rows, hotbar, shrinking queue, streak numeral, dyed cards). The user allowed up to 5 runs (~50 generations) to use freely for these mocks; 4 were used, all submitted at once. All four: `create_image_pro`, **32x32**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 35e2d23b), all four style aspects, no reference images, no palette, no seed, **10 generations, 64 candidates** each (1,120 remaining before the runs). Loose "each one different" recipe from item run 5, with 8 named kinds (4 for flames). Picks were copied to `docs/mockups/skills-fresh/` under the names the mock uses. Galleries: `gallery.html` (6x) in each folder.

**Run 1, `2026-11-15-skills-habits/`, job 742e2dd0-6c1c-4bad-9446-b05fb554a4fa** (habit objects, the skill's own art)
- Transparent.
- Description: `fantasy RPG icons for everyday good habits, glowing and unique, each one different, one item per tile, centred, filling the canvas: running boots; open spellbook; water flask; hearty meal bowl; meditation candle; iron dumbbell; quill and journal; sleeping crescent moon`
- Result: excellent. 8 kinds x 8 variants in the order written (boots 01-08, books 09-16, flasks 17-24, bowls 25-32, candles 33-40, dumbbells 41-48, journal + quill 49-56, sleeping moons 57-64), clean hero-style outlines, filling the tile. Variants differ by element (winged, fire, ice, nature boots; rune, fire, starry books; fire and frost dumbbells). Flasks 18/22 look like the shop's EXP potion, so the canteen 24 was used for water.
- Mock picks: boots 01 (Morning Run), boots2 07 (Long Hike), book 11, water 24, meal 26, candle 39 (Deep Work, true), weights 46 (Push-ups), weights2 42 (Gym Session), quill 52 (Journal), moon 59 (Lights Out).

**Run 2, `2026-11-15-skills-abilities/`, job d7330572-ed44-4ba8-8765-f348c1bc9aa1** (square ability icons for the hotbar)
- **Opaque** (`no_background: false`).
- Description: `square RPG skill ability icons, each with a full dark painted background and a thin bevelled frame, glowing, each one different: sprinting boot with wind; open glowing book; splash of water; steaming bowl of food; lotus with a flame; lifted barbell; quill writing; crescent moon and stars`
- Result: good. 8 kinds x 8, each a full 32x32 square with a 2-3 px frame (brown, gold, grey or purple) on a dark ground, like MMO spell icons. Water came out as waves and splashes, the barbell as a dumbbell. The frame colour varies by tile, so grey-framed ones were picked to sit inside the mock's type-coloured rim.
- Mock picks: ab_boots 06, ab_boots2 03, ab_book 14, ab_water 24, ab_meal 31, ab_candle 39 (gold lotus flame), ab_weights 43, ab_weights2 47, ab_quill 54, ab_moon 62. Drawn at 3 CSS px per art pixel (96px) as the hotbar key.

**Run 3, `2026-11-15-skills-temptations/`, job c81ffded-60ae-4e4c-a7b8-22701d0b2e25** (Resist art)
- Transparent.
- Description: `cursed fantasy RPG icons of bad habits and temptations, dark and glowing, each one different, one item per tile, centred, filling the canvas: glowing scrying mirror; pile of sweets and cakes; goblet of wine; smoking pipe; pair of bone dice; plush pillow; spilling gold coins; cracked hourglass`
- Result: good. 8 x 8 in order (mirrors 01-08, cakes and sweets 09-16, goblets 17-24, pipes 25-32, dice 33-40, pillows 41-48, coin bags and hoards 49-56, hourglasses 57-64). The scrying mirror stands in well for a phone (doomscrolling). Darker and more muted than run 1, as asked.
- Mock picks: mirror 01 (Doomscrolling), sweets 09 (Late Night Snacks).

**Run 4, `2026-11-15-skills-flames/`, job b21aff24-72e1-4489-92fe-743625bd3b2b** (streak flames by tier)
- Transparent.
- Description: `fantasy RPG fire icons growing in power, each one different, one per tile, centred, filling the canvas: small candle flame; crackling campfire; roaring bonfire in an iron brazier; blue-white soul fire`
- Result: usable, more uneven. Rows 1-2 are mostly tiny flames, torches and loose embers (01-04, 09, 10, 19 nearly empty); candles 05-08, 11-16; campfires 17-34; braziers and cauldrons 35-48; blue soul fire 49-64 (wisps, torches, lanterns, braziers). The brazier and blue fire tiles are strong.
- Mock picks: fl1 06 (candle, streak 3+), fl2 22 (stone-ring campfire, 10+), fl3 37 (iron brazier, 20+), fl4 55 (blue brazier, 30+). Drawn at 1 CSS px per art pixel in the streak plate.
- Why: new art for the mocks only. Nothing shipped; no game files changed.

**Run 5, `2026-11-15-skills-physical-ranks/`, job cde3ff79-bea7-4c58-8d0d-6c93e1cb0dfa** (rank art test: physical only)
- Why / changed from runs 1-4: players type any skill name, so per-skill art can't work. The user picked art by damage type that grows with rank, and asked how to keep it from looking like items. Answer: effects not objects, filled squares not cut-outs, one colour family per type, rank shown by a metal frame drawn in code (iron, brass, bright brass). This run tests the effect art for one type. Shown with the exact prompt and cost; the user said "do it".
- Tool + settings: `create_image_pro`, **32x32, opaque** (`no_background: false`), style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 35e2d23b), no references, no palette, no seed
- Description: `square RPG combat skill ability icons, a full dark painted background filling the tile, no frame, effects only with no weapons, items or hands, red and orange tones, each one different, growing in power in this order: a single sharp slash mark; crossed slashes with sparks; a blazing crescent strike with a shockwave; a colossal crimson impact explosion`
- Cost + candidates: **10 generations, 64 candidates** (1,080 remaining before the run)
- Result: worked as asked. 16 per step in the order written: single slashes 01-16, crossed slashes 17-32, crescent strikes 33-48, explosions 49-64 (64 nearly empty, very dark). All filled squares on a dark red-black ground, red, orange and cream only, no weapons, hands or frames, so nothing reads as an item. Softer than the hero style, with little dark outline (fine for effects). Power growth reads clearly from step to step.
- Mock picks (two variants per step, chosen per skill by a name hash): step 1 (Rank 0-I) 07 / 05, step 2 (II-III) 24 / 20, step 3 (IV-V) 38 / 35, step 4 (VI-VIII) 54 / 58. Copied to `docs/mockups/skills-fresh/rk_phys_<step><a|b>.png`, drawn at 1.5 CSS px in a 58px frame. Heal, magic and true are hue-shifted copies in the mock only, as stand-ins.

## 2026-11-14: service scenes (the Services tab's rotating card)

**Shipped picks (2026-11-15, "good enough, build it"):** Item slots = `2026-11-15-service-slot-2`, Overdrive = `2026-11-15-service-overdrive-2`, Reroll = `2026-11-15-service-reroll-5`, Enchant = `2026-11-14-service-enchant-8`, copied by hand to `public/sprites/services/<id>-scene.png` and drawn in `ShopServiceCard.vue`.

The Services tab shows one service at a time on a 3-day turn (Item slots → Overdrive → Reroll → Enchant) in a big card (mock `docs/mockups/services-rotation.html`). Each rotating service gets its own scene across the card's top. Size: **216 x 64 art px** at 2 CSS px (432 x 128 CSS): the standard backdrop width, but only as tall as the card's 128px art area (not the 216 x 116 backdrop height, by the user's choice). Subject in the middle ~175 px, top left kept dim for the countdown ribbon. Plan: four corners of the shop's back room (gear wall, forge, fortune table, rune altar); Enchant first to see the idea.

**Run 1 (Enchant), `2026-11-14-service-enchant/`, job a296026c-3860-4f05-b631-485960e4433a**
- Tool + settings: `create_image_pro`, **216x64, not transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 37b3debe, all four aspects), no reference images, no palette, no seed.
- Description: `fantasy RPG enchanter's back room, side view, a stone altar in the centre with a glowing rune circle carved into its top, a sword floating above the altar shining with pale opal white and soft violet light, a few magic sparkles, shelves of candles crystals and old books at the sides, wooden beams, stone wall, dim and shadowy at the top left, no characters`
- Cost + candidates: **10 generations, 1 candidate** (receipt; 1,290 remaining before the run). Took 73s.
- Why / changed: first service scene. The 3.4:1 canvas was a risk (not on the price list, might squash the subject); fallback was 216x116 cropped.
- Result: the wide canvas worked. A stone altar in the middle with a lit violet rune band on top, a sword lying flat in the air above it in white-violet glow with sparkles, a lit stone-brick alcove behind framed by wooden posts and a beam, shelves of books, candles and jars left, crystals (green, violet), candles and bottles right, hanging ivy at the top. The top left is dark as asked. The sword's glow is a bit soft (blobby edge). Gallery: `gallery.html` (4x).
- **Verdict:** the user liked the idea but found it "a bit busy and hard to make out", not clear. Asked for a simpler prompt (not a simpler scene), keeping the crystals, the wooden beams and the stone wall so it fits the shop.

**Run 2 (Enchant, shorter prompt), `2026-11-14-service-enchant-2/`, job d8065ce9-1418-46db-980a-b849f5abc60f**
- Tool + settings: same as run 1: `create_image_pro`, **216x64, not transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 37b3debe, all four aspects), no reference images, no palette, no seed.
- Description: `fantasy RPG enchanting room, side view, a glowing sword floating above a stone altar in the centre, glowing crystals on both sides, wooden beams, stone wall, no characters`
- Cost + candidates: **10 generations, 1 candidate** (receipt; 1,280 remaining before the run). Took 74s.
- What changed from run 1: about a third of the words. Kept room, altar, floating sword, side crystals, wooden beams, stone wall; dropped the rune circle, opal-violet light, sparkles, candles, books, shelves, "dim at the top left".
- Result: much clearer. A crisp silver sword floating flat above a carved stone altar, big pale-blue crystal clusters either side of the altar, two lit wall lanterns, a tall stone-brick wall between wooden posts and a top beam, a shelf of potions and jars on the left, a hanging banner and a small crystal pedestal on the right, lit candles at both edges. Cool blue light overall (closer to the Moonlit UI than run 1's violet). The top left (where the countdown ribbon sits) has the potion shelf, a little busy but dark. Gallery: `gallery.html` (4x).
- **Verdict:** the user asked to try again without the crystals.

**Run 3 (Enchant, no crystals), `2026-11-14-service-enchant-3/`, job 5d2746cb-a0d4-4a75-a072-77958676a31f**
- Tool + settings: same as run 2 (216x64, not transparent, style `assets/pixellab/2026-11-11-heroes/sheet.png`, upload 37b3debe, all four aspects, no references, no palette, no seed).
- Description: `fantasy RPG enchanting room, side view, a glowing sword floating above a stone altar in the centre, wooden beams, stone wall, no characters`
- Cost + candidates: **10 generations, 1 candidate** (receipt; 1,270 remaining before the run). Took 82s.
- What changed from run 2: only "glowing crystals on both sides" dropped.
- Result: the sword now stands upright, point up, above a dark carved altar, wrapped in a pale-blue magic swirl with a few sparks on the floor. Warmer, greener and brighter room than run 2: olive stone-brick walls with ivy, wooden posts and arches, a bubbling cauldron, a bookshelf, a scroll and potions on the left, a banner, a candle sconce and a treasure chest with crates on the right. The top left is a lit bookshelf and scroll, brighter than in runs 1-2. Gallery: `gallery.html` (4x).
- **Verdict:** the user asked for the crystals back, "slightly more zoomed in".

**Run 4 (Enchant, crystals back, closer), `2026-11-14-service-enchant-4/`, job f12f7e5f-f1ce-45c1-b8f8-841ca65b2ceb**
- Tool + settings: same as runs 2-3 (216x64, not transparent, style `assets/pixellab/2026-11-11-heroes/sheet.png`, upload 37b3debe, all four aspects, no references, no palette, no seed).
- Description: `fantasy RPG enchanting room, side view, closer view, a large glowing sword floating above a stone altar in the centre, glowing crystals on both sides, wooden beams, stone wall, no characters`
- Cost + candidates: **10 generations, 1 candidate** (receipt; 1,260 remaining before the run). Took 75s.
- What changed from run 2: "closer view" and "a large" sword added for the zoom.
- Result: the sword is bigger (about a third of the width), lying flat with a white-blue glow, above a wide carved altar set in a dark stone arch with two hanging banners. Blue and violet crystals sit along the floor at both sides, potion shelves and a lectern with an open book left, shelves of bottles and books right. Dark blue-grey stone like run 2, so it sits with the UI. The zoom is modest: the room still reads wide, the altar and sword just fill more of it. The top left is dark wall and a shelf. Gallery: `gallery.html` (4x).
- **Verdict:** "good but the main problem is the sword is not clear and hard to make out". "Glowing sword" draws the blade out of light, so its edges melt into the glow.

**Run 5 (Enchant, solid outlined sword), `2026-11-14-service-enchant-5/`, job 2ee4e015-466b-4644-bf7f-eb2d7996b5ce**
- Tool + settings: same as runs 2-4 (216x64, not transparent, style `assets/pixellab/2026-11-11-heroes/sheet.png`, upload 37b3debe, all four aspects, no references, no palette, no seed).
- Description: `fantasy RPG enchanting room, side view, closer view, a large silver sword with a crisp dark outline floating above a glowing stone altar in the centre, the sword clearly visible against a plain dark wall, glowing crystals on both sides, wooden beams, stone wall, no characters`
- Cost + candidates: **10 generations, 1 candidate** (receipt; 1,250 remaining before the run). Took 115s.
- What changed from run 4: the sword is "silver ... with a crisp dark outline" instead of "glowing", the glow moved to the altar, "clearly visible against a plain dark wall" added.
- Result: the clearest sword so far. A silver sword lying flat with a dark outline, readable hilt and guard, against a plain dark brick wall between wooden posts and a beam; a faint glow line on the altar top below it, rune panels on the altar's front. Blue, violet and pale-green crystal clusters hug both sides of the altar. Quiet edges: bookshelves with a few potions left and right, dark wood. Dark blue-grey overall, sits with the UI. The top left is dark shelving. Gallery: `gallery.html` (4x). Not yet judged by the user.
- Fallback if a sword is still not clear enough: generate the room with the space above the altar empty and draw a real 32x32 sword sprite over it in code at 2 CSS px.
- **Verdict:** after seeing runs 1-5 side by side (`assets/pixellab/2026-11-14-service-enchant-compare.html`), the user said run 1 was best and asked for its exact prompt again.

**Run 6 (Enchant, run 1's prompt again), `2026-11-14-service-enchant-6/`, job c7ae86e0-ff2e-43e3-a28f-aceb506db7b7**
- Tool + settings: same as run 1 (216x64, not transparent, style `assets/pixellab/2026-11-11-heroes/sheet.png`, upload 37b3debe, all four aspects, no references, no palette, no seed, so a new roll).
- Description (run 1's, unchanged): `fantasy RPG enchanter's back room, side view, a stone altar in the centre with a glowing rune circle carved into its top, a sword floating above the altar shining with pale opal white and soft violet light, a few magic sparkles, shelves of candles crystals and old books at the sides, wooden beams, stone wall, dim and shadowy at the top left, no characters`
- Cost + candidates: **10 generations, 1 candidate** (receipt; 1,240 remaining before the run). Took 73s.
- Result: a slim silver sword floating diagonally, point up-right, in a soft violet halo with sparkles, over a stone altar with a glowing violet rune circle on its top. Warm brown room like run 1: stone-brick alcove between wooden posts, hanging ivy and chains, shelves of candles, books, jars and violet crystals at both sides. Dark top left. The sword reads better than run 1's (thin and outlined, the halo sits behind it rather than over it) but is small and thin. Gallery: `gallery.html` (4x).

**Hand fix (not a run), `2026-11-14-service-enchant-fixed/tile-01.png`, 2026-11-15:** the user fixed run 1 by hand in Pixilart (exported as `pixil-frame-0.png`, 216x64) and copied it here. It is the scene shown in the Enchant card of `docs/mockups/services-rotation.html`. No generations spent.

**Run 7 (Enchant, altar and sword only), `2026-11-14-service-enchant-7/`, job 023ad5f4-9755-4a04-944a-a2f2c3bdfe45, 2026-11-15**
- Tool + settings: same as runs 1-6 (216x64, not transparent, style `assets/pixellab/2026-11-11-heroes/sheet.png`, upload 37b3debe, all four aspects, no references, no palette, no seed).
- Description: `fantasy RPG close-up of an enchanting altar filling the frame, side view, a stone altar with a glowing rune circle carved into its top, a sword floating just above it shining with pale opal white and soft violet light, a few magic sparkles, plain dark stone wall behind, no room, no shelves, no characters`
- Cost + candidates: **10 generations, 1 candidate** (receipt; 1,230 remaining before the run). Took 26s.
- Why / changed: the user asked for "just the enchantment table and sword", not the whole room. Run 1's altar, rune circle, opal-violet sword and sparkles kept; "close-up ... filling the frame", "plain dark stone wall", "no room, no shelves" added; candles, crystals, books, beams and the dim top left dropped.
- Result: by far the clearest sword: big, flat, silver with a violet sheen, a dark outline, a clear hilt, guard and pommel, a few sparkles. Below it a wide stone altar top with a glowing violet rune circle, on a stone pedestal. Behind, only a plain dark brick wall, so the sides of the card are empty wall. Gallery: `gallery.html` (4x).
- **Verdict:** "way better", but wanted bookshelves or something at the sides, not plain wall everywhere. An inpaint of run 7's sides (keeping the middle) was proposed; the user asked for a brand new generation instead.

**Run 8 (Enchant, close-up with side bookshelves), `2026-11-14-service-enchant-8/`, job 9b3679ed-d538-4cf2-b334-8af66ac6cc98, 2026-11-15**
- Tool + settings: same as runs 1-7 (216x64, not transparent, style `assets/pixellab/2026-11-11-heroes/sheet.png`, upload 37b3debe, all four aspects, no references, no palette, no seed).
- Description: `fantasy RPG close-up of an enchanting altar in the centre, side view, a stone altar with a glowing rune circle carved into its top, a sword floating just above it shining with pale opal white and soft violet light, a few magic sparkles, dark stone wall behind, wooden bookshelves at the far left and right edges, no characters`
- Cost + candidates: **10 generations, 1 candidate** (receipt; 1,220 remaining before the run). Took 21s.
- What changed from run 7: "filling the frame", "plain", "no room, no shelves" dropped; "wooden bookshelves at the far left and right edges" added.
- Result: the same clear look as run 7: a big flat silver-violet sword with a dark outline and sparkles over a stone altar, here with a **gold** rune circle (not violet). Dark brick wall behind, and a tall wooden bookshelf at each edge (about 40 art px wide) with books, scrolls, jars and a skull; a rolled scroll leans at the foot of each. On a 390px phone about 17 px of each shelf is cropped, so about 23 px shows. Gallery: `gallery.html` (4x). Not yet judged by the user.

**Reroll run 1, `2026-11-15-service-reroll/`, job 09c67458-f1c0-4c0f-887f-167906542dc2, 2026-11-15**
- Tool + settings: same as the Enchant runs (`create_image_pro`, 216x64, not transparent, style `assets/pixellab/2026-11-11-heroes/sheet.png`, upload 37b3debe, all four aspects, no references, no palette, no seed).
- Description: `fantasy RPG close-up of a fortune teller's table in the centre, side view, a small wooden table with a dark violet cloth, two large white bone dice tumbling in the air just above it with a few magic sparkles, a lit candle on each side of the table, dark stone wall behind, wooden shelves at the far left and right edges, no characters`
- Cost + candidates: **10 generations, 1 candidate** (receipt; 1,210 remaining before the run). Took 21s.
- Why: first Reroll scene, on Enchant run 8's recipe (close-up of one centre object, dark stone wall, shelves at the edges, solid subject).
- Result: two big cream bone dice tumbling in the air, very clear, with a few gold sparkles, above a small wooden table with a violet cloth hanging in a point; a lit candle on each end of the table. Warm dark-brown brick wall. The shelves came out only as thin slivers at the very edges (about 15 art px each), so on a 390px phone they are almost all cropped and the sides read as plain wall. Gallery: `gallery.html` (4x).
- **Verdict:** "nice".

**Item slots run 1, `2026-11-15-service-slot/`, job aa25a65f-cb04-4c21-9c8e-eeddf0ec33fa, 2026-11-15**
- Tool + settings: same as the Enchant and Reroll runs (`create_image_pro`, 216x64, not transparent, style `assets/pixellab/2026-11-11-heroes/sheet.png`, upload 37b3debe, all four aspects, no references, no palette, no seed).
- Description: `fantasy RPG close-up of a large open leather adventurer's backpack on a wooden table in the centre, side view, its pockets buckles and straps clearly visible, a lit lantern on the table beside it, dark stone wall behind, wooden shelves of pouches and belts at the left and right sides, no characters`
- Cost + candidates: **10 generations, 1 candidate** (receipt; 1,200 remaining before the run). Took 41s.
- Why: first Item slots scene, same recipe. The backpack matches the slot seal's glyph. Shelves asked "at the left and right sides" rather than "far edges" so they sit far enough in to survive the phone crop (Reroll's were cropped away).
- Result: a big open brown leather backpack in the middle, many pockets, buckles and straps, its flap open with gear poking out; its top touches the canvas's top edge. A lit brass lantern on the table to the right, a tin mug to the left. Dark brick wall, wooden posts, and shelves at both sides (about 40 art px each) with rolled bedrolls, belts, pouches, tools and chains, so they survive the crop. Warm brown, lantern-lit. Busier than Reroll, but the pack reads at once. Gallery: `gallery.html` (4x). Not yet judged by the user.

**Overdrive run 1, `2026-11-15-service-overdrive/`, job 2effe65a-7709-4936-a9da-70b4ad002565, 2026-11-15**
- Tool + settings: same as the other service runs (`create_image_pro`, 216x64, not transparent, style `assets/pixellab/2026-11-11-heroes/sheet.png`, upload 37b3debe, all four aspects, no references, no palette, no seed).
- Description: `fantasy RPG close-up of a blazing stone forge in the centre, side view, a roaring orange and white-hot fire with bright sparks flying up, leather bellows beside it, an anvil in front, dark stone wall behind, wooden shelves of tools at the left and right sides, no characters`
- Cost + candidates: **10 generations, 1 candidate** (receipt; 1,190 remaining before the run). Took 35s.
- Why: last of the four service scenes, the forge from the brainstorm (Overdrive = push harder).
- Result: a bright orange-white fire roaring in a round stone forge a little left of centre, with sparks flying up the wall, tongs resting on its rim, an anvil just right of centre in front. Dark brick wall; racks of hammers, tongs and tools at the left and shelves with pots at the right, both dark. The fire is the brightest, clearest thing of all four scenes; the anvil is dark and easy to miss, and the bellows are not clearly there. Darker overall than the others. Gallery: `gallery.html` (4x). Not yet judged by the user.

User on Reroll run 1 and Item slots run 1: "Reroll I'd like to see the table top, and the backpack looks too busy". Both run again at once (same settings as above: `create_image_pro`, 216x64, not transparent, style `assets/pixellab/2026-11-11-heroes/sheet.png`, upload 37b3debe, all four aspects, no references, no palette, no seed).

**Reroll run 2, `2026-11-15-service-reroll-2/`, job e702cfcb-f2f5-4fc4-93ba-68f985e453d6**
- Description: `fantasy RPG close-up of a fortune teller's table in the centre, side view from slightly above so the table top is visible, a small wooden table with a dark violet cloth on top, two large white bone dice tumbling in the air just above the table top with a few magic sparkles, a lit candle on each side of the table, dark stone wall behind, wooden shelves at the left and right sides, no characters`
- Cost + candidates: **10 generations, 1 candidate** (receipt; 1,180 remaining before the two runs). Took 47s.
- What changed from run 1: "side view from slightly above so the table top is visible", the cloth "on top", the dice "just above the table top"; shelves "at the left and right sides" instead of "far edges".
- Result: the table top shows now: a violet cloth spread over it with a book, a small pouch and a few scattered coins, the two cream dice tumbling just above with gold and blue sparkles, tall dripping candles at both ends. Shelves of books, scrolls, bottles and potions on both sides, wide enough (about 40 art px) to survive the phone crop. Warmer and richer than run 1. Gallery: `gallery.html` (4x). Not yet judged by the user.

**Item slots run 2, `2026-11-15-service-slot-2/`, job 49867ba5-ff32-4d86-b645-5b6daf856d83**
- Description: `fantasy RPG close-up of a simple leather backpack on a wooden table in the centre, side view, a plain clean shape with one flap and two straps, few details, a lit lantern on the table beside it, dark stone wall behind, wooden shelves at the left and right sides, no characters`
- Cost + candidates: **10 generations, 1 candidate** (receipt). Took 47s.
- What changed from run 1: "large open adventurer's" backpack with "pockets buckles and straps clearly visible" became a "simple" backpack, "a plain clean shape with one flap and two straps, few details"; the mug and the "pouches and belts" on the shelves dropped.
- Result: a clean brown leather backpack with one flap and two buckled straps, standing on a wide wooden table top, a lit lantern beside it on the right. Big plain brick wall behind. Very readable. The shelves (bottles, scrolls) came out thin at the edges again (about 20-30 art px), so they are mostly cropped on a phone. Gallery: `gallery.html` (4x).
- **Verdict:** "new item slots art is good" (keep), "the reroll one is too busy now".

**Reroll run 3, `2026-11-15-service-reroll-3/`, job f3d347e4-f1aa-458a-80d8-ea9450280929**
- Tool + settings: same as runs 1-2.
- Description: `fantasy RPG close-up of a fortune teller's table in the centre, side view from slightly above so the table top is visible, a small wooden table with a plain dark violet cloth on top and nothing else on it, two large white bone dice tumbling in the air just above the table top with a few magic sparkles, a lit candle on each side of the table, dark stone wall behind, simple wooden shelves at the left and right sides, few details, no characters`
- Cost + candidates: **10 generations, 1 candidate** (receipt; 1,160 remaining before the run). Took 46s.
- What changed from run 2: "plain" cloth "and nothing else on it", "simple" shelves, "few details".
- Result: much calmer. The table top shows as a plain violet cloth over a wooden table, nothing on it; two cream dice tumble just above with a few pale sparkles; a short candle on each end of the table with a warm glow on the wall. Dark violet-grey brick wall. Simple shelves with a few bottles and books at the very edges (about 25 art px), mostly cropped on a phone. The dice are a little smaller than in runs 1-2. Gallery: `gallery.html` (4x).
- **Verdict:** "too plain now".

**Reroll run 4, `2026-11-15-service-reroll-4/`, job 26ff0d39-0fc0-4195-b1b0-c588648a13a4**
- Tool + settings: same as runs 1-3.
- Description: `fantasy RPG close-up of a fortune teller's table in the centre, side view from slightly above so the table top is visible, a small wooden table with a dark violet cloth on top, a small crystal ball and a few tarot cards on the cloth, two large white bone dice tumbling in the air just above the table top with a few magic sparkles, a lit candle on each side of the table, dark stone wall behind, wooden shelves with a few books and bottles at the left and right sides, no characters`
- Cost + candidates: **10 generations, 1 candidate** (receipt; 1,150 remaining before the run). Took 24s.
- What changed from run 3: between runs 2 and 3: two named things on the cloth (a small crystal ball, a few tarot cards) instead of "nothing else", shelves "with a few books and bottles" instead of "simple ... few details".
- Result: a glowing violet crystal ball on a stand in the middle of the table, tarot cards laid out either side of it on the violet cloth, tall candles at both ends, a wisp of magic smoke curling up. The dice came out **small**, high up in the smoke, so the crystal ball, not the dice, is the subject now. Bookshelves (books, bottles, scrolls) about 40 art px wide at both sides, so they survive the phone crop. Gallery: `gallery.html` (4x). Not yet judged by the user.

**Overdrive run 2, `2026-11-15-service-overdrive-2/`, job a310bffc-4531-4d10-9856-4c081d345f82**
- Tool + settings: same as Overdrive run 1.
- Description: `fantasy RPG close-up of a stone forge in the centre, side view, a bright orange and white-hot fire with a few sparks, an anvil beside it, dark stone wall behind, simple wooden shelves at the left and right sides, no characters`
- Cost + candidates: **10 generations, 1 candidate** (receipt). Took 36s.
- Why / changed from run 1: the user found run 1 "a tad busy". "Blazing", "roaring", "bright sparks flying up", the bellows and the shelves "of tools" dropped; "a few sparks", "simple" shelves.
- Result: a big arched stone forge mouth in the middle with a bright fire and a few sparks, centred this time; an anvil and hanging tongs just right of it, dark. Simple shelves and benches with a few tools at both sides. Calmer than run 1, but still very dark overall: only the fire is lit, so the sides are near-black. Gallery: `gallery.html` (4x).
- **Verdict:** "overdrive is good now" (keep). Reroll run 4: redo.

**Reroll run 5, `2026-11-15-service-reroll-5/`, job 073c8be6-09fd-4f36-89f7-97fa2b0de590**
- Tool + settings: same as runs 1-4.
- Description: `fantasy RPG close-up of a fortune teller's table in the centre, side view from slightly above so the table top is visible, a small wooden table with a dark violet cloth on top and a few tarot cards on the cloth, two large white bone dice tumbling in the air just above the middle of the table, big and clear, with a few magic sparkles, a lit candle on each side of the table, dark stone wall behind, wooden shelves with a few books and bottles at the left and right sides, no characters`
- Cost + candidates: **10 generations, 1 candidate** (receipt; 1,130 remaining before the run). Took 41s.
- What changed from run 4: the crystal ball dropped (it took over as the subject); the dice "just above the middle of the table, big and clear".
- Result: the dice are the subject again: two big cream dice tumbling above the middle of the table with gold sparkles. Below them the table top shows a violet cloth with five tarot cards laid out, a candle in a holder at each end. Bookshelves with books, scrolls and bottles at both sides, wide enough to survive the phone crop. Between run 2 (busy) and run 3 (plain). Gallery: `gallery.html` (4x). Not yet judged by the user.

## 2026-11-14: potion art (shop potions: Health, Mending, EXP, Crit)

Picks so far from the 2026-11-12 trinkets pool: Health = T6 (red round flask), EXP = T7 (blue round flask). Titan's Lifeblood moved off the red flask to E42 (golden orb) on 2026-11-14 so the flask reads as a potion only. Mending wanted a wider, more triangular red flask and Crit a yellow potion; none in the pools, so this run.

**Run 1, `2026-11-14-items-potions-pool/`, job da5779d5-f1cd-473c-b0bc-4ccdf9845105**
- Tool + settings: `create_image_pro`, **32x32, transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload ff866da0), no reference images, no palette, no seed
- Description: `fantasy RPG potion bottles, glowing and unique, each one different, one item per tile, centred, filling the canvas: a variety of potions in different colors and flask shapes`
- Cost + candidates: **10 generations, 64 candidates** (1,300 remaining before the run)
- Why / changed from the proposal: first draft named the two kinds (wide triangular red flask, round yellow bottle); the user preferred open variety, so no kinds are named (same lesson as item run 5 and the boss variety run).
- Result: 64 clean 32x32 potions, complete outlines, in the T6/T7 family (glass bottle, cork or stopper, one colour of liquid). Good spread: round flasks (red 01/33, green 02/34, purple 05, yellow 07/37), square bottles (03, 04, 36, 43, 54), **triangular flasks** (green 10/26, blue 11/58, purple 12/28, dark blue 19, orange-yellow 45), hearts (red 09, blue and purple 18, green 42, yellow and purple 40), tagged and roped bottles, amphoras (yellow 61/62, dark 63), skull bottles (13, 30), hourglasses (14, 47, not potions), caged orbs (16, 39, 56, 64). **No red triangular flask**; yellow: 07, 37, 52 (small), 45 (triangular), 61. Gallery: `gallery.html` (3x); numbered contact sheet checked by eye.
- **Picks (2026-11-14):** Health = trinkets-pool T6, EXP = trinkets-pool T7, Crit = run tile 37 (big round yellow flask; 06, an orange flask with a tag, was picked first and swapped), Mending = run tile 17 (red flask wrapped in rope). The user wanted a wider, more triangular red flask for Mending, which the run did not make; 17 was picked instead of a recolour. Built to `public/sprites/potions/` by `npm run item-art` (picks.json `potions`, folder letter Q for this run) and shown on the shop rows.

## 2026-11-12: shop marketplace (shop tab backdrop, not yet shipped)

**Run 1, `2026-11-12-shop-market/`, job 1c27ab49-a7d2-49ec-8d38-a50653122e18**
- Tool + settings: `create_image_pro`, **216x116 directly (standard size, no padding), not transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 65c1d7b5, all four aspects), no reference images, no palette. Tile is `tile-01.png` (216x116) plus `gallery.html` at 4x.
- Description: `fantasy RPG marketplace at dusk, side view with a little depth, camera just above ground level, cobblestone street, timber market stalls with striped cloth awnings along the back, crates barrels and sacks of goods, hanging paper lanterns and strings of lights, potion bottles and weapons on display tables, stone buildings with shuttered windows behind, warm lantern glow with a deep blue evening sky, open clear cobblestone ground in the centre, no characters`
- Cost + candidates: 10 generations, 1 candidate (the receipt confirmed 10 at 216x116). Took 49s.
- Why: the user wants a shop tab later and asked for an RPG marketplace backdrop at the same size as the other backgrounds. Dusk with lantern glow chosen so the warm light sits against a blue sky, closer to the blue-black UI than the armory's all-warm look. Open cobblestone centre left for the hero or a shopkeeper drawn in code.
- Result: striped-awning stalls on both sides (red and green), a display table with potion bottles and weapons left of centre, hanging lanterns, stone buildings with shuttered windows, a blue dusk sky behind, crates and barrels in the foreground, cobblestone street with a clear patch in the middle. No characters. Not yet judged by the user.

**Run 2 (shopkeeper), `2026-11-12-shop-keeper/`, job b2bf3c34-b151-4e34-9cfd-92f5ae4eac50**
- Tool + settings: `create_image_pro`, **216x116, not transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 65c1d7b5, all four aspects), no reference images, no palette. Tile is `tile-01.png` plus `gallery.html` at 4x.
- Description: `fantasy RPG shop stall at dusk, side view with a little depth, camera just above ground level, one large timber market stall in the centre with a striped cloth awning and a wide wooden counter, a friendly merchant shopkeeper with a brown apron and green cap standing behind the counter facing the viewer, shelves behind them of potion bottles weapons and scrolls, wares and a set of scales on the counter, hanging paper lanterns, smaller stalls and stone buildings with shuttered windows at the edges, warm lantern glow with a deep blue evening sky, cobblestone ground in front of the counter, crates and barrels at the sides`
- Cost + candidates: 10 generations, 1 candidate. Took 70s.
- Why: the user wanted a similar scene with a shopkeeper. An inpainted shopkeeper in the run 1 market was proposed first, then dropped: the user did not want the shopkeeper in the middle of the street ("We can build one with shopkeeper in mind"), so this is a new scene with the shopkeeper in their own stall, baked into the image.
- What changed from run 1: one large central stall instead of a row of stalls, a shopkeeper in it, a darker dusk (purple-orange sky, dim cobbles) instead of a blue evening.
- Result: a big red-and-cream striped awning over a central stall, a shopkeeper (green cap, brown apron) behind a wide wooden counter, shelves of potions and weapons behind, a brass scale on the counter, four lit lanterns, crates, sacks and a barrel at the sides, dark stone houses on both edges, cobblestones in front. Not yet judged by the user.

**Run 2 verdict:** the user said "this one isnt good", the prompt had too much detail and the shopkeeper's face was jumbled (a face a few pixels wide). Not used.

**Run 3 (shopkeeper, simpler prompt), `2026-11-12-shop-keeper-2/`, job 763292e2-c0a8-461b-b237-0be7fb748d33**
- Tool + settings: `create_image_pro`, **216x116, not transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 65c1d7b5, all four aspects), no reference images, no palette.
- Description: `fantasy RPG shop stall at dusk, side view, one wooden market stall in the centre with a striped awning and a plain wooden counter, a hooded merchant shopkeeper standing behind the counter, simple shelves behind them, a few hanging lanterns, stone buildings at the edges, cobblestone ground, warm lantern glow, deep blue evening sky`
- Cost + candidates: 10 generations, 1 candidate. Took 74s.
- What changed from run 2: much shorter prompt (no scales, sacks, barrels, crates, shuttered windows, shelf contents), a hooded shopkeeper so there is no small face to jumble, "deep blue evening sky" back from run 1.
- Result: a central stall with a red-and-cream awning, a hooded shopkeeper in dark grey behind a plain counter, shelves of potions and books, a brass scale, hanging shop signs (potion, sword) on the stone houses either side, sacks and barrels at the foot, cobblestones in front. The face is hidden as hoped, but the shopkeeper is small and dark against a dark stall, so they are easy to miss and read as shadowy rather than friendly. The sky came out purple-dusk, not blue. Not yet judged by the user.

**Run 4 (shop interior, bearded shopkeeper), `2026-11-12-shop-keeper-3/`, job 7aff5d67-38fb-4398-abac-c5594b1982a3**
- Tool + settings: `create_image_pro`, **216x116, not transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 65c1d7b5, all four aspects), no reference images, no palette.
- Description: `fantasy RPG shop interior, side view, a large friendly stout bearded shopkeeper smiling behind a wooden counter in the centre, cream shirt and red apron, wooden shelves of potions and goods on the back wall, a few hanging lanterns, wooden beams, plank floor, warm lantern glow`
- Cost + candidates: 10 generations, 1 candidate. Took 75s.
- Why: run 3 (outdoor, hooded) had a small dark shopkeeper who blended in. The user asked for "an inside scene with a friendly shopkeeper (i'm thinking slightly fat beared man)". Beard covers the lower face so less to jumble; light clothes against dark wood.
- What changed from run 3: interior instead of a stall, a bearded smiling shopkeeper (cream shirt, red apron) instead of a hooded one, "large" for size, no sky.
- Result: shopkeeper centred behind a wooden counter, big and clearly readable, a clean smiling bearded face. Shelves of potions, books and sacks behind, two hanging lanterns, wooden ceiling beams, a brass scale and an open book on the counter, barrels, crates and chests at the sides, plank floor. Warm lantern-lit browns. Not yet judged by the user.

**Runs 5 and 6 (run 4's prompt again, for options), `2026-11-12-shop-keeper-4/` (job 4c74bf7c-ee7e-4f3f-ac7a-22a3d1682040) and `2026-11-12-shop-keeper-5/` (job bd2826d5-67fb-47c5-ae0d-1959b43f5b9b)**
- Tool + settings: both `create_image_pro`, 216x116, not transparent, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 65c1d7b5, all four aspects), no reference images, no palette, no seed.
- Description (both, unchanged from run 4): `fantasy RPG shop interior, side view, a large friendly stout bearded shopkeeper smiling behind a wooden counter in the centre, cream shirt and red apron, wooden shelves of potions and goods on the back wall, a few hanging lanterns, wooden beams, plank floor, warm lantern glow`
- Cost + candidates: 10 generations each (20 in all), 1 candidate each. Both took 87s.
- Why: the user called run 4 "perfect" and asked for 2 more of these to choose from.
- Result (all three shown together in a comparison gallery):
  - Run 5 (`-4`): the widest, busiest shop. A wide plain counter, a smiling bearded shopkeeper, herbs hanging from the beams, potion shelves left, sacks, barrels and a red-lined chest at the sides, three lanterns. Lots of detail at the edges.
  - Run 6 (`-5`): the most centred and readable. A stocky bearded shopkeeper with a rosy face, a long shelf of potions behind him, books and pots right, tools on a rack and a brass scale on the counter, hanging herbs, lanterns left, centre and right, a post at the right edge. The counter front has a small sign. His left eye looks slightly off.
  - Run 4 (`-3`): see above.
- User picked run 4 (`2026-11-12-shop-keeper-3/tile-01.png`): "first one is best. keep it". **Kept as the shop backdrop**, not yet shipped (no shop tab yet; copy it to `public/sprites/home/shop.png` when the tab is built). Runs 5 and 6 and the earlier market and stall runs are kept in `assets/pixellab/` as alternatives.

## 2026-11-12: armory and run 7 brought to the standard size (216 x 116)

**Armory, `2026-11-12-armory-floor8/`, job 253d1e9d-454a-4e38-ba30-25814fe1d6d9** (shipped as `public/sprites/home/armory.png`; the original 216x108 tile stays in `2026-11-12-armory/`)
**Run 7, `2026-11-12-arena-run7-floor8/`, job ed0322a9-1db6-4184-b1c9-a011496c9d87** (shipped as `public/sprites/stage/arena7b.png`, the potential skin)
- Why: the user liked the 8-row floor inpaint on run 6 and wants every background the same size: run 7 (the other "perfect" arena) and the Hero tab armory get the same treatment, and the armory must match the arena's height exactly.
- Tool + settings, both: exactly the `arena6b` call. Inputs built with `node scripts/pixellab-floor-pad.cjs <tile> <run-folder>` (216x116 `input.png`: the tile unchanged at rows 0-107, rows 108-115 starting as copies of its bottom row; `mask.png`: white = rows 108-115, black = the tile; the script reproduces the `arena6b` inputs byte for byte). `inpaint_image` with both uploaded, `crop_to_mask` default (true), background follows the input (opaque).
- Description, both: `more of the same flagstone floor continuing toward the viewer, matching the existing floor tiles, colours and lighting exactly, no characters, no objects`
- Cost: 10 generations each, 20 in all (run in parallel, about 54s).
- Result: both originals are identical (checked: 0 of 23,328 pixels changed in each), with 8 rows of matching flagstones below. Armory on the Hero tab at 390: frame 232px (was 216), art drawn 432x232, the hero raised to `bottom: 30px` so their feet stay on art row 101 as before, plates at the foot on the new floor. Run 7 on the stage at 390: fills the 232px backdrop box exactly, the hero's feet on row 108, the boss's on row 86, as with `arena6b`.

## 2026-11-12: boss arena (default fight-stage backdrop, one shared arena instead of a scene per boss)

**Run 6 extended to 216x116 (8 rows of floor only), `2026-11-12-arena-run6-floor8/`, job 2ed90b16-961a-41e8-a633-c7795d8aebd3**
- Why: the user found the 216x148 extension "awful" and dropped the notch inset ("We can have a black bar at the top for the notch"), so a stage backdrop only has to fill the stage's backdrop box: 116 rows at 390 wide without an inset (the painted scene's canvas height). Run 6 is 108 rows, so it needed 8 more rows of floor under the hero.
- Tool + settings: `inpaint_image`, image `input.png` (216x116: run 6's tile unchanged at rows 0-107, rows 108-115 starting as copies of its bottom row), custom mask `mask.png` (white = rows 108-115, black = run 6), `crop_to_mask` default (true), background follows the input (opaque). Both files in the run folder. Shown in the dev toggles as `arena6b` (`public/sprites/stage/arena6b.png`).
- Description: `more of the same flagstone floor continuing toward the viewer, matching the existing floor tiles, colours and lighting exactly, no characters, no objects`
- Cost: 10 generations.
- Result: run 6's pixels are identical (checked: 0 of 23,328 changed). On the stage at 390 with no inset, the image fills the backdrop box exactly (top and bottom flush), the hero's feet land on row 108 and the boss's on row 86, the same rows as when run 6 was approved, with the 8 new floor rows below the hero. User: "looks good", "this inpaint worked well". **Shipped as the default boss arena** (50e2d2f). The same call was then used for run 7 and the armory (above).

**Runs 8 and 9, `2026-11-12-arena-run8/` (job 51f031fd-f565-46ca-a172-f620b359428f) and `2026-11-12-arena-run9/` (job 40a9470f-a791-4947-932e-7668b782e8ed)**, run 6's prompt at the correct stage height
- Why: the user found the inpaint-extended run 6 "awful" and asked for run 6's exact prompt regenerated from scratch at the correct size, run twice. Correct size, measured at 390 wide: the painted scene's canvas (which fills the stage's backdrop box) is 116 rows without a status-bar inset and 146 rows with a 59px inset (notched iPhone, home-screen app), so the canvas is 216 x 148 (up to a 62px inset), held to the stage's bottom; on phones without an inset the top rows are cropped.
- Tool + settings: `create_image_pro`, **216x148, not transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 4704fb7e, all four aspects), no reference images, no palette. Shown in the dev toggles as `arena8` and `arena9` (`public/sprites/stage/arena8.png`, `arena9.png`).
- Description (both, unchanged from run 6): `fantasy RPG boss arena, side view with depth, camera just above floor level, stone hall, straight dark stone back wall set back from the front with an open stretch of floor before it, two shut iron portcullis gates in the wall, two iron braziers against the wall between them, broken pillars and tattered banners at the far edges, flagstone floor along the bottom third of the image, plain open floor across the whole width, cool moonlit blue-grey light, dark and plain at the top left, no characters`
- Cost + candidates: 10 generations each, 20 in all, 1 candidate each (the receipt confirmed 10 at 216x148).
- Result, on the stage at 390 (hero's feet on row 140, boss's on row 118 in both):
  - Run 8: works. A flagstone floor from about row 95, so the boss stands well in front of the wall. Two arched gates, two lit braziers, banners at the edges, a vaulted ceiling at the top that shows behind the status bar on a notched phone and is cropped otherwise. Closest to run 6.
  - Run 9: the middle floor came out as a flat, untextured blue-grey area from about row 75 to row 118 (read "plain open floor" literally), with flagstones only in a strip along the bottom. Square gates, lit braziers, broken pillars at the edges. Looks unfinished.
  - Not yet judged by the user.

**Run 6 extended to 216x148, `2026-11-12-arena-run6-tall/`, job c5f5b978-e671-46bf-ab6c-42537136f42b** (this is the shipped `public/sprites/stage/arena6.png`)
- Why: the arena was generated 108 rows tall, copied from the armory, but the phone stage is 235px (118 rows) without a status-bar inset and about 294px (147 rows) with a 59px one. The image was pinned to the stage top, so the floor ended at the hero's feet with 19px of flat fill below, and on a notched phone in home-screen mode it ended about 59px above the fighters.
- Tool + settings: `inpaint_image`, image `input.png` (216x148: run 6's tile pasted unchanged at rows 30-137; rows 0-29 and 138-147 start as copies of its top and bottom rows), custom mask `mask.png` (white = rows 0-29 and 138-147, black = run 6's rows), `crop_to_mask` default (true), background follows the input (opaque). Both files are in the run folder; built in code with `scripts/lib/pnglib.cjs`.
- Description: `continue the same stone hall: more of the dark stone back wall above, more flagstone floor below, matching the existing art, no characters`
- Cost: 10 generations (took 28s).
- Result: run 6's pixels are identical (checked: 0 of 23,328 changed). The top band continues the wall and pillars upward; the bottom band adds 10 rows of flagstones. Shipped with the arena held to the stage's bottom (`StageScene.vue`): at 390, with and without a simulated 59px inset, the hero's feet land on row 140 of 148 (8 rows of floor below them) and the boss's on row 118 (run 6's row 88). Without an inset the top is cropped; with one, the extra wall fills the status bar.
- Run 7 (the skin) is still 108 rows and would need the same extension before it is used.
- User: "This looks awful", and later "The last one was HORRIBLE." **Do not repeat**: no tall extension, no 30 rows of invented wall on top. Not used; replaced by the 8-row floor extension (`arena6b`), which "worked well", after the user dropped the notch inset.

All seven runs are kept: the tiles in `assets/pixellab/2026-11-12-arena*/` (git-ignored, back them up) and copies in `public/sprites/stage/` for the dev toggles.

| Run | File | Status |
|---|---|---|
| 1 | `arena.png` | kept; too much depth (big round floor) |
| 2 | `arena2.png` | kept; wall too close |
| 3 | `arena3.png` | **kept for a future sellable or alternative stage** (right depth, wall too detailed for the default) |
| 4 | `arena4.png` | **kept as a possible Hero tab backdrop** (wall too close for the stage) |
| 5 | `arena5.png` | kept; wall too close (layout reference ignored) |
| 6 | `arena6.png` | kept; the approved art, 216x108 (too short for the stage) |
| 6b | `arena6b.png` | **the default boss arena**: run 6 with 8 rows of floor inpainted below, 216x116 |
| 6 tall | (not shipped) | rejected: run 6 inpainted to 216x148 ("This looks awful") |
| 7 | `arena7.png` | kept; the approved skin art, 216x108 (too short for the stage) |
| 7b | `arena7b.png` | **the potential skin**: run 7 with 8 rows of floor inpainted below, 216x116 |
| 8 | `arena8.png` | kept; run 6's prompt at 216x148, works, closest to run 6 |
| 9 | `arena9.png` | kept; run 6's prompt at 216x148, flat untextured floor |

**Runs 6 and 7, `2026-11-12-arena-run6/` (job 9f7f9f85-edbb-480a-825d-ef8714c6d826) and `2026-11-12-arena-run7/` (job 71eb3fe2-46ce-4adf-8ac3-c76f2d8e61e4)**, the same prompt submitted twice at once
- Tool + settings: same as runs 1-4: `create_image_pro`, **216x108, not transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 4704fb7e, all four aspects), no reference images, no palette. Shown in the dev toggles as `arena6` and `arena7` (`public/sprites/stage/arena6.png`, `arena7.png`).
- Description (both): `fantasy RPG boss arena, side view with depth, camera just above floor level, stone hall, straight dark stone back wall set back from the front with an open stretch of floor before it, two shut iron portcullis gates in the wall, two iron braziers against the wall between them, broken pillars and tattered banners at the far edges, flagstone floor along the bottom third of the image, plain open floor across the whole width, cool moonlit blue-grey light, dark and plain at the top left, no characters`
- Cost + candidates: 10 generations each, 20 in all, 1 candidate each (both took 126s, run in parallel).
- To reproduce (the default arena's exact call; Pixellab gives a different picture each time, so run it twice and keep the one whose floor starts near row 68-70):
  1. Upload the style image: `get_upload_url`, then `curl -sS -F "file=@assets/pixellab/2026-11-11-heroes/sheet.png" "<upload url>"`, and use the returned `upload:<id>`.
  2. Call:
     ```
     create_image_pro(
       description="fantasy RPG boss arena, side view with depth, camera just above floor level, stone hall, straight dark stone back wall set back from the front with an open stretch of floor before it, two shut iron portcullis gates in the wall, two iron braziers against the wall between them, broken pillars and tattered banners at the far edges, flagstone floor along the bottom third of the image, plain open floor across the whole width, cool moonlit blue-grey light, dark and plain at the top left, no characters",
       width=216, height=108, no_background=False,
       style_image_url="upload:<id>",   # style_copy left at its default: palette, outline, detail, shading
     )                                   # no reference_images, palette, max_colors or seed
     ```
  3. `wait_for_jobs`, then `curl -sS -o assets/pixellab/<run-folder>/tile-01.png "https://api.pixellab.ai/mcp/images/<job id>/download"`, `node scripts/pixellab-gallery.cjs assets/pixellab/<run-folder> 4`, open `gallery.html`, and check a standing boss on the stage.
- Result: both got the depth right. The floor starts around row 68-70 in both (measured by row brightness), like run 3, and on the stage at 390 the spider (drifter 2) stands on open floor in front of the wall. Both are darker than runs 2-5, with less wall detail than run 3 (no moss or vines), and both have lit braziers with red flames between the gates.
  - Run 6: arched portcullis gates, broken pillars and rubble at both edges, a darker wall.
  - Run 7: square-topped barred gates, tattered banners hanging at the top corners, pillars at the edges, a slightly lighter and deeper-looking floor.
  - User: "these 2 runs are it. They are both perfect." **Run 6 is the default boss arena; run 7 is kept as a potential skin.**
- Why / what changed: user asked to go back to run 3's wording (the one with the right depth, but too detailed) with "a little depth" made "depth" and "ruined" dropped, run twice to see whether either lands. From run 3: "side view with a little depth" became "side view with depth" and "ruined stone hall" became "stone hall"; nothing else changed. The plain-wall wording of runs 4-5 was not used.

**Run 5, `2026-11-12-arena-run5/`, job 5cc0d488-0819-403d-aa88-f94b40c09c90**
- Tool + settings: `create_image_pro`, **216x108, not transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 4704fb7e, all four aspects), no palette. **Reference image (first time):** `assets/pixellab/refs/arena-layout-row68.png` (upload 02806fbc), a flat block-in drawn in code: dark wall rows 0-67, a lighter seam at row 68, floor rows 69-107 lightening toward the front. Usage: `composition only: the camera angle and the line where the back wall meets the floor; take no colours or detail from it`. Shown in the dev toggles as `arena5` (`public/sprites/stage/arena5.png`).
- Description: `fantasy RPG boss arena, side view with a little depth, camera just above floor level, stone hall, straight plain dark stone back wall of large simple blocks with little detail, set well back from the front with an open stretch of floor before it, two shut iron portcullis gates in the wall, two iron braziers against the wall between them, a pillar and a banner at each far edge, flagstone floor along the bottom third of the image, plain open floor across the whole width, cool moonlit blue-grey light, dark and plain at the top left, no characters`
- Cost + candidates: 10 generations, 1 candidate (took 76s; the reference did not change the price).
- Result: the reference did not move the wall. The floor starts around row 80-82 (measured by row brightness), the same as runs 2 and 4, so the boss still stands against the wall. Otherwise on brief and plain: even stone blocks, two arched portcullis gates, two small unlit braziers, a pillar and banner at each edge. The flat reference did not flatten the colours either.
- Why / what changed: run 4's wall was too close again. Added the layout reference and changed "set back" to "set well back"; everything else the same as run 4. Lesson: a flat block-in reference is ignored for horizon placement in `create_image_pro`; the floor line seems to be chance (run 3 at row 70, runs 2, 4, 5 at 80-84).

**Run 4, `2026-11-12-arena-run4/`, job c6581443-9032-44d6-b8fa-fd106651ff38**
- Tool + settings: same as runs 1-3: `create_image_pro`, **216x108, not transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 4704fb7e, all four aspects), no reference images, no palette. Shown in the dev toggles as `arena4` (`public/sprites/stage/arena4.png`).
- Description: `fantasy RPG boss arena, side view with a little depth, camera just above floor level, stone hall, straight plain dark stone back wall of large simple blocks with little detail, set back from the front with an open stretch of floor before it, two shut iron portcullis gates in the wall, two iron braziers against the wall between them, a pillar and a banner at each far edge, flagstone floor along the bottom third of the image, plain open floor across the whole width, cool moonlit blue-grey light, dark and plain at the top left, no characters`
- Cost + candidates: 10 generations, 1 candidate (took 47s).
- Result: plainer, as asked. A wall of large even stone blocks, two square-topped barred gates (not arched like runs 2-3), and two lit braziers with small flames between them, the first run where they are lit. A pillar and a banner at each far edge; no moss, vines or top banners. The floor keeps run 3's depth: on the stage at 390 the spider (drifter 2) stands on open floor in front of the wall. No characters. User: "decent", but the wall is too close again (measured: run 4's floor starts around row 82-84 like run 2's, run 3's around row 70, from the same floor wording). **Kept as a possible Hero tab backdrop.**
- Why / what changed: user wanted run 3's layout with a plainer back wall, detailed but not too much, like run 2. "ruined stone hall" became "stone hall" (likely the source of run 3's moss and cracks); the wall became "plain dark stone back wall of large simple blocks with little detail"; "broken pillars and tattered banners at the far edges" became "a pillar and a banner at each far edge". The floor and wall-distance wording is unchanged from run 3.

**Run 3, `2026-11-12-arena-run3/`, job 9fe3a860-8521-490d-9ac3-13af94d76ea9**
- Tool + settings: same as runs 1 and 2: `create_image_pro`, **216x108, not transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 4704fb7e, all four aspects), no reference images, no palette. Shown in the dev toggles as `arena3` (`public/sprites/stage/arena3.png`).
- Description: `fantasy RPG boss arena, side view with a little depth, camera just above floor level, ruined stone hall, straight dark stone back wall set back from the front with an open stretch of floor before it, two shut iron portcullis gates in the wall, two iron braziers against the wall between them, broken pillars and tattered banners at the far edges, flagstone floor along the bottom third of the image, plain open floor across the whole width, cool moonlit blue-grey light, dark and plain at the top left, no characters`
- Cost + candidates: 10 generations, 1 candidate (took 66s).
- Result: the floor runs along about the bottom third, so the wall stands further back than run 2. On the stage at 390 the boss (drifter 2, the spider) stands on open floor with flagstones behind it, no longer against the wall. Straight wall with two arched portcullis gates, two small braziers between them (they look unlit), moss and vines on the stones, banners hanging at the top, pillars at the edges, plain dark top-left. No characters. Darker and gloomier than run 2. **Kept** (user: "perfect. I love it"), then set aside as a future sellable or alternative stage: the user found its back wall too detailed for the default, which led to run 4.
- Why / what changed: user liked run 2's art but the boss looked backed up against the wall (run 2's floor starts around row 82, the boss's feet are at row 86). Asked for the wall "set back from the front with an open stretch of floor before it" and the floor along the bottom third instead of the bottom quarter, aiming for the wall base near row 70. "side view with only a little depth" became "side view with a little depth". Nothing else changed.

**Run 2, `2026-11-12-arena-run2/`, job 27e3a25f-4acb-419a-8b34-3eb0eb9b4a94**
- Tool + settings: same as run 1: `create_image_pro`, **216x108, not transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 4704fb7e, all four aspects), no reference images, no palette. Shown in the dev toggles as `arena2` (`public/sprites/stage/arena2.png`).
- Description: `fantasy RPG boss arena, side view with only a little depth, camera just above floor level, ruined stone hall, tall straight dark stone back wall filling most of the image, two shut iron portcullis gates in the wall, two iron braziers against the wall between them, broken pillars and tattered banners at the far edges, a shallow flagstone floor only along the bottom quarter of the image, plain open floor across the whole width, cool moonlit blue-grey light, dark and plain at the top left, no characters`
- Cost + candidates: 10 generations, 1 candidate (took 56s).
- Result: the floor came out as a shallow band along about the bottom quarter, as asked. A straight wall with two big arched portcullis gates in the middle, two small braziers at the foot of the gates (they look unlit), a pillar and banners at the far edges, plain top-left. No characters. Flatter and plainer than run 1, with less glow. Not yet judged on the stage.
- Why / what changed: run 1's floor had too much depth (a big ring seen from above; the boss's feet are only a little above the hero's). Measured on the stage at 390: boss feet at art row 86, hero feet at row 108, so the floor only needs the bottom quarter. Dropped "slightly raised", "curved wall", "sigil ring" and "on the floor" for the braziers; asked for a camera just above floor level and a floor along the bottom quarter. A layout sketch reference was offered and skipped for this try. (A "flat straight-on" version was proposed first and rejected by the user as too flat.)

**Run 1, `2026-11-12-arena/`, job ebad56ed-56a5-414e-9180-4d5d5befcd9e**
- Tool + settings: `create_image_pro`, **216x108, not transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 4704fb7e, all four aspects), no reference images, no palette. Tile is `tile-01.png` plus `gallery.html` at 4x.
- Description: `fantasy RPG boss arena, slightly raised side view, ruined stone fighting pit, curved dark stone back wall with two shut iron portcullis gates, broken pillars and tattered banners at the far edges, two iron braziers, cracked flagstone floor with a faint sigil ring in the middle, empty clear floor on the left and right, cool moonlit blue-grey light, dark and plain at the top left, no characters`
- Cost + candidates: 10 generations, 1 candidate (took 59s).
- Result: blue-grey and moonlit as asked, so no tint needed. Curved stone wall with two barred gates at the top centre, a lit brazier left of centre and another at the right edge, a broken pillar on the left, rubble in the bottom corners, and a big sigil ring covering most of the floor. No characters. Open questions: the ring is busy where fighters and hit effects sit, and the floor is one big circle rather than two ground lines (boss row 65, hero row 96); check fighter placement on the real stage. Not shipped yet.
- Why / what changed: first run for this piece. User wants one default arena for every boss (dungeon art and shop arenas later); plinths dropped in the brief, with "drop or draw them on top" as the fallback if the floor doesn't line up.

## 2026-11-12: armory home base (Hero tab backdrop, fixed, hero drawn on top in code)

**Run 1, `2026-11-12-armory/`, job cbd2a858-124b-4e83-9632-71426a4ac073**
- Tool + settings: `create_image_pro`, **216x108, not transparent** (a scene), style = `assets/pixellab/2026-11-11-heroes/sheet.png` (all four aspects: palette, outline, detail, shading), no reference images, no palette. Tile is `tile-01.png` (216x108) plus `gallery.html` at 4x.
- Description: `fantasy RPG armory interior, side view, stone brick back wall, wooden weapon racks with swords axes and spears, round shields on the wall, armor stands, glowing wall torches, wooden ceiling beams, flagstone floor, empty clear floor in the centre, no characters`
- Cost + candidates: 10 generations, 1 candidate (the 171-256 band).
- Why 216x108: 108 rows is the stage frame height; 216 art px is 432 CSS px at 2 px each, so it covers the widest phones and narrower ones crop the edges (hero and focal point stay centred).
- Result: clean and on brief. Stone brick back wall, four round shields and wall torches along the top, wooden racks of swords and spears in the middle, armor stands (plate and chain) on the right, a wooden rack and barrel on the left, flagstone floor with a clear patch in the centre. No characters. Warm, torch-lit browns and greys, so it will need a tint to sit next to the blue-black pixel-cut screens. Kept: user called it "fire". Shipped as `public/sprites/home/armory.png` (Hero tab, `HomeBase.vue`); checked on a 390 and a 360 phone.
- Why / what changed: first run for this piece. User asked for an armory interior, fixed (it does not show the player's gear).
- Later (2026-11-12): brought to the standard 216x116 with 8 rows of inpainted floor; the shipped `armory.png` is now that version (see "armory and run 7 brought to the standard size" above).

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

**Runs 6-8 (item pool, same recipe as run 5)**: all `create_image_pro`, **32x32, transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 791fc4b1), no reference images, no palette, **10 generations, 64 candidates each**. Submitted together after the user said "go ahead with what you think is best" to the three proposals. Why: run 5 covered swords, staffs, armour, helms, shields, relics, amulets and rings; these fill the gaps (other weapons, cursed magic, trinkets) so the user can pick from a wide pool and items get renamed to fit.

**Run 6, `2026-11-12-items-weapons-pool/`, job 2ffe43c4-b71d-4bf3-bb24-78d5db9ada9d** (weapons we're short on)
- Description: `epic legendary fantasy RPG weapons, ornate, glowing and unique, each one different, one item per tile, centred, filling the canvas: legendary bow or crossbow; legendary dagger; legendary axe; legendary hammer or mace`
- Result: 64 clean tiles, strong outline, all colours of the hero sheet. Only partly the four kinds asked for: bows and crossbows are the most common (about 14, drawn as a bow with a crossed arrow filling the tile, frost, gold, purple and fire versions), then war hammers and maces (about 20, barrel-headed hammers with gold, purple, blue-gem and iron bands, plus one spiked mace), double-bladed axes (about 12: iron, red, gold, ice, purple, green leaf), and swords or curved blades standing in for daggers (about 12: flame, ice, green scimitar, serrated, purple void, gold). A few spears (3-4). **Daggers are the weak spot**: no real short daggers, only swords and curved blades. Gallery: `gallery.html` (8x). Contact sheet checked by eye.

**Run 7, `2026-11-12-items-cursed-pool/`, job 2540a3cb-3a46-4c23-ad2b-44ccc50d6560** (magic and cursed)
- Description: `cursed dark magic fantasy RPG loot items, eerie, glowing and unique, each one different, one item per tile, centred, filling the canvas: cursed wand or scepter; cursed orb or crystal; cursed skull or grimoire relic; cursed ring or amulet`
- Result: 64 clean tiles, very different from run 6 and wider than the four kinds, 8 per row: staffs and wands 01-08 (twisted wood, bone, skeletal hand, spiral), orbs and crystals 09-16 (green and purple orbs, slit-eye orbs, purple, red and pale crystals), skulls 17-24 (ram skull, skull chalice, bull skull, jawbone, wrapped skulls), grimoires and scrolls 25-32 (eye books, skull book, chained book, three runed scrolls), rings and amulets 33-40 (purple-gem ring, dark ring, eye amulets, fang necklace, ruby pendant, sun medallion), then mixed dark relics 41-64: dark swords and a pickaxe, key rings, hourglasses, black chalice, spiked crowns, chests, gauntlets, mirrors, potions, a gargoyle statue, shadow flame and jars with a shadow inside. Gallery: `gallery.html` (8x). Contact sheet checked by eye.

**Run 8, `2026-11-12-items-trinkets-pool/`, job 7e896fff-ec2a-4da3-8101-52fcc23104ca** (trinkets and wearables)
- Description: `magical fantasy RPG trinkets and accessories, glowing and unique, each one different, one item per tile, centred, filling the canvas: magic ring; boots or gloves; belt, cape or pauldron; potion, charm or lantern`
- Result: 64 clean tiles, brighter and more varied than run 7. Rings are the biggest group (about 14: ruby, sapphire, emerald, skull, silver swirl, bone, purple-gem), then capes and cloaks (about 12), boots (about 8, iron and leather), gloves and gauntlets (about 5), potions (about 10 in red, blue and green), belts (4, two with jewelled pauldrons), medallions with a rune (about 6), necklaces (3), a pocket watch, two keys and two lanterns. No big weak spot, but **few charms and lanterns**. Gallery: `gallery.html` (8x). Contact sheet checked by eye.

**Run 9, `2026-11-12-items-gaps-pool/`, job 7cc08c70-5b1a-4c66-a3e6-ba3171884e25** (gaps: daggers, spears, charms, lanterns)
- Tool + settings: `create_image_pro`, **32x32, transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 791fc4b1), no reference images, no palette. 10 generations, 64 candidates.
- Description: `fantasy RPG loot items, ornate, glowing and unique, each one different, one item per tile, centred, filling the canvas: short dagger or knife; spear or halberd; charm or talisman; lantern or torch`
- Why / changed from run 6: run 6's "legendary dagger" gave swords, so this says "short dagger or knife"; "epic legendary" dropped so some tiles can look plainer. User said "run it" to these exact inputs.
- Result: **fixes the gaps, and it kept the order of the four kinds.** 64 clean tiles in two passes of the four kinds, 8 per row: daggers 01-08 and 33-40 (real short blades: steel, gold, jewelled, bone-grey, serrated, purple crystal, with ruby and sapphire pommels), spears and halberds 09-16 and 41-48 (iron, gold, red-ribboned, ice-tipped, flame-tipped, axe-halberds, purple void spear), charms and talismans 17-24 and 49-56 (rune plaque, ruby, sapphire, emerald, bronze disc, dreamcatchers, moon orb, purple gem, mirror, red-rune frame), lanterns, candelabras and torches 25-32 and 57-64 (iron and brass lanterns in amber, white, green and violet light, candelabra, green, orange and purple torches, birdcages, a violet flame brazier). Plainer than runs 5-8 (good for commons and uncommons). Gallery: `gallery.html` (8x). Contact sheet checked by eye.

**Runs 10-11 (sword and scythe focus)**: both `create_image_pro`, **32x32, transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 791fc4b1), no reference images, no palette, **10 generations, 64 candidates each**. Why: after the first item-to-art matching (approval page, `assets/pixellab/item-art-approval.json`) the user wanted cooler epic and rare swords, a red Vampiric Fang, and a real scythe for the Echoing Scythe instead of renaming it to a blade. User said "go ahead" to these exact inputs.

**Run 10, `2026-11-12-items-swords-pool/`, job f286a68c-bf45-4c07-b387-2b2791766497** (cooler epic and rare swords)
- Description: `epic legendary fantasy RPG swords, ornate, glowing and unique, each one different, bold distinctive silhouettes, one item per tile, centred, filling the canvas: legendary greatsword; ornate runed longsword; curved katana or scimitar; glowing magic blade with an elemental effect`
- Result: 64 clean tiles, but mostly big plain swords like run 5 (steel, gold, tan, bone, some with runes), 8 per row, no clear sub-kinds; no real katanas or scimitars (41-42 are the only curved ones). **The elemental ones are the best**: fire 09, 22, 28, 36, 44, 50; ice 14, 20, 31, 45; gold sparks 15; green nature 53; lilac crystal 54; purple void aura 08, 24, 55, 56; blue lightning 61; flame-rainbow 60; big gold greatswords 25, 49, 57. Gallery: `gallery.html` (8x). Contact sheet checked by eye.

**Run 11, `2026-11-12-items-blood-scythes-pool/`, job 5883b249-c811-4bbc-b717-8d0d20e7575f** (red vampiric blades and scythes)
- Description: `blood-red vampiric fantasy RPG weapons, eerie, glowing and unique, each one different, one item per tile, centred, filling the canvas: crimson blood-drinking sword; fang-shaped dagger with a red glow; dark reaper scythe with a long curved blade; red glowing katana or scimitar`
- Result: **Works.** 64 clean red-and-black tiles, 8 per row: bloody swords 01-16 (dripping blades 01-04, runed red blades 07-08, 15-16), fang daggers and curved blades 17-32 (blood-dripping fangs 17-19, hooked and curved 20-24, glowing red crystal blades 29-31), **scythes 33-35 (proper long-handled scythes) and sickles 36-40**, red katanas and scimitars 41-48, then axes, spiked maces and hammers 49-56 and crossed spears and bows 57-64 (drifted from the four kinds). Gallery: `gallery.html` (8x). Contact sheet checked by eye.

**Run 12, `2026-11-12-items-staffs-crowns-pool/`, job 30ab81ca-d114-4969-8d1c-91777448f09d** (mage staffs and crowns)
- Tool + settings: `create_image_pro`, **32x32, transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 791fc4b1), no reference images, no palette. 10 generations, 64 candidates.
- Description: `fantasy RPG mage staffs and crowns, glowing and unique, each one different, one item per tile, centred, filling the canvas: vine-wrapped nature staff; crystal wizard staff; wand with a star or moon; ornate crown or circlet`
- Why: after the approval page the user denied Staff of Renewal ("we need more mage staffs to pick from, a vine staff would be good") and said Glass Crown "doesn't look very glass"; "glass" dropped from the wording (may not generate well), Glass Crown can be renamed. User said "run it" to these exact inputs.
- Result: **very good, both kinds.** 64 clean tiles, 8 per row: nature and vine staffs 01-08 (vine-wrapped with green orb 02, 04, 05, amber crystal 07), crystal-topped wizard staffs 09-16 (blue, purple, red, pink), elemental and odd staffs 17-24 (fire torch, ice, frost, lightning, purple skull wraith, dark, sun 23, stone), star and moon wands and staffs 25-32 (star 25, 26, 29, crescent 27, 30, sparkle wand 28), more staffs 33-40 (winged wand, flame and ice, leaf sprig 36, shell, blue wind swirl 38, galaxy 39), crowns 41-48 (red-velvet gold and silver, jewelled), circlets and themed crowns 49-56 (gold and silver circlets, **ice crystal crown 51**, flame crowns 52-53, feather, dark and purple), nature crowns 57-64 (thorn, flower wreaths, horn, coral, mushroom, moss). Gallery: `gallery.html` (8x). Contact sheet checked by eye.

**Run 13, `2026-11-12-items-mage-hats-pool/`, job 9fd783a5-227b-4cce-bec4-d0cf3b254f7b** (better mage hats)
- Tool + settings: `create_image_pro`, **32x32, transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 791fc4b1), no reference images, no palette. 10 generations, 64 candidates.
- Description: `fantasy RPG mage hats, glowing and unique, each one different, one item per tile, centred, filling the canvas: pointed wizard hat with a brim; pyromancer hat with flames; astral starry night wizard hat; hooded mage cowl`
- Why: the user wanted better mage hats (Apprentice's Hat, Pyromancer's Hat, Astral Hat in the catalog). User said "run it" to these exact inputs.
- Result: **good, and well sorted.** 64 clean tiles, 8 per row: plain wizard hats 01-08 (brown and purple, buckles, feathers, charms), pyromancer hats 09-16 (flame-topped hats on robes, flame brims: 10-15 are the best), starry astral hats 17-24 (blue and purple with stars, crescents, a glowing orb), dark hooded cowls 25-32 (glowing eyes, scarves), more hats 33-40 (lantern, crystals, gem band, antlers), fire hoods 41-48 (flaming hoods, lava cracks), astral hoods 49-56 (ringed planet hood, star hoods, three hats), dark hoods and witch hats 57-64. Gallery: `gallery.html` (8x). Contact sheet checked by eye.

**Run 14, `2026-11-12-items-epic-armor-pool/`, job 55ae12b4-b14b-4cfd-ab11-2d3457ef8421** (epic heavy armour)
- Tool + settings: `create_image_pro`, **32x32, transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 791fc4b1), no reference images, no palette. 10 generations, 64 candidates.
- Description: `epic legendary fantasy RPG heavy armor, ornate, glowing and unique, each one different, one item per tile, centred, filling the canvas: massive plate armor chestplate; spiked dark knight armor; dragon scale armor; glowing runic armor`
- Why: the user wanted more epic armour to replace the Juggernaut Carapace (scarab art, a weak fit). User said "run it" to these exact inputs.
- Finding (user: "it's cut off"): **unusable as is, the armour is clipped.** Measured: nearly every tile spans x 0-31 and reaches y 31 with 22-28 edge pixels on the left and right columns, so shoulders and base are cut by the 32px canvas. Run 5's armour (17-24) has margins and is fine. Not used; Juggernaut stays on its old tile until a re-run.
- Result (before the clipping was noticed): **strong, bulky, a different look from run 5's armour.** 64 clean tiles, 8 per row, all full-width chest pieces with large pauldrons: massive grey plate with gold trim 01-08, dark spiked knight 09-16 (13 and 15 have red glow), dragon scale 17-24 (green, brown, lava-orange), runic frost and blue plate with glyphs on the chest 25-32 (32 is purple), silver and gold paladin plate 33-40, horned magma-cracked demon armour 41-48, bone and skeletal armour 49-56, gold plate with crystal or wing pauldrons 57-64. Caveats: very detailed, so check at the real 2 CSS px size; the dark rows (09-16, 17-24, 41-48) are low contrast on the dark game background. Gallery: `gallery.html` (8x). Contact sheet checked by eye.

**Run 15, `2026-11-12-items-armor-hats-pool/`, job d9c25ec2-400e-4063-a259-5ca1138d2a30** (epic armour re-run, in frame, plus fire mage hats)
- Tool + settings: `create_image_pro`, **32x32, transparent**, style = `assets/pixellab/2026-11-11-heroes/sheet.png` (upload 791fc4b1), no reference images, no palette. 10 generations, 64 candidates.
- Description: `epic legendary fantasy RPG gear, ornate, glowing and unique, each one different, one item per tile, small and centred with empty space around it, whole item fully visible and not cut off: massive plate armor chestplate; spiked dark knight armor; dragon scale armor; fire mage hat with flames and an ember glow`
- Why / changed from run 14: run 14's armour was clipped at the left, right and bottom edges ("filling the canvas" pushed it out), so this says "small and centred with empty space around it, fully visible, not cut off"; the user also asked to add more mage hats "like a fire mage hat" to the same run, so the fourth kind (glowing runic armour) became a fire mage hat. User said "run it" to the as-written version (runic dropped, not spiked dark knight).
- Result: **hats good, armour still clipped.** Tiles 01-48 are armour (16 each): bright gold and silver plate 01-16, very dark spiked knight 17-32 (purple, black, red; low contrast), dragon scale 33-48 (red, green, black-orange). The bottom clipping is fixed (4 or fewer edge pixels on the bottom row, was 31), but **all 48 armour tiles still touch or are cut on the left and right edges** (about 20 edge pixels per side on most; the shoulders are wider than 32). Not usable as is. Tiles 49-64 are fire mage hats (16): red and purple wizard hats with flames at the sides or runes (49-56) and ember or glow hats (57-64); only 0-10 stray edge pixels each (flame particles), 52, 56 and 64 fully clean. Gallery: `gallery.html` (8x). Contact sheet checked by eye, edges measured per side.
- Fix (user picked armour tile 06 for Juggernaut Carapace and said "fix it"; approved after a before/after in the browser): no AI, exact pixel moves with `scripts/item-art/mirror-fix.cjs` (axis 39, dx -4, dy -1): keep the largest connected shape (drops the cut-off sleeve fragment), rebuild the right half as a mirror of the left, shift inside the tile. Result `fixed/tile-06.png` in this run folder: symmetric, closed outline, 0 edge pixels, 1px margin all round; it reads as a torso with two spiked pauldrons. Cost: none.

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
