# Colour themes

A record of the colour themes StreakSlayer has had, with the real values, so any of them can be mocked up or rebuilt later.
Hex values are copied from the source, not retyped. Lightness figures are OKLCH L (0 black, 1 white).

| Theme | Status | Page | Card | Where it lives |
| --- | --- | --- | --- | --- |
| **Moonlit (original)** | replaced 2026-11-08 | `#07080c` (L 0.135) | `#1b2030` | git commit `8b88020`, `src/assets/scss/themes/moonlit.scss` |
| **Midnight** | current Dark theme | `#11121b` (L 0.186) | `#2d2c50` | `moonlit.scss` (the theme id is still `moonlit`) |
| **Dusk** | Light theme's popups | `#181c26` (L 0.227) | `#333b4f` | `light.scss`, the `.modal-content` block |
| **Light (Bright)** | current Light theme | `#eef1f5` | `#fff` | `light.scss` |
| Deepwater, Graphite | explored, not built | | | `docs/mockups/pixel-dark-options.html` |

## Getting the original Moonlit back

- **To build it:** `git checkout 8b88020 -- src/assets/scss/themes src/components/ui/DeathScreen.vue src/components/ui/HoodedSpeech.vue src/components/ui/HoodedScene.vue src/components/habits/StrikeButton.vue`
  The palette below and the swap table are the source of truth if that commit ever goes stale (the history was rewritten once before).
- **To mock it:** the "Moonlit" column of `docs/mockups/pixel-dark-options.html` is the original, untouched. `docs/mockups/pixel-tabs-final.html` has it too, hard-coded.

## Moonlit, original (commit 8b88020)

Blue-black stone. Silver is what you touch, brass is what you've earned, gold is EXP. Page about 14% light, so the pixel bevels had little room to shade.

