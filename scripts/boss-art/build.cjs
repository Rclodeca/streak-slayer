// npm run boss-art
// Builds the boss sprites from the Pixellab art listed in families.json (paths
// under assets/pixellab/, git-ignored and local only). The art is native pixel
// art, so nothing is resampled: each image is cropped to its figure, mirrored
// to face left (the figures all face forward; the hero stands on the left;
// an entry marked mirror: false in families.json already faces that way),
// padded with empty pixels (the feet stay on the bottom row) to a width and
// height of whole sixes, so its CSS size is whole at both densities (1.5 px per
// art pixel on 2x, 4/3 on 3x: a browser lays out in 64ths of a px, and an
// art pixel count that isn't a multiple of 3 gives a size that can't be
// held exactly, which shifts rows of art by a device pixel), and scaled
// by whole steps, 3x for public/sprites/bosses/<family>/<n>.png (3 device px per
// art pixel, drawn at 1.5 CSS px on 2x screens) and 4x for <n>@3x.png (4 device
// px, drawn at 4/3 CSS px on 3x screens). An <img> with srcset "x.png 2x,
// x@3x.png 3x" sizes itself from that: a file's width divided by its density.
// (spriteUrl.ts has the same two builds for the hero and old boss sprites.)
const fs = require('fs')
const path = require('path')
const { decode, encode } = require('../item-icons/pnglib.cjs')

const root = path.join(__dirname, '../..')
const families = require('./families.json')
const SCALES = [{ suffix: '', step: 3 }, { suffix: '@3x', step: 4 }]

// An entry is a path, or { src, mirror: false } for art that already faces the hero.
const entry = (e) => (typeof e === 'string' ? { src: e, mirror: true } : { mirror: true, ...e })
const missing = Object.values(families).flat().map((e) => entry(e).src).filter((p) => !fs.existsSync(path.join(root, 'assets/pixellab', p)))
if (missing.length) {
  console.error(`missing Pixellab art in assets/pixellab/: ${missing.join(', ')}`)
  process.exit(1)
}

let count = 0
for (const [family, sources] of Object.entries(families)) {
  const dir = path.join(root, 'public/sprites/bosses', family)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  sources.forEach((e, i) => {
    const { src: source, mirror } = entry(e)
    const art = decode(path.join(root, 'assets/pixellab', source))
    let minX = art.w, minY = art.h, maxX = -1, maxY = -1
    for (let y = 0; y < art.h; y++) for (let x = 0; x < art.w; x++) if (art.data[(y * art.w + x) * 4 + 3]) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
    const figW = maxX - minX + 1, figH = maxY - minY + 1
    const w = Math.ceil(figW / 6) * 6, h = Math.ceil(figH / 6) * 6
    const padL = Math.floor((w - figW) / 2), padT = h - figH
    // The mirrored figure, one art pixel per cell. A faint pixel (a soft edge) is made whole or dropped.
    const cells = Buffer.alloc(w * h * 4)
    for (let y = 0; y < figH; y++) for (let x = 0; x < figW; x++) {
      const from = ((minY + y) * art.w + (mirror ? maxX - x : minX + x)) * 4
      if (art.data[from + 3] < 128) continue
      const to = ((padT + y) * w + padL + x) * 4
      art.data.copy(cells, to, from, from + 3)
      cells[to + 3] = 255
    }
    for (const { suffix, step } of SCALES) {
      const out = Buffer.alloc(w * step * h * step * 4)
      const outW = w * step
      for (let y = 0; y < h * step; y++) for (let x = 0; x < outW; x++) {
        cells.copy(out, (y * outW + x) * 4, (Math.floor(y / step) * w + Math.floor(x / step)) * 4, (Math.floor(y / step) * w + Math.floor(x / step)) * 4 + 4)
      }
      fs.writeFileSync(path.join(dir, `${i + 1}${suffix}.png`), encode(outW, h * step, out))
    }
    count++
  })
}
console.log(`built ${count} boss sprites in ${Object.keys(families).length} families, each as <n>.png (3x) and <n>@3x.png (4x)`)
