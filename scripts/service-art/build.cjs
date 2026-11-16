// npm run service-art
// Draws the Shop's service seals (docs/mockups/services-art.html, B) to public/sprites/services/<id>.png: a round
// pixel medallion with a 16x16 glyph on its face, native 32x32 like the item art so it is drawn at the same size.
// Brass for the gold services, frost silver for the gem ones. Round, not the items' square socket, so a
// service never reads as something to wear. The rotating services' card scenes (<id>-scene.png) are Pixellab
// art copied in by hand (docs/pixellab-runs.md, service scenes), not drawn here.
const fs = require('fs')
const path = require('path')
const { encode } = require('../lib/pnglib.cjs')

const out = path.join(__dirname, '../../public/sprites/services')
const SIZE = 32

// 16x16 glyphs: a = outline, b = mid, c = light
const snow = (() => {
  const g = Array.from({ length: 16 }, () => Array(16).fill('.'))
  const set = (r, c, v = 'c') => { g[r][c] = v }
  for (let i = 1; i <= 13; i++) { set(i, 7); set(7, i) }
  for (let d = 1; d <= 5; d++) { set(7 - d, 7 - d, 'b'); set(7 - d, 7 + d, 'b'); set(7 + d, 7 - d, 'b'); set(7 + d, 7 + d, 'b') }
  for (const [r, c] of [[2, 6], [2, 8], [12, 6], [12, 8], [6, 2], [8, 2], [6, 12], [8, 12]]) set(r, c)
  return g.map((row) => row.join(''))
})()
const GLYPHS = {
  reroll: [
    '................', '................',
    '..aaaaaaaaaaaa..', '..acccccccccba..', '..acaaccccccba..', '..acaaccccccba..', '..acccccccccba..',
    '..accccaacccba..', '..accccaacccba..', '..acccccccccba..', '..acccccccaaba..', '..acccccccaaba..',
    '..abbbbbbbbbba..', '..aaaaaaaaaaaa..', '................', '................',
  ],
  overdrive: [
    '................', '.......aa.......', '......acba......', '......acba......', '.....acbbba.....', '.....acbbba.....',
    '....acbbbbba....', '...acbbccbbba...', '...acbcccbbba...', '..acbccccbbbba..', '..acbccccbbbba..', '..acbbccbbbbba..',
    '...abbbbbbbba...', '....aabbbbaa....', '......aaaa......', '................',
  ],
  enchant: [
    '................', '...aaaaaaaaaa...', '..acccccccccba..', '..acccccccccba..', '..abbbbbbbbbba..', '...aaaaaaaaaa...',
    '......acba......', '...c..acba......', '..ccc.acba...c..', '...c..acba..ccc.', '......acba...c..', '......acba......',
    '......acba......', '......acba......', '......aaaa......', '................',
  ],
  slot: [
    '................', '......aaaa......', '.....a....a.....', '...aaaaaaaaaa...', '..accccccccbba..', '..accccccccbba..',
    '..aaaaaaaaaaaa..', '..acccaaaacbba..', '..acccabbacbba..', '..acccaaaacbba..', '..accccccccbba..', '..accccccccbba..',
    '..abbbbbbbbbba..', '..aaaaaaaaaaaa..', '................', '................',
  ],
  freeze: snow,
  pouch: [
    '................', '.....aa..aa.....', '.....acaaca.....', '......abba......', '......aaaa......', '.....acccba.....',
    '....acccccba....', '...acccccccba...', '..acccbbbcccba..', '..accbcccbccba..', '..accbcccbccba..', '..acccbbbcccba..',
    '..abccccccbbba..', '...abbbbbbbba...', '....aaaaaaaa....', '................',
  ],
}

const BRASS = { a: '#4a3618', b: '#b08d4e', c: '#efd9a0', rim: '#1e1710', hi: '#d4b673', lo: '#6b5228', face: '#151a27', faceLo: '#0c0f17', shadow: '#07090e' }
const FROST = { a: '#1c3a46', b: '#6fb6c8', c: '#dcf5fb', rim: '#0b1a20', hi: '#9ad7e4', lo: '#2f6676', face: '#121b26', faceLo: '#0a1018', shadow: '#05080c' }
const GEM_SERVICES = new Set(['freeze', 'pouch'])

function draw(glyph, pal) {
  const px = Buffer.alloc(SIZE * SIZE * 4)
  const put = (x, y, hex) => {
    const i = (y * SIZE + x) * 4
    px[i] = parseInt(hex.slice(1, 3), 16); px[i + 1] = parseInt(hex.slice(3, 5), 16); px[i + 2] = parseInt(hex.slice(5, 7), 16); px[i + 3] = 255
  }
  const stamp = (g, colors, ox, oy, shadow) => {
    if (shadow) g.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.' && (g[r + 1]?.[c + 1] ?? '.') === '.') put(ox + c + 1, oy + r + 1, shadow) }))
    g.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') put(ox + c, oy + r, colors[ch]) }))
  }
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = Math.hypot(x + 0.5 - SIZE / 2, y + 0.5 - SIZE / 2)
      if (d > 15.6) continue
      const lit = x + y < SIZE - 1
      put(x, y, d > 14.6 ? pal.rim : d > 12.4 ? (lit ? pal.hi : pal.lo) : d > 11.5 ? pal.rim : x + y > SIZE + 8 ? pal.faceLo : pal.face)
    }
  }
  stamp(glyph, pal, 8, 8, pal.shadow)
  return encode(SIZE, SIZE, px)
}

fs.mkdirSync(out, { recursive: true })
for (const [id, glyph] of Object.entries(GLYPHS)) {
  fs.writeFileSync(path.join(out, `${id}.png`), draw(glyph, GEM_SERVICES.has(id) ? FROST : BRASS))
}
console.log(`wrote ${Object.keys(GLYPHS).length} seals to public/sprites/services/`)
