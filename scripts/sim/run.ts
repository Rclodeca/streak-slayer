// The run sim's front end: plays ballpark runs on the real engine and prints
// one report. See docs/superpowers/specs/2026-11-18-run-sim-design.md.
//
//   npm run sim                                   today's tuning
//   npm run sim -- --set BOSS_KILL_LEVEL_SHARE=0.72 --set UNLOCK_LEVELS.shop=7
//                                                 today vs the change, side by side
//
// Options (defaults in brackets):
//   --players good,decent,sloppy,bad   --habits 5,10   --bad-habits 2
//   --tasks 3 (done per week)          --days 180      --seeds 30
//   --classes warrior,cleric,ranger    --talent-share 0.6 (of gold earned)
//   --slots 8,20 (boss numbers that buy a slot)       --json <file>
//   --set KEY=VALUE (repeatable; a TUNING key, or UNLOCK_LEVELS.x, DEATH_SETBACK.x, PRESTIGE_RANKS.0.bar)
//   --only (run just the --set variant, without today's tuning beside it)
//   --exp-rush (hypothetical: EXP items first, Double EXP always running)
//   --prestige (prestige at every open rank through V; prints each run's length instead of the usual table; use --days 700)
//   --calibrate (prints the median level at each boss spawn and the median day each level is reached, as JSON, for retuning the level-keyed tables)
//   --no-rpg (wears each drop over a random slot, buys nothing: no shop, talents, potions or slots)
// Each variant plays in its own processes, so its overrides load before the engine.

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import type { RunOptions, RunResult } from './runner';
import type { Job, Override } from './worker';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SNAPSHOT_DAYS = [7, 14, 30, 60];
const UNLOCK_COLUMNS = ['special', 'talents', 'shop', 'ult', 'services', 'looks'] as const;

function parseArgs(argv: string[]) {
  const opts = {
    players: ['good', 'decent', 'sloppy', 'bad'],
    habits: [5, 10],
    badHabits: 2,
    tasks: 3,
    days: 180,
    seeds: 30,
    classes: ['warrior', 'cleric', 'ranger'],
    talentShare: 0.6,
    slots: [8, 20],
    json: undefined as string | undefined,
    set: [] as Override[],
    only: false,
    expRush: false,
    noRpg: false,
    calibrate: false,
    prestige: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    const list = () => next().split(',').map((s) => s.trim());
    switch (arg) {
      case '--players': opts.players = list(); break;
      case '--habits': opts.habits = list().map(Number); break;
      case '--bad-habits': opts.badHabits = Number(next()); break;
      case '--tasks': opts.tasks = Number(next()); break;
      case '--days': opts.days = Number(next()); break;
      case '--seeds': opts.seeds = Number(next()); break;
      case '--classes': opts.classes = list(); break;
      case '--talent-share': opts.talentShare = Number(next()); break;
      case '--slots': opts.slots = list().map(Number); break;
      case '--json': opts.json = next(); break;
      case '--only': opts.only = true; break;
      case '--exp-rush': opts.expRush = true; break;
      case '--calibrate': opts.calibrate = true; break;
      case '--prestige': opts.prestige = true; break;
      case '--no-rpg': opts.noRpg = true; opts.talentShare = 0; opts.slots = []; break;
      case '--set': {
        const [path, raw] = next().split('=');
        let value: unknown = raw;
        try { value = JSON.parse(raw); } catch { /* a plain string */ }
        opts.set.push({ path, value });
        break;
      }
      case '--': break;
      default: throw new Error(`Unknown option: ${arg}`);
    }
  }
  return opts;
}

type Opts = ReturnType<typeof parseArgs>;

function runsFor(opts: Opts, player: string, habits: number): RunOptions[] {
  return Array.from({ length: opts.seeds }, (_, s) => ({
    player: player as RunOptions['player'],
    habits,
    badHabits: opts.badHabits,
    tasksPerWeek: opts.tasks,
    days: opts.days,
    heroClass: opts.classes[s % opts.classes.length] as RunOptions['heroClass'],
    seed: 5000 + s,
    talentShare: opts.talentShare,
    slotBosses: opts.slots,
    snapshotDays: SNAPSHOT_DAYS.filter((d) => d <= opts.days),
    expRush: opts.expRush,
    noRpg: opts.noRpg,
    prestige: opts.prestige,
  }));
}

