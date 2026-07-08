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
- `combat-audio.js` — `installCombatAudioDirector()`, the procedural combat audio
  director. `weapon-lab.html` calls its `onAttackStart`/`onDummyEvent` methods
  directly at the point those events happen in its own combat code.
- `lab-modes.js` — `installLabModes()`, the Stance Cards / Individual Moves
  switcher and its review-panel chrome.
- `bent-world.js` — `installBentWorld()`, the bent-horizon camera/world system
  (cylinder-world bend shader, standing-element lean, 2D sky pass, long-lens
  camera). Ported from `bent_horizon_camera_prototype_v7`.

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
