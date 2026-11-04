import type { Personality } from '../../../game-engine';
import {
  bands,
  battlement,
  boulder,
  branch,
  cloud,
  crystal,
  disc,
  dz,
  fbm,
  FRAME_H,
  glass,
  halo,
  menhir,
  mesa,
  noise2,
  pine,
  ridge,
  rng,
  rock,
  stars,
  stream,
  tomb,
} from './painter';
import type { Painter } from './painter';

// A place for every boss (docs/mockups/pixel-boss-stages.html): the common six get
// a sky, a place and one small motion; the rarer tiers more going on, up to the
// 5x set pieces. Each scene paints the 195 x 108 frame (see painter.ts): the
// boss stands around frame x 143, the hero around 37, their plinths' tops at
// frame rows 65 and 96, and the boss's name and bars fill the top-left, so
// bright things keep out of there.

/** What a scene hands its motion: points that glow, a skyline, a horizon. */
export interface SceneData {
  pts?: [number, number][];
  /** The top row of the land per canvas column (the aurora stays above it). */
  mask?: number[];
  /** Lightning lights the sky down to this frame row. */
  horizon?: number;
}

export type FxName =
  | 'fireflies'
  | 'leaves'
  | 'snow'
  | 'dust'
  | 'embers'
  | 'motes'
  | 'seeds'
  | 'glyphs'
  | 'haze'
  | 'cyan'
  | 'golddust'
  | 'sparkles'
  | 'feathers'
  | 'birds'
  | 'bats'
  | 'lanterns'
  | 'rain'
  | 'lightning'
  | 'aurora'
  | 'fog'
  | 'twinkle'
  | 'runes'
  | 'window'
  | 'torches'
  | 'glints';

export interface StageSceneDef {
  paint: (g: Painter) => SceneData | void;
  fx: FxName[];
  /** A bright scene: the stage's names and stats switch to dark ink. */
  day?: boolean;
  /** The plinths' stone: face, lit top, second tier, foot. */
  plinth: [string, string, string, string];
}

function drifter(g: Painter) {
  const { W, H } = g, m = g.rx(143);
  bands(g, [[0, '#06070d'], [26, '#0a0d17'], [46, '#111626'], [60, '#192036'], [66, '#1d2540']]);
  stars(g, 11, 70, 54, ['#2a3246', '#3a4358', '#4a5470']);
  stars(g, 12, 8, 44, ['#9aa3bd']);
  // The moon sits behind the boss's hood.
  halo(g, m, 24, 10, 18, '#232b42', 0.75);
  disc(g, m, 24, 10, '#e4e0d0');
  disc(g, m - 4, 21, 2, '#c9c3af');
  disc(g, m + 4, 28, 3, '#c9c3af');
  g.P(m + 3, 18, '#c9c3af');
  g.P(m - 6, 28, '#d3cdb9');
  for (let y = 15; y <= 33; y++) {
    for (let x = m + 3; x <= m + 10; x++) {
      if (Math.hypot(x - m, y - 24) <= 10 && Math.hypot(x - m + 4, y - 24) > 10 && dz(x, y) < 0.5) g.P(x, y, '#c9c3af');
    }
  }
  ridge(g, { base: 62, amp: 9, scale: 0.03, c: '#141a2a', seed: 3 });
  ridge(g, { base: 67, amp: 5, scale: 0.05, c: '#0f131e', seed: 7 });
  bands(g, [[66, '#0e121c'], [86, '#0c1018'], [H, '#0a0d14']]);
  const road = g.rx(98);
  for (let y = 64; y < H; y++) {
    const t = (y - 64) / (FRAME_H - 64), cx = road - 14 * Math.sin(t * 2.8) + 40 * t * t, hw = 1 + t * 30;
    g.R(cx - hw, y, hw * 2 + 1, 1, '#1d202c');
    g.P(cx - hw, y, '#2a2f3e');
    g.P(cx + hw, y, '#2a2f3e');
    if (t > 0.2) {
      g.P(cx - hw * 0.45, y, '#161922');
      g.P(cx + hw * 0.45, y, '#161922');
    }
    if (y % 9 === 4 && t > 0.1) g.R(cx - hw - 4 - t * 3, y - 2 - t * 5, 1, 2 + t * 5, '#090b11');
  }
  const r = rng(5);
  for (let i = 0; i < 60; i++) {
    const x = (r() * W) | 0, y = (68 + r() * 38) | 0;
    g.P(x, y, '#18202e');
    g.P(x + 1, y - 1, '#151b28');
  }
  // A signpost at the roadside.
  const s = g.rx(186);
  g.R(s, 60, 1, 16, '#06080c');
  g.R(s - 6, 62, 10, 2, '#06080c');
  g.R(s - 3, 67, 9, 2, '#06080c');
  g.P(s - 6, 62, '#2a3040');
}

function colossus(g: Painter) {
  const { W, H } = g, sun = g.lx(84);
  bands(g, [[0, '#f3dcaa'], [20, '#eec98f'], [36, '#e6b27a'], [50, '#dc9866'], [60, '#d48a5a'], [62, '#d48a5a']]);
  halo(g, sun, 46, 7, 17, '#f8e7c0', 0.85);
  disc(g, sun, 46, 7, '#fff3d2');
  const far = ['#d99470', '#e6a880', '#c98260'] as const;
  mesa(g, g.lx(0), g.lx(24), 46, 62, ...far);
  mesa(g, g.lx(40), g.lx(66), 49, 62, ...far);
  mesa(g, g.rx(104), g.rx(128), 45, 62, ...far);
  mesa(g, g.rx(176), Math.max(g.rx(195), W), 43, 62, ...far);
  const near = ['#a4523a', '#c66e4a', '#7a3826', '#8e4430'] as const;
  mesa(g, g.lx(-10), g.lx(14), 50, 66, ...near);
  mesa(g, g.rx(142), Math.max(g.rx(197), W + 2), 29, 66, ...near);
  bands(g, [[62, '#e0a86c'], [74, '#d4955c'], [90, '#c4814c'], [H, '#b47040']]);
  const r = rng(21);
  for (let i = 0; i < 46; i++) {
    const y = (64 + r() * 42) | 0, x = (r() * W) | 0;
    g.R(x, y, (2 + (r() * 7 * (y - 58)) / 48) | 0, 1, '#ebbb83');
  }
  for (let i = 0; i < 12; i++) {
    const y = (66 + r() * 38) | 0, x = (r() * W) | 0, s = y > 88 ? 2 : 1;
    g.R(x, y, 2 * s + 1, s, '#8e4a2e');
    g.R(x + 1, y - 1, s, 1, '#b46840');
  }
  for (let i = 0; i < 8; i++) {
    let x = (r() * W) | 0, y = (72 + r() * 32) | 0;
    for (let k = 0; k < 6; k++) {
      g.P(x, y, '#a86238');
      x += r() < 0.5 ? 1 : 2;
      y += r() < 0.5 ? 0 : r() < 0.5 ? 1 : -1;
    }
  }
}

