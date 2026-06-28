# Source Moves Prototype

A phone/controller-friendly HTML5 top-down action prototype.

## Current goal

This is a first-pass feel test for a top-down ARPG/brawler combat model:

- Core movement/actions are modeled after Hades' Stygian Blade: light attack combo, dash, and Nova Smash-style heavy/special.
- The live ability tray is modeled after the One Step From Eden idea of two currently available deck cards.
- Tray card effects are sourced from baseline Diablo III skills.
- Graphics are intentionally placeholder shapes.

## Controls

Backbone / gamepad:

- Left stick: move
- Right stick: face/aim, if available
- Square / X button: light attack combo
- Triangle / Y button: heavy/special
- Cross / A button: dodge
- LB: cast left tray card
- RB: cast right tray card
- Circle / B button: shuffle/reload tray

Keyboard fallback:

- WASD / arrows: move
- J: light attack
- K: heavy/special
- Space: dodge
- Q/E: cast left/right tray cards
- R: shuffle/reload tray

## Source move notes

This prototype intentionally uses source move logic for testing. Names and presentation should be replaced before any public-facing release.

Current implemented references:

- Hades / Stygian Blade: Strike > Chop > Thrust combo, dash, Nova Smash-style AoE special.
- Diablo III / Barbarian: Ground Stomp, Cleave, Ancient Spear.
- Diablo III / Demon Hunter: Vault, Caltrops.
- Diablo III / Wizard: Frost Nova.

## Running

Open `index.html` in a browser, or host the repository with GitHub Pages/Vercel as a static site.
