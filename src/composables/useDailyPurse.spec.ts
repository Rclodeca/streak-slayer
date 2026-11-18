// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHabit, createRng, dailyPeriodKey, purseGold } from '../game-engine';
import { useAccountStore } from '../store/accountStore';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';
import { useHabitStore } from '../store/habitStore';
import { useShopSeenStore } from '../store/shopSeenStore';
import { useTabStore } from '../store/tabStore';
import { useDailyPurse } from './useDailyPurse';
import { useDeathScreen } from './useDeathScreen';
import { useMissedSkillsGate } from './useMissedSkillsGate';
import { useModalPriority } from './useModalPriority';

describe('useDailyPurse', () => {
  const NOW = new Date('2026-11-17T12:00:00');
  const TODAY = dailyPeriodKey(NOW);

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    // An established player: a first-time one (no habits) gets no purse popup.
    useHabitStore().setHabits([createHabit('Read', 'daily', 'medium', false, createRng(2))]);
  });

  // The purse and the recap are module-scoped, so clear them between tests.
  afterEach(() => {
    useDailyPurse().claim();
    useMissedSkillsGate().acknowledge();
    useDeathScreen().dismiss();
    vi.useRealTimers();
  });

  it('pays half a boss kill of gold into the run, once a day', () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, gold: 10 });
    const purse = useDailyPurse();
    purse.notice(TODAY);
    expect(purse.due.value).toBe(true);
    purse.claim();
    expect(purse.due.value).toBe(false);
    expect(characterStore.character.gold).toBe(10 + purseGold(useBossStore().boss.index));
    expect(useAccountStore().account.purseDayKey).toBe(TODAY);

    purse.notice(TODAY);
    expect(purse.due.value).toBe(false);
  });

  it('skips the popup for a first-time player, marking the day without paying', () => {
    useHabitStore().setHabits([]);
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, gold: 10 });
    const purse = useDailyPurse();
    purse.notice(TODAY);
    expect(purse.due.value).toBe(false);
    expect(characterStore.character.gold).toBe(10);
    expect(useAccountStore().account.purseDayKey).toBe(TODAY);
  });

  it('shows before the Daily update, which waits for the claim', () => {
    useMissedSkillsGate().queueMiss(createHabit('Meditate', 'daily', 'medium', false, createRng(1)), TODAY);
    useDailyPurse().notice(TODAY);
    const { purseVisible, habitMissVisible } = useModalPriority();
    expect(purseVisible.value).toBe(true);
    expect(habitMissVisible.value).toBe(false);
    useDailyPurse().claim();
    expect(purseVisible.value).toBe(false);
    expect(habitMissVisible.value).toBe(true);
  });

  it('waits out a death, so the new run gets the gold', () => {
    useDailyPurse().notice(TODAY);
    useDeathScreen().triggerDeath();
    expect(useModalPriority().purseVisible.value).toBe(false);
    useDeathScreen().dismiss();
    expect(useModalPriority().purseVisible.value).toBe(true);
  });

  it('brings the news of a service whose turn began today, and opens it', () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, servicesUnlocked: true, serviceTurn: { id: 'overdrive', startDayKey: TODAY } });
    const purse = useDailyPurse();
    expect(purse.newService.value?.id).toBe('overdrive');

    purse.notice(TODAY);
    purse.claimAndVisitServices();
    expect(purse.due.value).toBe(false);
    expect(useTabStore().tab).toBe('shop');
    expect(useTabStore().shopSide).toBe('services');
  });

  it('has no news while Services is still sealed', () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, serviceTurn: { id: 'overdrive', startDayKey: TODAY } });
    expect(useDailyPurse().newService.value).toBeNull();
  });

  it('has no news once the service was seen, on a later day of its turn, or before the run had a turn', () => {
    const characterStore = useCharacterStore();
    const purse = useDailyPurse();
    expect(purse.newService.value).toBeNull();

    characterStore.setCharacter({ ...characterStore.character, serviceTurn: { id: 'overdrive', startDayKey: '2026-11-16' } });
    expect(purse.newService.value).toBeNull();

    characterStore.setCharacter({ ...characterStore.character, serviceTurn: { id: 'overdrive', startDayKey: TODAY } });
    useShopSeenStore().seeServices(TODAY);
    expect(purse.newService.value).toBeNull();
  });

  it("claim clears the week's gems", () => {
    const purse = useDailyPurse();
    purse.noticeWeek(2);
    expect(purse.weekGems.value).toBe(2);
    purse.claim();
    expect(purse.weekGems.value).toBe(0);
  });
});
