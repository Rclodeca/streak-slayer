// Writes docs/mockups/item-catalog.html from the live ITEM_CATALOG.
// Run: npm run item-catalog-page
import { writeFileSync } from 'node:fs';
import { describeItemBonus, describeItemBonusParts, dropRarityShares, ITEM_CATALOG } from '../src/game-engine/items';
import type { DropRarity, ItemDef } from '../src/game-engine/items';

const SPRITES = '../../public/sprites/';
// The item's slot and its native 32x32 art at 2 CSS px per art pixel, as in the app's gear rows (see main.scss).
const [SLOT, ART] = [72, 64];
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'relic'];
const THEME_OF: Record<string, string> = {
  physicalDamage: 'Physical', magicDamage: 'Magic', trueDamage: 'True', critChance: 'Crit', allDamage: 'All damage',
  health: 'Tank', armor: 'Tank', magicResist: 'Tank', healing: 'Support', expGain: 'Support', lifesteal: 'Physical',
  armorPen: 'Physical', magicPen: 'Magic',
};
// Flat armor/MR compared on a rough percent scale so "+300 armor" doesn't outrank "+20% HP" by raw number.
const weight = (b: ItemDef['bonuses'][number]) => ((b.percent ?? 0) > 0 ? b.percent! : (b.flat ?? 0) > 0 ? b.flat! / 15 : 0);
function theme(item: ItemDef): string {
  if (item.type === 'consumable') return 'Consumable';
  const top = [...item.bonuses].sort((a, b) => weight(b) - weight(a))[0];
  return top ? THEME_OF[top.stat] ?? top.stat : '—';
}
const dropNote = (rarity: DropRarity) =>
  [1, 10, 30].map((level) => `${Math.round(dropRarityShares(level)[rarity] * 100)}% at L${level}`).join(' · ');
const SECTIONS: { title: string; note: string; match: (i: ItemDef) => boolean }[] = [
  ...(['common', 'uncommon', 'rare', 'epic'] as const).map((rarity) => ({
    title: rarity[0].toUpperCase() + rarity.slice(1),
    note: `drops ${dropNote(rarity)}`,
    match: (i: ItemDef) => i.rarity === rarity,
  })),
  { title: 'Relics', note: 'side quests only', match: (i) => i.rarity === 'relic' },
];
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// The twinkling pluses on an epic or relic's socket (ItemSparks.vue): three for epic, five for relic,
// each with its own timing, offset by the card's index so neighbours never pulse together.
const SPARK_SPOTS = [[12, 14], [87, 12], [88, 79], [13, 82], [50, 8]];
const SPARK_COUNT: Partial<Record<string, number>> = { epic: 3, relic: 5 };
const sparks = (rarity: string, seed: number) =>
  SPARK_SPOTS.slice(0, SPARK_COUNT[rarity] ?? 0)
    .map(([x, y], i) => `<i class="spark${i % 2 === 1 ? ' own' : ''}" style="left:${x}%;top:${y}%;animation-duration:${(2.4 + (i % 3) * 0.55).toFixed(2)}s;animation-delay:${(-(i * 0.97 + seed * 0.63)).toFixed(2)}s"></i>`)
    .join('');

function card(item: ItemDef, seed: number): string {
  const stats =
    item.type === 'consumable'
      ? `<span class="gear-bonus">${esc(describeItemBonus(item))}</span>`
      : `<span class="gear-bonuses">${describeItemBonusParts(item)
          .map((p) => `<span class="gear-bonus${p.text.startsWith('−') ? ' drawback' : ''}"><span class="gear-bonus-value">${esc(p.text)}</span> <span class="gear-bonus-label">${esc(p.label)}</span></span>`)
          .join('')}</span>`;
  return `<article class="gear-row rarity-${item.rarity}" data-theme="${theme(item)}">
    <span class="gear-icon">${sparks(item.rarity, seed)}<span class="gear-art"><img src="${SPRITES}${item.icon}.png" alt=""></span></span>
    <div class="gear-text">
      <span class="gear-name">${esc(item.name)}</span>
      <span class="gear-tags"><span class="gear-rarity">${item.rarity}</span><span class="tag">${theme(item)}</span></span>
      ${stats}
      ${item.effectText ? `<span class="gear-effect">${esc(item.effectText)}</span>` : ''}
    </div>
  </article>`;
}

