// The daily purse (docs/mockups/daily-login.html, option A): a little gold on
// the first open of each day, in its own popup before the Daily update.
// Module-scoped like useMissedSkillsGate: the rollover that notices the new day
// (useDailyRollover) and the popup (DailyPursePopup, mounted once in AppShell)
// must see the same state.
//
// Noticing and paying are split the same way as the recap: the rollover only
// notes the day; `claim()` pays the gold and marks the account. A purse shown
// but never claimed (the app closed first) is noticed again next launch.
// A perfect week's gems (already paid by the rollover) ride along as a line.

import { computed, ref } from 'vue';
import { characterGold, purseDue, purseGold, SERVICE_DEFS, serviceTurn } from '../game-engine';
import { useAccountStore } from '../store/accountStore';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';
import { useHabitStore } from '../store/habitStore';
import { useTabStore } from '../store/tabStore';
import { useShopNews } from './useShopNews';

const dayKey = ref<string | null>(null);
const weekGemsPaid = ref(0);

export function useDailyPurse() {
  const accountStore = useAccountStore();
  const bossStore = useBossStore();
  const characterStore = useCharacterStore();
  const habitStore = useHabitStore();
  const tabStore = useTabStore();
  const shopNews = useShopNews();

  const due = computed(() => dayKey.value !== null);
  const gold = computed(() => purseGold(bossStore.boss.index));
  const weekGems = computed(() => weekGemsPaid.value);

  /**
   * The service whose turn began today, while the player hasn't seen it in the
   * Shop: the purse brings the news. Only once this run has had a turn, so a
   * run that never opened Services isn't told "new" every day.
   */
  const newService = computed(() => {
    const character = characterStore.character;
    const todayKey = shopNews.todayKey.value;
    if (!character.serviceTurn || !shopNews.isNew('services')) return null;
    const turn = serviceTurn(character, habitStore.habits, todayKey);
    if (turn.startDayKey !== todayKey) return null;
    return SERVICE_DEFS.find((def) => def.id === turn.id) ?? null;
  });

  /**
   * The rollover saw `todayKey`: the purse shows if it's still to claim. A
   * first-time player (no purse yet, no habits) gets no popup over the
   * tutorial: the day is marked, nothing is paid.
   */
  function notice(todayKey: string): void {
    if (!purseDue(accountStore.account, todayKey)) return;
    if (accountStore.account.purseDayKey === undefined && habitStore.habits.length === 0) {
      accountStore.claimPurse(todayKey);
      return;
    }
    dayKey.value = todayKey;
  }

  /** The rollover paid a perfect week's `gems`: the purse shows them. */
  function noticeWeek(gems: number): void {
    weekGemsPaid.value = gems;
  }

  /** Pays the purse into this run and marks the day on the account. */
  function claim(): void {
    const day = dayKey.value;
    dayKey.value = null;
    weekGemsPaid.value = 0;
    if (day === null || !accountStore.claimPurse(day)) return;
    const character = characterStore.character;
    characterStore.setCharacter({ ...character, gold: characterGold(character) + gold.value });
  }

  /** Claims the purse and opens the Shop on Services, where the new service is. */
  function claimAndVisitServices(): void {
    claim();
    tabStore.select('shop');
    tabStore.selectShopSide('services');
  }

  return { due, gold, weekGems, newService, notice, noticeWeek, claim, claimAndVisitServices };
}
