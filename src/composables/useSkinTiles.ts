// The looks a skin slot offers, as tiles for the Vault and the wardrobe: the
// slot's default first, then its skins in catalog order, each with its state
// for the account (worn, owned, buyable or too dear).

import { DEFAULT_SCENE_ART, skinOffered, skinState, skinsFor, wornSkin } from '../game-engine';
import type { SkinDef, SkinSlot } from '../game-engine';
import { useAccountStore } from '../store/accountStore';

export interface SkinTile {
  key: string;
  name: string;
  src: string;
  slot: SkinSlot;
  /** Null for the slot's default look. */
  skin: SkinDef | null;
}

// 'sealed' never shows: sealed skins are filtered out (see skinOffered).
export type SkinTileState = 'worn' | 'owned' | 'buy' | 'short' | 'sealed';

const DEFAULTS: Record<'home' | 'arena', { name: string; art: string }> = {
  home: { name: 'Armory', art: DEFAULT_SCENE_ART.home },
  arena: { name: 'Stone Hall', art: DEFAULT_SCENE_ART.arena },
};

const spriteSrc = (art: string) => `${import.meta.env.BASE_URL}sprites/${art}.png`;

export function useSkinTiles() {
  const accountStore = useAccountStore();

  function tilesFor(slot: SkinSlot): SkinTile[] {
    const base = slot === 'home' || slot === 'arena' ? DEFAULTS[slot] : { name: 'Starter', art: `player/${slot}` };
    return [
      { key: `${slot}-default`, name: base.name, src: spriteSrc(base.art), slot, skin: null },
      ...skinsFor(slot).filter((skin) => skinOffered(accountStore.account, skin)).map((skin) => ({ key: skin.id, name: skin.name, src: spriteSrc(skin.art), slot, skin })),
    ];
  }

  /** The default is always owned, and worn while no skin is. */
  function stateOf(tile: SkinTile): SkinTileState {
    if (tile.skin) return skinState(accountStore.account, tile.skin);
    return wornSkin(accountStore.account, tile.slot) ? 'owned' : 'worn';
  }

  return { tilesFor, stateOf };
}
