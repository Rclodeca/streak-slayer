// The hooded figure: a stranger who speaks to the hero at three moments — the
// first hero's opening, the moment of death, and each new hero's return. His
// lines live here (docs/mockups/pixel-hooded-flow.html, "Mocking"); the scenes
// that show them are HoodedSpeech (one line box) and DeathScreen.
//
// The opening is fixed and in order. Death and return lines are drawn at
// random, never the same one twice in a row, and the death lines quote the
// run's real numbers. The scene to show after the new-hero screen is
// module-scoped state, same singleton reasoning as useDeathScreen: the code
// that begins a run (useCombatActions) and the component that plays it
// (HoodedScene, mounted once in AppShell) must see the same scene.

import { ref } from 'vue';

export const INTRO_LINES = ['Habits, is it?', 'How sweet.', 'Let’s see how long they hold.'];
const BACK_LINES = ['Back so soon.', 'Again? Good.', 'You again.'];

/** How far the dead run got. */
export interface DeathRun {
  level: number;
  bossIndex: number;
}

export interface FigureScene {
  kind: 'intro' | 'back';
  lines: string[];
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** A count in words, as the figure would say it; past ninety-nine he'd lose interest, so it's digits. */
function words(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99) return String(n);
  if (n < 20) return ONES[n];
  const rest = n % 10;
  return rest === 0 ? TENS[n / 10] : `${TENS[Math.floor(n / 10)]}-${ONES[rest]}`;
}

const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// The last line drawn from each pool, so none comes twice running.
const lastDrawn: Record<string, string> = {};

function draw(key: string, pool: string[], rng: () => number): string {
  const fresh = pool.filter((line) => line !== lastDrawn[key]);
  const options = fresh.length > 0 ? fresh : pool;
  const line = options[Math.min(options.length - 1, Math.floor(rng() * options.length))];
  lastDrawn[key] = line;
  return line;
}

/** What he says over a hero who just fell: one line, from the run's own numbers. */
export function deathLines(run: DeathRun, rng: () => number = Math.random): string[] {
  const pool = [
    `${capitalized(words(run.level))} level${run.level === 1 ? '' : 's'}… and still you fall.`,
    'They always come back.',
  ];
  // "Further than most" is only a taunt once the run got somewhere.
  if (run.bossIndex >= 3) pool.push(`Boss ${words(run.bossIndex)}. Further than most.`);
  return [draw('death', pool, rng)];
}

/** What he says to the next hero, back at the fire. */
export function returnLines(rng: () => number = Math.random): string[] {
  return [draw('back', BACK_LINES, rng)];
}

const scene = ref<FigureScene | null>(null);

export function useHoodedFigure() {
  /** Queues his scene for after the new-hero screen: the opening for a first run, a return line after any death. */
  function startScene(kind: FigureScene['kind'], rng: () => number = Math.random) {
    scene.value = { kind, lines: kind === 'intro' ? INTRO_LINES : returnLines(rng) };
  }

  function endScene() {
    scene.value = null;
  }

  return { scene, startScene, endScene };
}
