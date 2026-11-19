// Dev only: one start/end screen of the real app, seeded and mounted alone, for
// screens.html to lay side by side. `?s=<id>` picks the scene. Everything runs on
// an in-memory storage, so no frame touches the real save (or another frame).

import { setActivePinia } from 'pinia';
import { createApp, h, nextTick } from 'vue';
import type { Component } from 'vue';
import { createHabit, createRng, markFallItem, periodKeyFor } from '../game-engine';
import { setStorageBackend } from '../store/storage';

const memory = new Map<string, string>();
setStorageBackend({
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => void memory.set(key, value),
  removeItem: (key) => void memory.delete(key),
});

const SCENES = ['new-hero', 'intro', 'back', 'pick', 'purse', 'board', 'fire', 'fire-short', 'revive', 'prestige-1', 'prestige-3', 'prestige-5', 'sheet'] as const;
type Scene = (typeof SCENES)[number];

async function boot() {
  const requested = new URLSearchParams(location.search).get('s') as Scene | null;
  const scene: Scene = requested && SCENES.includes(requested) ? requested : 'new-hero';

  const [{ pinia, initializeStores }, { applyTheme, useThemeStore }] = await Promise.all([import('../store'), import('../store/themeStore')]);
  await Promise.all([
    import('@fontsource/cinzel/500.css'),
    import('@fontsource/cinzel/600.css'),
    import('@fontsource/alegreya/500.css'),
    import('@fontsource/alegreya/600.css'),
    import('@fontsource/alegreya/700.css'),
    import('@fontsource/alegreya-sans/500.css'),
    import('@fontsource/alegreya-sans/700.css'),
    import('../style.css'),
    import('../assets/scss/main.scss'),
    import('../assets/scss/themes/index.scss'),
  ]);
  const [{ default: App }, { default: PrestigePopup }, { default: HighScorePage }] = await Promise.all([
    import('../App.vue'),
    import('../components/talents/PrestigePopup.vue'),
    import('../components/highscores/HighScorePage.vue'),
  ]);
  const [{ useAccountStore }, { useBossStore }, { useCharacterStore }, { useHabitStore }, { useHighScoreStore }] = await Promise.all([
    import('../store/accountStore'),
    import('../store/bossStore'),
    import('../store/characterStore'),
    import('../store/habitStore'),
    import('../store/highScoreStore'),
  ]);
  const { useDeathScreen } = await import('../composables/useDeathScreen');
  const { useHoodedFigure } = await import('../composables/useHoodedFigure');
  const { useRetiredHero } = await import('../composables/useRetiredHero');
  const { useReviveNotice } = await import('../composables/useReviveNotice');
  const { useDailyPurse } = await import('../composables/useDailyPurse');
  const { dailyPeriodKey } = await import('../game-engine');

  setActivePinia(pinia);
  const themeStore = useThemeStore();
  applyTheme(themeStore.theme);
  initializeStores();

  const characterStore = useCharacterStore();
  const bossStore = useBossStore();
  const habitStore = useHabitStore();
  const accountStore = useAccountStore();

  // ---- seeding -------------------------------------------------------------
  const rng = createRng(7);
  const named = (level = 1) => {
    // A seeded level skips the unlock popups the real climb would have shown already.
    characterStore.setCharacter({ ...characterStore.character, heroPending: false, level, questsUnlocked: level > 1, talentsUnlocked: level > 1 });
    characterStore.setName('Ryan');
  };
  const SKILLS: [string, 'daily' | 'weekly', 'easy' | 'medium' | 'hard', number, number][] = [
    ['Meditate', 'daily', 'medium', 4, 31],
    ['Read a chapter', 'daily', 'easy', 3, 18],
    ['Long run', 'weekly', 'hard', 2, 6],
    ['Stretch', 'daily', 'easy', 1, 0],
  ];
  const withSkills = () =>
    habitStore.setHabits(
      SKILLS.map(([name, period, difficulty, rank, streakCount]) => ({ ...createHabit(name, period, difficulty, false, rng), rank, streakCount, lastCheckedPeriodKey: periodKeyFor(period, new Date()) })),
    );
  const midRun = (level = 14) => {
    named(level);
    bossStore.setBoss({ ...bossStore.boss, index: 6 });
    withSkills();
  };
  // Down with 200 gold and two worn items; the fall marks the axe, as the app does.
  const fallen = () => {
    midRun();
    const worn = ['berserkers-war-axe', 'chainmail-hauberk'];
    const down = { ...characterStore.character, gold: 200, ownedItemIds: worn, equippedItemIds: worn, currentHealth: 0 };
    characterStore.setCharacter(markFallItem(down, () => 0));
  };

  // The first-run hints are seen everywhere but the empty board, so they never cover another screen.
  if (scene !== 'board') {
    const { useHintStore } = await import('../store/hintStore');
    useHintStore().markSeen('checkGood');
    useHintStore().markSeen('checkBad');
  }
  // Today's purse is already claimed everywhere but its own frame, so it never covers another screen.
  if (scene !== 'purse') accountStore.$patch({ account: { ...accountStore.account, purseDayKey: dailyPeriodKey(new Date()) } });

  let root: Component = App;
  let after: (() => void) | undefined;

  switch (scene) {
    case 'new-hero':
      break;
    case 'intro':
      named();
      useHoodedFigure().startScene('intro');
      break;
    case 'back':
      named();
      useHoodedFigure().startScene('back');
      break;
    case 'pick':
      characterStore.setCharacter({ ...characterStore.character, heroPending: true });
      characterStore.setName('Ryan');
      useRetiredHero().recordRetired({ name: 'Ryan', level: 41 });
      accountStore.setPrestige(1);
      break;
    case 'board':
      named();
      habitStore.setHabits([]);
      break;
    case 'purse':
      midRun();
      accountStore.$patch({ account: { ...accountStore.account, purseDayKey: undefined } });
      after = () => useDailyPurse().notice(dailyPeriodKey(new Date()));
      break;
    case 'fire':
    case 'fire-short':
      fallen();
      accountStore.$patch({ account: { ...accountStore.account, gems: scene === 'fire' ? 120 : 10 } });
      useDeathScreen().triggerDeath();
      break;
    case 'revive': {
      midRun();
      const { showReviveNotice } = useReviveNotice();
      after = () => {
        showReviveNotice();
        setInterval(showReviveNotice, 3600);
      };
      break;
    }
    case 'prestige-1':
    case 'prestige-3':
    case 'prestige-5': {
      midRun(60);
      const rank = Number(scene.slice(-1));
      accountStore.setPrestige(rank - 1);
      root = { render: () => [h(App), h(PrestigePopup, { modelValue: true })] };
      break;
    }
    case 'sheet': {
      midRun(41);
      const scores = useHighScoreStore();
      const stats = { physicalDamage: 2400, magicDamage: 1800, healing: 900, health: 5200, trueDamage: 300, critChance: 18 };
      const run = (heroName: string, heroClass: 'warrior' | 'ranger' | 'cleric', level: number, bossIndex: number, prestige?: number, deaths?: number) =>
        scores.recordRunEnd({
          bossIndex,
          level,
          endedDayKey: dailyPeriodKey(new Date()),
          stats,
          habits: SKILLS.map(([name, period, , rank, streakCount]) => ({ name, period, damageType: 'physical' as const, isBad: false, streakCount, rank })),
          items: [],
          heroName,
          heroClass,
          bossPersonality: 'warlord',
          bossArt: 0,
          ...(deaths && { deaths }),
          ...(prestige && { prestige }),
        });
      run('Ryan', 'warrior', 41, 19, 1, 3);
      run('Ryan', 'ranger', 22, 11);
      run('Ryan', 'cleric', 9, 5);
      root = { render: () => h('div', { class: 'app-shell', style: 'padding-top: 12px' }, [h(HighScorePage)]) };
      after = () => document.querySelector<HTMLElement>('.epitaph')?.click();
      break;
    }
  }

  const instance = createApp(root);
  instance.use(pinia);
  instance.mount('#app');
  await nextTick();
  setTimeout(() => after?.(), 400);
}

void boot();
