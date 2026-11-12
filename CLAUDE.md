# StreakSlayer

## Long-term goal: native iOS/Android release

This is a Vue 3 + Vite + Pinia + SCSS web app. The end goal is to ship it as a real iOS/Android app (after original art and other improvements), most likely by wrapping the built web app with Capacitor. Build everything so that path stays open and no UI work has to be redone.

- Keep it a web app. Don't add dependencies or patterns that tie it to a desktop browser or break a Capacitor WebView.
- Mobile first: respect safe areas (`env(safe-area-inset-*)`, `viewport-fit=cover`), especially the pinned phone header and popups.
- Touch friendly: tap targets of at least ~44px, and nothing important behind hover.
- Keep persistence behind the store layer rather than calling `localStorage` directly from components, so it can be swapped for native storage or a backend.
- Bundle assets (fonts, art) locally so the app works offline. Watch animation/blur/SVG cost on mid-range Android.

## Pixellab generation runs

- Document every Pixellab generation run in `docs/pixellab-runs.md` in the same session it is made, in detail: folder, job id, tool, canvas size, transparent or not, style image (the local file, not the expiring upload id), reference images, the exact description, cost and candidate count, what came out, and what changed from the previous run. Update the entry when a result or finding changes.
- Every background (fight-stage arenas, the Hero tab armory, dungeons, shop backdrops) is **216 x 116 art px** at 2 CSS px per art pixel. Generate at that size; bring an old 216 x 108 tile up with the 8-row floor inpaint, never with tall invented bands. Details: `docs/pixellab-scenes.md` section 1.
- Before any paid run, show every input and the cost and wait for a clear yes. After the run, download the tiles, run `node scripts/pixellab-gallery.cjs <run-folder>` and open the `gallery.html` it writes in the browser. Don't open the 4x `sheet.png` directly: the browser shrinks and smooths it, so it looks blurry.
