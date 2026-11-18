// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { SKIN_CATALOG, createCharacter, createRng } from '../game-engine';
import { useAccountStore } from '../store/accountStore';
import { useActivityLogStore } from '../store/activityLogStore';
import { useCharacterStore } from '../store/characterStore';
import { useDebugBackdropStore } from '../store/debugBackdropStore';
import { useSkins } from './useSkins';

describe('useSkins', () => {
  beforeEach(() => setActivePinia(createPinia()));

  const mageSkin = SKIN_CATALOG.find((skin) => skin.heroClass === 'cleric')!;
  const arenaSkin = SKIN_CATALOG.find((skin) => skin.kind === 'arena')!;
  const homeSkin = SKIN_CATALOG.find((skin) => skin.kind === 'home')!;

  it('draws the defaults with nothing worn', () => {
    useCharacterStore().setCharacter(createCharacter(createRng(1), 'ranger'));
    const skins = useSkins();
    expect(skins.heroArt.value).toBe('player/ranger');
    expect(skins.homeArt.value).toBe('home/armory');
    expect(skins.arenaArt.value).toBe('stage/arena6b');
  });

  it('buys a skin with gems, wears it and logs it', () => {
    useCharacterStore().setCharacter(createCharacter(createRng(1), 'cleric'));
    useAccountStore().addGems(mageSkin.gems + 10);
    const skins = useSkins();
    expect(skins.buy(mageSkin.id)).toBe(true);
    expect(useAccountStore().account.gems).toBe(10);
    expect(skins.heroArt.value).toBe(mageSkin.art);
    expect(useActivityLogStore().entries[0]).toMatchObject({ kind: 'vault-bought', name: mageSkin.name, gems: mageSkin.gems });
  });

  it('buys nothing and logs nothing when short', () => {
    const skins = useSkins();
    expect(skins.buy(mageSkin.id)).toBe(false);
    expect(useActivityLogStore().entries).toHaveLength(0);
  });

  it("follows the run's class: a new class shows that class's worn skin", () => {
    useAccountStore().addGems(mageSkin.gems + 10);
    const characterStore = useCharacterStore();
    characterStore.setCharacter(createCharacter(createRng(1), 'cleric'));
    const skins = useSkins();
    skins.buy(mageSkin.id);
    characterStore.setCharacter(createCharacter(createRng(2), 'warrior'));
    expect(skins.heroArt.value).toBe('player/warrior');
    expect(skins.heroArtFor('cleric')).toBe(mageSkin.art);
  });

  it('lets the testing backdrop toggles override the worn arena and home base', () => {
    useAccountStore().addGems(100);
    const skins = useSkins();
    skins.buy(arenaSkin.id);
    skins.buy(homeSkin.id);
    expect(skins.arenaArt.value).toBe(arenaSkin.art);
    const debug = useDebugBackdropStore();
    debug.stage = 'arena9';
    debug.home = 'armory';
    expect(skins.arenaArt.value).toBe('stage/arena9');
    expect(skins.homeArt.value).toBe('home/armory');
    debug.stage = null;
    expect(skins.arenaArt.value).toBe(arenaSkin.art);
  });
});