```scss
@mixin palette {
  --bg: #07080c;
  --bg-rgb: 7 8 12;
  --text: #a9adb6;
  --text-h: #e8ebf0;
  --border: #2a2f3b;
  --code-bg: #12141b;
  --frame: #141720;
  --frame-rgb: 20 23 32;
  --panel-fill: #141720;
  --ash-rgb: 150 141 126;
  --ash-mark: #6b6458;
  --ash-deep: #5c554a;
  --moon: #dbe2ee;
  --moon-solid: #a9b4c8;
  --moon-tint-rgb: 170 185 215;
  --moon-glow-rgb: 200 214 240;
  --brass: #d2bb85;
  --brass-rgb: 210 187 133;
  --brass-solid: #b39a66;
  --check-done: #3c4352;
  --check-done-line: #566074;
  --page-glow: rgba(150, 170, 210, 0.1);
  // The main button: pale silver on a grey lip, dark text
  // (docs/mockups/pixel-gear.html "Equip", pixel-forms.html).
  --button-fill: #c8d0dd;
  --button-fill-hover: #d6dde8;
  --button-line: rgba(255, 255, 255, 0.4); // the light along its top edge
  --button-text: #12141a;
  --stage-light:
    radial-gradient(ellipse 45% 55% at 68% 55%, rgba(215, 205, 185, 0.15), transparent 72%),
    radial-gradient(ellipse 90% 30% at 50% 100%, rgba(224, 120, 58, 0.18), transparent 70%);
  --boss-sprite-filter: drop-shadow(2px 0 0 #2a120c) drop-shadow(-2px 0 0 #2a120c) drop-shadow(0 2px 0 #2a120c)
    drop-shadow(0 -2px 0 #2a120c) drop-shadow(0 0 12px rgba(224, 120, 58, 0.35)) brightness(1.06);
  --hero-sprite-filter: none; // the hero stands as drawn on the boss's scene

  // Cast-blue odds and ends the rules reach for.
  --spent-text: #6a6f7a; // a spent skill's name and damage
  --day-on-rgb: 70 82 108; // a chosen weekday's disc
  --bar-rgb: 19 22 30; // the top of the pinned boss bar
  --plate: #0a0b10; // the level diamond in the boss bar

  // Pixel-cut cards, buttons and panels (docs/mockups/pixel-done.html, option A).
  // An open card is lifted: a step brighter, with a bevel and a dark lip.
  --card: #1b2030;
  --card-hi: #333c52;
  --card-lo: #0c0f15;
  --card-lip: #05060a;
  --card-ink: #f0f3f7; // an open skill's or quest's name
  // A struck card drops dark and flat; its button loses all colour.
  --struck-card: #0e1117;
  --struck-hi: #161a24;
  --struck-lo: #07090d;
  --struck-face: #1b1f28;
  --struck-lip: #111319;
  --struck-ink: #5b606b;
  // Quiet cards: Resist, and skills resting today.
  --quiet-card: #161a24;
  --quiet-hi: #1c2230;
  --quiet-lo: #0a0c12;
  --resting-face: #1b1f28; // a resting skill's flat button, as struck
  // A panel's bevel (the log, popups, the menu).
  --panel-hi: #232937;
  --panel-lo: #0b0d12;
  // A well sunk into a panel: its bevel flipped (the hero and stat wells).
  --sunk-hi: #05070a;
  --sunk-lo: #1a1f2b;
  --button-lip: #7d8595; // under a primary (silver) button
  // A stone button: a dark lifted face over a black lip (Replace, Drop).
  --stone-face: #232a3a;
  --stone-lip: #0a0c11;
  // A dark well for inputs, bars and checks, with its line and inner shadow.
  --field: #07090d;
  --field-line: #2a3140;
  --field-shadow: #020305;
  --check-bg: rgba(0, 0, 0, 0.4);
  --selected-card: #141a28; // a picked card in a list
  --selected-shadow: #0a0d14;
  --brass-on-face: #6e5418; // brass on a lit (pale) key
  --on-brass: #14161c; // text on a brass chip
  --well: rgba(0, 0, 0, 0.22); // a shallow well set into a panel or card
  --on-true-damage: #1e1c18; // text on true damage's pale key
  --on-crimson: #e8ebf0; // text on the crimson Take the blow button
  --input-fill: rgba(0, 0, 0, 0.35);
  --tint-to: #fff; // what red text is mixed toward to lift it off the card

  // The game's own colours: damage, icons, rarity.
  --damage-color: #c8402f;
  --heal-color: #92bf88;
  --stat-color: #d8cdb5;
  --true-damage-color: #f1e9d6;
  --exp-skill-color: #e6cf9a;
  --dmg-physical: #d0604f;
  --dmg-magic: #ab8dd8;
  --dmg-healing: #92bf88;
  --dmg-true: #f1e9d6;
  --icon-health: #c33a2e;
  --icon-lifesteal: #b8433a;
  --icon-crit: #d6a24f;
  --icon-steel: #a8a092;
  --icon-arcane: #8d9bd1;
  --icon-violet: #a58bd0;
  --icon-streak: #8d8475;
  --icon-exp: #d8b46a;
  --icon-gold: #c8a96e;
  --icon-gift: #c8a96e;
  --hp-color: #a82a20;
  // Rosier than physical red, so the thread never reads as a hit.
  --fx-lifesteal: #d9566a;
  --fx-reflect: #c4bcac;
  --fx-boss-cut: #c33a2e;
  --hp-trail: rgba(240, 222, 190, 0.75);
  --exp-color: #c8a96e;
  --rarity-common: #8d8475;
  --rarity-uncommon: #86b08b;
  --rarity-rare: #7f9fd1;
  --rarity-epic: #ae8bd6;
  // Ember, not gold: gold is Ashen's own chrome and blended into common.
  --rarity-relic: #ec8338;
  --soon-color: #d49a46;
  --overdrive-color: #e0783a;
}
```

### Hard-coded neutrals outside the palette

Stage floor and plinths, socket shading, death screen, hooded scene and speech, the level-up night strip. These were Moonlit's hex values written straight into rules. Midnight changed them as below.