function runJob(job: Job): Promise<RunResult[]> {
  return new Promise((resolve, reject) => {
    const bin = `${HERE}../../node_modules/.bin/vite-node`;
    const child = spawn(bin, ['--config', `${HERE}vite.config.ts`, `${HERE}worker.ts`, '--', JSON.stringify(job)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => (out += chunk));
    child.stderr.on('data', (chunk) => (err += chunk));
    child.on('close', (code) => (code === 0 ? resolve(JSON.parse(out)) : reject(new Error(err || `worker exited ${code}`))));
  });
}

async function pool<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  });
  await Promise.all(lanes);
  return results;
}

const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

/** The day half the runs got there by, or undefined when fewer than half did. */
function medianDay(days: (number | undefined)[]): number | undefined {
  const got = days.filter((d): d is number => d !== undefined);
  return got.length * 2 >= days.length ? median(got) : undefined;
}

function summarize(results: RunResult[], days: number) {
  const deathWindow = Math.min(100, days);
  const reached = results.filter((r) => r.prestigeDay !== undefined);
  const gear30 = results.map((r) => r.gearOn[30]).filter(Boolean);
  return {
    unlocks: Object.fromEntries(UNLOCK_COLUMNS.map((id) => [id, medianDay(results.map((r) => r.unlockDay[id]))])),
    prestigeDay: medianDay(results.map((r) => r.prestigeDay)),
    prestigeReached: reached.length / results.length,
    deaths: mean(results.map((r) => r.deathDays.filter((d) => d <= deathWindow).length)),
    deathWindow,
    killsByPrestige: reached.length ? median(reached.map((r) => r.killsByPrestige!)) : undefined,
    talentsByPrestige: reached.length ? median(reached.map((r) => r.talentsByPrestige!)) : undefined,
    levelOn: Object.fromEntries(SNAPSHOT_DAYS.filter((d) => d <= days).map((d) => [d, median(results.map((r) => r.levelOn[d]))])),
    gear30: gear30.length
      ? Object.fromEntries((['common', 'uncommon', 'rare', 'epic'] as const).map((k) => [k, mean(gear30.map((g) => g[k]))]))
      : undefined,
    potions: mean(results.map((r) => r.potions)),
  };
}

type Summary = ReturnType<typeof summarize>;

const fmt = (x: number | undefined, digits = 0) => (x === undefined || Number.isNaN(x) ? '—' : x.toFixed(digits));
const pair = (a: string, b: string | undefined) => (b === undefined || a === b ? a : `${a}→${b}`);

function gearText(g: Summary['gear30']): string {
  if (!g) return '—';
  return (['common', 'uncommon', 'rare', 'epic'] as const)
    .filter((k) => g[k] >= 0.5)
    .map((k) => `${Math.round(g[k])}${k[0].toUpperCase()}`)
    .join(' ');
}

function cells(s: Summary): string[] {
  return [
    ...UNLOCK_COLUMNS.map((id) => fmt(s.unlocks[id])),
    s.prestigeDay !== undefined ? fmt(s.prestigeDay) : `— (${Math.round(s.prestigeReached * 100)}%)`,
    fmt(s.deaths, 1),
    fmt(s.killsByPrestige),
    fmt(s.talentsByPrestige),
    ...Object.values(s.levelOn).map((l) => fmt(l)),
    gearText(s.gear30),
  ];
}

