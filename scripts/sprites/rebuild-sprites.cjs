// npm run sprites
// Rebuilds every hero and boss sprite from its source in assets/, in two builds
// that draw at the same CSS size: public/sprites/<name>.png with art pixels
// 1.5 CSS px across (3 device px on 2x screens, like the item icons there) and
// <name>@3x.png at 4/3 CSS px (4 device px on 3x screens). sprites.json holds,
// per sprite, its source, the drawn canvas size in CSS px (a multiple of 12, so
// both builds have whole cells), the figure's longest side and its left/bottom
// offsets in that canvas, whether to mirror it and outline it (heroes, like
// the item icons), and a lower coverage cutoff for thin parts (the ranger's
// bowstring). Uses pixel-icon.cjs with 48 colours.
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { decode, encode } = require('../lib/pnglib.cjs')

// CSS px per art pixel for each build.
const BUILDS = [
  { suffix: '', cell: 3 / 2 },
  { suffix: '@3x', cell: 4 / 3 },
]

const root = path.join(__dirname, '../..')
const spec = require('./sprites.json')
const missing = Object.values(spec).filter((s) => !fs.existsSync(path.join(root, 'assets', s.source)))
if (missing.length) {
  console.error(`missing source art in assets/: ${missing.map((s) => s.source).join(', ')}`)
  process.exit(1)
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sprites-'))
for (const [name, s] of Object.entries(spec)) {
  for (const { suffix, cell } of BUILDS) {
    const grid = Math.round(s.size / cell)
    const tmp = path.join(tmpDir, 'out.png')
    const pad = s.outline ? 2 : 0
    execFileSync('node', [path.join(__dirname, 'pixel-icon.cjs'), path.join(root, 'assets', s.source), tmp, String(grid), '48', '1', String(grid + pad), s.outline ? 'outline' : 'none', String(s.cutoff ?? 0.5)], { stdio: 'ignore' })
    const art = decode(tmp)

    // The figure's box, outline included.
    let minX = art.w, minY = art.h, maxX = -1, maxY = -1
    for (let y = 0; y < art.h; y++) for (let x = 0; x < art.w; x++) if (art.data[(y * art.w + x) * 4 + 3]) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }

    // Place the figure (inside its outline) at its offsets, from the bottom.
    const size = Math.round(s.canvas / cell)
    const ring = s.outline ? 1 : 0
    const offX = Math.round(s.left / cell) - ring
    const offY = size - Math.round(s.bottom / cell) + ring - (maxY - minY + 1)
    const out = Buffer.alloc(size * size * 4)
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const sx = s.mirror ? maxX - (x - minX) : x
      const i = (y * art.w + sx) * 4
      if (!art.data[i + 3]) continue
      const tx = offX + x - minX, ty = offY + y - minY
      if (tx < 0 || ty < 0 || tx >= size || ty >= size) throw new Error(`${name}${suffix} doesn't fit its canvas`)
      art.data.copy(out, (ty * size + tx) * 4, i, i + 4)
    }
    fs.writeFileSync(path.join(root, 'public/sprites', `${name}${suffix}.png`), encode(size, size, out))
  }
}
fs.rmSync(tmpDir, { recursive: true })
console.log(`rebuilt ${Object.keys(spec).length} sprites, each as <name>.png and <name>@3x.png`)
