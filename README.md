# Source Moves Prototype

A phone/controller-friendly HTML5 top-down action prototype.

## Repo layout

- `index.html` — launcher.
- `top-down-shooter.html` — the original top-down shooter prototype (notes below).
- `weapon-lab.html` — the Stone Wanderer weapon test lab: Red Toll greatsword, bent-horizon scrolling world, combat audio, and Stance Cards / Individual Moves modes. A single ES-module page that imports everything from `src/` directly — no runtime HTML patching.
- `combat-arena.html` — the Combat Arena: an encounter-director goblin arena (waves, 9 director modes plus an auto-rotating Cycle All, HP/score loop) played with the Stone Wanderer's full weapon + stance-card combat. Stance cards work as a One Step From Eden-style deck: two hand slots played with LB/RB (or Q/E), each play switches your stance, fully refills stamina, and draws a replacement; using up the deck reshuffles instantly, while a manual shuffle (Circle/R) tosses the hand and takes a countdown. Swing stamina is spent as recoverable gray stamina unless the player gets hit, and horizontal/vertical/thrust attacks have different costs. Light attack is a two-hit combo gated on hit 1 connecting, while heavy uses the stance finisher and can be held to charge across the WIMPY→CARTOON feel tiers (scaling windup, damage, knockback, stun, hitstop, lunge). Dodge with i-frames, phone joystick + on-screen buttons, and gamepad support. Shares the rig and combat interpreter with `weapon-lab.html` via `src/stone-wanderer.js` and `src/player-combat.js`.
- `src/` — real source modules (`stone-wanderer.js`, `player-combat.js`, `weapons.js`, `attacks.js`, `stance-cards.js`, `enemies.js`, `combat-director.js`, `feel.js`, `combat-audio.js`, `lab-modes.js`, `bent-world.js`, …). See `src/README.md` for the module architecture.
- `archive/` — the retired iframe wrapper, the old string-patched lab core, and donor pages. Kept for reference only; nothing links to them.
- `docs/` — source-move libraries (Hades, Diablo III) used as design references.

## Current goal

This is a first-pass feel test for a top-down ARPG/brawler combat model:

- Core movement/actions are modeled after Hades' Stygian Blade: light attack combo, dash, and Nova Smash-style heavy/special.
- The live ability tray is modeled after the One Step From Eden idea of two currently available deck cards.
- Tray card effects are sourced from baseline Diablo III skills.
- Graphics are intentionally placeholder shapes.

## Experimental branch note

Branch `experiment/soft-aim-assist` adds an attack-aim and family-safe mode experiment:

- Soft aim assist is the default. Attacks use movement/facing direction, then nudge toward the best enemy in front.
- Right stick aiming overrides assist while the stick is actively held.
- The Aim button cycles Soft / Auto / Manual.
- Soft mode avoids pure nearest-enemy snapping.
- Auto mode continuously points the player at the closest enemy within a nearby range, while still allowing right-stick override.
- Manual disables target assist.
- Melee attacks get a small lunge/magnetism when an enemy is just outside comfortable range.
- Right hamburger/Menu button pauses and opens the existing expanded HUD/menu rather than a separate pause overlay.
- Pause freezes gameplay updates until the Menu button is pressed again.
- Hold left three-dots/View for 1 second to toggle Boys Mode on or off.
- Boys Mode persists after release: player cannot take damage, and enemies stop near the player instead of attacking.
- Downed state now has an on-screen Respawn button instead of requiring browser refresh.
- Keyboard fallback: T cycles aim mode; P or Escape toggles pause.

## Phone UI controls

Top-left browser/game overlay buttons:

- ☰: collapse or restore the HUD, tray, and touch controls. Collapsed mode leaves a tiny mini-HUD for HP, mana, and current cards. If paused, tapping ☰ resumes.
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
- Right hamburger/Menu: pause and open existing HUD/menu; press again to resume
- Hold left three-dots/View for 1 second: toggle Boys Mode safety mode

Keyboard fallback:

- WASD / arrows: move
- J: light attack
- L: heavy/special
- K: dodge
- Q/E: cast left/right tray cards
- R: shuffle/reload tray
- T: cycle aim assist mode
- P or Escape: pause menu

## Source move notes

This prototype intentionally uses source move logic for testing. Names and presentation should be replaced before any public-facing release.

Current implemented references:

- Hades / Stygian Blade: Strike > Chop > Thrust combo, dash, Nova Smash-style AoE special.
- Diablo III / Barbarian: Ground Stomp, Cleave, Ancient Spear.
- Diablo III / Demon Hunter: Vault, Caltrops.
- Diablo III / Wizard: Frost Nova.

## Running

Open `index.html` in a browser, or host the repository with GitHub Pages/Vercel as a static site.