function bloodfang(g: Painter) {
  const { W, H } = g, sun = g.rx(100);
  bands(g, [[0, '#24183a'], [14, '#4a2652'], [28, '#8c3c5c'], [40, '#cc6450'], [50, '#ec9a58'], [62, '#f4b866'], [68, '#f4b866']]);
  // A striped sun going down between the hero and the boss.
  halo(g, sun, 58, 11, 20, '#f6c878', 0.7);
  disc(g, sun, 58, 11, '#ffd27e', (y) => y > -3 && y % 3 === 0);
  disc(g, sun, 58, 7, '#ffe4a8', (y) => y > -3 && y % 3 === 0);
  const r = rng(31);
  for (let x = -2; x < W + 4; x += 4 + ((r() * 4) | 0)) pine(g, x, 62, 8 + ((r() * 9) | 0), '#4a2848');
  for (let y = 54; y < 68; y++) {
    const d = 1 - Math.abs(y - 61) / 7;
    for (let x = 0; x < W; x++) if (dz(x, y) < d * 0.55) g.P(x, y, '#b4687a');
  }
  bands(g, [[68, '#1a131c'], [88, '#151017'], [H, '#110d13']]);
  for (let i = 0; i < 70; i++) {
    const x = (r() * W) | 0, y = (70 + r() * 36) | 0;
    g.P(x, y, '#2a1e2c');
    if (r() < 0.3) g.P(x + 1, y - 1, '#3a2838');
  }
  const near = (a: number, b: number, lo: number, hi: number) => {
    for (let x = a; x < b; x += 6 + ((r() * 4) | 0)) pine(g, x, 70, lo + ((r() * (hi - lo)) | 0), '#150f19');
  };
  near(-3, g.lx(44), 22, 34);
  near(g.lx(46), g.rx(148), 10, 17);
  near(g.rx(150), W + 5, 20, 32);
}

function frost(g: Painter) {
  const { W, H } = g;
  bands(g, [[0, '#87abc8'], [22, '#a2c2da'], [40, '#bcd5e6'], [54, '#d0e2ee'], [60, '#dbe9f2']]);
  const ys = ridge(g, { base: 56, amp: 34, scale: 0.03, c: '#9ab3c8', seed: 41, peaks: true });
  for (let x = 0; x < W; x++) {
    for (let y = ys[x]; y < 42; y++) if (y < 38 || dz(x, y) < (42 - y) / 4) g.P(x, y, '#eef4f8');
    if (x > 0 && ys[x] > ys[x - 1]) for (let y = ys[x] + 1; y < 40; y++) if (dz(x, y) < 0.35) g.P(x, y, '#c9d9e6');
  }
  ridge(g, { base: 64, amp: 8, scale: 0.045, c: '#cfdfe9', seed: 43 });
  const r = rng(45);
  const grove = (a: number, b: number, lo: number, hi: number) => {
    for (let x = a; x < b; x += 5 + ((r() * 3) | 0)) pine(g, x, 66, lo + ((r() * (hi - lo)) | 0), '#35525e', '#e4eef4');
  };
  grove(g.lx(2), g.lx(36), 12, 20);
  grove(g.rx(92), g.rx(112), 8, 12);
  grove(g.rx(148), W + 2, 12, 22);
  bands(g, [[66, '#e6eff5'], [80, '#d8e6ef'], [96, '#c8dbe7'], [H, '#bcd2e0']]);
  for (let k = 0; k < 5; k++) {
    for (let x = 0; x < W; x++) {
      const y = 71 + k * 8 + Math.round(Math.sin(x * 0.05 + k * 1.7) * 2);
      if (dz(x, y) < 0.7) g.P(x, y, '#b4cad9');
    }
  }
}

