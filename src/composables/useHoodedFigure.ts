// The hooded figure: a stranger who speaks to the hero at two moments — the
// first hero's opening and each new hero's return. His lines live here
// (docs/mockups/pixel-hooded-flow.html, "Mocking"); HoodedSpeech shows them
// (one line box).
//
// The opening is fixed and in order. Return lines are drawn at random, never
// the same one twice in a row. The scene to show after the new-hero screen is
// module-scoped state, same singleton reasoning as useDeathScreen: the code
// that begins a run (useCombatActions) and the component that plays it
// (HoodedScene, mounted once in AppShell) must see the same scene.

import { ref } from 'vue';

export const INTRO_LINES = ['Habits, is it?', 'How sweet.', 'Let’s see how long they hold.'];
const BACK_LINES = ['Back so soon.', 'Again? Good.', 'You again.'];

export interface FigureScene {
  kind: 'intro' | 'back';
  lines: string[];
}

// The last line drawn from each pool, so none comes twice running.
const lastDrawn: Record<string, string> = {};

function draw(key: string, pool: string[], rng: () => number): string {
  const fresh = pool.filter((line) => line !== lastDrawn[key]);
  const options = fresh.length > 0 ? fresh : pool;
  const line = options[Math.min(options.length - 1, Math.floor(rng() * options.length))];
  lastDrawn[key] = line;
  return line;
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