| Moonlit (original) | Midnight | In |
| --- | --- | --- |
| `#020305` | `#080811` | ashen.scss |
| `#050609` | `#0e0f17` | DeathScreen.vue |
| `#05060a` | `#0e0e19` | ashen.scss |
| `#05070a` | `#0f1018` | HoodedSpeech.vue |
| `#07080c` | `#11121b` | HoodedSpeech.vue |
| `#07090d` | `#12131c` | ashen.scss |
| `#0a0c12` | `#161624` | ashen.scss |
| `#0b0d12` | `#171823` | ashen.scss |
| `#0b0d14` | `#171727` | HoodedSpeech.vue, HoodedScene.vue |
| `#0b0e15` | `#181828` | ashen.scss |
| `#0c0e14` | `#191926` | DeathScreen.vue |
| `#0c0f17` | `#19192b` | ashen.scss, HoodedSpeech.vue |
| `#0c1019` | `#1a1a2f` | light.scss |
| `#0e1017` | `#1b1b2b` | DeathScreen.vue |
| `#0f131d` | `#1e1e34` | ashen.scss |
| `#10141d` | `#1f1f34` | ashen.scss |
| `#12141a` | `#20202e` | HoodedSpeech.vue |
| `#121620` | `#212138` | StrikeButton.vue |
| `#141926` | `#252442` | ashen.scss |
| `#171b25` | `#27283e` | DeathScreen.vue |
| `#1b1f29` | `#2c2d43` | DeathScreen.vue |
| `#1b2436` | `#312f59` | light.scss |
| `#1d2230` | `#2f2f4e` | HoodedSpeech.vue |
| `#1f2534` | `#333254` | ashen.scss |
| `#232a39` | `#38385a` | DeathScreen.vue |
| `#252f44` | `#3d3c6c` | light.scss |
| `#283041` | `#3f3f66` | ashen.scss |
| `#2a3140` | `#414163` | ashen.scss, HoodedSpeech.vue |
| `#2c3446` | `#44446c` | DeathScreen.vue |
| `#3a4358` | `#555584` | ashen.scss, DeathScreen.vue |
| `#4a4f5a` | `#66677f` | DeathScreen.vue |
| `#4a5266` | `#676895` | HoodedSpeech.vue, light.scss |
| `#4a5470` | `#6968a6` | DeathScreen.vue, light.scss |

Left alone on purpose: the per-boss stage scenes (`fight/stage/scenes.ts`, their own art palettes), the enchant glow, the warm ash structure greys, damage colours, brass, EXP gold and rarity colours.

## Midnight (current Dark)

Chosen 2026-11-08 from `docs/mockups/pixel-dark-options.html`: option B at Lift -0.03.
Violet-blue stone that lifts the page to about 19% light. Brass and EXP gold are near-opposites of it, so they glow. Text holds 9:1 on cards. Watch Magic (purple) against it.

**Recipe** (applied to every cool dark neutral, in OKLCH): `L' = 0.185 + (L - 0.135) * 1.15`, chroma x 2.0, hue 283.
Light cool greys (silver, button fills): same lightness, hue 283, chroma x 1.2 (max 0.05).
Text: `--text` L 0.875, `--text-h` and `--card-ink` L 0.97, `--struck-ink` struck card + 0.24, `--spent-text` struck card + 0.29, all hue 283.

