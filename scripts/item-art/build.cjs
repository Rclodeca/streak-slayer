// npm run item-art
// Builds the item sprites from the Pixellab tiles picked in picks.json (paths under assets/pixellab/, git-ignored
// and local only). The tiles are native 32x32 pixel art, so nothing is resampled: each picked tile (or its fixed
// copy, see picks.json "fixes") is written, centred, to public/sprites/<icon>.png, drawn in the game at 2 CSS px per
// art pixel (64px, see main.scss). Then checks every file is 32x32 RGBA and lists the tiles whose art touches the
// tile's edge (swords and polearms that run corner to corner are fine; anything else is clipped art).
// Each tile is first shifted by whole pixels so its art sits in the middle of the tile (see centred), since
// the picked tiles are drawn off to one side or low in their canvas.
const fs = require('fs')
const path = require('path')
const { decode, encode } = require('./mirror-fix.cjs')

const root = path.join(__dirname, '../..')
const picks = require('./picks.json')
const SIZE = 32

// The tile with its art's bounding box moved to the middle by whole pixels, never off the canvas. A half pixel
// either way is a tie: vertically it goes up (the art reads low otherwise), sideways it stays put.
function centred(tile) {
  let l = SIZE, t = SIZE, r = 0, b = 0
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (tile.px[(y * SIZE + x) * 4 + 3] === 0) continue
      l = Math.min(l, x); r = Math.max(r, x + 1); t = Math.min(t, y); b = Math.max(b, y + 1)
    }
  }
  if (r === 0) return { tile, dx: 0, dy: 0 }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const dx = clamp(Math.round(SIZE / 2 - (l + r) / 2 - 0.0001), -l, SIZE - r)
  const dy = clamp(-Math.ceil((t + b) / 2 - SIZE / 2 - 0.0001), -t, SIZE - b)
  if (!dx && !dy) return { tile, dx, dy }
  const px = Buffer.alloc(tile.px.length)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const [nx, ny] = [x + dx, y + dy]
      if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue
      tile.px.copy(px, (ny * SIZE + nx) * 4, (y * SIZE + x) * 4, (y * SIZE + x) * 4 + 4)
    }
  }
  return { tile: { ...tile, px }, dx, dy }
}

const entries = Object.entries(picks.items)
const problems = []
const edgeTouching = []

for (const [id, item] of entries) {
  const letter = item.tile[0]
  const number = item.tile.slice(1)
  const fixed = picks.fixes[item.tile]
  const src = fixed
    ? path.join(root, fixed.fixedFile)
    : path.join(root, picks.folders[letter], `tile-${number.padStart(2, '0')}.png`)
  if (!fs.existsSync(src)) {
    problems.push(`${id}: missing source ${path.relative(root, src)}`)
    continue
  }
  const tile = decode(src)
  if (tile.w !== SIZE || tile.h !== SIZE) {
    problems.push(`${id}: ${item.tile} is ${tile.w}x${tile.h}, not ${SIZE}x${SIZE}`)
    continue
  }
  const out = path.join(root, 'public/sprites', `${item.icon}.png`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  const moved = centred(tile)
  fs.writeFileSync(out, encode(SIZE, SIZE, moved.tile.px))

  const sides = []
  const opaque = (x, y) => moved.tile.px[(y * SIZE + x) * 4 + 3] > 0
  for (let i = 0; i < SIZE; i++) {
    if (opaque(i, 0) && !sides.includes('top')) sides.push('top')
    if (opaque(i, SIZE - 1) && !sides.includes('bottom')) sides.push('bottom')
    if (opaque(0, i) && !sides.includes('left')) sides.push('left')
    if (opaque(SIZE - 1, i) && !sides.includes('right')) sides.push('right')
  }
  if (sides.length) edgeTouching.push(`${id} (${item.tile}): ${sides.join(', ')}`)
}

// Re-read what was written: the same count, all 32x32 RGBA (colour type 6, 8 bit).
const written = entries.map(([, item]) => path.join(root, 'public/sprites', `${item.icon}.png`)).filter((f) => fs.existsSync(f))
for (const f of written) {
  const b = fs.readFileSync(f)
  if (b.readUInt32BE(16) !== SIZE || b.readUInt32BE(20) !== SIZE || b[24] !== 8 || b[25] !== 6) {
    problems.push(`${path.relative(root, f)}: not a ${SIZE}x${SIZE} 8-bit RGBA PNG`)
  }
}

console.log(`${written.length} of ${entries.length} item sprites written to public/sprites/items/`)
console.log(`${edgeTouching.length} tiles touch the tile edge:`)
for (const line of edgeTouching) console.log(`  ${line}`)
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
