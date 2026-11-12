# Credits

## Pixellab art

The boss images in `public/sprites/bosses/<family>/<n>.png` (51, in ten families) were generated with [Pixellab](https://pixellab.ai) (`create_image_pro`, the hero sheet as the style image), picked and tidied by hand, and built with `npm run boss-art` (`scripts/boss-art/`, the picks in `families.json`). They replace the FreePixel boss sprites below, which the game no longer shows (`bosses/hooded.png` is still used by the death screen).

The three heroes in `public/sprites/player/` (Warrior, Mage, Ranger) are Pixellab art too, picked from the same sheets and built with `npm run hero-art` (`scripts/hero-art/`, the picks in `heroes.json`). They replace the FreePixel heroes.

All 94 item icons in `public/sprites/items/` are Pixellab art too (`create_image_pro`, 32x32, the hero sheet as the style image), picked by hand and written unchanged, one file pixel per art pixel, with `npm run item-art` (`scripts/item-art/`, the picks in `picks.json`). They replace the FreePixel item icons.

## FreePixel art

The boss sprites in `public/sprites/bosses/*.png` that the game no longer shows (`hooded.png` is still used by the death screen) and the old player heroes come from [FreePixel](https://freepixel.art/), used under the [FreePixel Asset License](https://freepixel.art/license/): free for personal and commercial games and apps, modification allowed, no attribution required (credited here anyway). The raw asset files themselves must not be redistributed, so only the processed sprites live in the repo. They were rebuilt with `npm run sprites` (`scripts/sprites/rebuild-sprites.cjs`, settings per sprite in `sprites.json`) in two builds drawn at the same size, `<name>.png` for 2x screens and `<name>@3x.png` for 3x, with 48 colours.

### Boss sprites

| File | FreePixel source |
|---|---|
| `bosses/balanced.png` | `starter-hero-rogue-dual-daggers-hood-leather-death-falling_20260217_212644.png` |
| `bosses/hooded.png` | `wizard-cloak-dark-black-flowing-hooded_20260225_190428.png` |
| `bosses/tank.png` | `rpg-troll-chief-large-troll-062-v2-2026-03-03T17-02-45.png` |
| `bosses/armored.png` | `celestial-paladin-radiant-shield-blessed-sword-plate-armor_20260217_155248.png` |
| `bosses/armored3x.png` | `8bit-plate-armor-heavy-armor-005-2026-03-10T18-57-54.png` |
| `bosses/armored4x.png` | `mediev-plate-armor-full-armor-031-v4-2026-03-25T19-14-54.png` |
| `bosses/armored5x.png` | `celestial-paladin-radiant-shield-blessed-sword-plate-armor_20260217_155514.png` |
| `bosses/warded.png` | `forbidden-tome-dark-chains-locked-black-leather_20260225_183200.png` |
| `bosses/warded3x.png` | `rpg-ice-troll-blue-frozen-060-v2-2026-03-03T17-02-45.png` |
| `bosses/warded4x.png` | `rpg-troll-ghost-spectral-troll-184-v4-2026-03-03T17-02-45.png` |
| `bosses/warded5x.png` | `celestial-guardian-golden-armor-ethereal-wings-divine-aura_20260217_154507.png` |
| `bosses/brute.png` | `rpg-troll-warrior-armored-troll-107-v3-2026-03-03T17-02-45.png` |
| `bosses/brute3x.png` | `rpg-axe-troll-battle-axe-088-v2-2026-03-03T17-02-45.png` |
| `bosses/brute4x.png` | `rpg-spiked-troll-spine-covered-147-v3-2026-03-03T17-02-45.png` |
| `bosses/brute5x.png` | `rpg-ancient-red-dragon-massive-067-v2-2026-03-03T17-02-45.png` |
| `bosses/arcane.png` | `starter-hero-mage-staff-robes-magical-death-falling_20260217_212554.png` |
| `bosses/arcane3x.png` | `celestial-mage-holy-staff-divine-robes-golden-trim-casting_20260217_155139.png` |
| `bosses/arcane4x.png` | `cultist.png` |
| `bosses/arcane5x.png` | `rpg-black-dragon-dark-shadow-104-v3-2026-03-03T17-02-45.png` |

### Player heroes

Picked per run from the rolled starting stats (`heroClassFor` in `character.ts`). Processed like the bosses (`npm run sprites`), plus a 1-pixel dark outline. The ranger uses a 30% coverage cutoff (like `--thin` for items) so its bowstring survives, and is drawn at 0.915 of its source's size to stand as tall as the others.

| File | FreePixel source |
|---|---|
| `player/warrior.png` | `starter-hero-warrior-sword-shield-plate-armor-idle-standing_20260217_212146.png` |
| `player/cleric.png` | `starter-hero-cleric-holy-mace-armor-divine-cast-heal-aura_20260217_213000.png` |
| `player/ranger.png` | `starter-hero-ranger-bow-cloak-nature-hurt-taking-damage_20260217_212747.png` |
