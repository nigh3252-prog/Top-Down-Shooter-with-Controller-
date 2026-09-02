# Enemy Lab Ecctrl sandbox

This directory builds the optional locomotion sandbox loaded by `enemy-lab.html`.
It is deliberately a separate bundle because Saturn's Gravity currently runs
vanilla Three.js 0.165, while Ecctrl runs React Three Fiber, Rapier, and Three.js
0.184.

The sandbox also layers the shared Warden attack interpreter over the Ecctrl
mannequin. The visible Warden puppet is not mounted: one generic adapter applies
the procedural hip/spine/head pose to the mannequin and drives every shared
weapon through the existing weapon definitions and mesh builder. Press J,
Square, R2, or the touch ATTACK button to cycle an overhead, crosscut, and
thrust. The on-screen fit controls adjust the whole weapon attachment height
and the shared weapon scale.

The sandbox mounts The Wrinkeler through the shared world-sprite enemy layer.
`arena-runtime` injects a narrow bridge which snapshots the actual enemy-system
instances into the R3F scene. While Saturn is paused, that bridge advances their
existing AI against the Ecctrl Warden position with player damage disabled, so
movement, attacks, health, and puppet animation stay authoritative. If no 2D
enemy scenario is active, entering Ecctrl starts a two-Wrinkeler depth scenario
and places those real instances on opposite sides of the Warden.

The puppet remains one five-part canvas composition, but the canvas is a
depth-tested Three.js texture inside the same scene—not a DOM overlay.
Additional 2D enemies can add artwork definitions to that layer without
creating another renderer or sorting path; both surfaces consume the same
`world-sprite-enemy-registry.js` definition list.

The vendored controller source and `media/ecctrl/AnimationLibrary.glb` come from
`pmndrs/ecctrl` commit `55776ca343d8c59a4c27cdd80074e54c0cbcaae8`
(`agent/backbone-playtest`). Ecctrl is MIT licensed. See the copied LICENSE and
NOTICE files in `public/` for attribution and animation-asset provenance.

Build the browser artifact after changing this source:

```sh
npm ci
npm run typecheck
npm run verify:combat
npm run build
```

The generated `../ecctrl-lab/` output is intentionally committed because the
game is served as static files and has no deployment-time application build.
