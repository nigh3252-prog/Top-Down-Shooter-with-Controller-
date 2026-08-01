# Active `src/` module boundary

The supported root pages are native ES-module hosts. `combat-arena.html` creates
`arena-runtime.js` from `arena-runtime-config.js`; `enemy-lab.html` creates the
same runtime and passes it to `enemy-lab-controller.js`. There is no bundler,
build step, child-page wrapper, or page-source patching in the active path.

## Shared runtime pieces

- `arena-runtime-config.js` — pure mode/config resolution. Explicit `mode` wins over legacy query and pathname flags while retaining seed, layout, cell-size, tuning, Enemy Lab, and storage compatibility.
- `arena-runtime.js` — the single local owner of rendering, player combat, maze rooms, encounters, input, deck state, tuning controls, and lifecycle.
- `arena-control-registry.js` — stable control descriptors grouped for the runtime and Lab, with registration/removal and value/invocation events.
- `enemy-lab-controller.js` — same-document Lab presentation and scenario controller. It consumes runtime snapshots, control groups, and explicit lab methods; it does not inspect a second document.
- `player-combat.js`, `stance-deck.js`, `arena-enemies.js`, `fusion-enemies.js`, the wizard modules, and the maze/room modules — shared gameplay services reached through injected runtime context.
- `roadie-run.js`, `run-draft.js`, and the Enemy Lab editor/hotfix modules — optional UI/features installed by the runtime with explicit document and runtime references.

The useful runtime surface is:

```text
ready
start() / stop() / destroy() / reset()
setStarted() / setPaused() / setMenuOpen()
getSnapshot() / getControlGroups() / setControl() / invokeControl()
startLabScenario() / clearRoomRuntime()
beginTestSwing() / cycleWeapon() / cycleStance() / playCard() / startDeckShuffle()
subscribe(listener)
```

## Import and test boundary

The live entry graph starts at the two pages above. Node tests import pure
runtime seams and individual active modules directly; browser smoke pages under
`tests/` are test-only and are not additional supported experiences. Keep
relative imports local so the graph continues to work from a static server.

## Conservative archive/dead-code boundary

An import audit of the live pages and Node/browser tests found these older
modules outside the active runtime graph:

- `bent-world.js` is imported by the archived weapon-lab snapshots.
- `carapace-stalker-rig.js` is imported by the archived carapace viewer.
- `enemies.js` is the archived weapon-lab enemy implementation; its only active-looking dependency, `enemy-attacks.js`, is imported only by that archived module.
- `lab-modes.js` is imported by archived lab snapshots.

These files are retained as research/reference material and are not candidates
for deletion merely because the live roots do not import them. The live enemy
path is `arena-enemies.js` plus the current fusion, Flare, Hades, and encounter
modules. If an archived idea is needed again, port it intentionally into the
unified runtime with tests; do not widen the supported root surface.
