import { describe, expect, it } from 'vitest';
import { createAccount } from './account';
import { createQuest } from './quests';
import { renameTaskGroup, taskGroupName } from './taskGroups';

describe('task groups', () => {
  it('uses the default name until renamed', () => {
    expect(taskGroupName(createAccount(), 'other')).toBe('Other');
  });

  it('keeps a trimmed, capped name', () => {
    const account = renameTaskGroup(createAccount(), 'other', '  Side project for the band  ');
    expect(taskGroupName(account, 'other')).toBe('Side project f');
    expect(taskGroupName(account, 'work')).toBe('Work');
  });

  it('puts the default back for a blank name or the default itself, dropping the empty map', () => {
    const renamed = renameTaskGroup(createAccount(), 'home', 'Kids');
    expect(renameTaskGroup(renamed, 'home', '   ').taskGroupNames).toBeUndefined();
    expect(renameTaskGroup(renamed, 'home', 'Home').taskGroupNames).toBeUndefined();
  });

  it('files a quest under a slot only when given one', () => {
    expect(createQuest('Essay', 'easy', '2026-11-20', undefined, 'school').group).toBe('school');
    expect('group' in createQuest('Essay', 'easy', '2026-11-20')).toBe(false);
  });
});
