// Lucide icon for each challenge, by the kebab-case name on its ChallengeDef.

import {
  CalendarCheck,
  ChevronsUp,
  Crosshair,
  Flame,
  Gem,
  ListChecks,
  Plus,
  ScrollText,
  Shield,
  ShieldCheck,
  Skull,
  Sparkles,
  Sunrise,
  Swords,
  Target,
  Trophy,
  Zap,
} from 'lucide-vue-next';
import type { Component } from 'vue';

export const CHALLENGE_ICONS: Record<string, Component> = {
  'calendar-check': CalendarCheck,
  'shield-check': ShieldCheck,
  shield: Shield,
  sunrise: Sunrise,
  flame: Flame,
  plus: Plus,
  skull: Skull,
  'scroll-text': ScrollText,
  'chevrons-up': ChevronsUp,
  sparkles: Sparkles,
  gem: Gem,
  crosshair: Crosshair,
  swords: Swords,
  zap: Zap,
  'list-checks': ListChecks,
  trophy: Trophy,
  target: Target,
};

export function challengeIcon(name: string): Component {
  return CHALLENGE_ICONS[name] ?? ScrollText;
}
