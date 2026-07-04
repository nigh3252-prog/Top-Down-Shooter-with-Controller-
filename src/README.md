# `src/` source modules

`weapon-lab.html` imports these directly as ES modules (`<script type="module">`,
plain relative `import`s — no bundler, no build step). There is no more runtime
HTML patching anywhere in this repo: the old wrapper used to `fetch()` a copy of
the core page and string-replace pieces of it before running; that wrapper and
the core page it patched are retired to `archive/`.

- `weapons.js` — the Stone weapon order/definitions, plus `installRedTollGreatsword()`,
  which installs the Red Toll greatsword visual variant directly into a running
  lab instance.
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
declaring it. `rebuildCombatWeaponMesh` and `activeWeaponKind` get real
get/set pairs because `weapons.js` needs to reassign them — since the getter/
setter closes over the same variable the rest of the page already calls,
every existing call site keeps working with zero changes.

A few features that used to live in the page (Individual Moves' extension
points, the Red Toll rotation UI) are now small named hook points in
`weapon-lab.html` — e.g. `LabAPI.moveTest?.intercept?.(action)` at the top of
`labAction()` — that are inert until the matching module installs real
behavior into them. That replaces the old approach of patching the function
body's source text at load time.

## Extending this

Next natural seams to pull out, if this keeps growing: the attack/combat
system (`ATTACK_GROUPS`, `startCombatAttack`, hit detection), the actor rig
and IK, and the dungeon/prop builder. Follow the same pattern — a small
`installX(LabAPI)` in a new `src/` file, called once from `weapon-lab.html`.
