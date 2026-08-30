# Enemy Lab Ecctrl sandbox

This directory builds the optional locomotion sandbox loaded by `enemy-lab.html`.
It is deliberately a separate bundle because Saturn's Gravity currently runs
vanilla Three.js 0.165, while Ecctrl runs React Three Fiber, Rapier, and Three.js
0.184.

The vendored controller source and `media/ecctrl/AnimationLibrary.glb` come from
`pmndrs/ecctrl` commit `55776ca343d8c59a4c27cdd80074e54c0cbcaae8`
(`agent/backbone-playtest`). Ecctrl is MIT licensed. See the copied LICENSE and
NOTICE files in `public/` for attribution and animation-asset provenance.

Build the browser artifact after changing this source:

```sh
npm ci
npm run typecheck
npm run build
```

The generated `../ecctrl-lab/` output is intentionally committed because the
game is served as static files and has no deployment-time application build.
