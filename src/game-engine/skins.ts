// Skins (docs/ideas/2026-11-13-shop-economy.md §3): new looks for the hero, the
// home base (the Hero tab's backdrop) and the fight arena, bought with gems and
// kept for good. A hero skin belongs to one class and shows whenever that class
// is played. Owned and worn skins live on the account, so a death never touches
// them. Pure rules only; composables/useSkins.ts runs them against the stores.

import type { Account } from './account';
import { SKIN_PRICES } from './constants/economy';
import type { HeroClass } from './character';

export type SkinKind = 'hero' | 'home' | 'arena';
/** Where a skin is worn: one slot per hero class, the home base, the arena. */
export type SkinSlot = HeroClass | 'home' | 'arena';

export interface SkinDef {
  id: string;
  kind: SkinKind;
  name: string;
  gems: number;
  /** The sprite's path under sprites/, without .png. */
  art: string;
  heroClass?: HeroClass;
}

const hero = (id: string, name: string, heroClass: HeroClass): SkinDef => ({
  id, kind: 'hero', name, gems: SKIN_PRICES.hero, art: `player/skins/${id}`, heroClass,
});
const scene = (id: string, kind: 'home' | 'arena', name: string, art: string): SkinDef => ({ id, kind, name, gems: SKIN_PRICES[kind], art });

// Placeholders, picked at random from art already made (built by npm run
// hero-art from scripts/hero-art/skins.json); the real catalog comes later.
export const SKIN_CATALOG: readonly SkinDef[] = [
  hero('warrior-crimson', 'Crimson Guard', 'warrior'),
  hero('warrior-steel', 'Steel Vanguard', 'warrior'),
  hero('mage-ember', 'Ember Sage', 'cleric'),
  hero('mage-dusk', 'Dusk Seer', 'cleric'),
  hero('ranger-moss', 'Moss Stalker', 'ranger'),
  hero('ranger-ash', 'Ash Strider', 'ranger'),
  scene('home-barred-hall', 'home', 'Barred Hall', 'stage/arena7b'),
  scene('home-moonlit-hall', 'home', 'Moonlit Hall', 'stage/arena6b'),
  scene('arena-barred-hall', 'arena', 'Barred Hall', 'stage/arena7b'),
  scene('arena-mossy-hall', 'arena', 'Mossy Hall', 'stage/arena3'),
];

/** The art worn when no skin is: the armory and the default arena. */
export const DEFAULT_SCENE_ART = { home: 'home/armory', arena: 'stage/arena6b' } as const;

/** The slot a skin is worn in. */
export function skinSlot(skin: SkinDef): SkinSlot {
  return skin.kind === 'hero' ? skin.heroClass! : skin.kind;
}

/** Every skin worn in `slot`, in catalog order. */
export function skinsFor(slot: SkinSlot): SkinDef[] {
  return SKIN_CATALOG.filter((skin) => skinSlot(skin) === slot);
}

/** The skin worn in `slot`, or null for the default (also when the worn id left the catalog). */
export function wornSkin(account: Account, slot: SkinSlot): SkinDef | null {
  const id = account.wornSkins?.[slot];
  return SKIN_CATALOG.find((skin) => skin.id === id && skinSlot(skin) === slot) ?? null;
}

/** A skin's button: worn now, owned, buyable, or too dear. */
export function skinState(account: Account, skin: SkinDef): 'worn' | 'owned' | 'buy' | 'short' {
  if (wornSkin(account, skinSlot(skin))?.id === skin.id) return 'worn';
  if (account.ownedSkinIds?.includes(skin.id)) return 'owned';
  return account.gems >= skin.gems ? 'buy' : 'short';
}

/** Buys a skin and wears it at once. Null if it isn't in the catalog, is owned already, or costs more gems than the account holds. */
export function buySkin(account: Account, skinId: string): { account: Account; skin: SkinDef } | null {
  const skin = SKIN_CATALOG.find((candidate) => candidate.id === skinId);
  if (!skin || skinState(account, skin) !== 'buy') return null;
  const bought: Account = { ...account, gems: account.gems - skin.gems, ownedSkinIds: [...(account.ownedSkinIds ?? []), skin.id] };
  return { account: wearSkin(bought, skinSlot(skin), skin.id)!, skin };
}

/** Wears an owned skin in its slot, or the default with null. Null if the skin isn't owned or belongs to another slot. */
export function wearSkin(account: Account, slot: SkinSlot, skinId: string | null): Account | null {
  if (skinId !== null) {
    const skin = SKIN_CATALOG.find((candidate) => candidate.id === skinId);
    if (!skin || skinSlot(skin) !== slot || !account.ownedSkinIds?.includes(skinId)) return null;
  }
  const wornSkins = { ...account.wornSkins };
  if (skinId === null) delete wornSkins[slot];
  else wornSkins[slot] = skinId;
  return { ...account, wornSkins };
}

/** The sprite path a `heroClass` hero is drawn with: its worn skin's, else the class's own. */
export function heroArt(account: Account, heroClass: HeroClass): string {
  return wornSkin(account, heroClass)?.art ?? `player/${heroClass}`;
}

/** The home base's or the arena's backdrop path: its worn skin's, else the default. */
export function sceneArt(account: Account, slot: 'home' | 'arena'): string {
  return wornSkin(account, slot)?.art ?? DEFAULT_SCENE_ART[slot];
}
