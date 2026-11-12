// node scripts/item-art/mirror-fix.cjs <in.png> <out.png> <axis> <dx> <dy>
// Fixes a 32x32 tile whose art is wider than the canvas and cut at the edges: drops detached fragments (keeps the
// largest connected shape), rebuilds the right half as a mirror of the left half (pixel x maps to axis - x), then
// shifts the result by dx, dy so it sits inside the tile. Exact pixel moves only, no resampling and no AI.
// Used for Juggernaut Carapace (armor-hats-pool tile 06): axis 39, dx -4, dy -1.
const fs = require('fs')
const zlib = require('zlib')

function decode(file) {
  const b = fs.readFileSync(file)
  let p = 8
  const idat = []
  let w
  let h
  while (p < b.length) {
    const len = b.readUInt32BE(p)
    const type = b.toString('ascii', p + 4, p + 8)
    if (type === 'IHDR') { w = b.readUInt32BE(p + 8); h = b.readUInt32BE(p + 12) }
    if (type === 'IDAT') idat.push(b.slice(p + 8, p + 8 + len))
    p += 12 + len
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = w * 4
  const px = Buffer.alloc(h * stride)
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)]
    for (let x = 0; x < stride; x++) {
      const r = raw[y * (stride + 1) + 1 + x]
      const a = x >= 4 ? px[y * stride + x - 4] : 0
      const u = y ? px[(y - 1) * stride + x] : 0
      const c = x >= 4 && y ? px[(y - 1) * stride + x - 4] : 0
      let v = r
      if (filter === 1) v = r + a
      else if (filter === 2) v = r + u
      else if (filter === 3) v = r + ((a + u) >> 1)
      else if (filter === 4) {
        const pp = a + u - c
        const pa = Math.abs(pp - a)
        const pb = Math.abs(pp - u)
        const pc = Math.abs(pp - c)
        v = r + (pa <= pb && pa <= pc ? a : pb <= pc ? u : c)
      }
      px[y * stride + x] = v & 255
    }
  }
  return { w, h, px }
}

const crcTable = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})
const crc = (buf) => {
  let c = -1
  for (const x of buf) c = crcTable[(c ^ x) & 255] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const sum = Buffer.alloc(4)
  sum.writeUInt32BE(crc(body))
  return Buffer.concat([len, body, sum])
}
function encode(w, h, px) {
  const stride = w * 4
  const rows = Buffer.alloc(h * (stride + 1))
  for (let y = 0; y < h; y++) px.copy(rows, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  const head = Buffer.alloc(13)
  head.writeUInt32BE(w, 0)
  head.writeUInt32BE(h, 4)
  head[8] = 8
  head[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', zlib.deflateSync(rows)), chunk('IEND', Buffer.alloc(0))])
}

function mirrorFix(file, axis, dx, dy) {
  const t = decode(file)
  const size = t.w
  const seen = new Uint8Array(size * size)
  let best = []
  for (let s = 0; s < size * size; s++) {
    if (seen[s] || t.px[s * 4 + 3] === 0) continue
    const stack = [s]
    const comp = []
    seen[s] = 1
    while (stack.length) {
      const i = stack.pop()
      comp.push(i)
      const x = i % size
      const y = (i / size) | 0
      for (let ay = -1; ay <= 1; ay++) {
        for (let ax = -1; ax <= 1; ax++) {
          const nx = x + ax
          const ny = y + ay
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue
          const j = ny * size + nx
          if (!seen[j] && t.px[j * 4 + 3]) { seen[j] = 1; stack.push(j) }
        }
      }
    }
    if (comp.length > best.length) best = comp
  }
  const keep = new Set(best)
  const at = (x, y) => (x < 0 || x >= size || !keep.has(y * size + x) ? null : t.px.slice((y * size + x) * 4, (y * size + x) * 4 + 4))
  const half = Math.floor(axis / 2)
  const out = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < axis + 1; x++) {
      const p = x <= half ? at(x, y) : at(axis - x, y)
      if (!p) continue
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || nx >= size || ny < 0 || ny >= size) throw new Error(`pixel ${x},${y} would land outside the tile at ${nx},${ny}`)
      out.set(p, (ny * size + nx) * 4)
    }
  }
  return { w: size, h: size, px: out }
}

if (require.main === module) {
  const [inFile, outFile, axis, dx, dy] = process.argv.slice(2)
  if (!outFile) { console.error('usage: node scripts/item-art/mirror-fix.cjs <in.png> <out.png> <axis> <dx> <dy>'); process.exit(1) }
  const r = mirrorFix(inFile, Number(axis), Number(dx), Number(dy))
  fs.writeFileSync(outFile, encode(r.w, r.h, r.px))
}
module.exports = { mirrorFix, decode, encode }
