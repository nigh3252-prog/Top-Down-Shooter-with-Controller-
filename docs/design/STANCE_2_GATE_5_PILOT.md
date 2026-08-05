# Stance 2.0 Gate 5 Pilot

This pilot keeps one existing defense input while changing its behavior for three approved stances.

## Rat Step — existing dodge

Rat Step does not add a new sidestep system. Cross / LT / K continues to call the current Combat Arena dodge exactly as it did before Gate 5.

- A successful Rat Step dodge spends 12 stamina.
- Cooldown, movement-lock, and other eligibility checks happen before the spend, so a rejected dodge does not consume stamina.
- A positive reserve below 12 may Overdraw, reaches zero, and opens the ordinary Stance Catch.
- Starting from zero stamina cannot dodge.
- Playing a stance card during Catch continues to refill stamina through the existing rule.

Other non-pilot stances retain the existing dodge as their fallback defense and remain free in this representative pilot. Their defensive costs are deferred to the full stance-defense rollout.

## Long Blade Form — sword parry

- Tap defense to open a 0.22 second parry window.
- A hit during that window is negated.
- Missing the window creates 0.32 seconds of parry recovery.
- The parry replaces the dodge input only while Long Blade Form is active.
- Opening the window creates a small blue-white burst around the player.
- Successfully deflecting a hit creates a larger white-gold confirmation burst.

The parry deliberately uses this lightweight burst rather than authored sword posing or a new animation rig. Enemy-specific recoil, riposte, and counter animations remain deferred until the basic timing feels correct.

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

## Input routing

Combat Arena owns the defense button edge. K and Cross / LT call one `defenseDown()` seam. Long Blade and Hammerfall consume that input; Rat Step falls through to the existing `triggerDodge()` implementation, which requests the Rat Step stamina spend only after the dodge is eligible to begin. Non-pilot stances retain the unchanged fallback dodge. Gate 5 does not add keyboard listeners, start a second gamepad loop, or manipulate the built-in dodge cooldown.

## Damage pipeline

The existing arena enemy-system object keeps a stable identity. It exposes a prioritized registered-interceptor API for stance defense while preserving `setPlayerDamageInterceptor()` as the legacy Arcana slot. No proxy is published through the enemy registry, and `damageEnemy()` is never repatched by Gate 5.

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
- Defensive stamina costs for the remaining stance families.
- Full rollout across all 30 stances.
