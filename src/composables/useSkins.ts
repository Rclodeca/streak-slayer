// Skins run against the stores (rules in game-engine/skins.ts): the sprite each
// hero, the home base and the arena is drawn with, and buying or wearing one
// with the account's gems. The testing backdrop toggles (debugBackdropStore)
// override the worn backdrops while set.

import { computed } from 'vue';
import { heroArt, heroClassFor, sceneArt } from '../game-engine';
import type { HeroClass, SkinSlot } from '../game-engine';
import { useAccountStore } from '../store/accountStore';
import { useActivityLogStore } from '../store/activityLogStore';
import { useCharacterStore } from '../store/characterStore';
import { useDebugBackdropStore } from '../store/debugBackdropStore';

export function useSkins() {
  const accountStore = useAccountStore();
  const characterStore = useCharacterStore();
  const activityLogStore = useActivityLogStore();
  const debugBackdrop = useDebugBackdropStore();

  /** The sprite path (under sprites/, no .png) a `heroClass` hero is drawn with. */
  function heroArtFor(heroClass: HeroClass): string {
    return heroArt(accountStore.account, heroClass);
  }
  const heroClass = computed(() => heroClassFor(characterStore.character));
  const heroArtNow = computed(() => heroArtFor(heroClass.value));

  const homeArt = computed(() => {
    const debug = debugBackdrop.home;
    if (debug === 'armory') return 'home/armory';
    return debug ? `stage/${debug}` : sceneArt(accountStore.account, 'home');
  });
  // The painted scene is the stage's own (StageScene draws it when the toggle picks it).
  const arenaArt = computed(() => {
    const debug = debugBackdrop.stage;
    return debug && debug !== 'painted' ? `stage/${debug}` : sceneArt(accountStore.account, 'arena');
  });

  /** Buys a skin with gems and wears it. False (nothing spent) if it can't be bought. */
  function buy(skinId: string): boolean {
    const skin = accountStore.buySkin(skinId);
    if (!skin) return false;
    activityLogStore.addEntry({ kind: 'vault-bought', name: skin.name, gems: skin.gems });
    return true;
  }

  /** Wears an owned skin in `slot`, or the default with null. */
  function wear(slot: SkinSlot, skinId: string | null): boolean {
    return accountStore.wearSkin(slot, skinId);
  }

  return { heroClass, heroArtFor, heroArt: heroArtNow, homeArt, arenaArt, buy, wear };
}