function apex(g: Painter) {
  const { W, H } = g, v = g.lx(92);
  bands(g, [[0, '#0e0606'], [18, '#1e0a08'], [34, '#36110b'], [48, '#56190d'], [60, '#7a2810'], [63, '#7a2810']]);
  const n = noise2(61);
  for (let y = 0; y < 36; y++) {
    for (let x = 0; x < W; x++) {
      const ash = (fbm(n, x * 0.05, y * 0.14) - 0.5) * 2.4 + 0.5;
      if (ash + (dz(x, y) - 0.5) * 0.25 > 0.62) g.P(x, y, '#2c0f0b');
    }
  }
  ridge(g, { base: 63, amp: 12, scale: 0.04, c: '#260f0c', seed: 63, peaks: true });
  // The volcano between the fighters, its smoke leaning right.
  halo(g, v, 40, 3, 22, '#9a3410', 0.55);
  for (let y = 6; y < 40; y++) {
    const cx = v + (40 - y) * 0.5 + Math.sin(y * 0.3) * 2, w = 3 + (40 - y) * 0.25;
    for (let x = Math.floor(cx - w); x <= cx + w; x++) if (dz(x, y) < 0.55) g.P(x, y, '#3c1712');
  }
  for (let y = 42; y < 64; y++) {
    const hw = 5 + (y - 42) * 2.1;
    g.R(v - hw, y, hw * 2 + 1, 1, '#180a09');
    g.P(v + hw, y, '#3c1711');
    g.P(v + hw - 1, y, '#2a100d');
  }
  g.R(v - 4, 41, 9, 1, '#ff7a22');
  g.R(v - 5, 42, 11, 1, '#ffb43c');
  g.R(v - 6, 43, 13, 1, '#c8401a');
  const lava: [string, string, string] = ['#a8300e', '#ff6a1a', '#ffc04a'];
  stream(g, [[v - 3, 44], [v - 6, 50], [v - 8, 55], [v - 12, 62]], 0.4, lava);
  stream(g, [[v + 4, 44], [v + 7, 51], [v + 10, 57], [v + 12, 63]], 0.4, lava);
  bands(g, [[63, '#1e0d0b'], [82, '#170a09'], [H, '#110707']]);
  // The lava river runs behind the hero and off the left edge.
  const river = [[80, 64], [70, 68], [58, 72], [44, 77], [30, 83], [14, 90]].map(([x, y]): [number, number] => [g.lx(x), y]);
  stream(g, [...river, [Math.min(g.lx(-4), -4), 97]], 1.8, ['#8a240c', '#ff7418', '#ffd04a']);
  const r = rng(65);
  for (let i = 0; i < 16; i++) {
    let x = (r() * W) | 0, y = (66 + r() * 40) | 0;
    for (let k = 0; k < 6; k++) {
      g.P(x, y, k === 3 ? '#ff6a1a' : '#5a1a0c');
      x += 1;
      y += r() < 0.5 ? 0 : r() < 0.5 ? 1 : -1;
    }
  }
}

function voidcaller(g: Painter) {
  const { W, H } = g;
  bands(g, [[0, '#05040b'], [40, '#090615'], [80, '#0d0a1d'], [H, '#0b0818']]);
  const n = noise2(71);
  for (let y = g.top; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const band = Math.exp(-((x / W - 0.62) ** 2 + (y / FRAME_H - 0.42) ** 2) * 5);
      const v = ((fbm(n, x * 0.045, y * 0.06, 4) - 0.5) * 2.4 + 0.5) * (0.55 + 0.6 * band) + (dz(x, y) - 0.5) * 0.1;
      const c = v > 0.9 ? '#9a52a8' : v > 0.82 ? '#6e3488' : v > 0.72 ? '#4a2268' : v > 0.62 ? '#2e1648' : v > 0.52 ? '#1c0f30' : null;
      if (c) g.P(x, y, c);
    }
  }
  stars(g, 72, 110, FRAME_H - 2, ['#2a2440', '#3a3458', '#4a4470']);
  stars(g, 73, 24, FRAME_H - 2, ['#8a80b0']);
  const r = rng(74);
  for (let i = 0; i < 6; i++) {
    const x = (4 + r() * (W - 8)) | 0, y = (4 + r() * 70) | 0;
    g.P(x, y, '#e8e0ff');
    g.P(x - 1, y, '#6a6090');
    g.P(x + 1, y, '#6a6090');
    g.P(x, y - 1, '#6a6090');
    g.P(x, y + 1, '#6a6090');
  }
  // Two broken slabs over the void: the boss's high, the hero's at the bottom edge.
  const step = g.rx(141), deep = g.rx(174);
  for (let x = g.rx(132); x < W; x++) {
    const top = 74 + (x < step ? Math.round((step - x) * 0.7) : 0), bot = 78 + 26 * Math.pow(Math.max(0, 1 - Math.abs(x - deep) / 42), 0.8);
    g.R(x, top, 1, bot - top, '#1a1430');
    g.P(x, top, '#4e3e74');
    g.P(x, top + 1, '#2e2448');
    for (let y = Math.round(bot) - 6; y < bot; y++) if (dz(x, y) < 0.4) g.P(x, y, '#120e22');
  }
  const edge = g.lx(74);
  for (let x = 0; x < g.lx(86); x++) {
    const top = x < edge ? 100 : 100 + Math.round((x - edge) * 0.8);
    g.R(x, top, 1, H - top, '#1a1430');
    g.P(x, top, '#4e3e74');
  }
  rock(g, g.rx(100), 64, 6, '#1a1430', '#4e3e74');
  rock(g, g.rx(124), 92, 4, '#1a1430', '#4e3e74');
  rock(g, g.rx(186), 40, 4, '#1a1430', '#4e3e74');
}

// ---- common: a sky, a place, one small motion ----

function ironGuardian(g: Painter) {
  const { W, H } = g;
  bands(g, [[0, '#7aa2c8'], [18, '#93b5d4'], [34, '#abc6de'], [46, '#c2d6e6']]);
  cloud(g, g.lx(34), 12, 16, '#eef3f7', '#cbd8e4');
  cloud(g, g.rx(132), 8, 12, '#eef3f7', '#cbd8e4');
  cloud(g, g.rx(190), 30, 8, '#eef3f7', '#cbd8e4');
  ridge(g, { base: 46, amp: 5, scale: 0.04, c: '#8aa6a0', seed: 81 });
  // A sandstone curtain wall, a tower at the right edge, two banners.
  battlement(g, 0, W, 36, 66, '#a8987e', '#c4b496');
  for (let y = 41; y < 66; y++) {
    for (let x = 0; x < W; x++) {
      const row = (y - 41) >> 2;
      if (((y - 41) % 4 === 3 || (x + (row & 1) * 4) % 8 === 0) && dz(x, y) < 0.8) g.P(x, y, '#8e8068');
    }
  }
  const t = g.rx(176);
  battlement(g, t, W, 28, 66, '#9e8e74', '#bcac8e');
  g.R(t, 31, 1, 35, '#b8a888');
  g.R(t + 9, 38, 1, 4, '#3a3226');
  g.R(t + 9, 50, 1, 4, '#3a3226');
  for (const bx of [g.lx(70), g.lx(96)]) {
    g.R(bx, 42, 6, 14, '#a8342a');
    g.R(bx, 42, 6, 1, '#d8b060');
    g.R(bx, 56, 2, 1, '#a8342a');
    g.R(bx + 4, 56, 2, 1, '#a8342a');
    g.R(bx + 2, 47, 2, 3, '#d8b060');
    g.R(bx + 5, 43, 1, 13, '#7e2620');
  }
  bands(g, [[66, '#7c9c5c'], [82, '#6c8c4e'], [H, '#5c7c42']]);
  g.R(0, 66, W, 1, '#4e6a3a');
  const r = rng(83);
  for (let i = 0; i < 60; i++) {
    const x = (r() * W) | 0, y = (68 + r() * 38) | 0;
    g.P(x, y, '#5a7a3e');
    if (r() < 0.4) g.P(x, y - 1, '#86a862');
  }
  for (let i = 0; i < 8; i++) g.P((r() * W) | 0, (70 + r() * 36) | 0, r() < 0.5 ? '#f0e4a0' : '#e8a0a0');
}

