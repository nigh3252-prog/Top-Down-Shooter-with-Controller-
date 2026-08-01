# Archive

Retired HTML pages are kept here for historical reference only. Nothing in the
live repo links to them. Archived pages are not maintained as runnable app entry
points and may fail to load because they depend on obsolete module APIs, inline
prototype assumptions, or removed assets.

- `archive/stone-wanderer-stance-chain-lab-wrapper.html` — the old official lab entry
  point. It worked by fetching the core page below, string-patching its HTML at
  load time (weapon injection, Red Toll tuning UI, lab modes, audio hooks), and
  running the result in an iframe. It was later superseded by the now-archived
  `archive/demos/weapon-lab.html`. **This wrapper no longer runs** — it expects
  old `src/` module APIs (patch-string exports) that were rewritten.
- `archive/stone-wanderer-stance-chain-lab-core.html` — the raw core the wrapper
  patched, including the bent-horizon integration pass. Superseded by the
  later weapon lab and retained only as source reference.
- `archive/stone-wanderer-individual-move-test.html` — donor/reference for the move
  rating UI, since merged into `src/lab-modes.js`.
- `archive/sound-foundry-retro-beasts.html` — donor/reference for procedural audio
  recipes behind `src/combat-audio.js`.
- `archive/stone-lab-audio-test.html` — old audio hook test page.

## Archived root demos

These pages were formerly root-level prototypes, viewers, and labs. They are
preserved as source snapshots under `archive/demos/`; they are historical
references and are not required to remain runnable.

- `archive/demos/carapace-stalker-viewer.html`
- `archive/demos/falcon-pilebunker-punch-lab-v2.html`
- `archive/demos/fencer_hit_feel_lab_v3.html`
- `archive/demos/fusion-lab-v2.html`
- `archive/demos/hex-maze-lab.html`
- `archive/demos/mace-goblin-sandbox-v2.html`
- `archive/demos/melee_combat_director_lab_v6.html`
- `archive/demos/pot-goblin-viewer.html`
- `archive/demos/punch-lab.html`
- `archive/demos/threejs_midair_lifted_ground_slice_v1.html`
- `archive/demos/top-down-shooter.html`
- `archive/demos/weapon-lab.html`
