# `src/` source modules

`weapon-lab.html` imports these directly as ES modules (`<script type="module">`,
plain relative `import`s — no bundler, no build step). There is no more runtime
HTML patching anywhere in this repo: the old wrapper used to `fetch()` a copy of
the core page and string-replace pieces of it before running; that wrapper and
the core page it patched are retired to `archive/`.

- `weapons.js` — the Stone weapon order/definitions, shared combat weapon mesh
  builders, optional weapon visual update hooks, and `installRedTollGreatsword()`,
  which selects/tunes the Red Toll greatsword visual variant without replacing
  the lab's common rebuild path.
- `stone-wanderer.js` — `installStoneWanderer({ THREE })`, the Stone Wanderer
  character rig: procedural stone textures/materials, `makeStoneWanderer()`,
  head/crown/width tuning, and `getW()` for the live rig handle bag.
- `player-combat.js` — `installPlayerCombat(api)`, the player combat core:
  pose model + attack interpreter over `attacks.js` definitions, the attack
  state machine (`startCombatAttack`/`updateCombat`), two-bone arm IK, weapon
  rig lifecycle (`selectCombatWeapon`/`rebuildCombatWeaponMesh`), swept
  hit-zone geometry, and the swing trail/sparks. Page-specific side effects
  (aim commit, audio, lab bookkeeping, DOM status, dummy-vs-enemy hit routing)
  are injected through `api.hooks`.
- `combat-balance.js` — weapon style-affinity tables and damage multiplier helpers used by the swept dummy hit tests.
- `goblin-rig.js` — re-exports `installGoblinRig(THREE)` from `pot-goblin-rig.js`
  so consumers keep the same import path.
- `pot-goblin-rig.js` — the shared articulated goblin model: a faceted pot body,
  wavy rim collar, brown belt, dark inner head with glowing eyes, and a
  five-lobe leaf cap (shatter throws the leaves), plus a held stone weapon. Same
  `installGoblinRig(THREE)` contract as the old capsule goblin (materials,
  `makeGoblinRig`, the telegraph/token/health marker update, the attack glow,
  and the death shatter) — used by both `enemies.js` (weapon-lab combat) and
  `arena-enemies.js` (combat-arena). `pot-goblin-viewer.html` at the repo root
  is a standalone glow/flash/shatter test page for it.
- `arena-enemies.js` — `createArenaEnemySystem(...)`, the combat-arena enemy
  system: a port of the "Director Punch" enemy simulation (grunt / dagger / mace
  / rock / captain) scaled to arena units, rendered with the goblin rig. Enemies
  seek a tight hold distance and lunge-commit on the active phase, gated by the
  `combat-director.js` token director; the rock archetype throws a projectile.
  Drop-in API match for `createCombatEnemySystem`.
- `feel.js` — the hold-to-charge feel continuum (WIMPY → DEFAULT → HAYMAKER →
  CARTOON keyframes, `createFeelKeys`/`feelAt`/`tierName`/`holdToTier`). Data
  only; `combat-arena.html` maps a hold duration to a tier and applies the
  resulting multipliers to the player-combat swing timing/damage.
- `combat-audio.js` — `installCombatAudioDirector()`, the procedural combat audio
  director. `weapon-lab.html` calls its `onAttackStart`/`onDummyEvent` methods
  directly at the point those events happen in its own combat code.
- `lab-modes.js` — `installLabModes()`, the Stance Cards / Individual Moves
  switcher and its review-panel chrome.
- `bent-world.js` — `installBentWorld()`, the bent-horizon camera/world system
  (cylinder-world bend shader, standing-element lean, 2D sky pass, long-lens
  camera). Ported from `bent_horizon_camera_prototype_v7`.

## Recent combat modules

- `guard-poses.js` defines the reusable European and Japanese ready poses
  selected by authored stance cards.
- `combat-links.js` contains pure recovery-boundary and light-follow-up
  decisions shared by the browser runtime and focused node tests.
- `player-combat.js` now crossfades from the captured outgoing recovery pose
  into a queued windup, while complete unqueued recoveries return to the active
  stance guard.
- `weapons.js` now builds the curved two-handed katana and migrates the retired
  `saber` weapon id in persisted settings.

## Recent dungeon modules

- `hex-maze.js` — deterministic axial hex-maze carving, dead-end braiding, room segmentation, derived doors, and validation.
- `hex-maze-navigation.js` — axial/world conversion, shared collision segments, circle movement, wall raycasts, and room-local pathfinding.
- `hex-maze-renderer.js` — debug rendering plus the active-room-only Three.js world builder, doorway wings, animated door slabs, and collision output.
- `room-encounters.js` — persistent room-clear and opened-door state for a dungeon run.
- `room-transition.js` — the input-locking, occluded midpoint room-swap state machine.
## How the module boundary works

`weapon-lab.html` builds one `LabAPI` object — a getter/setter bag defined in
the page's own module scope — and passes it to each `installX()` call. Getters
defer evaluation, so `LabAPI` can be built (and `installBentWorld` called)
before most of the state it exposes even exists yet; nothing reads a getter
until the corresponding `installX()` runs, by which point the page has finished
declaring it. Mutable page-owned values such as `activeWeaponKind` stay behind
get/set pairs so modules can coordinate with the live runtime state without
copying it or patching the page source.

A few features that used to live in the page (for example Individual Moves'
extension points) are now small named hook points in `weapon-lab.html` — e.g.
`LabAPI.moveTest?.intercept?.(action)` at the top of `labAction()` — that are
inert until the matching module installs real behavior into them. Weapon
visuals use a shared build/update lifecycle instead of page-source patching or
weapon-specific rebuild overrides.

## Extending this

The attack/combat system and the actor rig + IK are now extracted
(`player-combat.js`, `stone-wanderer.js`). The next natural seam, if this
keeps growing, is the dungeon/prop builder. Follow the same pattern — a small
`installX(LabAPI)` in a new `src/` file, called once from `weapon-lab.html`.
