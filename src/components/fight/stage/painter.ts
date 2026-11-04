// A small pixel painter for the stage scenes (docs/mockups/pixel-boss-stages.html).
// It draws into a buffer of art pixels, each one 2 CSS px on a phone and 3 on the
// desktop banner, which StageScene puts on a canvas.
//
// Scenes are drawn on a 195 x 108 frame: the 390px phone stage. A Fit lays that
// frame over the real stage: `oy` drops it so its ground meets the plinths, and
// `lx` / `rx` carry a frame x along with the hero or with the boss, so on any width
// each fighter keeps the backdrop drawn behind them while the sky and ground run
// across the middle. Loops over the whole width use the canvas's own `W`.

/** Frame size, in art pixels: the 390px phone stage plus the 4px under its plinths. */
export const FRAME_W = 195;
export const FRAME_H = 108;

/** Where the frame sits on the canvas, in art pixels (see StageScene's fitting). */
export interface Fit {
  /** Columns the hero's side of the frame moves right by. */
  dxL: number;
  /** Columns the boss's side of the frame moves right by. */
  dxR: number;
  /** Rows the frame moves down by (negative crops the top of its sky). */
  oy: number;
}

export interface Painter {
  /** Canvas width, art px: whole-width loops run 0..W. */
  W: number;
  /** The frame row the canvas ends at: ground loops run down to H. */
  H: number;
  /** The frame row at the canvas's top (0, or less where the sky reaches higher). */
  top: number;
  buf: Uint32Array<ArrayBuffer>;
  /** A frame x on the hero's side, as a canvas x. */
  lx(x: number): number;
  /** A frame x on the boss's side, as a canvas x. */
  rx(x: number): number;
  /** Fills a rectangle: x in canvas columns, y in frame rows. */
  R(x: number, y: number, w: number, h: number, c: string): void;
  P(x: number, y: number, c: string): void;
}

const COLORS = new Map<string, number>();

/** '#rrggbb' as one ImageData pixel (RGBA bytes, little-endian). */
export function rgba(hex: string): number {
  let v = COLORS.get(hex);
  if (v === undefined) {
    const n = parseInt(hex.slice(1), 16);
    v = (0xff000000 | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff)) >>> 0;
    COLORS.set(hex, v);
  }
  return v;
}

export function createPainter(cols: number, rows: number, fit: Fit): Painter {
  const buf = new Uint32Array(cols * rows);
  const R = (x: number, y: number, w: number, h: number, c: string) => {
    const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y) + fit.oy);
    const x1 = Math.min(cols, Math.round(x) + Math.round(w)), y1 = Math.min(rows, Math.round(y) + fit.oy + Math.round(h));
    if (x1 <= x0 || y1 <= y0) return;
    const v = rgba(c);
    for (let yy = y0; yy < y1; yy++) buf.fill(v, yy * cols + x0, yy * cols + x1);
  };
  return {
    W: cols,
    H: rows - fit.oy,
    top: -fit.oy,
    buf,
    lx: (x) => x + fit.dxL,
    rx: (x) => x + fit.dxR,
    R,
    P: (x, y, c) => R(x, y, 1, 1, c),
  };
}

// ---------------- noise and dither ----------------

export type Rng = () => number;

/** A seeded random stream (mulberry32): the same scene every time. */
export function rng(seed: number): Rng {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const B4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** The 4x4 Bayer threshold at a pixel, 0..1. */
export const dz = (x: number, y: number) => (B4[y & 3][x & 3] + 0.5) / 16;

export function noise1(seed: number) {
  const r = rng(seed), p = Array.from({ length: 256 }, r);
  return (x: number) => {
    const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f);
    return p[i & 255] * (1 - s) + p[(i + 1) & 255] * s;
  };
}

export function noise2(seed: number) {
  const r = rng(seed), p = Array.from({ length: 4096 }, r), at = (i: number, j: number) => p[(j & 63) * 64 + (i & 63)];
  return (x: number, y: number) => {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = at(i, j) * (1 - sx) + at(i + 1, j) * sx, b = at(i, j + 1) * (1 - sx) + at(i + 1, j + 1) * sx;
    return a * (1 - sy) + b * sy;
  };
}

export function fbm(n: (x: number, y: number) => number, x: number, y: number, octaves = 3) {
  let h = 0, a = 1, s = 0, f = 1;
  for (let k = 0; k < octaves; k++) {
    h += n(x * f + k * 17, y * f + k * 9) * a;
    s += a;
    a *= 0.5;
    f *= 2;
  }
  return h / s;
}

// ---------------- shapes ----------------

/** Flat colour bands, each dithering into the next over its last `soft` share. A
 *  band from the frame's top runs on up to the canvas's, where the stage is taller. */
