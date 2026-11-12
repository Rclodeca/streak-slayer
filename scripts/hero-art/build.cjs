// npm run hero-art
// Builds the three heroes' sprites from the Pixellab art picked in heroes.json
// (paths under assets/pixellab/, git-ignored and local only; the cleric is the
// game's Mage). The art is native pixel art, so nothing is resampled: each
// figure is cropped, centred on a square canvas with its feet on the bottom
// row, and written 1 file pixel per art pixel in two builds that draw at the
// same CSS size (HERO_CANVAS in heroArt.ts): public/sprites/player/<class>.png
// on a 64-pixel grid, 1.5 CSS px per art pixel (3 device px on 2x screens),
// and <class>@3x.png on a 72-pixel grid, 4/3 CSS px (4 device px on 3x),
// the same two builds spriteUrl.ts picks between. Heroes face the boss as the
// art is drawn, so they aren't mirrored.
const fs = require('fs')
const path = require('path')
const { decode, encode } = require('../lib/pnglib.cjs')

const root = path.join(__dirname, '../..')
const heroes = require('./heroes.json')
const BUILDS = [{ suffix: '', grid: 64 }, { suffix: '@3x', grid: 72 }]

for (const [name, source] of Object.entries(heroes)) {
  const file = path.join(root, 'assets/pixellab', source)
  if (!fs.existsSync(file)) { console.error(`missing Pixellab art: ${file}`); process.exit(1) }
  const art = decode(file)
  let minX = art.w, minY = art.h, maxX = -1, maxY = -1
  for (let y = 0; y < art.h; y++) for (let x = 0; x < art.w; x++) if (art.data[(y * art.w + x) * 4 + 3] >= 128) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  const w = maxX - minX + 1, h = maxY - minY + 1
  for (const { suffix, grid } of BUILDS) {
    if (w > grid || h > grid) throw new Error(`${name} is ${w}x${h}, bigger than its ${grid}-pixel canvas`)
    const offX = Math.floor((grid - w) / 2), offY = grid - h
    const out = Buffer.alloc(grid * grid * 4)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const from = ((minY + y) * art.w + minX + x) * 4
      if (art.data[from + 3] < 128) continue
      const to = ((offY + y) * grid + offX + x) * 4
      art.data.copy(out, to, from, from + 3)
      out[to + 3] = 255
    }
    fs.writeFileSync(path.join(root, 'public/sprites/player', `${name}${suffix}.png`), encode(grid, grid, out))
    if (!suffix) console.log(`${name}: figure ${w}x${h} at x ${offX}, y ${offY} in the base grid`)
  }
}
console.log('built player/warrior, cleric, ranger, each as <name>.png and <name>@3x.png')
