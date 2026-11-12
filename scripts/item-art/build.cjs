// npm run item-art
// Builds the item sprites from the Pixellab tiles picked in picks.json (paths under assets/pixellab/, git-ignored
// and local only). The tiles are native 32x32 pixel art, so nothing is resampled: each picked tile (or its fixed
// copy, see picks.json "fixes") is written as is to public/sprites/<icon>.png, drawn in the game at 2 CSS px per
// art pixel (64px, see main.scss). Then checks every file is 32x32 RGBA and lists the tiles whose art touches the
// tile's edge (swords and polearms that run corner to corner are fine; anything else is clipped art).
const fs = require('fs')
const path = require('path')
const { decode } = require('./mirror-fix.cjs')

const root = path.join(__dirname, '../..')
const picks = require('./picks.json')
const SIZE = 32

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
  fs.copyFileSync(src, out)

  const sides = []
  const opaque = (x, y) => tile.px[(y * SIZE + x) * 4 + 3] > 0
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