```scss
@mixin palette {
  --bg: #11121b;
  --bg-rgb: 17 18 27;
  --text: #d3d4e4;
  --text-h: #f4f4fa;
  --border: #3f405a;
  --code-bg: #202030;
  --frame: #232337;
  --frame-rgb: 35 35 55;
  --panel-fill: #232337;
  --ash-rgb: 150 141 126;
  --ash-mark: #6b6458;
  --ash-deep: #5c554a;
  --moon: #dfe0f0;
  --moon-solid: #b0b1cb;
  --moon-tint-rgb: 180 181 217;
  --moon-glow-rgb: 208 210 244;
  --brass: #d2bb85;
  --brass-rgb: 210 187 133;
  --brass-solid: #b39a66;
  --check-done: #565779;
  --check-done-line: #7778a6;
  --page-glow: rgba(165, 166, 201, 0.1);
  // The main button: pale silver on a grey lip, dark text
  // (docs/mockups/pixel-gear.html "Equip", pixel-forms.html).
  --button-fill: #cdcedf;
  --button-fill-hover: #dadbea;
  --button-line: rgba(255, 255, 255, 0.4); // the light along its top edge
  --button-text: #20202e;
  --stage-light:
    radial-gradient(ellipse 45% 55% at 68% 55%, rgba(215, 205, 185, 0.15), transparent 72%),
    radial-gradient(ellipse 90% 30% at 50% 100%, rgba(224, 120, 58, 0.18), transparent 70%);
  --boss-sprite-filter: drop-shadow(2px 0 0 #2a120c) drop-shadow(-2px 0 0 #2a120c) drop-shadow(0 2px 0 #2a120c)
    drop-shadow(0 -2px 0 #2a120c) drop-shadow(0 0 12px rgba(224, 120, 58, 0.35)) brightness(1.06);
  --hero-sprite-filter: none; // the hero stands as drawn on the boss's scene

  // Cast-blue odds and ends the rules reach for.
  --spent-text: #686877; // a spent skill's name and damage
  --day-on-rgb: 102 102 161; // a chosen weekday's disc
  --bar-rgb: 34 34 52; // the top of the pinned boss bar
  --plate: #151621; // the level diamond in the boss bar

  // Pixel-cut cards, buttons and panels (docs/mockups/pixel-done.html, option A).
  // An open card is lifted: a step brighter, with a bevel and a dark lip.
  --card: #2d2c50;
  --card-hi: #4d4c7e;
  --card-lo: #191a28;
  --card-lip: #0e0e19;
  --card-ink: #f4f4fa; // an open skill's or quest's name
  // A struck card drops dark and flat; its button loses all colour.
  --struck-card: #1c1c2a;
  --struck-hi: #26263d;
  --struck-lo: #12131c;
  --struck-face: #2c2d41;
  --struck-lip: #1f1f2c;
  --struck-ink: #5a5a68;
  // Quiet cards: Resist, and skills resting today.
  --quiet-card: #26263d;
  --quiet-hi: #2f2f4f;
  --quiet-lo: #161624;
  --resting-face: #2c2d41; // a resting skill's flat button, as struck
  // A panel's bevel (the log, popups, the menu).
  --panel-hi: #373857;
  --panel-lo: #171823;
  // A well sunk into a panel: its bevel flipped (the hero and stat wells).
  --sunk-hi: #0f1018;
  --sunk-lo: #2c2c47;
  --button-lip: #828398; // under a primary (silver) button
  // A stone button: a dark lifted face over a black lip (Replace, Drop).
  --stone-face: #38385c;
  --stone-lip: #161622;
  // A dark well for inputs, bars and checks, with its line and inner shadow.
  --field: #12131c;
  --field-line: #414163;
  --field-shadow: #080811;
  --check-bg: rgba(0, 0, 0, 0.4);
  --selected-card: #252545; // a picked card in a list
  --selected-shadow: #171727;
  --brass-on-face: #6e5418; // brass on a lit (pale) key
  --on-brass: #222330; // text on a brass chip
  --well: rgba(0, 0, 0, 0.22); // a shallow well set into a panel or card
  --on-true-damage: #1e1c18; // text on true damage's pale key
  --on-crimson: #eaeaf1; // text on the crimson Take the blow button
  --input-fill: rgba(0, 0, 0, 0.35);
  --tint-to: #fff; // what red text is mixed toward to lift it off the card

  // The game's own colours: damage, icons, rarity.
  --damage-color: #c8402f;
  --heal-color: #92bf88;
  --stat-color: #d8cdb5;
  --true-damage-color: #f1e9d6;
  --exp-skill-color: #e6cf9a;
  --dmg-physical: #d0604f;
  --dmg-magic: #ab8dd8;
  --dmg-healing: #92bf88;
  --dmg-true: #f1e9d6;
  --icon-health: #c33a2e;
  --icon-lifesteal: #b8433a;
  --icon-crit: #d6a24f;
  --icon-steel: #a8a092;
  --icon-arcane: #8d9bd1;
  --icon-violet: #a58bd0;
  --icon-streak: #8d8475;
  --icon-exp: #d8b46a;
  --icon-gold: #c8a96e;
  --icon-gift: #c8a96e;
  --hp-color: #a82a20;
  // Rosier than physical red, so the thread never reads as a hit.
  --fx-lifesteal: #d9566a;
  --fx-reflect: #c4bcac;
  --fx-boss-cut: #c33a2e;
  --hp-trail: rgba(240, 222, 190, 0.75);
  --exp-color: #c8a96e;
  --rarity-common: #8d8475;
  --rarity-uncommon: #86b08b;
  --rarity-rare: #7f9fd1;
  --rarity-epic: #ae8bd6;
  // Ember, not gold: gold is Ashen's own chrome and blended into common.
  --rarity-relic: #ec8338;
  --soon-color: #d49a46;
  --overdrive-color: #e0783a;
}
```

