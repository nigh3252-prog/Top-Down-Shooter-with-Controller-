# Stance 2.0 Gate 5 Pilot

This pilot keeps one existing defense input while changing its behavior for three approved stances.

## Rat Step — existing dodge

Rat Step does not add a new sidestep system. Cross / LT / K continues to call the current Combat Arena dodge exactly as it did before Gate 5.

Other non-pilot stances also retain that existing dodge as their fallback defense.

## Long Blade Form — sword parry

- Tap defense to open a 0.22 second parry window.
- A hit during that window is negated.
- Missing the window creates 0.32 seconds of parry recovery.
- The parry replaces the dodge input only while Long Blade Form is active.

This first pilot validates timing and readability. Enemy-specific counter reactions are deferred until the basic parry feels correct.

## Hammerfall Guard — kite shield

Drafting or owning Hammerfall makes a basic kite shield visible on the character.

- Outside Hammerfall, the shield rests on the back.
- Entering Hammerfall moves it to the character's left side.
- Tap defense to toggle the shield up in front.
- Tap defense again to lower it to the left side.
- The shield remains raised without holding the defense button.
- Movement is reduced to 55% while guarding.
- Attacking moves the shield aside and temporarily removes its protection.

### Blocking

- Frontal protection uses a 120 degree arc.
- Rear and sufficiently off-angle attacks bypass the shield.
- A successful block converts health damage into stamina cost.
- Block cost is the greater of 8 stamina or 1.5 stamina per incoming damage.
- A block may use the Gate 4 `stance-defense` Overdraw source from a positive reserve.
- Starting from zero stamina cannot block and causes guard break.

### Guard Counter

- Every successful block opens a 0.8 second Guard Counter window.
- Pressing Heavy during that window starts the Hammerfall heavy attack.
- The attack is automatically set to full charge; the player does not need to hold Heavy.
- Its normal charged stamina spending and Gate 4 Overdraw behavior remain intact.

## Damage pipeline

Gate 5 publishes a proxy through the branch-local enemy registry. The proxy composes stance defense before the existing Arcana damage interceptor instead of replacing it.

Resolution order for this pilot:

1. Existing invulnerability checks inside the enemy system.
2. Gate 5 parry or shield evaluation.
3. Existing Arcana damage interception.
4. Remaining damage reaches player health.

## Deferred

- Card shuffling or Stamina Crash at zero.
- Shield running.
- Shield strain as a second resource.
- Enemy-specific parry recoil and riposte animations.
- Full / Adapted defense variations across the complete 3×3 matrix.
- Full rollout across all 30 stances.
