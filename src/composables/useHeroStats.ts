// The hero's numbers, for the stage's stat line (CharacterPanel) and the
// details (HeroDetails, in a popup or on the phone's Hero tab): the buffed
// stats with their base values, the gear-only stats, the boons and banes
// running today, the gear, and the level and EXP held back while a level-up's
// beat waits (useCelebration).

import { computed } from 'vue';
import {
  activeBlind,
  activeSever,
  activeCritBoost,
  activeHealBoost,
  activeSunder,
  activeWoundsEffect,
  bossSkillEffectText,
  critChanceBeforeBlind,
  dailyPeriodKey,
  damageReductionPct,
  daysBetweenDayKeys,
  doomDaysLeft,
  doomPct,
  effectiveCritChance,
  effectiveStat,
  expToNextLevel,
  formatCompact,
  ITEM_CATALOG,
  itemBonusPercent,
  itemFlatBonus,
  maxEquipSlots,
  statAtLevel,
} from '../game-engine';
import { TUNING } from '../game-engine/constants/tuning';
import type { StatIconName } from '../components/ui/statIcons';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';
import { useDebugClockStore } from '../store/debugClockStore';
import { useCelebration } from './useCelebration';

export interface StatTile {
  icon: StatIconName;
  label: string;
  value: string;
  // What a boss skill has the stat at right now, when it's lowering it: `value` is then the usual, shown crossed out.
  now?: string;
  reason?: string;
  gain?: string;
  note?: string;
}

