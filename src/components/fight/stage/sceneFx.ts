import { dz, fbm, noise2, rng } from './painter';
import type { Painter, Rng } from './painter';
import type { FxName, SceneData } from './scenes';

// Each scene's light motion, drawn a frame at a time onto its own layer over the
// scene: snow, embers, lanterns, the aurora. Things move in whole art pixels, like
// the art. An effect is built once per painted stage from the scene's data and
// then just draws frame `t` (StageScene steps t about 12 times a second).

type Draw = (t: number) => void;
type Factory = (g: Painter, d: SceneData, r: Rng) => Draw;

interface Particle {
  x: number;
  y: number;
  s: number;
  p: number;
  c: string;
}

function parts<Q>(n: number, make: (r: Rng, g: Painter) => Q, tick: (q: Q, t: number, g: Painter) => void, draw: (g: Painter, q: Q, t: number) => void): Factory {
  return (g, _d, r) => {
    const ps = Array.from({ length: n }, () => make(r, g));
    return (t) => {
      for (const q of ps) {
        tick(q, t, g);
        draw(g, q, t);
      }
    };
  };
}

interface DriftOptions {
  n: number;
  /** The band they drift in, frame rows; `null` is the whole canvas. */
  band: [number, number] | null;
  vx?: number;
  vy?: number;
  sway?: number;
  bob?: number;
  c: string[];
  /** Hidden while sin(phase) is below this; unset, always shown. */
  blink?: number;
  w?: number;
}

// Particles drifting inside a band, wrapping at its edges.
function drift(o: DriftOptions): Factory {
  const range = (g: Painter): [number, number] => o.band ?? [g.top - 1, g.H];
  return parts<Particle>(
    o.n,
    (r, g) => {
      const [y0, y1] = range(g);
      return { x: r() * g.W, y: y0 + r() * (y1 - y0), s: 0.6 + r() * 0.8, p: r() * 7, c: o.c[(r() * o.c.length) | 0] };
    },
    (q, t, g) => {
      const [y0, y1] = range(g);
      q.x += (o.vx ?? 0) * q.s + Math.sin(t * 0.07 + q.p) * (o.sway ?? 0);
      q.y += (o.vy ?? 0) * q.s + Math.cos(t * 0.05 + q.p) * (o.bob ?? 0);
      if (q.x > g.W + 2) q.x = -2;
      if (q.x < -2) q.x = g.W + 2;
      if (q.y > y1) q.y = y0;
      if (q.y < y0) q.y = y1;
    },
    (g, q, t) => {
      if (o.blink === undefined || Math.sin(t * 0.12 + q.p * 3) > o.blink) g.R(q.x, q.y, o.w ?? 1, 1, q.c);
    },
  );
}

// Birds or bats: a body and two wingtips that flap, crossing left to right.
function fliers(n: number, y0: number, y1: number, v: number, c: string): Factory {
  return parts(
    n,
    (r, g) => ({ x: r() * g.W, y: 0, b: y0 + r() * (y1 - y0), p: r() * 7 }),
    (q, t, g) => {
      q.x += v + Math.cos(t * 0.09 + q.p) * v;
      q.y = q.b + Math.sin(t * 0.13 + q.p * 2) * (v * 8);
      if (q.x > g.W + 3) {
        q.x = -3;
        q.b = y0 + Math.random() * (y1 - y0);
      }
    },
    (g, q, t) => {
      const up = ((t + q.p * 4) | 0) % 4 < 2;
      g.R(q.x - 1, q.y, 3, 1, c);
      g.P(q.x - 2, up ? q.y - 1 : q.y + 1, c);
      g.P(q.x + 2, up ? q.y - 1 : q.y + 1, c);
    },
  );
}

const lanterns = parts(
  12,
  (r, g) => ({ x: r() * g.W, y: 30 + r() * 40, v: 0.08 + r() * 0.1, p: r() * 7 }),
  (q, t, g) => {
    q.y -= q.v;
    q.x += Math.sin(t * 0.03 + q.p) * 0.12;
    if (q.y < g.top - 2) {
      q.y = 66 + Math.random() * 4;
      q.x = Math.random() * g.W;
    }
  },
  (g, q, t) => {
    g.P(q.x, q.y, Math.sin(t * 0.3 + q.p * 5) > -0.6 ? '#ffe08a' : '#ffc060');
    g.P(q.x + 1, q.y, '#ff9a3a');
    g.P(q.x, q.y + 1, '#e8782a');
    g.P(q.x + 1, q.y + 1, '#b8501a');
  },
);

