# Archive and reference boundary

Everything under `archive/` is historical reference material. It is not a
supported application surface and nothing in the live root links to it. The
only supported root experiences are `combat-arena.html` and `enemy-lab.html`,
with `index.html` as their launcher.

Archived pages may fail to load because they use old module APIs, inline
prototype assumptions, obsolete assets, or the retired wrapper approach. Their
filenames and imports are preserved so research remains searchable; they are
not instructions for the current runtime.

## Retired wrapper and donor snapshots

- `stone-wanderer-stance-chain-lab-wrapper.html` — the former fetch-and-patch
  lab wrapper. It is retained to document the pre-runtime architecture and is
  not a supported way to compose a page.
- `stone-wanderer-stance-chain-lab-core.html` — the raw pre-runtime core used
  by that wrapper.
- `stone-wanderer-individual-move-test.html` — donor for the old move-rating
  UI.
- `sound-foundry-retro-beasts.html` and `stone-lab-audio-test.html` — donor
  audio experiments.

## Archived demos

The former prototype pages are kept under `archive/demos/` as snapshots only:

```text
carapace-stalker-viewer.html
falcon-pilebunker-punch-lab-v2.html
fencer_hit_feel_lab_v3.html
fusion-lab-v2.html
hex-maze-lab.html
mace-goblin-sandbox-v2.html
melee_combat_director_lab_v6.html
pot-goblin-viewer.html
punch-lab.html
threejs_midair_lifted_ground_slice_v1.html
top-down-shooter.html
weapon-lab.html
```

The old `bent-world.js`, `carapace-stalker-rig.js`, `enemies.js`,
`enemy-attacks.js`, and `lab-modes.js` research boundary is described in
[`src/README.md`](../src/README.md). Preserve these snapshots unless a future
task explicitly migrates their useful behavior into the unified runtime.
