# Todo

High-level list of major work. Ongoing refinement and game balance not listed.

## Rough order (2026-11-19)
1. ~~Decide monetization model + check Apple/Google payment rules~~ done 2026-11-19, see docs/ideas/2026-11-13-shop-economy.md §2
2. Dungeons system + relic rework, then dungeons catalog (biggest gameplay piece, no server needed)
3. Hero unlock decision (own todo, below), then unlockable heroes + skins
4. Rough Capacitor shell on a real phone + local notifications (catch WebView/safe-area/perf issues early)
5. Backend: accounts + cloud save, then server, then analytics + crash reporting
6. Payments infra + purchase flow UI (after accounts)
7. Pre-launch polish: art review + hooded figure, sounds, haptics, graphs, light mode decision
8. Release: app icon/store art, privacy policy, listings, age rating, betas, trademark check
- After launch: widgets, data export, social, live events, accessibility/localization, music if added

Open call: move backend ahead of dungeons if outside testers need cross-device saves soon.

## Content
- Skins: build more, set prices, the mythic skin, gold-bought skins
- Dungeons system (and relic rework to match)
- Dungeons catalog
- Hero unlock decision (deferred 2026-11-19): is Ranger free, unlocked by play, or paid; which couple of heroes are sold; what unique gameplay each has
- Unlockable heroes: build, after the decision
- Original art pass: mostly done, needs a review
- Hooded death figure: needs work and a review
- App icon and store art

## Monetization
- ~~Overall model~~ decided 2026-11-19: one-time dungeon + character packs, gems on sale from launch day, no ads, web version retired (shop-economy §2, with the store rules)
- Purchase flow UI
- Payments infra: Apple In-App Purchase + Google Play Billing only, gems tracked on the server, Restore Purchases button (shop-economy §2 store rules)
- Pro mode: parked until after launch, only if the game does well
- Skin packs (one-time, real money): maybe, after launch

## Backend
- Accounts and cloud save: login, saves synced across devices, move existing localStorage saves onto the server (do first; payments and social build on it; needed at launch since gems sell from day one)
- Server to support infra
- Analytics
- Crash and error reporting

## Mobile release
- Capacitor app
- Retire the web version (GitHub Pages) when the app ships
- Tablet view: design and refine
- Notifications
- Haptics
- App store release work: privacy policy and terms, store listings and screenshots, age rating, TestFlight / Play beta, real-device testing incl. a mid-range Android

## Features
- Habit tracking graphs/charts
- Sounds
- Music (maybe, undecided)
- Possible light mode
- Home screen widgets
- Player data export, backup, reset
- Anytime habits (maybe): check off for a reward whenever, never required daily or weekly, so no boss hit on a miss; reward small and capped, like tasks

## Ideas (later)
- Friends and social
- Live events or seasons
- Accessibility (screen readers, reduced motion) and localization
- Marketing: landing page, trademark check on "StreakSlayer"
