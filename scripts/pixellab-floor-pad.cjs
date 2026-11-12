// Pads a 216 x 108 Pixellab scene to the standard backdrop size, 216 x 116
// (docs/pixellab-scenes.md), ready for inpaint_image: writes <out-dir>/input.png
// (the tile unchanged at the top, the new rows below starting as copies of its
// bottom row) and <out-dir>/mask.png (white = the new rows to paint, black = keep).
//
//   node scripts/pixellab-floor-pad.cjs <tile.png> <out-dir> [rows = 8]

const fs = require('fs')
const path = require('path')
const { decode, encode } = require('./lib/pnglib.cjs')

const [tile, outDir, rowsArg] = process.argv.slice(2)
if (!tile || !outDir) {
  console.error('usage: node scripts/pixellab-floor-pad.cjs <tile.png> <out-dir> [rows = 8]')
  process.exit(1)
}
const rows = Number(rowsArg ?? 8)
const src = decode(tile)
const w = src.w ?? src.width, h = src.h ?? src.height, px = src.rgba ?? src.data ?? src.pixels
const H = h + rows
const out = Buffer.alloc(w * H * 4), mask = Buffer.alloc(w * H * 4)
for (let y = 0; y < H; y++) {
  const sy = Math.min(h - 1, y)
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, s = (sy * w + x) * 4
    out[i] = px[s]; out[i + 1] = px[s + 1]; out[i + 2] = px[s + 2]; out[i + 3] = 255
    const m = y < h ? 0 : 255
    mask[i] = m; mask[i + 1] = m; mask[i + 2] = m; mask[i + 3] = 255
  }
}
fs.mkdirSync(outDir, { recursive: true })
const write = (name, buf) => fs.writeFileSync(path.join(outDir, name), Buffer.isBuffer(buf) ? buf : Buffer.from(buf))
write('input.png', encode(w, H, out))
write('mask.png', encode(w, H, mask))
console.log(`${w} x ${H}: ${path.join(outDir, 'input.png')} + mask.png (rows ${h}-${H - 1} to paint)`)