const rain = parts(
  90,
  (r, g) => ({ x: r() * (g.W + 40), y: g.top + r() * (g.H - g.top), v: 2.5 + r() * 1.5 }),
  (q, _t, g) => {
    q.y += q.v;
    q.x -= q.v * 0.4;
    if (q.y > g.H) {
      q.y = g.top - 3;
      q.x = Math.random() * (g.W + 40);
    }
  },
  (g, q) => {
    g.P(q.x, q.y, '#6a7a92');
    g.P(q.x + 1, q.y - 2, '#47556c');
  },
);

// Every few seconds a bolt over the boss's side, the sky flashing for two frames.
const lightning: Factory = (g, d, r) => {
  let next = 20, k = 9, bolt: [number, number][] = [];
  const horizon = d.horizon ?? 56;
  return (t) => {
    if (t >= next) {
      k = 0;
      next = t + 45 + r() * 90;
      bolt = [];
      let x = (g.rx(118) + r() * 70) | 0;
      const end = 30 + r() * 22;
      for (let y = g.top; y < end; y++) {
        bolt.push([x, y]);
        if (r() < 0.45) x += r() < 0.5 ? -1 : 1;
        if (r() < 0.06) {
          let bx = x, by = y;
          for (let i = 0; i < 6 + r() * 6; i++) {
            by++;
            bx += r() < 0.6 ? 1 : 0;
            bolt.push([bx, by]);
          }
        }
      }
    }
    if (k > 4) return;
    if (k < 2) {
      for (let y = g.top; y < horizon; y++) for (let x = 0; x < g.W; x++) if (dz(x, y) < (k ? 0.12 : 0.28)) g.P(x, y, '#8a98b8');
    }
    if (k !== 2) {
      for (const [x, y] of bolt) {
        g.P(x, y, '#f4f8ff');
        g.P(x + 1, y, '#9ab0e0');
      }
    }
    k++;
  };
};

// Curtains of green light rolling along over the mountains (never in front of them).
const aurora: Factory = (g, d) => (t) => {
  const mask = d.mask;
  if (!mask) return;
  for (let x = 0; x < g.W; x++) {
    const b = Math.round(30 + 7 * Math.sin(x * 0.035 + t * 0.02) + 4 * Math.sin(x * 0.09 - t * 0.03));
    const I = 0.5 + 0.5 * Math.sin(x * 0.05 + t * 0.025) * Math.cos(x * 0.021 - t * 0.015);
    for (let y = Math.max(g.top, b - 20); y <= b && y < mask[x] - 1; y++) {
      const k = (y - (b - 20)) / 20;
      if (dz(x, y) < I * (0.15 + k * 0.55)) g.P(x, y, k > 0.85 ? '#7af8c0' : k > 0.5 ? '#2ec890' : k > 0.25 ? '#1a8a7a' : '#4a3a9a');
    }
  }
};

const fog: Factory = (g) => {
  const n = noise2(171);
  return (t) => {
    for (let y = 60; y < 90; y++) {
      const w = 1 - Math.abs(y - 72) / 14;
      for (let x = 0; x < g.W; x++) if (dz(x, y) < (fbm(n, (x + t * 0.3) * 0.05, y * 0.12, 2) - 0.45) * 2.2 * w) g.P(x, y, '#3e2830');
    }
  };
};

const twinkle: Factory = (g, _d, r) => {
  const s = Array.from({ length: 16 }, () => [(r() * g.W) | 0, (r() * 50) | 0, r() * 7]);
  return (t) => {
    for (const [x, y, p] of s) if (Math.sin(t * 0.07 + p) > 0.85) g.P(x, y, '#d8e6ff');
  };
};

const runes: Factory = (g, d, r) => {
  const pts = d.pts ?? [], ph = pts.map(() => r() * 7);
  return (t) =>
    pts.forEach(([x, y], i) => {
      const s = Math.sin(t * 0.06 + ph[i]);
      g.P(x, y, s > 0.4 ? '#e0c0ff' : s > -0.2 ? '#9a6ad8' : '#5a3e7a');
    });
};