## Dusk (popups in the Light theme)

A lighter Moonlit, from `docs/mockups/pixel-light-player-modal.html` (A). Built on the original Moonlit palette, with these overrides:

```scss
#{$light} .modal-content:not(:has(.add-habit-form, .quest-form)) {
  @include moonlit.palette;
  @include ashen.derived-tokens;
  --bg: #181c26;
  --bg-rgb: 24 28 38;
  --text: #b7bdc8;
  --text-h: #f3f5f8;
  --border: #3c4354;
  --code-bg: #222734;
  --frame: #262c3a;
  --frame-rgb: 38 44 58;
  --panel-fill: #262c3a;
  --panel-hi: #394154;
  --panel-lo: #161a23;
  --brass: #e0c98f;
  --check-done: #4a5266;
  --check-done-line: #66708a;
  --spent-text: #7c8494;
  --card: #333b4f;
  --card-hi: #4a5470;
  --card-lo: #1e2330;
  --card-lip: #141821;
  --card-ink: #f3f5f8;
  --struck-card: #1d212b;
  --struck-hi: #272c38;
  --struck-lo: #12151c;
  --struck-face: #2b303c;
  --struck-lip: #191c24;
  --quiet-card: #2a3040;
  --quiet-hi: #343b4d;
  --quiet-lo: #1a1e28;
  --resting-face: #2b303c;
  --sunk-hi: #12151c;
  --sunk-lo: #353d50;
  --stone-face: #363e52;
  --stone-lip: #141821;
  --field: #181c25;
  --field-line: #3c4456;
  --field-shadow: #0e1016;
  --selected-card: #2a3346;
  --selected-shadow: #181d28;
  // Text that sets no colour of its own (the quest popup's Due and Reward)
  // would inherit the page's dark grey; it takes the popup's.
  color: var(--text);
}
```

## Light (Bright), as of 8b88020

White cards on a soft grey page, gunmetal Resist, navy for touch. The base tokens (card fills and the other rules are further down `light.scss`):

