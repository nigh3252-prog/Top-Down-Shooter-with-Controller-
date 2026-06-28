# Source Moves Prototype

A phone/controller-friendly HTML5 top-down action prototype.

## Current goal

This is a first-pass feel test for a top-down ARPG/brawler combat model:

- Core movement/actions are modeled after Hades' Stygian Blade: light attack combo, dash, and Nova Smash-style heavy/special.
- The live ability tray is modeled after the One Step From Eden idea of two currently available deck cards.
- Tray card effects are sourced from baseline Diablo III skills.
- Graphics are intentionally placeholder shapes.

## Experimental branch note

Branch `experiment/soft-aim-assist` adds an attack-aim experiment:

- Soft aim assist is the default. Attacks use movement/facing direction, then nudge toward the best enemy in front.
- Right stick aiming overrides assist while the stick is actively held.
- The Aim button cycles Soft / Auto / Manual.
- Soft mode avoids pure nearest-enemy snapping; Auto mode deliberately tests nearest-enemy targeting; Manual disables target assist.
- Melee attacks get a small lunge/magnetism when an enemy is just outside comfortable range.
- Keyboard fallback: T cycles aim mode.

## Phone UI controls

Top-left browser/game overlay buttons:

- ☰: collapse or restore the HUD, tray, and touch controls. Collapsed mode leaves a tiny mini-HUD for HP, mana, and current cards.
- ⛶: request fullscreen. Browser support varies; it works best from a direct tap and may still depend on Chrome/Vercel/phone rules.
- − / +: toggle a slightly zoomed-out arena view.

## Gameplay controls

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
- T: cycle aim assist mode

## Source move notes

This prototype intentionally uses source move logic for testing. Names and presentation should be replaced before any public-facing release.

Current implemented references:

- Hades / Stygian Blade: Strike > Chop > Thrust combo, dash, Nova Smash-style AoE special.
- Diablo III / Barbarian: Ground Stomp, Cleave, Ancient Spear.
- Diablo III / Demon Hunter: Vault, Caltrops.
- Diablo III / Wizard: Frost Nova.

## Running

Open `index.html` in a browser, or host the repository with GitHub Pages/Vercel as a static site.
