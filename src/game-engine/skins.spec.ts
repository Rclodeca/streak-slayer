import { describe, expect, it } from 'vitest';
import type { Account } from './account';
import { createAccount } from './account';
import { SKIN_PRICES } from './constants/economy';
import { MYTHIC_SKIN_IDS, SKIN_CATALOG, buySkin, heroArt, sceneArt, skinOffered, skinState, skinsFor, wearSkin, wornSkin } from './skins';

const rich = (overrides: Partial<Account> = {}): Account => ({ ...createAccount(), gems: 300, ...overrides });
const warriorSkin = SKIN_CATALOG.find((skin) => skin.heroClass === 'warrior')!;
const mageSkin = SKIN_CATALOG.find((skin) => skin.heroClass === 'cleric')!;
const arenaSkin = SKIN_CATALOG.find((skin) => skin.kind === 'arena')!;
const homeSkin = SKIN_CATALOG.find((skin) => skin.kind === 'home')!;

describe('the skin catalog', () => {
  it('has skins for every class, the home base and the arena, priced by kind', () => {
    for (const slot of ['warrior', 'cleric', 'ranger', 'home', 'arena'] as const) expect(skinsFor(slot).length).toBeGreaterThan(0);
    for (const skin of SKIN_CATALOG) expect(skin.gems).toBe(skin.mythic ? 0 : SKIN_PRICES[skin.kind]);
    expect(new Set(SKIN_CATALOG.map((skin) => skin.id)).size).toBe(SKIN_CATALOG.length);
  });
});

describe('an account with no skin fields (a save from before skins)', () => {
  it('wears the default art everywhere and can buy', () => {
    const account = createAccount();
    expect(heroArt(account, 'warrior')).toBe('player/warrior');
    expect(sceneArt(account, 'home')).toBe('home/armory');
    expect(sceneArt(account, 'arena')).toBe('stage/arena6b');
    expect(wornSkin(account, 'arena')).toBeNull();
    expect(skinState(rich(), warriorSkin)).toBe('buy');
  });
});

describe('buySkin', () => {
  it('spends the gems, owns the skin and wears it', () => {
    const result = buySkin(rich(), warriorSkin.id)!;
    expect(result.skin).toBe(warriorSkin);
    expect(result.account.gems).toBe(300 - warriorSkin.gems);
    expect(result.account.ownedSkinIds).toEqual([warriorSkin.id]);
    expect(heroArt(result.account, 'warrior')).toBe(warriorSkin.art);
    expect(skinState(result.account, warriorSkin)).toBe('worn');
  });

  it('only changes the art of the skin\'s own class', () => {
    const { account } = buySkin(rich(), warriorSkin.id)!;
    expect(heroArt(account, 'cleric')).toBe('player/cleric');
  });

  it('buys nothing with too few gems', () => {
    const poor = rich({ gems: warriorSkin.gems - 1 });
    expect(skinState(poor, warriorSkin)).toBe('short');
    expect(buySkin(poor, warriorSkin.id)).toBeNull();
  });

  it('never charges twice for a skin already owned', () => {
    const { account } = buySkin(rich(), warriorSkin.id)!;
    expect(buySkin(account, warriorSkin.id)).toBeNull();
  });

  it('buys nothing for an id not in the catalog', () => {
    expect(buySkin(rich(), 'no-such-skin')).toBeNull();
  });
});

describe('wearSkin', () => {
  it('switches between owned skins and back to the default', () => {
    let account = buySkin(rich(), arenaSkin.id)!.account;
    account = wearSkin(account, 'arena', null)!;
    expect(sceneArt(account, 'arena')).toBe('stage/arena6b');
    expect(skinState(account, arenaSkin)).toBe('owned');
    account = wearSkin(account, 'arena', arenaSkin.id)!;
    expect(sceneArt(account, 'arena')).toBe(arenaSkin.art);
  });

  it('refuses a skin not owned', () => {
    expect(wearSkin(rich(), 'home', homeSkin.id)).toBeNull();
  });

  it("refuses a skin in another slot's place", () => {
    const { account } = buySkin(rich(), mageSkin.id)!;
    expect(wearSkin(account, 'warrior', mageSkin.id)).toBeNull();
    expect(wearSkin(account, 'arena', mageSkin.id)).toBeNull();
  });
});

describe('a worn skin that left the catalog', () => {
  it('falls back to the default art', () => {
    const account = rich({ ownedSkinIds: ['gone'], wornSkins: { warrior: 'gone', arena: 'gone' } });
    expect(heroArt(account, 'warrior')).toBe('player/warrior');
    expect(sceneArt(account, 'arena')).toBe('stage/arena6b');
    expect(wornSkin(account, 'warrior')).toBeNull();
  });
});

describe('the Mythic skins', () => {
  const mythic = SKIN_CATALOG.find((skin) => skin.id === 'mythic-warrior')!;

  it('one per class, given at prestige V, never sold', () => {
    expect(MYTHIC_SKIN_IDS).toEqual(['mythic-warrior', 'mythic-mage', 'mythic-ranger']);
    expect(MYTHIC_SKIN_IDS.map((id) => SKIN_CATALOG.find((skin) => skin.id === id)?.heroClass)).toEqual(['warrior', 'cleric', 'ranger']);
    expect(skinState(rich(), mythic)).toBe('sealed');
    expect(buySkin(rich(), 'mythic-warrior')).toBeNull();
    expect(skinOffered(rich(), mythic)).toBe(false);
    expect(skinOffered(rich(), warriorSkin)).toBe(true);
  });

  it('once owned, shows and can be worn', () => {
    const owner = rich({ ownedSkinIds: [...MYTHIC_SKIN_IDS] });
    expect(skinState(owner, mythic)).toBe('owned');
    expect(skinOffered(owner, mythic)).toBe(true);
    expect(wearSkin(owner, 'warrior', 'mythic-warrior')?.wornSkins?.warrior).toBe('mythic-warrior');
  });
});