function arcaneWarden(g: Painter) {
  const { W, H } = g, sun = g.lx(100);
  bands(g, [[0, '#2e4a5e'], [16, '#46647a'], [30, '#6e8a8e'], [44, '#a8b4a0'], [54, '#dcd4a8'], [62, '#f0dca8']]);
  stars(g, 91, 10, 20, ['#5a7890']);
  halo(g, sun, 62, 5, 22, '#f8e8c0', 0.8);
  disc(g, sun, 62, 5, '#fff4d8');
  ridge(g, { base: 62, amp: 5, scale: 0.03, c: '#4e6262', seed: 92 });
  for (let y = 56; y < 68; y++) {
    const d = 1 - Math.abs(y - 62) / 6;
    for (let x = 0; x < W; x++) if (dz(x, y) < d * 0.5) g.P(x, y, '#c8ccb4');
  }
  ridge(g, { base: 68, amp: 4, scale: 0.05, c: '#2c3638', seed: 93 });
  bands(g, [[68, '#283230'], [88, '#222a29'], [H, '#1d2423']]);
  const r = rng(94);
  for (let i = 0; i < 70; i++) g.P((r() * W) | 0, (70 + r() * 36) | 0, r() < 0.5 ? '#4a3a4a' : '#344038');
  const st = ['#3a3e44', '#7a8288', '#24282c'] as const;
  return {
    pts: [
      ...menhir(g, g.lx(80), 66, 5, 14, ...st),
      ...menhir(g, g.lx(91), 64, 4, 10, ...st),
      ...menhir(g, g.rx(180), 70, 6, 24, ...st),
      ...menhir(g, g.rx(189), 68, 5, 15, ...st),
    ],
  };
}

function savageBrute(g: Painter) {
  const { W, H } = g;
  bands(g, [[0, '#5e9ed8'], [22, '#7fb6e4'], [42, '#a2cdee'], [56, '#c2e0f2'], [58, '#c2e0f2']]);
  cloud(g, g.lx(46), 14, 16, '#ffffff', '#d4e4f0');
  cloud(g, g.rx(148), 9, 12, '#ffffff', '#d4e4f0');
  cloud(g, g.rx(188), 40, 7, '#ffffff', '#d4e4f0');
  const ys = ridge(g, { base: 58, amp: 8, scale: 0.03, c: '#8cba78', seed: 101 });
  // A lone tree on the far hill.
  const tx = g.rx(100), ty = ys[Math.max(0, Math.min(W - 1, tx))];
  disc(g, tx, ty - 6, 3, '#4e8040');
  g.P(tx - 1, ty - 8, '#6a9c52');
  g.R(tx, ty - 3, 1, 3, '#5a4a32');
  ridge(g, { base: 66, amp: 6, scale: 0.045, c: '#6ca254', seed: 103 });
  bands(g, [[66, '#64984a'], [84, '#58883f'], [H, '#4c7a36']]);
  const r = rng(104);
  for (let i = 0; i < 80; i++) {
    const x = (r() * W) | 0, y = (68 + r() * 38) | 0;
    g.P(x, y, '#46742f');
    if (r() < 0.5) g.P(x, y - 1, '#7ab05a');
  }
  for (let i = 0; i < 14; i++) g.P((r() * W) | 0, (70 + r() * 36) | 0, ['#f0d860', '#f09090', '#ffffff'][(r() * 3) | 0]);
  boulder(g, g.rx(184), 75, 8, 10, '#8a8e86', '#aaaea4', '#6a6e66');
  g.R(g.rx(175), 75, 18, 1, '#3e6a2c');
  boulder(g, g.rx(98), 80, 3, 3, '#8a8e86', '#aaaea4', '#6a6e66');
}

function arcaneAdept(g: Painter) {
  const { W, H } = g, c = g.rx(98);
  bands(g, [[0, '#2a3a66'], [16, '#4a5480'], [30, '#8a7a98'], [44, '#d49a7a'], [56, '#eeb47a'], [64, '#f4c888'], [70, '#f4c888']]);
  stars(g, 111, 8, 14, ['#7a88b8']);
  // A hill peaking under a broken tower with one lit window.
  for (let x = 0; x < W; x++) {
    const y = Math.min(68, Math.round(50 + ((x - c) / 34) ** 2 * 12));
    g.R(x, y, 1, H - y, '#3a2a44');
  }
  [36, 33, 31, 32, 34, 30, 29, 31, 34, 37, 39].forEach((t, i) => g.R(c - 5 + i, t, 1, 52 - t, '#24182e'));
  g.R(c - 5, 36, 1, 16, '#4a3a58');
  ridge(g, { base: 70, amp: 4, scale: 0.05, c: '#241c34', seed: 113 });
  bands(g, [[70, '#211a30'], [88, '#1a1528'], [H, '#151121']]);
  const r = rng(114);
  for (let i = 0; i < 50; i++) g.P((r() * W) | 0, (71 + r() * 35) | 0, '#30264a');
  return { pts: [[c, 38], [c, 39], [c - 2, 44], [c - 2, 45]] as [number, number][] };
}

