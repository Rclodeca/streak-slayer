import {
  bands,
  battlement,
  boulder,
  branch,
  crystal,
  disc,
  dz,
  fbm,
  halo,
  mesa,
  noise2,
  ridge,
  rng,
  rock,
  stars,
  tomb,
} from './painter';
import type { Painter } from './painter';
import type { SceneData } from './scenes';

// The four hybrid families' places (warlord, dragon, serpent, wraith), a base
// scene and a grander one each, painted like the rest of scenes.ts (see its
// notes on the 195 x 108 frame: the boss stands around frame x 143, the hero
// around 37, the plinths' tops at rows 65 and 96, the boss's name and bars in
// the top-left).

/** A spear or banner pole, planted: from its foot (x, y) up and leaning by `lean` columns. */
function pole(g: Painter, x: number, y: number, h: number, lean: number, c: string) {
  for (let i = 0; i < h; i++) g.P(Math.round(x + (lean * i) / h), y - i, c);
}

// ---- Warlord: armor and a heavy hand ----

export function ironWarlord(g: Painter): SceneData {
  const { W, H } = g;
  bands(g, [[0, '#160a0d'], [18, '#2e1014'], [34, '#5a1c18'], [48, '#923a1e'], [58, '#c0602a'], [66, '#d27a34']]);
  // A low red sun and smoke from the fires on the field.
  const sun = g.rx(150);
  halo(g, sun, 58, 7, 24, '#e8903a', 0.55);
  disc(g, sun, 60, 8, '#f8c070');
  const n = noise2(211);
  for (let y = g.top; y < 56; y++) {
    for (let x = 0; x < W; x++) if (fbm(n, x * 0.02, y * 0.09) > 0.6 && dz(x, y) < 0.75) g.P(x, y, y < 30 ? '#241014' : '#3a1a16');
  }
  ridge(g, { base: 63, amp: 9, scale: 0.035, c: '#2a1210', seed: 212 });
  // The warband's banners along the ridge.
  for (const bx of [g.lx(60), g.lx(112), g.rx(96), g.rx(186)]) {
    pole(g, bx, 64, 24, 0, '#0c0506');
    g.R(bx + 1, 41, 6, 5, '#7a1414');
    g.R(bx + 1, 41, 6, 1, '#a82a1c');
    g.P(bx + 6, 46, '#7a1414');
  }
  bands(g, [[64, '#2c1a14'], [84, '#241510'], [H, '#1a100c']]);
  const r = rng(213);
  for (let i = 0; i < 70; i++) g.P((r() * W) | 0, (66 + r() * 40) | 0, r() < 0.5 ? '#3a241a' : '#160c09');
  // Spears left in the ground, and a fallen shield.
  for (const [x, y, h, l] of [[g.lx(86), 82, 16, -3], [g.rx(164), 90, 14, 4], [g.rx(176), 80, 12, 2], [g.lx(14), 100, 14, 3]] as const) {
    pole(g, x, y, h, l, '#0e0807');
    g.P(x + l, y - h, '#7a7a82');
  }
  disc(g, g.lx(104), 90, 4, '#3a2a22');
  disc(g, g.lx(104), 90, 1, '#7a7a82');
  return {};
}

export function blackWarlord(g: Painter): SceneData {
  const { W, H } = g;
  bands(g, [[0, '#07040a'], [24, '#10070e'], [44, '#220c14'], [58, '#34121a'], [64, '#3e1620']]);
  stars(g, 221, 36, 40, ['#3a2830', '#4a3038']);
  // The black fortress behind the boss: a wall, two towers, banners hung down it.
  const wall = g.rx(70), end = Math.max(W, g.rx(195));
  g.R(wall, 38, end - wall, 28, '#12090d');
  battlement(g, wall, end, 34, 40, '#12090d', '#2a1218');
  for (const tx of [g.rx(86), g.rx(166)]) {
    g.R(tx, 22, 16, 44, '#0e070a');
    battlement(g, tx - 1, tx + 17, 18, 26, '#0e070a', '#2a1218');
    g.R(tx + 6, 32, 4, 7, '#ffb43c');
    g.R(tx + 7, 33, 2, 5, '#ffe08a');
  }
  for (const bx of [g.rx(112), g.rx(140)]) {
    g.R(bx, 38, 8, 20, '#5a1010');
    g.R(bx, 38, 8, 1, '#8a2418');
    g.R(bx + 3, 56, 2, 2, '#5a1010');
    g.R(bx + 3, 44, 2, 5, '#c8a050');
  }
  // The camp below: churned mud, torches on stakes.
  bands(g, [[64, '#241418'], [84, '#1c1014'], [H, '#140b0e']]);
  const r = rng(222);
  for (let i = 0; i < 80; i++) g.P((r() * W) | 0, (66 + r() * 40) | 0, r() < 0.5 ? '#321c20' : '#0e070a');
  const pts: [number, number][] = [];
  for (const tx of [g.lx(70), g.lx(126), g.rx(104), g.rx(190)]) {
    g.R(tx, 68, 1, 12, '#0a0507');
    pts.push([tx, 66]);
  }
  boulder(g, g.lx(100), 98, 6, 5, '#2a2428', '#443a40', '#18141a');
  return { pts };
}

