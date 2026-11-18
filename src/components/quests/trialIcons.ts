// Lucide icon for each trial set, by the kebab-case name on its TrialSetDef.

import { Award, CalendarCheck, ChevronsUp, Flame, Footprints, Gem, Gift, ListChecks, Shield, Sparkles, Swords, Target, Trophy } from 'lucide-vue-next';
import type { Component } from 'vue';

export const TRIAL_ICONS: Record<string, Component> = {
  footprints: Footprints,
  trophy: Trophy,
  flame: Flame,
  'calendar-check': CalendarCheck,
  'list-checks': ListChecks,
  shield: Shield,
  target: Target,
  sparkles: Sparkles,
  'chevrons-up': ChevronsUp,
  gem: Gem,
  swords: Swords,
  award: Award,
  gift: Gift,
};

export function trialIcon(name: string): Component {
  return TRIAL_ICONS[name] ?? Gift;
}
