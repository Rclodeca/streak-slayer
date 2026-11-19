// One sim job in its own process: applies the variant's tuning overrides,
// then loads the engine and plays every seed, and prints the results as JSON.
// Overrides go in before the engine loads, since some constants are copied
// when their modules load (the Talents unlock level, Special and Ult levels).

export interface Override {
  path: string;
  value: unknown;
}

export interface Job {
  overrides: Override[];
  runs: import('./runner').RunOptions[];
}

type Root = Record<string, unknown>;

/** Sets `path` (ROOT.key.key or a bare key looked up in each root in turn) to `value`. Throws on a path that isn't there. */
function applyOverride(roots: Record<string, Root>, { path, value }: Override): void {
  const parts = path.split('.');
  let root = roots[parts[0]];
  if (root) parts.shift();
  else root = Object.values(roots).find((r) => parts[0] in r) as Root;
  if (!root) throw new Error(`Unknown tuning key: ${path}`);
  let target: Root = root;
  for (const key of parts.slice(0, -1)) {
    if (!(key in target)) throw new Error(`Unknown tuning key: ${path}`);
    target = target[key] as Root;
  }
  const last = parts[parts.length - 1];
  if (!(last in target)) throw new Error(`Unknown tuning key: ${path}`);
  target[last] = value;
}

async function main() {
  const job: Job = JSON.parse(process.argv[process.argv.length - 1]);
  // Load order matters: each root is patched before anything that copies from it loads.
  const { UNLOCK_LEVELS } = await import('../../src/game-engine/constants/unlocks');
  const early = job.overrides.filter((o) => o.path.startsWith('UNLOCK_LEVELS.') || (!o.path.includes('.') && o.path in UNLOCK_LEVELS));
  for (const o of early) applyOverride({ UNLOCK_LEVELS: UNLOCK_LEVELS as unknown as Root }, o);
  const { TUNING } = await import('../../src/game-engine/constants/tuning');
  const { DEATH_SETBACK } = await import('../../src/game-engine/constants/economy');
  const roots = { TUNING: TUNING as unknown as Root, DEATH_SETBACK: DEATH_SETBACK as unknown as Root };
  const late = job.overrides.filter((o) => o.path.startsWith('PRESTIGE_RANKS.'));
  for (const o of job.overrides.filter((o) => !early.includes(o) && !late.includes(o))) applyOverride(roots, o);
  // The prestige bars load with the rest of the engine, so they go in last.
  const { PRESTIGE_RANKS } = await import('../../src/game-engine/prestige');
  for (const o of late) applyOverride({ PRESTIGE_RANKS: PRESTIGE_RANKS as unknown as Root }, o);

  const { runOnce } = await import('./runner');
  const results = job.runs.map((run) => runOnce(run));
  process.stdout.write(JSON.stringify(results));
}

main().catch((error) => {
  process.stderr.write(String(error?.stack ?? error));
  process.exit(1);
});