export function bands(g: Painter, stops: [number, string][], soft = 0.5) {
  for (let i = 0; i < stops.length - 1; i++) {
    const [y0, c0] = stops[i], [y1, c1] = stops[i + 1];
    for (let y = y0 === 0 ? Math.min(0, g.top) : y0; y < y1; y++) {
      const k = (Math.max(0, y - y0) / (y1 - y0) - (1 - soft)) / soft;
      if (k <= 0) {
        g.R(0, y, g.W, 1, c0);
        continue;
      }
      for (let x = 0; x < g.W; x++) g.P(x, y, dz(x, y) < k ? c1 : c0);
    }
  }
}

export interface RidgeOptions {
  base: number;
  amp: number;
  scale: number;
  c: string;
  seed: number;
  oct?: number;
  peaks?: boolean;
}

/** A silhouette from 1D noise, filled to the bottom; returns its top row per column. */
export function ridge(g: Painter, o: RidgeOptions) {
  const n = noise1(o.seed), ys: number[] = [];
  for (let x = 0; x < g.W; x++) {
    let h = 0, a = 1, f = o.scale, s = 0;
    for (let k = 0; k < (o.oct ?? 3); k++) {
      let v = n(x * f + k * 31.7);
      if (o.peaks) v = 1 - Math.abs(v * 2 - 1);
      h += v * a;
      s += a;
      a *= 0.5;
      f *= 2.1;
    }
    const y = Math.round(o.base - (h / s) * o.amp);
    ys.push(y);
    g.R(x, y, 1, g.H - y, o.c);
  }
  return ys;
}

export function disc(g: Painter, cx: number, cy: number, r: number, c: string, skip?: (dy: number) => boolean) {
  for (let y = -r; y <= r; y++) {
    if (skip?.(y)) continue;
    const w = Math.round(Math.sqrt(r * r - y * y));
    g.R(cx - w, cy + y, w * 2 + 1, 1, c);
  }
}

export function halo(g: Painter, cx: number, cy: number, r0: number, r1: number, c: string, d = 0.6) {
  for (let y = Math.floor(cy - r1); y <= cy + r1; y++) {
    for (let x = Math.floor(cx - r1); x <= cx + r1; x++) {
      const q = Math.hypot(x - cx, y - cy);
      if (q >= r0 && q < r1 && dz(x, y) < d * (1 - (q - r0) / (r1 - r0))) g.P(x, y, c);
    }
  }
}

export function stars(g: Painter, seed: number, n: number, yMax: number, cols: string[]) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) g.P((r() * g.W) | 0, (r() * yMax) | 0, cols[(r() * cols.length) | 0]);
}

/** A three-tier pine; with `snow`, the top row of each tier is snow. */
export function pine(g: Painter, x: number, base: number, h: number, c: string, snow?: string) {
  const th = h / 3;
  for (let r = 0; r < h; r++) {
    const t = Math.min(2, Math.floor(r / th)), k = r - t * th, hw = Math.floor(k * 0.55 + t * 1.1);
    g.R(x - hw, base - h + r, hw * 2 + 1, 1, snow && k < 1.5 && r > 1 ? snow : c);
  }
  g.R(x, base, 1, 2, c);
}

/** A flat-topped rock with talus slopes, a lit rim, a shaded right side and strata. */
export function mesa(g: Painter, x0: number, x1: number, top: number, base: number, c: string, hi: string, sh: string, strata?: string) {
  const talus = top + (base - top) * 0.55;
  for (let y = top; y < base; y++) {
    const d = y > talus ? Math.round((y - talus) * 1.3) : 0, a = x0 - d - ((y * 7) % 5 === 0 ? 1 : 0), b = x1 + d;
    g.R(a, y, b - a, 1, c);
    g.R(b - 3, y, 3, 1, sh);
    if (strata && (y - top) % 5 === 2) for (let x = a; x < b - 3; x++) if (dz(x, y) < 0.5) g.P(x, y, strata);
  }
  g.R(x0, top, x1 - x0, 1, hi);
}

/** A river along a polyline, wider as it comes toward the viewer. */
export function stream(g: Painter, pts: [number, number][], w: number, [edge, mid, core]: [string, string, string]) {
  const seg: [number, number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay));
    for (let s = 0; s < n; s++) seg.push([Math.round(ax + ((bx - ax) * s) / n), Math.round(ay + ((by - ay) * s) / n), (i + s / n) / (pts.length - 1)]);
  }
  const rad = (t: number) => Math.round(w * (0.5 + t));
  seg.forEach(([x, y, t]) => disc(g, x, y, rad(t), edge));
  seg.forEach(([x, y, t]) => disc(g, x, y, Math.max(0, rad(t) - 1), mid));
  seg.forEach(([x, y], i) => {
    if (i % 3) g.P(x, y, core);
  });
}

/** A floating rock: a lit top row, tapering underneath. */
export function rock(g: Painter, cx: number, cy: number, w: number, body: string, rim: string) {
  for (let i = 0; i < w + 3; i++) {
    const hw = i === 0 ? w - 1 : Math.round(w * (1 - (i - 1) / (w + 2)));
    g.R(cx - hw, cy + i, hw * 2 + 1, 1, i === 0 ? rim : body);
  }
}