const litWindow: Factory = (g, d) => () => {
  for (const [x, y] of d.pts ?? []) g.P(x, y, Math.random() < 0.8 ? '#ffd27a' : '#e89a48');
};

const torches: Factory = (g, d) => () => {
  for (const [x, y] of d.pts ?? []) {
    const h = 2 + ((Math.random() * 2.5) | 0);
    g.P(x - 1, y, '#c8401a');
    g.P(x + 1, y, '#c8401a');
    g.P(x, y, '#ff7a1a');
    g.P(x, y - 1, '#ffb43c');
    if (h > 2) g.P(x + (Math.random() < 0.5 ? -1 : 0), y - 2, '#ffe08a');
    if (h > 3) g.P(x, y - 3, '#ffb43c');
  }
};

const glints: Factory = (g, d, r) => {
  const pts = d.pts ?? [], ph = pts.map(() => r() * 40);
  return (t) =>
    pts.forEach(([x, y], i) => {
      const s = Math.sin(t * 0.05 + ph[i]);
      if (s < 0.9) return;
      g.P(x, y, '#ffffff');
      if (s > 0.96) {
        g.P(x - 1, y, '#bff8ff');
        g.P(x + 1, y, '#bff8ff');
        g.P(x, y - 1, '#bff8ff');
        g.P(x, y + 1, '#bff8ff');
      }
    });
};

const FX: Record<FxName, Factory> = {
  fireflies: drift({ n: 9, band: [58, 102], sway: 0.35, bob: 0.25, c: ['#eef3b0', '#cfe0a0'], blink: 0.1 }),
  leaves: drift({ n: 14, band: null, vx: 0.35, vy: 0.4, sway: 0.4, c: ['#d8743a', '#b84a2a', '#e8a04a'] }),
  snow: drift({ n: 80, band: null, vy: 0.6, sway: 0.3, c: ['#ffffff'] }),
  dust: drift({ n: 18, band: [58, 104], vx: 0.55, bob: 0.1, c: ['#f6dcae'] }),
  embers: drift({ n: 26, band: null, vy: -0.55, sway: 0.35, c: ['#ffcf5a', '#ff7a2a'] }),
  motes: drift({ n: 16, band: null, vy: -0.22, sway: 0.2, c: ['#a888dc'], blink: -0.3 }),
  seeds: drift({ n: 14, band: [40, 104], vx: 0.4, vy: -0.08, bob: 0.15, c: ['#f6f4dc', '#ffffff'] }),
  glyphs: drift({ n: 10, band: [20, 100], vy: -0.2, sway: 0.2, c: ['#c8a0ff', '#9a78e0'], blink: -0.2 }),
  haze: drift({ n: 10, band: [50, 100], vx: 0.2, vy: -0.05, c: ['#e8e4cc'], blink: 0 }),
  cyan: drift({ n: 14, band: [10, 100], vx: 0.05, vy: -0.12, sway: 0.2, c: ['#7ae6f0', '#3ab0c8'], blink: -0.4 }),
  golddust: drift({ n: 24, band: [20, 104], vx: -0.18, vy: 0.2, sway: 0.15, c: ['#f8dc8a', '#fff0c0'], blink: -0.2 }),
  sparkles: drift({ n: 18, band: null, vy: -0.3, sway: 0.25, c: ['#fff4c0', '#f8d070'], blink: 0.2 }),
  feathers: drift({ n: 6, band: null, vx: 0.1, vy: 0.25, sway: 0.6, c: ['#ffffff'], w: 2 }),
  birds: fliers(4, 8, 34, 0.25, '#3a4250'),
  bats: fliers(5, 10, 50, 0.45, '#040203'),
  lanterns,
  rain,
  lightning,
  aurora,
  fog,
  twinkle,
  runes,
  window: litWindow,
  torches,
  glints,
};

/** The scene's motion as one draw call per frame, each effect seeded apart. */
export function sceneMotion(names: FxName[], g: Painter, d: SceneData, seed: number): Draw {
  const draws = names.map((name, i) => FX[name](g, d, rng(seed + i * 101)));
  return (t) => {
    for (const draw of draws) draw(t);
  };
}
