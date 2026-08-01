# Source Moves Prototype

A static, phone- and controller-friendly HTML5 top-down action prototype.

## Supported experiences

Only two game experiences are supported at the repository root:

- [`combat-arena.html`](combat-arena.html) — the playable Combat Arena. It combines the Stone Wanderer combat runtime, stance-card deck, director-driven encounters, deterministic hex rooms, room transitions, and touch/gamepad input.
- [`enemy-lab.html`](enemy-lab.html) — the Enemy Lab. It uses the same local runtime in lab mode and adds direct controls for enemy families, solo tests, matching packs, mixed waves, room sizing, tuning, deck editing, clearing, and repeat runs.

[`index.html`](index.html) is the small launcher for those two experiences. No other root HTML page is a supported application entry point.

## Unified runtime

Both live pages create one same-document runtime through native ES modules:

- `src/arena-runtime-config.js` resolves explicit mode and preserves the supported seed, layout, cell-size, tuning, Enemy Lab flags, URL compatibility, and existing storage keys.
- `src/arena-runtime.js` owns the arena, player, maze, encounters, deck, input, rendering, and lifecycle. Its explicit API includes `ready`, `start`/`stop`/`destroy`/`reset`, state setters, snapshots, control access, lab scenario methods, combat/deck actions, and `subscribe`.
- `src/arena-control-registry.js` publishes stable control descriptors and register/remove/change/invoke events. Consumers do not scrape arena DOM panels.
- `src/enemy-lab-controller.js` owns the Lab dock and calls the runtime directly for manual room `-777` scenarios, clear/repeat flows, result badges, and tuning.

Runtime context is injected into gameplay modules. The active graph has no child-page wrapper, DOM bridge, or production runtime globals.

## Static development

There is no bundler or build step. Serve the repository over HTTP(S) so native modules and the import map work:

```text
python -m http.server 4173
```

Then open `http://127.0.0.1:4173/` and choose Combat Arena or Enemy Lab. Opening the module pages through `file://` is not a supported setup.

Run the deterministic Node test suite with:

```text
npm test
```

The focused tests cover runtime configuration precedence, control registration and lifecycle, combat seams, maze/room behavior, deck persistence, and the wizard/Enemy Lab integrations.

## Current controls

The same controls are available in both experiences where the action applies:

- Move with the phone joystick, WASD/arrow keys, or the left stick.
- Light attack: on-screen LIGHT, `J`, Square/X, or the right trigger.
- Hold heavy attack: on-screen HEAVY, `L`, or Triangle/Y.
- Dodge: `K`, Cross/A, or the left trigger.
- Play the two stance cards with LB/RB or `Q`/`E`; shuffle with Circle/B or `R`.
- Cycle weapon with `X`; cycle stance with `T` as a development shortcut.
- Open or close the menu with `M` or `P`; use the fullscreen button in the page controls.

Enemy Lab additionally exposes its LAB dock for choosing an enemy and starting, clearing, repeating, or tuning a test. The dock closes while a test is active and can be reopened from the page control.

## Archive and reference policy

`archive/` contains historical prototypes, donor pages, and research snapshots only. They are not supported entry points, are not part of the live import graph, and may depend on obsolete APIs or assets. Keep them as reference material; extract a feature into the active runtime deliberately and add a focused test instead of reviving an archived wrapper.

See [`src/README.md`](src/README.md) for the active module boundary and [`archive/README.md`](archive/README.md) for the archive catalog.
