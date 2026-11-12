// node scripts/pixellab-gallery.cjs assets/pixellab/<run-folder> [scale]
// Writes <run-folder>/gallery.html: every tile-NN.png at a whole-number scale (default 3, 8 is good for 32px item tiles) with
// image-rendering: pixelated, so a browser shows the pixels crisp. Don't open sheet.png directly
// for judging quality: the browser shrinks it to fit the window and smooths it (looks blurry).
const fs = require('fs')
const path = require('path')

const dir = process.argv[2]
const scale = Number(process.argv[3]) || 3
if (!dir) { console.error('usage: node scripts/pixellab-gallery.cjs <run-folder> [scale]'); process.exit(1) }
const tiles = fs.readdirSync(dir).filter((f) => /^tile-\d+\.png$/.test(f)).sort()
// Tile width from the first PNG's header (85 for bosses, 64 for heroes, 32 for items).
const tileWidth = tiles.length ? fs.readFileSync(path.join(dir, tiles[0])).readUInt32BE(16) : 85
const tileHeight = tiles.length ? fs.readFileSync(path.join(dir, tiles[0])).readUInt32BE(20) : tileWidth
const size = tileWidth * scale
const sizeH = tileHeight * scale
const html = `<!doctype html><meta charset="utf-8"><title>${path.basename(dir)}</title>
<style>
body{margin:0;padding:16px;background:#3a3a42;color:#ddd;font:13px system-ui}
.g{display:flex;flex-wrap:wrap;gap:8px;max-width:${(size + 8) * 4}px}
figure{margin:0;width:${size}px;background:#2c2c34;position:relative}
img{display:block;width:${size}px;height:${sizeH}px;image-rendering:pixelated}
figcaption{position:absolute;left:4px;top:2px;color:#ff0;font-weight:700}
</style>
<h3>${path.basename(dir)} (${scale}x)</h3>
<div class="g">${tiles.map((t) => `<figure><img src="${t}"><figcaption>${t.replace(/\D/g, '')}</figcaption></figure>`).join('')}</div>
`
fs.writeFileSync(path.join(dir, 'gallery.html'), html)
console.log(`${path.join(dir, 'gallery.html')} (${tiles.length} tiles at ${scale}x)`)
