# Making a scene with Pixellab (how the armory was made)

How the armory home base was generated, shipped and shown, so the next scene (another room, a camp, a level-up variant) can follow the same steps. The exact inputs of the run itself are in `docs/pixellab-runs.md` (2026-11-12: armory home base). The rules for any paid run still apply: show every input and the cost, wait for a clear yes, log it the same session.

## 1. The size: every backdrop is 216 x 116

**All backgrounds are one size: 216 x 116 art px**, drawn at **2 CSS px per art pixel** (432 x 232 CSS px), like the stage's hero and the item art (4 device px on 2x, 6 on 3x, always whole). That covers the fight stage's arenas, the Hero tab armory, and any future dungeon art or shop backdrop, so any backdrop can go in either place. Don't make one another size.

| | Size | Where the feet land |
|---|---|---|
| Fight stage (`StageScene.vue`, arena held to the box's bottom) | 216 x 116, fills the 232px backdrop box at 390 wide exactly | hero row 108, boss row 86 |
| Hero tab (`HomeBase.vue`, frame `ART_H = 232`) | 216 x 116 | hero row 101 (`bottom: 30px`) |

- A notched iPhone's status-bar inset sits above the backdrop as a dark bar, not art.
- A new backdrop is generated at **216 x 116** directly (`create_image_pro`, `width=216`, `height=116`).
- An old 216 x 108 tile is brought to size with the **8-row floor inpaint**, which worked well: `node scripts/pixellab-floor-pad.cjs <tile.png> <run-folder>`, upload its `input.png` and `mask.png`, and run `inpaint_image` with the description `more of the same flagstone floor continuing toward the viewer, matching the existing floor tiles, colours and lighting exactly, no characters, no objects` (10 generations; check the original's pixels are unchanged). Done for run 6 (`arena6b`), run 7 (`arena7b`) and the armory.
- **Never** extend a backdrop with tall bands of invented wall: the 216x148 version (30 rows of wall on top) was horrible.

How 116 was found (keep it if the stage changes): the fight stage's backdrop box is 232 CSS px at 390 wide, the height of the painted scene's canvas (`StageScene.vue`). Measure it again before changing the size.

- Height: 116 rows (above). The armory and the first arenas were made 108 rows by mistake (108 is only the painted scenes' design frame, not their full height) and given 8 rows of floor with `inpaint_image`.
- Width: phones are 360 to 430 CSS px wide, the art can't stretch (stretching breaks the pixel grid). So draw it **wider than the widest phone and crop the sides evenly**: 216 art px = 432 CSS px. Keep the focal point (hero, door, fire) in the middle and let the sides be filler (racks, walls, trees).
- Check the width in `create_image_pro`'s limits first: about a quarter megapixel by aspect ratio (792 x 336 is the widest canvas; 216 x 116 is far inside it).

## 2. The Pixellab run

- **Tool:** `create_image_pro`, `no_background=false` (a scene, not an asset), `width=216`, `height=116` (the armory itself was made at `height=108` and padded later).
- **Style image:** `assets/pixellab/2026-11-11-heroes/sheet.png`, all four aspects (palette, outline, detail, shading), so the scene's outline and shading sit with the hero sprite. Upload it first: `get_upload_url`, then `curl -sS -F "file=@<file>" "<url>"`, and pass the returned `upload:<id>` as `style_image_url`. Uploads last 3 days, so record the local file in the runs log, not the id.
- **Reference images / palette:** none.
- **Description:** describe the room, name the clear patch for the hero, and say there are no characters:
  `fantasy RPG armory interior, side view, stone brick back wall, wooden weapon racks with swords axes and spears, round shields on the wall, armor stands, glowing wall torches, wooden ceiling beams, flagstone floor, empty clear floor in the centre, no characters`
- **Cost:** 216 x 108, 216 x 116 and 216 x 148 all cost **10 generations, 1 candidate** (receipts). Non-square prices are not on the square ladder, so the submit receipt (`cost: N generations`) is the exact number. A cancel after submitting usually still pays. Smaller canvases return more candidates but would break the 2 CSS px match.
- **Time:** about a minute. `wait_for_jobs`, then download the tile.

What to watch for: the chibi hero sheet can pull a scene toward chunky, cartoon shapes, and "no characters" may be ignored. The first armory run did neither. The colours came out warm and torch-lit, so a scene may need a tint to sit next to the blue-black UI.

## 3. After the run

1. Download: `curl -sS -o assets/pixellab/<run-folder>/tile-01.png "https://api.pixellab.ai/mcp/images/<job id>/download"` (add `?index=N` for the Nth of several candidates).
2. `node scripts/pixellab-gallery.cjs assets/pixellab/<run-folder> 4` and open the `gallery.html` it writes (it reads the tile's height now, so non-square tiles are not squashed). Judge it there, never in the 4x `sheet.png`.
3. Log the run in `docs/pixellab-runs.md`: folder, job id, tool, canvas, style image file, exact description, cost and candidates, result, what changed.

## 4. Shipping it

- Copy the kept tile to `public/sprites/home/<name>.png` (the service worker precaches every PNG under `public/sprites`, so it works offline; `pwaPrecache.spec.ts` checks it).
- Draw it as an `<img>` with `image-rendering: pixelated` at its native size x 2 (`src/components/character/HomeBase.vue`). On a phone's Hero tab `AppShell` renders `HomeBase` pinned in the first grid row, in place of the fight stage's Focus strip; the page's menu rides in its corner through the slot.
- **Whole pixels:** centre the art by an offset snapped to whole CSS px (`Math.floor((width - 432) / 2)`, kept current by a `ResizeObserver`), not `left: 50%; translateX(-50%)`, which lands on half pixels on odd-width phones.
- **The hero is not in the art.** The scene is generated empty with a clear floor patch, and the real hero sprite (base build, 64 art px at 2 CSS px = 128px) is drawn on top in code, so it always matches the player's class. A hero baked into the image would not.

## 5. The boss arena (a scene with two fighters)

The boss arena (`docs/pixellab-runs.md`, 2026-11-12: boss arena; run 6 is the default, run 7 a skin, run 3 an alternative stage, run 4 a possible Hero tab backdrop) took seven runs. The first three found the depth, all on the same canvas and style image as the armory. What differs from the armory is the floor: the fight stage has the boss on the right, standing only a little higher than the hero on the left. Measured on the stage at 390 wide, the boss's feet land on art row 86 of 108 and the hero's on row 108, the bottom edge. So the floor has to start a little above row 86, with open floor behind the boss, and nothing higher.

- **Run 1:** "slightly raised side view", "curved back wall", "sigil ring" gave a big round floor seen from above. Far too much depth: the floor rose way above the boss.
- **Run 2:** "camera just above floor level", "floor only along the bottom quarter" gave the right look, but the wall started around row 82, so the boss looked backed up against it.
- **Run 3 (kept as an alternative):** "side view with a little depth", "back wall set back from the front with an open stretch of floor before it", "floor along the bottom third". The wall base sits near row 70, leaving floor behind the boss. But "ruined stone hall" made the wall too detailed (moss, vines, cracks).
- **Runs 4-5:** a plainer wall ("plain ... large simple blocks with little detail"), but the wall came forward to row 80-84 again, even with a flat layout sketch as a reference image (ignored).
- **Runs 6-7 (default + skin):** run 3's wording with "a little depth" made "depth" and "ruined" dropped. Both landed the wall near row 68-70 with a plainer wall and lit braziers. Use this description for the next arena.

Lessons: the floor line is not reliable from a floor share alone ("bottom third" landed at row 70 in runs 3, 6 and 7 but at 80-84 in runs 4-5), so measure each result (mean brightness per row across the middle half shows the wall-floor seam) and check a standing boss on the stage. Describing the wall at length ("plain ... large simple blocks") seemed to bring it forward. "Ruined" adds moss and cracks. A flat block-in reference image does not set the horizon. Don't ask for a flat, straight-on view: the user wants some depth, like the painted scenes. "Arena", "pit" and "curved" pull toward a round floor seen from above. Plinths are hidden over the arena (the floor does their job). The exact run 6 description is in the runs log; reuse it, changing only the room and props, for dungeon arenas and shop backdrops, and run it twice to get one with the right depth.

**Extending a scene that came out too short** (how run 6 became `arena6b`, 216x116): paste the tile unchanged into a taller canvas in code, fill the new rows with copies of its bottom row, make a mask (white = the new rows, black = the original), and run `inpaint_image` with both uploaded and the description `more of the same flagstone floor continuing toward the viewer, matching the existing floor tiles, colours and lighting exactly, no characters, no objects`. The original pixels stay identical (check it); it costs 10 generations. A 216x148 version that also added 30 rows of wall on top was rejected as awful. Regenerating run 6's prompt at 216x148 gave one good result (run 8) and one with a flat floor (run 9), so for a new stage backdrop, generate 216x116 directly and run it twice.

## 6. For the next scene

- Keep the same canvas and the same clear floor patch in the middle, so the same component and hero placement work.
- Reuse the opening of the description (`fantasy RPG ... interior/exterior, side view`) and change the rooms, props and light.
- If a scene should follow the player (level, progress), generate a small set of the same size and swap the file in `HomeBase.vue`; nothing else changes.
