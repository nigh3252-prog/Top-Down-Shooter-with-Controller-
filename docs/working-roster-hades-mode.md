# Working Roster Hades-Style Encounter Mode

Enemy Lab's saved Working Arena Roster can drive a separate Combat Arena encounter mode.

## Workflow

1. Open `enemy-lab.html`.
2. Open **ROSTER**.
3. Select any enemies you want in the current combat-development pool.
4. Choose **OPEN COMBAT ARENA**.
5. Combat Arena opens with **ROSTER · Hades-Style Encounter** selected.

The same mode is also available from Combat Arena's enemy selector.

## Controls

- **HADES-STYLE ENEMY COUNT** changes the total planned population.
- **HADES-STYLE ENEMY INTRODUCTION** changes how quickly later or harder enemy types become eligible. It does not change reinforcement timing.
- **PRESSURE BUDGET** separately controls simultaneous attack pressure through the Combat Director. It does not change reinforcement timing.

## Native Hades reinforcement cadence

Native Hades enemies keep their existing queue. Original and FLARE roster enemies now use the same native Hades fallback cadence rather than the earlier approximation:

- exactly two spawn rings can telegraph at once
- the active-weight ceiling is `max(2.5, planned count × 0.65)`
- each enemy type obeys its catalog `maxActive` / `maxCount` limit
- the default preview lasts `.72` seconds
- the ring uses the native Hades pulse, growth, rotation, and opacity timing
- the ring appears before the model joins the scene
- queued reinforcements release as active capacity opens

The earlier Original/FLARE spawn adapter is explicitly disabled while roster mode is active. Hades remains the source behavior; the other runtimes now follow its cadence rules directly.

## Current behavior

- The saved roster constrains which individual enemy types are eligible.
- Hades-style budget, introduction, compatibility, and count rules compose the encounters.
- Compatible Goblin types and Lugaru can share one Original-runtime encounter.
- Original, FLARE, and Hades enemies follow the Hades reinforcement cadence in roster mode.
- The shared enemy-count control supports 1×, 2×, 5×, and 10× roster populations.
- An enemy marked **Lab Only**, such as the current Lion, appears only when deliberately selected.
- An empty roster falls back to **ALL · Budgeted Encounter** so a room cannot become uncleared.
- Existing All Enemies and Tartarus Mix modes remain available and keep their existing behavior.

## Population caps

The roster multiplier scales each selected encounter group, with a temporary safety cap of **20 bodies per participating runtime**:

- Original runtime: up to 20 bodies shared across selected Original types.
- FLARE runtime: up to 20 bodies of the selected type.
- Hades runtime: up to 20 bodies of the selected type in roster mode.

A two-runtime roster encounter can therefore reach roughly 40 bodies. Native **HADES · Tartarus Mix** remains the separate extreme stress-test path with its larger queued population support.

## Current limitation

Same-runtime multi-type composition is currently enabled for the Original runtime only. Multiple FLARE types and multiple Hades types through the mixed-runtime roster adapter remain later steps.