export function useHeroStats() {
  const characterStore = useCharacterStore();
  const debugClockStore = useDebugClockStore();
  const bossStore = useBossStore();

  const character = computed(() => characterStore.character);
  // Named on NewHeroScreen; only a hero still waiting on that screen is unnamed.
  const heroName = computed(() => character.value.name ?? 'Character');
  const maxHealth = computed(() => effectiveStat(character.value, 'health'));

  // Until a level-up's beat plays (useCelebration — after any kill it came
  // from), the hero holds the old level with a full EXP bar, then ticks over.
  const { heldLevel } = useCelebration();
  const displayLevel = computed(() => heldLevel.value ?? character.value.level);
  const expNeeded = computed(() => expToNextLevel(displayLevel.value));
  const displayExp = computed(() => (heldLevel.value === null ? character.value.exp : expNeeded.value));

  const currentDayKey = computed(() => dailyPeriodKey(debugClockStore.now()));
  const physicalDamage = computed(() => effectiveStat(character.value, 'physicalDamage'));
  const magicDamage = computed(() => effectiveStat(character.value, 'magicDamage'));
  const healing = computed(() => effectiveStat(character.value, 'healing'));
  const trueDamage = computed(() => effectiveStat(character.value, 'trueDamage'));
  const critChance = computed(() => effectiveCritChance(character.value, currentDayKey.value));
  // What Blind is holding down, for the details to show crossed out.
  const usualCritChance = computed(() => critChanceBeforeBlind(character.value, currentDayKey.value));

  // Item-only stats: no base value exists, they come purely from equipped gear.
  // Armor/MR are flat and show their damage reduction against boss attacks;
  // pen is capped at TUNING.ARMOR_MAGIC_PEN_CAP_PCT (see effectiveResistAfterPen).
  const armor = computed(() => itemFlatBonus(character.value, 'armor'));
  const magicResist = computed(() => itemFlatBonus(character.value, 'magicResist'));
  const lifesteal = computed(() => itemBonusPercent(character.value, 'lifesteal'));
  const armorPen = computed(() => Math.min(itemBonusPercent(character.value, 'armorPen'), TUNING.ARMOR_MAGIC_PEN_CAP_PCT));
  const magicPen = computed(() => Math.min(itemBonusPercent(character.value, 'magicPen'), TUNING.ARMOR_MAGIC_PEN_CAP_PCT));

  const woundsEffect = computed(() => activeWoundsEffect(character.value, currentDayKey.value));
  const critBoost = computed(() => activeCritBoost(character.value, currentDayKey.value));
  const critBoostDaysLeft = computed(() =>
    critBoost.value ? critBoost.value.durationDays - daysBetweenDayKeys(critBoost.value.appliedDayKey, currentDayKey.value) : 0,
  );
  const healBoost = computed(() => activeHealBoost(character.value, currentDayKey.value));
  const healBoostDaysLeft = computed(() =>
    healBoost.value ? healBoost.value.durationDays - daysBetweenDayKeys(healBoost.value.appliedDayKey, currentDayKey.value) : 0,
  );
  const woundsDaysLeft = computed(() =>
    woundsEffect.value ? woundsEffect.value.durationDays - daysBetweenDayKeys(woundsEffect.value.appliedDayKey, currentDayKey.value) : 0,
  );
  // Boss skills on the hero: Blind, Sever and Sunder, and the boss's Doom counting down to them.
  const blindEffect = computed(() => activeBlind(character.value, currentDayKey.value));
  const blindDaysLeft = computed(() =>
    blindEffect.value ? blindEffect.value.durationDays - daysBetweenDayKeys(blindEffect.value.appliedDayKey, currentDayKey.value) : 0,
  );
  const severEffect = computed(() => activeSever(character.value, currentDayKey.value));
  const severDaysLeft = computed(() =>
    severEffect.value ? severEffect.value.durationDays - daysBetweenDayKeys(severEffect.value.appliedDayKey, currentDayKey.value) : 0,
  );
  const sunderEffect = computed(() => activeSunder(character.value, currentDayKey.value));
  const sunderDaysLeft = computed(() =>
    sunderEffect.value ? sunderEffect.value.durationDays - daysBetweenDayKeys(sunderEffect.value.appliedDayKey, currentDayKey.value) : 0,
  );
  // What the stage shows: the stats with boss skills' cuts applied (the details show the usual beside them).
  const currentHealing = computed(() => healing.value * (woundsEffect.value?.effectRate ?? 1));
  const currentArmor = computed(() => armor.value * (sunderEffect.value ? TUNING.BOSS_SKILLS.SUNDER_FACTOR : 1));
  const currentMagicResist = computed(() => magicResist.value * (sunderEffect.value ? TUNING.BOSS_SKILLS.SUNDER_FACTOR : 1));
  const doomDays = computed(() => doomDaysLeft(bossStore.boss, currentDayKey.value));

  // Pre-item-bonus values, shown alongside the buffed (post-item) ones in the
  // details so the player can see how much their gear is helping.
  const baseHealth = computed(() => statAtLevel(character.value.starterStats.health, character.value.level, 'health'));
  const basePhysicalDamage = computed(() => statAtLevel(character.value.starterStats.physicalDamage, character.value.level, 'physicalDamage'));
  const baseMagicDamage = computed(() => statAtLevel(character.value.starterStats.magicDamage, character.value.level, 'magicDamage'));
  const baseHealing = computed(() => statAtLevel(character.value.starterStats.healing, character.value.level, 'healing'));
  const baseTrueDamage = computed(() => statAtLevel(character.value.starterStats.trueDamage, character.value.level, 'trueDamage'));
  const baseCritChance = computed(() => character.value.critChance);

  function gain(buffed: number, base: number, scale = 1) {
    return Math.round((buffed - base) * scale);
  }

  // Sized to the character's current slot cap (4, 6 or 8 — see maxEquipSlots),
  // in whatever order they were equipped; the details' Equipment list shows
  // the empty ones after the gear. Slots not yet unlocked aren't shown anywhere.
  const slotCount = computed(() => maxEquipSlots(character.value));
  const equippedSlots = computed(() =>
    Array.from({ length: slotCount.value }, (_, i) => {
      const itemId = character.value.equippedItemIds[i];
      return itemId ? ITEM_CATALOG.find((item) => item.id === itemId) ?? null : null;
    }),
  );
  const equippedItems = computed(() => equippedSlots.value.flatMap((item) => (item ? [item] : [])));
  const emptySlotCount = computed(() => slotCount.value - equippedItems.value.length);

  function tile(icon: StatIconName, label: string, value: number, base?: number): StatTile {
    const gained = base === undefined ? 0 : gain(value, base);
    return { icon, label, value: formatCompact(value), gain: gained > 0 ? `+${formatCompact(gained)}` : undefined };
  }

  const statTiles = computed<StatTile[]>(() => {
    const blinded = !!blindEffect.value;
    const severed = !!severEffect.value;
    const sundered = !!sunderEffect.value;
    const crit = gain(usualCritChance.value, baseCritChance.value, 100);
    const sunderFactor = TUNING.BOSS_SKILLS.SUNDER_FACTOR;
    // Armor and magic resist: the usual value, and Sunder's halved one beside it while it runs.
    const resistTile = (icon: 'armor' | 'magicResist', label: string, usual: number): StatTile => {
      const current = sundered ? usual * sunderFactor : usual;
      return {
        icon,
        label,
        value: formatCompact(usual),
        ...(sundered ? { now: formatCompact(current), reason: 'Sundered' } : { note: `${(damageReductionPct(usual) * 100).toFixed(1)}% less damage` }),
      };
    };
    return [
      tile('health', 'Max health', maxHealth.value, baseHealth.value),
      tile('physical', 'Physical', physicalDamage.value, basePhysicalDamage.value),
      tile('magic', 'Magic', magicDamage.value, baseMagicDamage.value),
      tile('true', 'True', trueDamage.value, baseTrueDamage.value),
      {
        ...tile('healing', 'Healing', healing.value, baseHealing.value),
        ...(woundsEffect.value ? { now: formatCompact(currentHealing.value), reason: 'Wounded', gain: undefined } : {}),
      },
      {
        icon: 'crit' as const,
        label: 'Crit chance',
        value: `${(usualCritChance.value * 100).toFixed(0)}%`,
        ...(blinded ? { now: `${(critChance.value * 100).toFixed(0)}%`, reason: 'Blinded' } : { gain: crit > 0 ? `+${crit}%` : undefined }),
      },
      ...(armor.value > 0 ? [resistTile('armor', 'Armor', armor.value)] : []),
      ...(magicResist.value > 0 ? [resistTile('magicResist', 'Magic resist', magicResist.value)] : []),
      ...(lifesteal.value > 0
        ? [{ icon: 'lifesteal' as const, label: 'Lifesteal', value: `${+lifesteal.value.toFixed(1)}%`, ...(severed ? { now: '0%', reason: 'Severed' } : {}) }]
        : []),
      ...(armorPen.value > 0 ? [{ icon: 'armorPen' as const, label: 'Armor pen', value: `${armorPen.value.toFixed(0)}%` }] : []),
      ...(magicPen.value > 0 ? [{ icon: 'magicPen' as const, label: 'Magic pen', value: `${magicPen.value.toFixed(0)}%` }] : []),
    ];
  });

  // "Blinded · no crits": a boss skill's name with what it does, lowercased to follow it.
  function effectText(name: string, skill: 'blind' | 'sever' | 'sunder' | 'doom', doomShare?: number): string {
    const effect = bossSkillEffectText(skill, doomShare) ?? '';
    return `${name} · ${effect.charAt(0).toLowerCase()}${effect.slice(1)}`;
  }

  const activeEffects = computed(() => {
    const effects: { icon: StatIconName; text: string; days: number; tone: 'boon' | 'bane' }[] = [];
    if (critBoost.value) effects.push({ icon: 'critBoost', text: `+${(critBoost.value.bonus * 100).toFixed(0)}% crit`, days: critBoostDaysLeft.value, tone: 'boon' });
    if (healBoost.value) effects.push({ icon: 'healBoost', text: `+${(healBoost.value.bonus * 100).toFixed(0)}% heal`, days: healBoostDaysLeft.value, tone: 'boon' });
    if (woundsEffect.value) effects.push({ icon: 'wounds', text: `Wounded · ${(woundsEffect.value.effectRate * 100).toFixed(0)}% heal`, days: woundsDaysLeft.value, tone: 'bane' });
    if (blindEffect.value) effects.push({ icon: 'blind', text: effectText('Blinded', 'blind'), days: blindDaysLeft.value, tone: 'bane' });
    if (severEffect.value) effects.push({ icon: 'sever', text: effectText('Severed', 'sever'), days: severDaysLeft.value, tone: 'bane' });
    if (sunderEffect.value) effects.push({ icon: 'sunder', text: effectText('Sundered', 'sunder'), days: sunderDaysLeft.value, tone: 'bane' });
    if (doomDays.value !== undefined) effects.push({ icon: 'doom', text: effectText('Doom', 'doom', doomPct(character.value)), days: doomDays.value, tone: 'bane' });
    return effects;
  });

  return {
    character,
    heroName,
    maxHealth,
    displayLevel,
    expNeeded,
    displayExp,
    physicalDamage,
    magicDamage,
    healing,
    trueDamage,
    critChance,
    currentHealing,
    armor,
    magicResist,
    currentArmor,
    currentMagicResist,
    lifesteal,
    armorPen,
    magicPen,
    critBoost,
    critBoostDaysLeft,
    healBoost,
    healBoostDaysLeft,
    woundsEffect,
    woundsDaysLeft,
    blindEffect,
    blindDaysLeft,
    severEffect,
    severDaysLeft,
    sunderEffect,
    sunderDaysLeft,
    doomDays,
    equippedItems,
    emptySlotCount,
    statTiles,
    activeEffects,
  };
}
