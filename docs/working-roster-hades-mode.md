# Working Roster Hades-Style Encounter Mode

Enemy Lab's saved Working Arena Roster can drive a separate Combat Arena encounter mode.

## Workflow

1. Open `enemy-lab.html`.
2. Open **ROSTER**.
3. Select any enemies you want in the current combat-development pool.
4. Choose **OPEN COMBAT ARENA**.
5. The full Combat Arena opens with **ROSTER · Hades-Style Encounter** selected.

The mode is also available directly from Combat Arena's enemy selector.

## Current behavior

- The saved roster constrains which individual enemy types are eligible.
- Hades-style budget, introduction, compatibility, and difficulty-ramp rules compose the encounters.
- Original and FLARE enemies receive visible spawn rings before entering combat; Hades enemies retain their native spawn telegraphs.
- The shared **HADES-STYLE ENEMY COUNT** control supports 1×, 2×, 5×, and 10× roster populations.
- The shared **HADES-STYLE DIFFICULTY RAMP** control supports Slow, Medium, and High progression.
- In roster mode, the Combat Director stays enabled. **PRESSURE BUDGET** remains a separate control for simultaneous attack pressure rather than total bodies.
- An enemy marked **Lab Only**, such as the current Lion, appears only when deliberately selected.
- An empty roster falls back to **ALL · Budgeted Encounter** so a room cannot become uncleared.
- Existing All Enemies and Tartarus Mix modes remain available and keep their existing behavior.

## Population caps

The roster multiplier scales each selected encounter group, with a temporary safety cap of **20 bodies per participating runtime**:

- Original runtime: up to 20 bodies of the selected type.
- FLARE runtime: up to 20 bodies of the selected type.
- Hades runtime: up to 20 bodies of the selected type in roster mode.

A two-runtime roster encounter can therefore reach roughly 40 bodies. Native **HADES · Tartarus Mix** remains the separate extreme stress-test path with its larger queued population support.

## Current limitation

Only one enemy type from each underlying runtime system can be composed into the same room. Selected enemies from the same system rotate between encounters rather than appearing together. Native same-system multi-type routing is the next architecture step.
