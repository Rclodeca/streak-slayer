// Task groups: six fixed slots, each with its own icon and colour (in the UI),
// that the player can rename but never add to or remove. A quest stores the
// slot, so renaming a group never moves its tasks. The names live on the
// account, so they outlive every run.

import type { Account } from './account';
import type { TaskGroup } from './types';

/** Every group slot, in the order they're listed. */
export const TASK_GROUPS: readonly TaskGroup[] = ['work', 'home', 'school', 'health', 'errands', 'other'];

export const TASK_GROUP_DEFAULT_NAMES: Record<TaskGroup, string> = {
  work: 'Work',
  home: 'Home',
  school: 'School',
  health: 'Health',
  errands: 'Errands',
  other: 'Other',
};

/** Longest name a group takes, so it fits a chip and the two-across picker on a phone. */
export const TASK_GROUP_NAME_MAX = 14;

/** The group's name: the player's, or its default. */
export function taskGroupName(account: Account, group: TaskGroup): string {
  return account.taskGroupNames?.[group] ?? TASK_GROUP_DEFAULT_NAMES[group];
}

/** Renames a group slot. A blank name, or the default, puts the default back. */
export function renameTaskGroup(account: Account, group: TaskGroup, name: string): Account {
  const trimmed = name.trim().slice(0, TASK_GROUP_NAME_MAX).trim();
  const names = { ...account.taskGroupNames };
  if (!trimmed || trimmed === TASK_GROUP_DEFAULT_NAMES[group]) delete names[group];
  else names[group] = trimmed;
  const next: Account = { ...account, taskGroupNames: names };
  if (Object.keys(names).length === 0) delete next.taskGroupNames;
  return next;
}
