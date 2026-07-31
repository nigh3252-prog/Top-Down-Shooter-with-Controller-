# Combat Profiles

Combat Profiles save repeatable Combat Arena development environments.

## Profile contents

Each profile stores:

- Working Arena Roster
- Working Ability Pool
- ROSTER · Hades-Style Encounter mode
- native Hades spawn cadence
- enemy count multiplier
- enemy introduction speed
- Combat Director mode
- Pressure Budget
- aggression
- enemy speed
- enemy health
- enemy size
- idle range

The exact current two-slot deck and weapon are deliberately not stored. Those remain run/player decisions.

## Enemy Lab workflow

1. Open **PROFILES**.
2. Use **EDIT ENEMY ROSTER** to choose the enemies for the profile.
3. Use **EDIT ABILITY POOL** to choose starter-extra and room-reward availability.
4. Return to **PROFILES**.
5. Name and tune the environment.
6. Choose **SAVE & ACTIVATE**.
7. Open Combat Arena normally, or use the saved profile's **OPEN ARENA** button.

**SAVE & ACTIVATE** writes both the named snapshot and the current active environment. This means the selected roster, Ability Pool, enemy count, pressure, and other tuning carry into Combat Arena even when the user navigates there after saving rather than pressing **OPEN ARENA** immediately.

**LOAD & ACTIVATE** restores an older profile into the Enemy Lab development pools and makes it the current environment.

## Combat Arena behavior

Combat Arena applies the active profile before resetting the opening playable room. The opening encounter therefore uses the saved roster, enemy-count multiplier, Pressure Budget, director mode, and enemy tuning rather than applying those settings only after the room already exists.

Rat Step and Deep Launch remain the fixed run-foundation stances. Additional starting cards come from selected non-stance cards in the Working Ability Pool. Room-clear rewards stay inside the full selected Ability Pool. An empty pool preserves the legacy starter and reward lists.

All 46 Arcana retain their existing card objects and authored effect runtimes. Five early Arcana runtime families were originally restricted to the embedded Enemy Lab; the full Combat Arena now initializes those same implementations so their visuals, movement, damage, charges, and manual sequences resolve there as well.

## Active-profile detachment

Manual changes to the roster, Ability Pool, encounter count/introduction, Combat Director mode, pressure, aggression, speed, health, size, or idle range detach the active profile. The saved profile remains unchanged. Save the modified environment as a new profile or update the currently edited profile.