// ---- Dragon: armor and a caster's fire ----

export function scaledWyrm(g: Painter): SceneData {
  const { W, H } = g;
  bands(g, [[0, '#1a0a08'], [20, '#3a140c'], [38, '#7a2a10'], [52, '#c0501c'], [62, '#e07a28'], [66, '#e88a30']]);
  // A volcano at the boss's back, its lava running down.
  const vx = g.rx(120);
  for (let y = 24; y < 66; y++) {
    const hw = 3 + (y - 24) * 0.95;
    g.R(vx - hw, y, hw * 2, 1, y < 28 ? '#5a2410' : '#2a100a');
    g.P(vx - hw, y, '#3e1a10');
  }
  halo(g, vx + 2, 22, 3, 16, '#ffb43c', 0.55);
  g.R(vx - 4, 24, 9, 2, '#ffb43c');
  g.R(vx - 2, 24, 5, 1, '#ffe08a');
  for (let y = 26; y < 66; y++) {
    const x = Math.round(vx + Math.sin(y * 0.3) * 2 - 1);
    g.P(x, y, '#ff7a1a');
    if (y % 3) g.P(x + 1, y, '#ffb43c');
  }
  ridge(g, { base: 64, amp: 8, scale: 0.04, c: '#24100c', seed: 231 });
  // The cracked black ground, lava in its seams.
  bands(g, [[64, '#241612'], [84, '#1c100d'], [H, '#140a08']]);
  const r = rng(232);
  for (let i = 0; i < 12; i++) {
    let x = (r() * W) | 0, y = (68 + r() * 38) | 0;
    for (let k = 0; k < 14; k++) {
      g.P(x, y, k % 3 ? '#ff7a1a' : '#ffb43c');
      x += r() < 0.75 ? 1 : 0;
      y += r() < 0.5 ? 0 : r() < 0.5 ? 1 : -1;
    }
  }
  boulder(g, g.lx(100), 78, 6, 6, '#2e2220', '#4a3a34', '#1a1210');
  boulder(g, g.rx(184), 92, 7, 7, '#2e2220', '#4a3a34', '#1a1210');
  return {};
}

export function elderDragon(g: Painter): SceneData {
  const { W, H } = g;
  // The hoard's cavern: dark rock, a shaft of light, gold heaped across the floor.
  bands(g, [[0, '#08060a'], [30, '#120c10'], [52, '#1c1216'], [64, '#241820']]);
  const n = noise2(241);
  for (let y = g.top; y < 64; y++) {
    for (let x = 0; x < W; x++) {
      const v = fbm(n, x * 0.05, y * 0.07);
      if (v > 0.62 && dz(x, y) < 0.6) g.P(x, y, '#2e2028');
      else if (v < 0.34 && dz(x, y) < 0.6) g.P(x, y, '#08060a');
    }
  }
  for (let x = 0; x < W; x += 6) {
    const len = 4 + ((Math.abs(Math.sin(x * 1.7)) * 9) | 0);
    for (let i = 0; i < len; i++) g.R(x + (i < 2 ? 1 : 0), g.top + i, i < 2 ? 3 : 2, 1, i % 3 ? '#1a1014' : '#2a1c22');
  }
  const mx = g.rx(150);
  for (let y = g.top; y < 70; y++) for (let x = mx - 18 + Math.round((y - g.top) * 0.1); x < mx + 6; x++) if (dz(x, y) < 0.16 * (1 - y / 90)) g.P(x, y, '#f0d890');
  bands(g, [[64, '#3a2a1a'], [84, '#2e2014'], [H, '#22160e']]);
  const r = rng(242);
  const pts: [number, number][] = [];
  for (const [cx, w, h] of [[g.lx(52), 26, 9], [g.lx(112), 18, 6], [g.rx(176), 24, 10], [g.rx(104), 14, 5]] as const) {
    for (let x = cx - w; x <= cx + w; x++) {
      const top = Math.round(88 - h * (1 - Math.abs(x - cx) / (w + 1)) + (r() * 2 - 1));
      for (let y = top; y < 92; y++) g.P(x, y, y === top ? '#fff0a0' : r() < 0.3 ? '#e8b030' : r() < 0.3 ? '#a87a1c' : '#c89828');
      if (r() < 0.08) pts.push([x, top - 1]);
    }
  }
  for (let i = 0; i < 40; i++) g.P((r() * W) | 0, (92 + r() * 14) | 0, r() < 0.5 ? '#c89828' : '#5a4220');
  const tips: [number, number][] = [];
  tips.push(crystal(g, g.lx(10), 100, 8, 2, 1, ['#3a1a4a', '#7a3a9a', '#b070d8', '#e0b0ff']));
  return { pts: [...pts, ...tips] };
}

