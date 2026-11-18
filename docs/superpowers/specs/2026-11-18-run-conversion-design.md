# Run conversion: old saves onto the new economy

Approved by the user 2026-11-18, before the first push of the shop, gold/gem economy, prestige and trial sets work (live is still at 48be5a6, 2026-11-13).

## Intent

Testers (and the user's own warrior, level 24, boss 27) hold runs made under the old rules: a per-run talent tree paid in level points, level-up events for item slots, 17 one-off trials that paid relics. After the push those runs must carry on in place, with no export or re-entry, and feel like a run that has been through the new economy.

## What the conversion is

Mostly already built. Loading an old save already runs, on every hydrate:

- `migrateLevelEvents`: taken `item-slots` events become bought slots (`slotUpgrades`).
- `migrateShopGates`, `migrateQuestUnlock`: gates open by level / best level.
- `seedTrials`: old one-off trials are credited to the 12 sets; claimed ones mark their rungs paid.
- `payStartingGems` (30, once) and `recordLevel` seeding (level milestones paid retroactively from the best level).
- Talent ranks are kept as they are.

## Decisions (user)

- Ranks and slots stay free. A level-24 hero has about 23 ranks that a new run would have paid about 43 gems and half a boss kill of gold each for.
- No owed trial gems are paid. Old claimed trials paid relics, not gems, and the free ranks stand in for them (the two come to roughly the same).
- Gold starts at 0.
- Convert in place on load, no export. Testers' runs convert the same way.

## What is new (the safety)

1. **A marker.** `Account.economyConverted?: boolean`. `createAccount()` sets it true (a fresh account is born converted). A save without it is a pre-conversion save.
2. **A backup before the first rewrite.** In `initializeStores`, before `setupPersistence` (so before any write): if the stored save text exists and its account does not carry the marker (or the text can't be read as a save), and no backup exists yet, copy the exact raw text to `streak-slayer:save:v5:pre-economy`. The first backup is never overwritten. A failed copy (quota) is swallowed: the load goes on, since refusing to load is worse.
3. **Set the marker after hydration** so the debounced writer persists it with the converted save.
4. **A legacy-save test** that hydrates a realistic old-shape save (level 24, boss 27, 23 ranks, both slot events taken, claimed old trials, no `account`) and pins: ranks and slots kept, gates open, trials credited with no gems paid for them, gems = starting + milestones only, gold 0, marker set, backup byte-identical to the original, a second load changes nothing, and the written save reloads to the same state.

The backup key is left out of the export file (`ENTRY_KEYS`) and the cloud sync, so a file import or a restore can't overwrite or leak it. Cloud sync (`syncSave`) is not wired into the app yet, so there is no conflict with it today.

## Non-goals

- No refunds, no gem top-ups, no charging for ranks or slots.
- No in-app restore button (restoring is a storage-key copy for now; one can be added if a bug makes it needed).
- No schema version bump: the save format number stays 5, as every change since v5 shipped.

## Approaches considered

- Pay and charge to match a fresh run's totals (rejected by the user: more arithmetic, more ways to be wrong, no playtest value).
- Export first, import after (rejected: the load-time migrations already convert in place; the backup key replaces the export as the safety net).
- **Chosen:** convert on load, plus a once-only backup and a marker.
