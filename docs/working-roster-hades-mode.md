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

## Reinforcement flow

Native Hades enemies keep their queued spawn-ring system. Original and FLARE roster enemies use a matching adapter:

- the preview ring appears by itself before the enemy model enters
- queued models are detached from the scene during the preview countdown
- two spawn rings can telegraph at once
- nearby suitable authored spawn points are prioritized for the next cohort
- the active on-screen weight ceiling is approximately 65% of that runtime's planned population
- the remaining enemies stay in reserve
- new reinforcement rings begin as active enemies die and capacity opens
- active enemies keep fighting while later enemies telegraph
- Gradual, Faster, and Fast introduction settings all use the same reinforcement cadence

Higher count settings therefore raise both the population visible during the main fight and the size of the reserve wave without dumping the entire batch into the room simultaneously.

## Current behavior

- The saved roster constrains which individual enemy types are eligible.
- Hades-style budget, introduction, compatibility, and count rules compose the encounters.
- Original and FLARE enemies use the ring-first, model-second presentation; Hades enemies retain their native spawn telegraphs.
- The shared enemy-count control supports 1×, 2×, 5×, and 10× roster populations.
- An enemy marked **Lab Only**, such as the current Lion, appears only when deliberately selected.
- An empty roster falls back to **ALL · Budgeted Encounter** so a room cannot become uncleared.
- Existing All Enemies and Tartarus Mix modes remain available and keep their existing behavior.

## Population caps

The roster multiplier scales each selected encounter group, with a temporary safety cap of **20 bodies per participating runtime**:

- Original runtime: up to 20 bodies shared across the selected Original types.
- FLARE runtime: up to 20 bodies of the selected type.
- Hades runtime: up to 20 bodies of the selected type in roster mode.

A two-runtime roster encounter can therefore reach roughly 40 bodies. Native **HADES · Tartarus Mix** remains the separate extreme stress-test path with its larger queued population support.

## Current same-runtime support

The Original runtime can compose up to three compatible selected types in one room, including Goblin Grunt, Dagger, Mace, Rock Thrower, Captain, and Lugaru Duelist. Those selected types share the single 20-body Original cap and the same staggered reinforcement queue.

FLARE and Hades are still limited to one selected type from their runtime in the mixed-roster adapter. Expanding those runtimes is a later step.