// ---- Serpent: resist and a physical bite ----

export function coiledSerpent(g: Painter): SceneData {
  const { W, H } = g;
  bands(g, [[0, '#08100c'], [20, '#10201a'], [38, '#1c3426'], [52, '#2c4a30'], [62, '#3a5a36'], [66, '#3a5a36']]);
  // A sickly moon through the mist.
  const m = g.rx(160);
  halo(g, m, 26, 9, 20, '#3a5a3a', 0.6);
  disc(g, m, 26, 8, '#d8e8b0');
  disc(g, m - 3, 24, 2, '#b8c890');
  // Dead trees against it.
  const r = rng(251);
  branch(g, g.lx(14), 70, Math.PI / 2 + 0.1, 16, 4, '#060c08', r);
  branch(g, g.rx(112), 68, Math.PI / 2 - 0.1, 14, 4, '#060c08', r);
  ridge(g, { base: 64, amp: 6, scale: 0.05, c: '#0e1a12', seed: 252 });
  // Black water with weed, reeds along the near bank.
  bands(g, [[64, '#0e1c16'], [84, '#0a1612'], [H, '#08100d']]);
  for (let y = 66; y < H; y++) for (let x = 0; x < W; x++) if (dz(x, y) < 0.1 && (x + y * 3) % 11 < 3) g.P(x, y, '#1c3a2c');
  for (let i = 0; i < 22; i++) {
    const x = (r() * W) | 0, y = (72 + r() * 32) | 0, h = 4 + ((r() * 6) | 0);
    for (let k = 0; k < h; k++) g.P(x + (k > h - 3 ? 1 : 0), y - k, k % 2 ? '#2a5a34' : '#1c3e26');
    g.P(x + 1, y - h, '#4a2a20');
  }
  for (const [x, y] of [[g.lx(70), 78], [g.lx(110), 98], [g.rx(176), 88]] as const) {
    g.R(x - 5, y, 11, 1, '#2a4a32');
    g.R(x - 3, y + 1, 7, 1, '#1c3426');
  }
  return {};
}

export function basilisk(g: Painter): SceneData {
  const { W, H } = g;
  bands(g, [[0, '#0e1408'], [20, '#1c2410'], [38, '#34401a'], [52, '#58602a'], [62, '#807a38'], [66, '#807a38']]);
  // The sun sits low and left of the boss, clear of the stats in the top-left.
  const s = g.lx(118);
  halo(g, s, 50, 7, 18, '#a8b04a', 0.5);
  disc(g, s, 50, 7, '#e8e8a0');
  mesa(g, g.rx(120), Math.max(g.rx(160), g.rx(120) + 20), 44, 66, '#4a4a26', '#6a6a38', '#2a2a14');
  // A ruined temple: broken columns and a fallen lintel.
  for (const [cx, h] of [[g.rx(124), 34], [g.rx(142), 22], [g.rx(160), 30], [g.rx(180), 14]] as const) {
    g.R(cx, 66 - h, 8, h, '#6a6444');
    g.R(cx, 66 - h, 1, h, '#8a8458');
    g.R(cx + 7, 66 - h, 1, h, '#3a3822');
    g.R(cx - 1, 66 - h, 10, 2, '#8a8458');
    for (let y = 66 - h; y < 66; y += 6) g.R(cx, y, 8, 1, '#4a4830');
  }
  g.R(g.rx(124), 30, 38, 4, '#5a5636');
  bands(g, [[66, '#a89850'], [84, '#8c7e40'], [H, '#70642f']]);
  const r = rng(261);
  for (let i = 0; i < 90; i++) g.P((r() * W) | 0, (68 + r() * 38) | 0, r() < 0.5 ? '#c4b466' : '#5c5026');
  // Sand drifted in ripples, and a toppled column drum.
  for (let y = 72; y < H; y += 6) for (let x = 0; x < W; x++) if (Math.sin(x * 0.12 + y) > 0.5) g.P(x, y, '#b8a85a');
  rock(g, g.lx(100), 82, 7, '#6a6444', '#8a8458');
  rock(g, g.lx(24), 100, 5, '#6a6444', '#8a8458');
  return {};
}