// ---- 3x: firelight, weather, water ----

function steelBulwark(g: Painter) {
  const { W, H } = g, c = g.rx(140);
  bands(g, [[0, '#22263a'], [16, '#3a3a52'], [30, '#5e5060'], [44, '#a0705e'], [56, '#d89a62']]);
  battlement(g, 0, W, 38, 66, '#23252f', '#3a3c4a');
  for (let y = 43; y < 66; y++) {
    for (let x = 0; x < W; x++) {
      const row = (y - 43) >> 2;
      if (((y - 43) % 4 === 3 || (x + (row & 1) * 5) % 10 === 0) && dz(x, y) < 0.7) g.P(x, y, '#1a1c24');
    }
  }
  battlement(g, c - 32, c - 18, 26, 66, '#1e2029', '#3a3c4a');
  battlement(g, c + 18, c + 32, 26, 66, '#1e2029', '#3a3c4a');
  g.R(c - 32, 29, 1, 37, '#34364a');
  g.R(c + 18, 29, 1, 37, '#34364a');
  // The gate stands open on a firelit yard; the portcullis is raised.
  const FIRE = ['#3a2010', '#6a3816', '#a8581e', '#e08c2a'];
  for (let y = 40; y < 66; y++) {
    const hw = y < 52 ? Math.round(18 * Math.sqrt(Math.max(0, 1 - ((52 - y) / 12) ** 2))) : 18, k = (y - 40) / 26;
    for (let x = c - hw; x < c + hw; x++) g.P(x, y, FIRE[Math.max(0, Math.min(3, Math.floor(k * 3.6 + (dz(x, y) - 0.5) * 0.8)))]);
    g.P(c - hw - 1, y, '#3a3c4a');
    g.P(c + hw, y, '#3a3c4a');
  }
  for (let x = c - 16; x < c + 17; x += 4) g.R(x, 41, 1, 7, '#14100c');
  g.R(c - 16, 44, 33, 1, '#14100c');
  g.R(c - 17, 47, 35, 1, '#14100c');
  for (const bx of [c - 28, c + 22]) {
    g.R(bx, 32, 6, 16, '#6a1a1a');
    g.R(bx, 32, 6, 1, '#c8a050');
    g.R(bx + 2, 38, 2, 3, '#c8a050');
  }
  const torches: [number, number][] = [[g.rx(104), 47], [g.rx(176), 47]];
  for (const [tx] of torches) {
    halo(g, tx, 46, 1, 10, '#7a4a22', 0.5);
    g.R(tx, 48, 1, 4, '#101014');
  }
  bands(g, [[66, '#30303a'], [86, '#28282f'], [H, '#212128']]);
  const rows = [68, 71, 75, 80, 86, 93, 101];
  rows.forEach((y, i) => {
    g.R(0, y, W, 1, '#1c1c22');
    const step = 6 + i * 3, next = rows[i + 1] ?? H;
    for (let x = (i & 1) * (step >> 1); x < W; x += step) g.R(x, y + 1, 1, next - y - 1, '#1c1c22');
  });
  for (let y = 66; y < H; y++) {
    const s = (y - 66) * 0.6;
    for (let x = Math.round(c - 18 - s); x < c + 18 + s; x++) if (dz(x, y) < 0.4 * (1 - (y - 66) / 44)) g.P(x, y, '#6a4224');
  }
  return { pts: torches };
}

function ragingBerserker(g: Painter) {
  const { W, H } = g;
  bands(g, [[0, '#14171e'], [18, '#1c2029'], [36, '#262b36'], [52, '#323846'], [56, '#3a4150']]);
  const n = noise2(161);
  for (let y = 0; y < 54; y++) {
    for (let x = 0; x < W; x++) {
      const v = (fbm(n, x * 0.03, y * 0.08) - 0.5) * 2.4 + 0.5 + (dz(x, y) - 0.5) * 0.12;
      if (v > 0.72) g.P(x, y, '#3a414e');
      else if (v > 0.6) g.P(x, y, '#2c323e');
      else if (v < 0.34) g.P(x, y, '#101318');
    }
  }
  bands(g, [[54, '#1a2430'], [62, '#16202a'], [66, '#141c26']]);
  const r = rng(162);
  for (let i = 0; i < 30; i++) g.R((r() * W) | 0, (55 + r() * 9) | 0, (2 + r() * 3) | 0, 1, '#4a5a68');
  // A dark headland behind the hero.
  for (let x = 0; x < g.lx(64); x++) {
    const top = Math.round(44 + (x - g.lx(0)) * 0.25 + Math.sin(x * 0.2) * 2);
    g.R(x, top, 1, 64 - top, '#14181e');
  }
  for (let x = 0; x < W; x++) {
    const top = 64 + Math.round(Math.sin(x * 0.08) * 1.5 + Math.sin(x * 0.31) * 0.8);
    g.R(x, top, 1, H - top, '#262c26');
    g.P(x, top, '#34402e');
  }
  bands(g, [[70, '#222a22'], [90, '#1c221c'], [H, '#181d18']]);
  for (let i = 0; i < 60; i++) g.P((r() * W) | 0, (68 + r() * 38) | 0, r() < 0.5 ? '#2c3a2c' : '#141814');
  boulder(g, g.rx(186), 76, 6, 6, '#3a3e3e', '#545a5a', '#282c2c');
  boulder(g, g.lx(96), 72, 3, 3, '#3a3e3e', '#545a5a', '#282c2c');
  return { horizon: 54 };
}