const sections = SECTIONS.map((s) => {
  const items = ITEM_CATALOG.filter(s.match).sort(
    (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) || theme(a).localeCompare(theme(b)),
  );
  return `<section><h2>${s.title} <small>${items.length} · ${s.note}</small></h2><div class="grid">${items.map(card).join('')}</div></section>`;
}).join('');
const themes = ['All', 'Physical', 'Magic', 'True', 'Crit', 'Tank', 'Support', 'All damage', 'Consumable'];

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>StreakSlayer — item catalog</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500;600;700&family=Alegreya+Sans:wght@500;600;700&family=Cinzel:wght@500;600&display=swap" />
<style>
/* Every item in ITEM_CATALOG with its current art, drawn as the game draws a gear row
   in the Moonlit theme (HeroDetails.vue + themes/ashen.scss): a lifted card warmed by the
   rarity's tier, the item in a pixel-cut socket lit to the same tier, twinkling sparks on
   epics and relics. Generated from the catalog, so regenerate it when the catalog changes. */
:root {
  --bg: #11121b; --text: #d3d4e4; --text-h: #f4f4fa; --moon-solid: #b0b1cb; --page-glow: rgba(165,166,201,.1);
  --card: #2d2c50; --card-hi: #4d4c7e; --card-lo: #191a28; --card-lip: #0e0e19; --card-ink: #f4f4fa; --dmg-physical: #e86154;
  --rarity-common: #9d9382; --rarity-uncommon: #6cc47f; --rarity-rare: #5f95e6; --rarity-epic: #b57be8; --rarity-relic: #f58a35;
  --px3: polygon(0 3px, 3px 3px, 3px 0, calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px));
  --px2: polygon(0 2px, 2px 2px, 2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px));
  --sans: 'Alegreya Sans', system-ui, sans-serif; --serif: 'Alegreya', Georgia, serif;
  color-scheme: dark;
}
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; padding: 24px 16px 60px; color: var(--text); background: radial-gradient(ellipse 80% 40% at 50% -6%, var(--page-glow), transparent 70%), var(--bg); font: 500 16px/1.35 var(--sans); }
.page { max-width: 1400px; margin: 0 auto; }
h1 { margin: 0 0 4px; text-align: center; font: 600 14px/1 'Cinzel', Georgia, serif; letter-spacing: .32em; text-transform: uppercase; color: var(--text-h); }
.sub { text-align: center; color: var(--text); }
h2 { display: flex; align-items: baseline; gap: 10px; margin: 30px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #3f405a; font: 600 12px/1 'Cinzel', Georgia, serif; letter-spacing: .2em; text-transform: uppercase; color: var(--text-h); }
h2 small { font: 500 14px/1 var(--sans); letter-spacing: 0; text-transform: none; color: var(--text); }
.filters { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; padding: 14px 0; background: var(--bg); }
.filters button { min-height: 44px; padding: 0 14px; font: 600 11px/1 'Cinzel', serif; letter-spacing: .18em; text-transform: uppercase; color: var(--text); background: #232337; border: 1px solid #3f405a; clip-path: var(--px2); cursor: pointer; }
.filters button.on { color: #20202e; background: #cdcedf; border-color: #cdcedf; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap: 8px; }

/* The tier climbs with the rarity: how much of its colour the socket and the row take. */
.rarity-common { --rarity: var(--rarity-common); --tier: 10%; --tier-soft: 6%; }
.rarity-uncommon { --rarity: var(--rarity-uncommon); --tier: 24%; --tier-soft: 12%; }
.rarity-rare { --rarity: var(--rarity-rare); --tier: 38%; --tier-soft: 20%; }
.rarity-epic { --rarity: var(--rarity-epic); --tier: 52%; --tier-soft: 28%; }
.rarity-relic { --rarity: var(--rarity-relic); --tier: 68%; --tier-soft: 38%; }

/* A lifted card, warmed by the tier: a wash from the socket, a lit top edge. */
.gear-row { display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px 8px 8px; border: 0; clip-path: var(--px3);
  background:
    radial-gradient(circle at 44px 50%, color-mix(in srgb, var(--rarity) calc(var(--tier) * 0.6), transparent) 0, transparent 66px),
    linear-gradient(100deg, color-mix(in srgb, var(--rarity) var(--tier-soft), var(--card-lo)) 0, var(--card) 70%);
  border-bottom: 3px solid color-mix(in srgb, var(--rarity) var(--tier-soft), var(--card-lip));
  box-shadow: inset 0 2px 0 color-mix(in srgb, var(--rarity) var(--tier), var(--card-hi)), inset 2px 0 0 color-mix(in srgb, var(--rarity) var(--tier-soft), var(--card-hi)), inset -2px -2px 0 var(--card-lo); }
.gear-row.hide { display: none; }

/* The socket lit by its rarity: the well fills with the rarity's light as the tier climbs. */
.gear-icon { position: relative; flex-shrink: 0; width: ${SLOT}px; height: ${SLOT}px; border: 0; clip-path: var(--px3);
  background: radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--rarity) var(--tier), #0a0a14) 0, #07070e 82%);
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--rarity) calc(var(--tier) + 30%), #000), inset 4px 4px 0 rgba(0,0,0,.5), inset -4px -4px 0 color-mix(in srgb, var(--rarity) var(--tier), #000); }
.gear-art { position: absolute; inset: 0; overflow: hidden; }
.gear-art img { --rim: color-mix(in srgb, var(--rarity) 55%, #000); position: absolute; left: 50%; top: 50%; width: ${ART}px; height: ${ART}px; transform: translate(-50%, -50%); image-rendering: pixelated; pointer-events: none;
  filter: drop-shadow(2px 0 0 var(--rim)) drop-shadow(-2px 0 0 var(--rim)) drop-shadow(0 2px 0 var(--rim)) drop-shadow(0 -2px 0 var(--rim)) drop-shadow(0 0 6px color-mix(in srgb, var(--rarity) 45%, transparent)); }

/* Twinkling pluses on epics and relics (ItemSparks.vue). Every other one takes the rarity colour. */
.spark { position: absolute; width: 8px; height: 8px; margin: -4px 0 0 -4px; color: #fff; pointer-events: none; opacity: 0; animation: item-spark 2.4s ease-in-out infinite;
  background: linear-gradient(currentColor, currentColor) center / 2px 100% no-repeat, linear-gradient(currentColor, currentColor) center / 100% 2px no-repeat; }
.spark.own { color: var(--rarity); }
@keyframes item-spark { 0%, 100% { opacity: 0; transform: scale(.4); } 50% { opacity: 1; transform: scale(1); } }
@media (prefers-reduced-motion: reduce) { .spark { opacity: .8; animation: none; } }

.gear-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; padding-top: 3px; }
.gear-name { font: 600 16px/1.2 var(--serif); color: var(--card-ink); }
.gear-tags { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 8px; }
.gear-rarity { font: 600 12.5px/normal var(--sans); color: var(--rarity); text-transform: capitalize; }
.tag { font: 500 11px/normal var(--sans); letter-spacing: .06em; text-transform: uppercase; color: var(--text); opacity: .7; }
.gear-bonuses { display: flex; flex-wrap: wrap; gap: 2px 10px; }
.gear-bonus { font: 700 13px/normal var(--sans); color: var(--text-h); }
.gear-bonus-label { font-weight: 500; color: var(--text); }
.gear-bonus.drawback, .gear-bonus.drawback .gear-bonus-label { color: var(--dmg-physical); }
.gear-effect { font: 700 13.5px/normal var(--sans); color: var(--rarity); }
</style>
</head>
<body>
<div class="page">
<h1>Item catalog</h1>
<p class="sub">${ITEM_CATALOG.length} items · grouped by rarity, sorted by theme</p>
<div class="filters">${themes.map((t, i) => `<button type="button" data-t="${t}" class="${i ? '' : 'on'}">${t}</button>`).join('')}</div>
${sections}
</div>
<script>
document.querySelectorAll('.filters button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.filters button').forEach((x) => x.classList.toggle('on', x === b));
  const t = b.dataset.t;
  document.querySelectorAll('.gear-row').forEach((c) => c.classList.toggle('hide', t !== 'All' && c.dataset.theme !== t));
}));
</script>
</body>
</html>
`;

writeFileSync(process.argv[2], html);
console.log('wrote', ITEM_CATALOG.length, 'items to', process.argv[2]);
