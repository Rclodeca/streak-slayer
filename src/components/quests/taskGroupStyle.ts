import { Briefcase, GraduationCap, HeartPulse, House, ShoppingCart, Sparkles } from 'lucide-vue-next';
import type { Component } from 'vue';
import type { TaskGroup } from '../../game-engine';

// Each group slot's fixed icon and colour (docs/mockups/tasks-b-p2.html). A
// renamed slot keeps both. The colours are theme tokens (--group-*).
export const TASK_GROUP_ICONS: Record<TaskGroup, Component> = {
  work: Briefcase,
  home: House,
  school: GraduationCap,
  health: HeartPulse,
  errands: ShoppingCart,
  other: Sparkles,
};

/** The colour a task's box is rimmed in: its group's, or brass with no group. */
export function taskGroupColor(group: TaskGroup | undefined): string {
  return group ? `var(--group-${group})` : 'var(--brass)';
}