function spellweaver(g: Painter) {
  const { W, H } = g;
  bands(g, [[0, '#070a1a'], [24, '#0c1028'], [44, '#141a3a'], [56, '#1c2448'], [58, '#1c2448']]);
  stars(g, 121, 70, 56, ['#2a3050', '#3a4268', '#4a5480']);
  stars(g, 122, 10, 50, ['#b0b8e0']);
  const ys = ridge(g, { base: 58, amp: 16, scale: 0.035, c: '#10142c', seed: 123, peaks: true });
  // A still lake: the mountains mirrored, shimmer and the lanterns' light on it.
  bands(g, [[57, '#18204a'], [64, '#141c40'], [72, '#101636']]);
  for (let x = 0; x < W; x++) {
    const d = Math.round((58 - ys[x]) * 0.35);
    for (let y = 57; y < 57 + d && y < 70; y++) if (dz(x, y) < 0.55) g.P(x, y, '#0e1330');
  }
  const r = rng(124);
  for (let i = 0; i < 30; i++) g.R((r() * W) | 0, (58 + r() * 12) | 0, (2 + r() * 5) | 0, 1, '#2a3670');
  for (let i = 0; i < 14; i++) g.R((r() * W) | 0, (59 + r() * 11) | 0, (1 + r() * 3) | 0, 1, r() < 0.5 ? '#c8823a' : '#8a5a2a');
  ridge(g, { base: 72, amp: 3, scale: 0.06, c: '#0f111f', seed: 125 });
  bands(g, [[72, '#0f111f'], [90, '#0c0e1a'], [H, '#0a0b15']]);
  const reeds = (a: number, b: number) => {
    for (let x = a; x < b; x += 2 + ((r() * 3) | 0)) {
      const h = (4 + r() * 8) | 0;
      g.R(x, 72 - h, 1, h, '#06070e');
      if (r() < 0.4) g.R(x, 72 - h, 1, 2, '#2a1c14');
    }
  };
  reeds(0, g.lx(22));
  reeds(g.lx(70), g.lx(92));
  reeds(g.rx(180), W);
}

// ---- 4x: stranger places, more motion ----

function adamantBastion(g: Painter) {
  const { W, H } = g;
  bands(g, [[0, '#07060c'], [30, '#0b0913'], [60, '#110d1b'], [H, '#0e0b16']]);
  const n = noise2(131);
  for (let y = g.top; y < 70; y++) {
    for (let x = 0; x < W; x++) {
      const v = (fbm(n, x * 0.06, y * 0.08) - 0.5) * 2.4 + 0.5 + (dz(x, y) - 0.5) * 0.12;
      if (v > 0.72) g.P(x, y, '#1e1838');
      else if (v > 0.6) g.P(x, y, '#16122a');
    }
  }
  const r = rng(132);
  halo(g, g.rx(182), 50, 4, 28, '#0e3444', 0.6);
  halo(g, g.rx(100), 58, 2, 16, '#0e3444', 0.6);
  halo(g, g.lx(4), 56, 2, 12, '#2a1040', 0.6);
  // Stalactites, from above the canvas's top on a tall stage.
  for (let x = 0; x < W; x += 5 + ((r() * 8) | 0)) {
    const len = (5 + r() * 14) | 0, w = (2 + r() * 2) | 0;
    for (let i = 0; i < len; i++) {
      const hw = Math.round(w * (1 - i / len));
      g.R(x - hw, g.top + i, hw * 2 + 1, 1, '#05040a');
      g.P(x + hw, g.top + i, '#2a2440');
    }
  }
  const T = ['#14506a', '#2a9ab8', '#7ae6f0', '#e0ffff'], A = ['#3a1858', '#7a34a8', '#c88af0', '#f4dcff'];
  const tips = [
    crystal(g, g.rx(186), 68, 34, 4, -0.12, T),
    crystal(g, g.rx(177), 68, 22, 3, 0.14, T),
    crystal(g, g.rx(193), 68, 18, 3, -0.3, T),
    crystal(g, g.rx(170), 68, 12, 2, 0.25, A),
    crystal(g, g.rx(100), 67, 16, 3, 0, T),
    crystal(g, g.rx(94), 67, 10, 2, 0.3, A),
    crystal(g, g.rx(106), 67, 9, 2, -0.3, T),
    crystal(g, g.lx(3), 66, 14, 2, 0.2, A),
  ];
  ridge(g, { base: 69, amp: 3, scale: 0.06, c: '#151120', seed: 133 });
  bands(g, [[69, '#15111e'], [88, '#110e19'], [H, '#0d0b14']]);
  for (let i = 0; i < 40; i++) g.P((r() * W) | 0, (70 + r() * 36) | 0, '#1c2a3a');
  for (let i = 0; i < 16; i++) {
    const x = (r() * W) | 0, y = (74 + r() * 30) | 0;
    tips.push(crystal(g, x, y, (2 + r() * 3) | 0, 1, 0, r() < 0.7 ? T : A));
  }
  return { pts: tips };
}

function spectralAegis(g: Painter) {
  const { W, H } = g;
  bands(g, [[0, '#03070f'], [24, '#060c1a'], [44, '#0a1526'], [58, '#0e1c30'], [61, '#0e1c30']]);
  stars(g, 141, 90, 58, ['#1e2a3c', '#2a3a50', '#3a4e68']);
  stars(g, 142, 14, 50, ['#8aa8c8']);
  const ys = ridge(g, { base: 62, amp: 24, scale: 0.03, c: '#081220', seed: 143, peaks: true });
  for (let x = 0; x < W; x++) for (let y = ys[x]; y < ys[x] + 4 && y < 48; y++) if (dz(x, y) < 0.6 - (y - ys[x]) * 0.15) g.P(x, y, '#2a4058');
  bands(g, [[61, '#12283a'], [78, '#173046'], [H, '#1c384e']]);
  // The aurora's reflection on the ice, and cracks.
  for (let x = 0; x < W; x++) {
    const s = Math.sin(x * 0.05) * Math.cos(x * 0.021);
    if (s > 0.2) for (let y = 62; y < 74; y++) if (dz(x, y) < (s - 0.2) * 0.6 * (1 - (y - 62) / 12)) g.P(x, y, '#1e6a5a');
  }
  const r = rng(144);
  for (let i = 0; i < 10; i++) {
    let x = (r() * W) | 0, y = (66 + r() * 40) | 0;
    for (let k = 0; k < 10; k++) {
      g.P(x, y, k % 4 ? '#3a6a88' : '#7aa8c8');
      x += r() < 0.7 ? 1 : 0;
      y += r() < 0.5 ? 0 : r() < 0.5 ? 1 : -1;
    }
  }
  return { mask: ys };
}

