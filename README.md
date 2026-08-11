# Source Moves Prototype

A phone/controller-friendly HTML5 top-down action prototype.

## Repo layout

- `index.html` — launcher.
- `wizard-of-legend-arcana-checklist.html` — standalone, phone-friendly source-analysis checklist with bounded showcase clips, persistent progress, and explicit source-first versus legacy-replacement lineage. It does not import or modify the game runtime.
- `top-down-shooter.html` — the original top-down shooter prototype (notes below).
- `weapon-lab.html` — the Stone Wanderer weapon test lab: Red Toll greatsword, bent-horizon scrolling world, combat audio, and Stance Cards / Individual Moves modes. A single ES-module page that imports everything from `src/` directly — no runtime HTML patching.
- `combat-arena.html` — the Combat Arena: an encounter-director goblin arena played with the Stone Wanderer's full weapon + stance-card combat. Its braided hex dungeon is stored as lightweight run data, while only the current oversized combat room is live at once. Clearing a room makes its unopened exits weapon-hittable; opening and entering one uses a brief occluded doorway transition before the next room is constructed. Stance cards work as a One Step From Eden-style deck: two hand slots played with LB/RB (or Q/E), each play switches your stance, fully refills stamina, and draws a replacement; using up the deck reshuffles instantly, while a manual shuffle (Circle/R) tosses the hand and takes a countdown. Missed swings refund as recoverable gray stamina unless the player gets hit, landed attacks keep their stamina cost, and horizontal/vertical/thrust attacks have different costs. Light attack is a two-hit combo gated on hit 1 connecting, while heavy uses the stance finisher and can be held to charge across the WIMPY→CARTOON feel tiers (scaling windup, damage, knockback, stun, hitstop, lunge). Dodge with i-frames, phone joystick + on-screen buttons, and gamepad support. Shares the rig and combat interpreter with `weapon-lab.html` via `src/stone-wanderer.js` and `src/player-combat.js`.
- `tools/wizard-of-legend-thunder-circuit-line.html` — a standalone, phone-friendly three.js lab that reproduces the Thunder Line and Circuit Line Dash Arcana exactly as the showcase demonstrates them (151–158s and 158–165s), following the source-first entries in `archive/wizard-of-legend/source-notes/`. Three.js is inlined, so the page runs offline with no network access and no build step. It does not import or modify the game runtime.
- `tools/wizard-of-legend-bladed-vine-spark-contact.html` — the same lab for the two Basic Arcana combo strings: Bladed Vine (38–43s) and Spark Contact (46–51s). Attack beats run on a press-or-hold string with source-faithful beat counts, damage progressions, and the distinction between visible strands and damage events. Also standalone and offline.
- `hex-maze-lab.html` — a phone-friendly deterministic hex-maze diagnostic view with generation steps, original dead ends, braids, room numbers, derived doors, and validation failures.
- `src/` — real source modules (`stone-wanderer.js`, `player-combat.js`, `weapons.js`, `attacks.js`, `stance-cards.js`, `enemies.js`, `combat-director.js`, `feel.js`, `combat-audio.js`, `lab-modes.js`, `bent-world.js`, …). See `src/README.md` for the module architecture.
- `archive/` — the retired iframe wrapper, old donor pages, and superseded Wizard of Legend Markdown. The checklist links back to its preserved source-note archive.
- `docs/design/` — living gameplay rules, game flow, project terminology, and unresolved design questions for human and AI collaborators.
- `docs/` — active source-move libraries (Hades, Diablo III) used as design references.

## Recent combat pass

Authored stance cards now select distinct mostly-European ready guards with a
smaller Japanese set. Hit-confirmed Light 1 links from its recovery directly
into Light 2, a landed Heavy can link into one Light, and the old saber slot is
now a curved two-handed katana with saved-setting migration.

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

## Deterministic arcana capture

Enemy Lab has a capture-only fixed-step mode for comparing an arcana with its
bounded source clip. The committed manifest owns the viewport, aim, dummy
layout, RNG seed, source timeline, checkpoints, and measurable acceptance
ranges. Re-measure the approved path with presentation FX suppressed by running:

```text
npm run capture:arcana -- --id DRAGON-ARC --stage motion
```

After the final visual design is ready, capture the same source timeline and
motion contract with presentation effects enabled:

```text
npm run capture:arcana -- --id DRAGON-ARC --stage style
```

The stages write separate ignored review sets under the arcana's `motion/` and
`style/` artifact directories. The saved Gate 1 motion set preserves the neutral
proxy review; current `motion` reruns use the one production dragon carrier with
presentation FX suppressed, so there is no second permanent gameplay variant.

The dependency-free runner requires Node.js 22 or newer, Chrome or Edge, and
FFmpeg with its FFprobe companion. If they are not discoverable, set
`ARCANA_CAPTURE_BROWSER`, `FFMPEG_PATH`, and `FFPROBE_PATH`, or pass `--browser`,
`--ffmpeg`, and `--ffprobe`. It serves the repository only
on loopback, repeats the fixed-step capture twice, verifies serialized snapshots,
validates the comparison as exactly 60 FPS with its declared frame count and
duration, and writes ignored review files under `artifacts/arcana-capture/`: game and
source screenshots, a contact sheet, a synchronized comparison MP4, and
`metrics.json`.
