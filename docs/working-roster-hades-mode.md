# Working Roster Hades-Style Encounter Mode

Enemy Lab's saved Working Arena Roster can now drive a separate Combat Arena encounter mode.

## Workflow

1. Open `enemy-lab.html`.
2. Open **ROSTER**.
3. Select any enemies you want in the current combat-development pool.
4. Choose **START HADES-STYLE**.
5. Combat Arena restarts using only those selected enemies as eligible encounter types.

The same mode is also available from Combat Arena's enemy selector as **ROSTER · Hades-Style Encounter**.

## Current behavior

- The ordinary Hades-style budget, introduction, compatibility, and count arc is preserved.
- The saved roster constrains which individual enemy types are eligible.
- An enemy marked **Lab Only**, such as the current Lion, appears only when it was deliberately selected.
- An empty roster falls back to **ALL · Budgeted Encounter** so a room cannot become uncleared.
- Existing All Enemies and Tartarus Mix modes are unchanged.

## Current limitation

Only one enemy type from each underlying runtime system can be composed into the same room. Selected enemies from the same system rotate between encounters rather than appearing together. Native same-system multi-type routing is the next architecture step.