function eldritchHarbinger(g: Painter) {
  const { W, H } = g, m = g.rx(150);
  bands(g, [[0, '#08050a'], [20, '#14080e'], [38, '#260c14'], [52, '#3a121a'], [62, '#4a1a20']]);
  stars(g, 151, 30, 40, ['#3a2830', '#4a3038']);
  // A blood moon behind the reaper.
  halo(g, m, 30, 15, 28, '#5a1a1c', 0.6);
  disc(g, m, 30, 15, '#c8402e');
  disc(g, m - 5, 25, 3, '#a8301f');
  disc(g, m + 5, 35, 4, '#a8301f');
  disc(g, m + 6, 23, 2, '#a8301f');
  g.P(m - 8, 36, '#a8301f');
  for (let y = 15; y <= 45; y++) {
    for (let x = m; x <= m + 15; x++) {
      if (Math.hypot(x - m, y - 30) <= 15 && Math.hypot(x - m + 6, y - 30) > 15 && dz(x, y) < 0.5) g.P(x, y, '#9a2a1c');
    }
  }
  ridge(g, { base: 62, amp: 6, scale: 0.04, c: '#1a0c12', seed: 152 });
  const fence = g.rx(108);
  g.R(fence, 58, W - fence, 1, '#0c0608');
  for (let x = fence; x < W; x += 3) {
    g.R(x, 55, 1, 9, '#0c0608');
    g.P(x, 54, '#2a1418');
  }
  bands(g, [[64, '#1a0e12'], [84, '#140a0e'], [H, '#10080b']]);
  const r = rng(153);
  branch(g, g.lx(4), 72, Math.PI / 2 + 0.1, 12, 4, '#07040a', r);
  branch(g, g.rx(188), 64, Math.PI / 2 - 0.15, 9, 4, '#07040a', r);
  for (let i = 0; i < 50; i++) g.P((r() * W) | 0, (66 + r() * 40) | 0, '#2a1a1e');
  tomb(g, g.lx(72), 76, 6, 8);
  tomb(g, g.lx(88), 71, 0, 7, true);
  tomb(g, g.lx(100), 80, 7, 9);
  tomb(g, g.rx(182), 86, 7, 10);
  tomb(g, g.rx(180), 75, 0, 6, true);
  tomb(g, g.lx(30), 68, 4, 5);
}

// ---- 5x: set pieces ----

function mythicJuggernaut(g: Painter) {
  const { W, H } = g;
  bands(g, [[0, '#120c07'], [30, '#1a120a'], [66, '#22180d']]);
  for (let y = g.top; y < 66; y++) {
    for (let x = 0; x < W; x++) {
      const row = Math.floor(y / 6);
      if (((((y % 6) + 6) % 6 === 5) || (x + (row & 1) * 6) % 12 === 0) && dz(x, y) < 0.6) g.P(x, y, '#0c0805');
    }
  }
  // A tall window lights the boss from behind; a smaller one at the right edge.
  const win = g.rx(132), side = g.rx(183);
  halo(g, win + 11, 34, 12, 36, '#3e2c14', 0.7);
  g.R(win - 2, 8, 26, 50, '#2e2214');
  glass(g, win, 10, 22, 46);
  g.R(side - 2, 30, 14, 30, '#2e2214');
  glass(g, side, 32, 10, 26);
  for (const px of [g.lx(84), g.rx(170)]) {
    g.R(px, g.top, 9, 66 - g.top, '#3a2a1a');
    g.R(px, g.top, 1, 66 - g.top, '#6a4a28');
    g.R(px + 8, g.top, 1, 66 - g.top, '#22180e');
    g.R(px - 2, 4, 13, 3, '#c8a050');
    g.R(px - 2, 7, 13, 1, '#8a6a30');
    g.R(px - 2, 62, 13, 4, '#8a6a30');
    g.R(px - 2, 62, 13, 1, '#c8a050');
  }
  for (const bx of [g.lx(26), g.lx(58)]) {
    g.R(bx, g.top, 10, 30 - g.top, '#4a2060');
    g.R(bx, g.top, 10, 2 - g.top, '#c8a050');
    g.R(bx, g.top, 1, 30 - g.top, '#c8a050');
    g.R(bx + 9, g.top, 1, 30 - g.top, '#c8a050');
    g.R(bx, 30, 4, 2, '#4a2060');
    g.R(bx + 6, 30, 4, 2, '#4a2060');
    g.R(bx + 4, 12, 2, 4, '#c8a050');
    g.R(bx + 3, 13, 4, 2, '#c8a050');
  }
  // A checkered floor running to the back, a red carpet down the middle.
  const vx = g.rx(150), vy = 40;
  for (let y = 66; y < H; y++) {
    const dy = y - vy, row = Math.floor(Math.log(dy) * 6);
    for (let x = 0; x < W; x++) {
      const u = (x - vx) / dy;
      let c = (row + Math.floor(u * 5)) & 1 ? '#3a2a18' : '#4a3620';
      if (u > -0.78 && u < -0.42) c = Math.abs(u + 0.78) < 1 / dy || Math.abs(u + 0.42) < 1 / dy ? '#c8a050' : '#7a1a1a';
      g.P(x, y, c);
    }
  }
  const shaft = (x0: number, x1: number, y0: number, dens: number) => {
    for (let y = y0; y < H; y++) {
      const off = (y - y0) * 0.9;
      for (let x = Math.round(x0 - off); x < x1 - off; x++) if (dz(x, y) < dens * (1 - ((y - y0) / (FRAME_H - y0)) * 0.5)) g.P(x, y, '#e8c070');
    }
  };
  shaft(win, win + 22, 30, 0.16);
  shaft(side, side + 10, 44, 0.12);
}

