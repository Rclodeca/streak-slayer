// The account's prestige mark (title, numeral, colour), or null before the first
// prestige, for the Hero tab's name plate (HomeBase) and the stage's name line
// (CharacterPanel).

import { computed } from 'vue';
import { prestigeMark, prestigeRank } from '../game-engine';
import { useAccountStore } from '../store/accountStore';

export function usePrestige() {
  const accountStore = useAccountStore();
  const mark = computed(() => prestigeMark(prestigeRank(accountStore.account)));
  return { mark };
}