/** A flat-bottomed cloud of overlapping puffs, its shadow showing along the bottom. */
export function cloud(g: Painter, cx: number, cy: number, w: number, c: string, sh: string) {
  const r = rng(cx * 31 + cy), puffs: [number, number][] = [];
  for (let i = -w; i <= w; i += 3) puffs.push([cx + i, Math.round((1 - Math.abs(i) / w) * w * 0.4 + 2 + r() * 2)]);
  puffs.forEach(([x, rr]) => disc(g, x, cy, rr, sh, (dy) => dy > 2));
  puffs.forEach(([x, rr]) => disc(g, x, cy - 1, rr, c, (dy) => dy > 2));
}

export function boulder(g: Painter, cx: number, base: number, w: number, h: number, body: string, lit: string, sh: string) {
  for (let y = base - h; y < base; y++) {
    const k = (base - y) / h, hw = Math.round(w * Math.sqrt(1 - k * k));
    g.R(cx - hw, y, hw * 2 + 1, 1, body);
    g.R(cx + hw - 1, y, 2, 1, sh);
    if (k > 0.55) g.R(cx - hw, y, Math.max(1, hw), 1, lit);
  }
}

/** A standing stone; returns the points down its face where runes glow. */
export function menhir(g: Painter, x: number, base: number, w: number, h: number, body: string, lit: string, sh: string) {
  for (let y = base - h; y < base; y++) {
    const inset = y === base - h ? 1 : 0;
    g.R(x + inset, y, w - inset * 2, 1, body);
    g.P(x + inset, y, lit);
    g.P(x + w - 1 - inset, y, sh);
  }
  const pts: [number, number][] = [];
  for (let y = base - h + 3; y < base - 2; y += 3) pts.push([x + (w >> 1), y]);
  return pts;
}

/** A leaning prism, lit on its left facet; returns its tip. */
export function crystal(g: Painter, x: number, base: number, h: number, w: number, lean: number, [dk, md, lt, tip]: string[]): [number, number] {
  for (let i = 0; i < h; i++) {
    const y = base - h + i, cx = Math.round(x + (h - i) * lean), hw = Math.min(w, Math.floor(i * 0.7));
    g.R(cx - hw, y, hw + 1, 1, md);
    g.R(cx + 1, y, hw, 1, dk);
    g.P(cx - hw, y, lt);
    if (i === 0) g.P(cx, y, tip);
  }
  return [Math.round(x + h * lean), base - h];
}

export function tomb(g: Painter, x: number, base: number, w: number, h: number, cross = false) {
  const body = '#2e2428', lit = '#4e3e44', sh = '#1c1418';
  if (cross) {
    g.R(x, base - h, 2, h, body);
    g.R(x - 2, base - h + 2, 6, 2, body);
    g.P(x, base - h, lit);
    g.R(x - 2, base - h + 2, 1, 2, lit);
    return;
  }
  for (let y = base - h; y < base; y++) {
    const k = y - (base - h), inset = k === 0 ? 2 : k === 1 ? 1 : 0;
    g.R(x + inset, y, w - inset * 2, 1, body);
    g.P(x + inset, y, lit);
    g.P(x + w - 1 - inset, y, sh);
  }
}

/** A bare branching tree, grown from (x, y) at angle `a`. */
export function branch(g: Painter, x: number, y: number, a: number, len: number, depth: number, c: string, r: Rng) {
  for (let i = 0; i < len; i++) {
    x += Math.cos(a);
    y -= Math.sin(a);
    g.P(x, y, c);
    if (depth > 2) g.P(x + 1, y, c);
  }
  if (depth <= 0) return;
  branch(g, x, y, a + 0.35 + r() * 0.4, len * 0.68, depth - 1, c, r);
  branch(g, x, y, a - 0.35 - r() * 0.4, len * 0.68, depth - 1, c, r);
}

/** An arched stained-glass window, panes in a lead grid. */
export function glass(g: Painter, x: number, top: number, w: number, h: number) {
  const cols = ['#e8b040', '#c83a2a', '#3a6ad0', '#f0d890', '#7a3ab0'], r = w / 2, cx = x + r;
  for (let y = top; y < top + h; y++) {
    const dy = top + r - y, hw = y < top + r ? Math.sqrt(Math.max(0, r * r - dy * dy)) : r;
    for (let xx = Math.round(cx - hw); xx < Math.round(cx + hw); xx++) {
      const lead = (xx - x) % 4 === 0 || (y - top) % 5 === 0;
      g.P(xx, y, lead ? '#1a120a' : cols[(((xx - x) >> 2) + (((y - top) / 5) | 0)) % cols.length]);
    }
  }
}

/** A crenellated wall run: merlons every other 4px. */
export function battlement(g: Painter, x0: number, x1: number, top: number, base: number, c: string, lit: string) {
  for (let x = x0; x < x1; x++) {
    const t = ((x - x0) >> 2) % 2 ? top : top + 3;
    g.R(x, t, 1, base - t, c);
    g.P(x, t, lit);
  }
}