function printTable(title: string, rows: { player: string; base: Summary; changed?: Summary }[], days: number) {
  const window = Math.min(100, days);
  const head = [
    'Player', 'Special', 'Talents', 'Shop', 'Ult', 'Services', 'Looks', 'Prestige', `Deaths/${window}d`, 'Kills@P', 'Talents@P',
    ...SNAPSHOT_DAYS.filter((d) => d <= days).map((d) => `Lv d${d}`), 'Gear d30',
  ];
  const body = rows.map(({ player, base, changed }) => {
    const a = cells(base);
    const b = changed ? cells(changed) : [];
    return [player, ...a.map((cell, i) => pair(cell, b[i]))];
  });
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((r) => r[i].length)));
  const line = (r: string[]) => r.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join('  ');
  console.log(`\n${title}`);
  console.log(line(head));
  for (const r of body) console.log(line(r));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const variants = opts.set.length ? (opts.only ? [opts.set] : [[], opts.set]) : [[]];
  const keys: { variant: number; player: string; habits: number }[] = [];
  const tasks: (() => Promise<RunResult[]>)[] = [];
  variants.forEach((overrides, variant) => {
    for (const habits of opts.habits) {
      for (const player of opts.players) {
        keys.push({ variant, player, habits });
        tasks.push(() => runJob({ overrides, runs: runsFor(opts, player, habits) }));
      }
    }
  });
  const started = Date.now();
  const results = await pool(tasks, Math.max(1, cpus().length - 1));
  if (opts.prestige) {
    const two = variants.length === 2;
    for (const habits of opts.habits) {
      console.log(`\n== ${habits} habits: days each run took (median), then the day rank V was reached`);
      const head = ['Player', 'Run 1', 'Run 2', 'Run 3', 'Run 4', 'Run 5', 'Rank V on day', 'Talents at V', 'Reached V'];
      const rows = opts.players.map((player) => {
        const cellsFor = (variant: number) => {
          const rs = results[keys.findIndex((k) => k.variant === variant && k.player === player && k.habits === habits)];
          const runLen = (i: number) => medianDay(rs.map((r) => (r.prestigeDays[i] === undefined ? undefined : r.prestigeDays[i] - (i ? r.prestigeDays[i - 1] : 0))));
          return [
            ...[0, 1, 2, 3, 4].map((i) => fmt(runLen(i))),
            fmt(medianDay(rs.map((r) => r.prestigeDays[4]))),
            fmt(medianDay(rs.map((r) => (r.prestigeDays[4] === undefined ? undefined : r.runTalents[4])))),
            `${rs.filter((r) => r.prestigeDays.length >= 5).length}/${rs.length}`,
          ];
        };
        const a = cellsFor(0);
        const b = two ? cellsFor(1) : [];
        return [player, ...a.map((c, i) => pair(c, b[i]))];
      });
      const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
      const line = (r: string[]) => r.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join('  ');
      console.log(line(head));
      for (const r of rows) console.log(line(r));
    }
    console.log(`\n(${((Date.now() - started) / 1000).toFixed(1)}s)`);
    return;
  }
  if (opts.calibrate) {
    // Pooled over every player and habit count asked for, per variant.
    for (let v = 0; v < variants.length; v++) {
      const all = results.filter((_, i) => keys[i].variant === v).flat();
      const atBoss = Object.fromEntries([1, 5, 10, 15, 20, 25, 30, 40, 50, 60].map((b) => [b, median(all.map((r) => r.levelAtBoss[b]).filter((x) => x !== undefined))]));
      const dayOfLevel = Object.fromEntries(Array.from({ length: 60 }, (_, i) => i + 1).map((l) => [l, medianDay(all.map((r) => r.levelDay[l]))]));
      console.log(JSON.stringify({ variant: v, atBoss, dayOfLevel }));
    }
    return;
  }
  const summaries = keys.map((k, i) => ({ ...k, summary: summarize(results[i], opts.days) }));

  const changes = opts.set.map((o) => `${o.path}=${JSON.stringify(o.value)}`).join(', ');
  console.log(`Run sim${opts.expRush ? ' (EXP rush)' : ''}${opts.noRpg ? ' (no-RPG player)' : ''}: ${opts.seeds} seeds, ${opts.days} days, ${opts.tasks} tasks/week, ${opts.badHabits} bad habits, classes ${opts.classes.join('/')}`);
  if (opts.set.length) console.log(opts.only ? `Tuning: ${changes}` : `Cells read today→changed. Changed: ${changes}`);
  console.log('Unlock and prestige columns: median day first reached (— when under half the runs got there). Gear: worn items by rarity, on average.');
  const two = variants.length === 2;
  for (const habits of opts.habits) {
    const rows = opts.players.map((player) => {
      const pick = (variant: number) => summaries.find((s) => s.variant === variant && s.player === player && s.habits === habits)!.summary;
      return { player, base: pick(0), changed: two ? pick(1) : undefined };
    });
    printTable(`== ${habits} habits`, rows, opts.days);
  }
  console.log(`\n(${((Date.now() - started) / 1000).toFixed(1)}s)`);
  if (opts.json) {
    writeFileSync(opts.json, JSON.stringify({ options: opts, summaries }, null, 2));
    console.log(`Saved ${opts.json}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