function etherealSovereign(g: Painter) {
  const { W, H } = g, sun = g.lx(96);
  bands(g, [[0, '#6a9ad0'], [18, '#8ab2dc'], [34, '#b4c8e2'], [46, '#e0d4c4'], [56, '#f4dcb0'], [70, '#f8e6c4']]);
  for (let y = g.top; y < 62; y++) {
    for (let x = 0; x < W; x++) {
      const a = Math.atan2(y - 52, x - sun), s = ((a + Math.PI) / (Math.PI / 12)) | 0;
      if (s % 2 === 0 && dz(x, y) < 0.32 * Math.max(0, 1 - Math.hypot(x - sun, y - 52) / 110)) g.P(x, y, '#fff6e0');
    }
  }
  halo(g, sun, 52, 8, 24, '#fff0d0', 0.8);
  disc(g, sun, 52, 8, '#fffbf0');
  const r = rng(181);
  for (let x = -6; x < W + 6; x += 9) cloud(g, x, 59 + ((r() * 3) | 0), 6 + ((r() * 4) | 0), '#f8ecd8', '#e6d0ac');
  // A floating island with a small gold temple at the right edge.
  const i = g.rx(184);
  rock(g, i, 47, 10, '#b89a6a', '#e8d4a8');
  g.R(i - 8, 45, 17, 2, '#e8d4a8');
  for (const cx of [i - 7, i - 3, i + 1, i + 5]) {
    g.R(cx, 36, 2, 9, '#f4e6c4');
    g.P(cx + 1, 40, '#d8c49c');
  }
  g.R(i - 9, 34, 19, 2, '#e8d4a8');
  for (let y = 29; y < 34; y++) {
    const hw = (y - 29) * 2;
    g.R(i - hw, y, hw * 2 + 1, 1, '#d8b060');
  }
  // The cloud floor the fight stands on.
  for (let x = 0; x < W; x++) {
    const top = 64 + Math.round(Math.sin(x * 0.13) * 2 + Math.sin(x * 0.047 + 1) * 3);
    for (let y = top; y < H; y++) {
      const c = y === top ? '#ffffff' : y > 96 && dz(x, y) < (y - 96) / 10 ? '#e2ceac' : y > 80 && dz(x, y) < (y - 80) / 30 ? '#f0e2c8' : '#fff8ee';
      g.P(x, y, c);
    }
  }
  for (let k = 0; k < 8; k++) cloud(g, (r() * W) | 0, (78 + r() * 24) | 0, 4 + ((r() * 5) | 0), '#fffaf2', '#eadbbe');
}

const NIGHT_STONE: StageSceneDef['plinth'] = ['#1f2534', '#3a4358', '#283041', '#10141d'];

/** Every boss's scene, by its personality (the sprite it shows: bossSprites.ts). */
export const STAGE_SCENES: Record<Personality, StageSceneDef> = {
  balanced: { paint: drifter, fx: ['fireflies'], plinth: NIGHT_STONE },
  tank: { paint: colossus, fx: ['dust'], day: true, plinth: ['#a85e3a', '#d48c5c', '#bc7246', '#743a22'] },
  armored: { paint: ironGuardian, fx: ['birds'], day: true, plinth: ['#7a7f88', '#b0b5bc', '#94999f', '#4e535a'] },
  armored3x: { paint: steelBulwark, fx: ['torches'], plinth: ['#2a2c36', '#5a5e6e', '#3e414e', '#14151b'] },
  armored4x: { paint: adamantBastion, fx: ['glints', 'cyan'], plinth: ['#1c1a2a', '#3a6a80', '#262a40', '#0a0912'] },
  armored5x: { paint: mythicJuggernaut, fx: ['golddust'], plinth: ['#5a4630', '#d8b060', '#8a6a40', '#2a1e12'] },
  warded: { paint: arcaneWarden, fx: ['runes', 'haze'], plinth: ['#3a3e44', '#7a8288', '#50565c', '#1c1f22'] },
  warded3x: { paint: frost, fx: ['snow'], day: true, plinth: ['#9cc0d8', '#eaf4fa', '#c0dbeb', '#6a90aa'] },
  warded4x: { paint: spectralAegis, fx: ['aurora', 'twinkle'], plinth: ['#2a4a64', '#7ab0d0', '#3e6888', '#122436'] },
  warded5x: { paint: etherealSovereign, fx: ['sparkles', 'feathers'], day: true, plinth: ['#e8d8b8', '#fffaf0', '#f4e8d0', '#c8a878'] },
  brute: { paint: savageBrute, fx: ['seeds'], day: true, plinth: ['#7a7e72', '#a8ac9c', '#8e9284', '#4e5248'] },
  brute3x: { paint: ragingBerserker, fx: ['rain', 'lightning'], plinth: ['#2e3238', '#5a626e', '#3e444e', '#16191e'] },
  brute4x: { paint: bloodfang, fx: ['leaves'], plinth: ['#262028', '#4a3e4a', '#342a36', '#120e14'] },
  brute5x: { paint: apex, fx: ['embers'], plinth: ['#1c1212', '#5a2a20', '#2e1a18', '#0a0606'] },
  arcane: { paint: arcaneAdept, fx: ['window', 'glyphs'], plinth: ['#2a2440', '#5a4e7a', '#3a3456', '#120f1e'] },
  arcane3x: { paint: spellweaver, fx: ['lanterns'], plinth: ['#1e2238', '#4a5480', '#2e3456', '#0c0e1c'] },
  arcane4x: { paint: eldritchHarbinger, fx: ['fog', 'bats'], plinth: ['#2a2228', '#5a4a50', '#3a3036', '#120c0e'] },
  arcane5x: { paint: voidcaller, fx: ['motes'], plinth: ['#211a33', '#5a4a84', '#33284e', '#0d0a17'] },
};
