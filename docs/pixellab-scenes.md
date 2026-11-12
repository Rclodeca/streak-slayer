# Making a scene with Pixellab (how the armory was made)

How the armory home base was generated, shipped and shown, so the next scene (another room, a camp, a level-up variant) can follow the same steps. The exact inputs of the run itself are in `docs/pixellab-runs.md` (2026-11-12: armory home base). The rules for any paid run still apply: show every input and the cost, wait for a clear yes, log it the same session.

## 1. Pick the size from where it is drawn

A scene is a fixed backdrop, so size it in **art pixels** and draw it at **2 CSS px per art pixel**, like the stage's hero and the item art (4 device px on 2x, 6 on 3x, always whole).

- Height: the fight stage frame is 108 art rows (216 CSS px). Same height = same room on screen.
- Width: phones are 360 to 430 CSS px wide, the art can't stretch (stretching breaks the pixel grid). So draw it **wider than the widest phone and crop the sides evenly**: 216 art px = 432 CSS px. Keep the focal point (hero, door, fire) in the middle and let the sides be filler (racks, walls, trees).
- Check the width in `create_image_pro`'s limits first: about a quarter megapixel by aspect ratio (792 x 336 is the widest canvas; 216 x 108 is far inside it).

## 2. The Pixellab run

- **Tool:** `create_image_pro`, `no_background=false` (a scene, not an asset), `width=216`, `height=108`.
- **Style image:** `assets/pixellab/2026-11-11-heroes/sheet.png`, all four aspects (palette, outline, detail, shading), so the scene's outline and shading sit with the hero sprite. Upload it first: `get_upload_url`, then `curl -sS -F "file=@<file>" "<url>"`, and pass the returned `upload:<id>` as `style_image_url`. Uploads last 3 days, so record the local file in the runs log, not the id.
- **Reference images / palette:** none.
- **Description:** describe the room, name the clear patch for the hero, and say there are no characters:
  `fantasy RPG armory interior, side view, stone brick back wall, wooden weapon racks with swords axes and spears, round shields on the wall, armor stands, glowing wall torches, wooden ceiling beams, flagstone floor, empty clear floor in the centre, no characters`
- **Cost:** 216 x 108 is in the 171-256 band: **10 generations, 1 candidate**. Non-square prices are not on the square ladder, so the submit receipt (`cost: N generations`) is the exact number. A cancel after submitting usually still pays. Smaller canvases return more candidates but would break the 2 CSS px match.
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

## 5. For the next scene

- Keep the same canvas and the same clear floor patch in the middle, so the same component and hero placement work.
- Reuse the opening of the description (`fantasy RPG ... interior/exterior, side view`) and change the rooms, props and light.
- If a scene should follow the player (level, progress), generate a small set of the same size and swap the file in `HomeBase.vue`; nothing else changes.