```scss
#{$light} {
  color-scheme: light;
  --bg: #eef1f5;
  --bg-rgb: 238 241 245;
  --text: #4f5866; // dark enough to hold on the grey cards
  --text-h: #141a24;
  --border: #d5dae1;
  --code-bg: #e3e7ec;
  --frame: #eef1f5; // popups and panels are the page's grey
  --frame-rgb: 238 241 245;
  --panel-fill: #eef1f5;
  --ash-rgb: 70 82 100; // structure lines: cool slate
  --ash-mark: #9aa3b0;
  --ash-deep: #8b93a1;
  --moon: #1d3557; // what you touch is deep navy here
  --moon-solid: #3a4f70;
  --moon-tint-rgb: 29 53 87;
  --moon-glow-rgb: 60 90 140;
  --brass: #a87400;
  --brass-rgb: 168 116 0;
  --brass-solid: #b8860b;
  --check-done: #e3e6ea;
  --check-done-line: #b9c0ca;
  --page-glow: rgba(220, 235, 255, 0.35);
  // The main button: navy with white text.
  --button-fill: #1d3557;
  --button-fill-hover: #2a4570;
  --button-line: rgba(255, 255, 255, 0.2);
  --button-text: #fff;
  // The secondary buttons (Cancel, Back, Replace): white with a grey line, so
  // they don't pass for the cards, which have no line.
  --soft-fill: #fff;
  --soft-fill-hover: #f6f8fa;
  --soft-line: #b4bcc8;
  --stage-light:
    radial-gradient(ellipse 45% 55% at 68% 55%, rgba(215, 205, 185, 0.15), transparent 72%),
    radial-gradient(ellipse 90% 30% at 50% 100%, rgba(224, 120, 58, 0.18), transparent 70%);
  --boss-sprite-filter: drop-shadow(2px 0 0 #2a120c) drop-shadow(-2px 0 0 #2a120c) drop-shadow(0 2px 0 #2a120c)
    drop-shadow(0 -2px 0 #2a120c) drop-shadow(0 0 12px rgba(224, 120, 58, 0.35)) brightness(1.06);
  --hero-sprite-filter: none; // the hero stands as drawn on the boss's scene

  --spent-text: #a3aab5;
  --day-on-rgb: 180 192 210;
  --bar-rgb: 255 255 255;
  --plate: #fff;

  // Cards: open ones are white with a faint bevel and a grey lip on the grey
  // page and popups (docs/mockups/pixel-bright-card-colours.html, C); Resist
  // takes its own fill below. Struck ones sink to a flat grey.
  --card: #fff;
  --card-hi: #fff;
  --card-lo: #f1f3f6;
  --card-lip: #cfd5de;
  --card-ink: #141a24;
  --struck-card: #e4e8ed;
  --struck-hi: #e4e8ed;
  --struck-lo: #e4e8ed;
  --struck-face: #d6dbe2;
  --struck-lip: #c9cfd8;
  --struck-ink: #9aa2ae;
  --quiet-card: #fff;
  --quiet-hi: #fff;
  --quiet-lo: #f1f3f6;
  --resting-face: #e1e5ea;
  --panel-hi: #ffffff;
  --panel-lo: #dfe3e9;
  --sunk-hi: #c3cad4;
  --sunk-lo: #ffffff;
  --button-lip: #0f1d33;
  --stone-face: #dce1e8; // stone buttons (the choice keys): darker than the grey popup
  --stone-lip: #a6afbc;
  // Sunken is one rule: darker than what it sits on, so the fields share the
  // wells' tint (it darkens a white popup and a grey card alike).
  --field: var(--well);
  --field-line: #aeb7c4;
  --field-shadow: #cdd3dc;
  --check-bg: #fff;
  --selected-card: #e9eef6;
  --selected-shadow: #cfd6e1;
  --brass-on-face: #f2d58a;
  --on-brass: #fff;
  --well: rgba(20, 30, 50, 0.11);
  --on-true-damage: #fff;
  --on-crimson: #fff;
  --input-fill: var(--well);
  --tint-to: #000;

  // The game's own colours, darker so they read as text on white. The skill
  // cards use brighter fills (below).
  --damage-color: #c8382a;
  --heal-color: #2f8a46;
  --stat-color: #3d4452;
  --true-damage-color: #3d4452;
  --exp-skill-color: #a87400;
  --dmg-physical: #c8442d;
  --dmg-magic: #6f4fc0;
  --dmg-healing: #2f8a46;
  --dmg-true: #3d4452;
  --icon-health: #c0392b;
  --icon-lifesteal: #b0342c;
  --icon-crit: #b07d12;
  --icon-steel: #6b7280;
  --icon-arcane: #4f63b0;
  --icon-violet: #6f4fc0;
  --icon-streak: #8a6f4a;
  --icon-exp: #b07d12;
  --icon-gold: #a87400;
  --icon-gift: #a87400;
  --hp-color: #a82a20;
  --fx-lifesteal: #d9566a;
  --fx-reflect: #c4bcac;
  --fx-boss-cut: #c33a2e;
  --hp-trail: rgba(240, 222, 190, 0.75);
  --exp-color: #b07d12;
  --rarity-common: #6b7381; // darker, so "Common" reads on the grey
  --rarity-uncommon: #2f8a46;
  --rarity-rare: #2f68c0;
  --rarity-epic: #6f4fc0;
  --rarity-relic: #c4631c;
  --soon-color: #b8741c;
  --overdrive-color: #c4631c;
}
```

## Dark options explored 2026-11-08 (not chosen)

Same recipe as Midnight, with these settings. `L0` is the page lightness before the Lift slider; the hue is OKLCH degrees ("keep" leaves each colour's own hue).

| Option | L0 | Spread | Chroma x | Hue | Idea |
| --- | --- | --- | --- | --- | --- |
| A · Dusk | 0.227 | 1.14 | 1.25 | keep (about 268) | The same blue slate, lifted. Safest. |
| **B · Midnight** | 0.215 | 1.15 | 2.0 | 283 | Indigo. **Chosen** (at Lift -0.03, so L0 0.185). |
| C · Deepwater | 0.225 | 1.14 | 1.6 | 205 | Teal slate. Red and brass sit opposite it. |
| D · Graphite | 0.235 | 1.14 | 0.22 | 70 | Near-neutral charcoal. Least mood, most room for the art. |

The mock's Lift slider ran -0.04 to +0.07 on L0. Higher looked washed out, lower looked deeper.