// ---- Wraith: resist and a caster's curse ----

export function restlessWraith(g: Painter): SceneData {
  const { W, H } = g;
  bands(g, [[0, '#080c18'], [22, '#0e1428'], [42, '#18223c'], [56, '#223052'], [62, '#223052']]);
  stars(g, 271, 50, 46, ['#2a3a5a', '#3a4c70']);
  stars(g, 272, 10, 40, ['#b8c8e8']);
  // The moon rises behind the boss, out of the way of the stats in the top-left.
  const m = g.rx(150);
  halo(g, m, 30, 10, 26, '#2a3a5a', 0.7);
  disc(g, m, 30, 10, '#e4ecf4');
  disc(g, m + 3, 27, 2, '#c4d0e0');
  ridge(g, { base: 62, amp: 8, scale: 0.03, c: '#10182c', seed: 273 });
  // A moor with old graves.
  bands(g, [[62, '#141c30'], [84, '#10172a'], [H, '#0c1220']]);
  const r = rng(274);
  for (let i = 0; i < 60; i++) g.P((r() * W) | 0, (64 + r() * 42) | 0, r() < 0.5 ? '#1c2a44' : '#0a0f1c');
  branch(g, g.rx(112), 68, Math.PI / 2 + 0.15, 14, 4, '#060a14', r);
  for (const [x, y, w, h, cross] of [[g.lx(56), 74, 6, 8, false], [g.lx(78), 80, 0, 8, true], [g.rx(168), 82, 7, 9, false], [g.rx(186), 74, 0, 7, true], [g.lx(14), 92, 6, 8, false]] as const) {
    tomb(g, x, y, w, h, cross);
  }
  return {};
}

export function dreadWraith(g: Painter): SceneData {
  const { W, H } = g;
  // A drowned crypt: arches, dark water, cold lights in the stone.
  bands(g, [[0, '#04080e'], [26, '#081018'], [48, '#0e1a24'], [62, '#12222e'], [64, '#12222e']]);
  const n = noise2(281);
  for (let y = g.top; y < 64; y++) for (let x = 0; x < W; x++) if (fbm(n, x * 0.04, y * 0.08) > 0.6 && dz(x, y) < 0.5) g.P(x, y, '#1a3040');
  const pts: [number, number][] = [];
  for (const ax of [g.lx(46), g.lx(104), g.rx(100), g.rx(168)]) {
    // An arch: two piers and a round head, the dark of the passage between.
    for (let y = g.top; y < 66; y++) {
      const reach = y < 26 ? Math.sqrt(Math.max(0, 14 * 14 - (26 - y) * (26 - y))) : 14;
      g.R(ax - 17, y, 3, 1, '#0a141c');
      g.R(ax + 15, y, 3, 1, '#0a141c');
      if (reach > 0) g.R(ax - reach, y, reach * 2 + 1, 1, '#050b10');
    }
    g.R(ax - 14, 26, 1, 40, '#1e3646');
    g.R(ax + 14, 26, 1, 40, '#1e3646');
    pts.push([ax, 28]);
  }
  bands(g, [[64, '#0c1c26'], [84, '#08141c'], [H, '#060e14']]);
  // Still water that holds the lights.
  const r = rng(282);
  for (let y = 66; y < H; y++) for (let x = 0; x < W; x++) if (dz(x, y) < 0.12 && (x * 5 + y * 7) % 13 < 3) g.P(x, y, '#1e4a5a');
  for (const [px] of pts) for (let k = 0; k < 4; k++) g.P(px + ((r() * 3) | 0) - 1, 70 + k * 6 + ((r() * 3) | 0), '#2a8a9a');
  rock(g, g.lx(108), 84, 6, '#1a2a34', '#2e4654');
  rock(g, g.rx(188), 90, 7, '#1a2a34', '#2e4654');
  return { pts };
}
