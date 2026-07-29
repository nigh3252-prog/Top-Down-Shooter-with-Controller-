# Combat Profiles

Combat Profiles are the final development handoff between Enemy Lab and Combat Arena.

## Saved profile contents

Each profile stores:

- Working Arena Roster enemy IDs
- Working Ability Pool card IDs
- Roster Hades-style encounter mode
- Native Hades spawn cadence
- Enemy-count multiplier
- Enemy-introduction speed
- Combat Director mode
- Pressure Budget
- Aggression
- Enemy speed
- Enemy health
- Enemy size
- Idle range

The current two-slot test deck and weapon selection are not stored. They remain run/player choices.

## Enemy Lab workflow

1. Build the Working Arena Roster.
2. Build the Working Ability Pool.
3. Open **PROFILES**.
4. Name and tune the profile.
5. Choose **SAVE PROFILE**.
6. Choose **OPEN ARENA** on a saved profile.

**LOAD** restores a profile into Enemy Lab without navigating away. A loaded profile can be updated or saved as a new profile.

## Combat Arena behavior

Opening a profile applies its enemy roster and tuning to **ROSTER · Hades-Style Encounter**.

Rat Step and Deep Launch remain the fixed starter stances. The Working Ability Pool controls:

- non-stance cards offered during run setup
- all room-clear reward cards

An empty Working Ability Pool preserves the legacy run offers and reward pool.

Manual changes detach the active profile rather than being overwritten on the next load. The changed roster, pool, and tuning can then be saved as another profile.
