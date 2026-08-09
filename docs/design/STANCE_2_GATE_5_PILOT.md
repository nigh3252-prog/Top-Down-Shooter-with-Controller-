# Stance 2.0 Gate 5 Defense Rollout

Gate 5 uses one Combat Arena defense input and three approved defense families. The original pilot stances remain the canonical behavior sources, while all 30 stance cards now choose one of those same families by stance ID.

- **Dodge** inherits Rat Step's existing Combat Arena dodge and stamina rule.
- **Parry** inherits Long Blade Form's timing, miss cost, success feedback, and attacker stagger.
- **Block** inherits Hammerfall Guard's kite-shield guard, frontal block, stamina conversion, and Guard Counter.

Defense family is independent of the stance's Light / Medium / Heavy attack class. A Heavy stance assigned Dodge still uses Heavy Stance 2.0 attack movement and pauses; only its defense button behavior changes.

## Assignment

| Weight | Dodge | Parry | Block |
| --- | ---: | ---: | ---: |
| Light | 3 | 3 | 1 |
| Medium | 3 | 5 | 2 |
| Heavy | 1 | 5 | 7 |
| **Total** | **7** | **13** | **10** |

### Light

- S14 Street Duelist — Block
- S16 Needle Line — Parry
- S18 False Invitation — Parry
- S19 Surgeon Ladder — Parry
- S23 Low Knife — Dodge
- S24 Rat Step — Dodge
- S25 Alley Fang — Dodge

### Medium

- S03 Iron Chapel — Block
- S11 Hasso Waltz — Dodge
- S12 Crescent Cut — Parry
- S13 Red Ribbon — Dodge
- S15 Open Palm Cut — Dodge
- S17 High Needle — Parry
- S20 Pike Drill — Block
- S22 Hook and Thrust — Parry
- S26 Long Blade Form — Parry
- S29 Crossguard Bloom — Parry

### Heavy

- S01 Hammerfall Guard — Block
- S02 Bell Ringer — Parry
- S04 Anvil Step — Block
- S05 Grave Mallet — Block
- S06 Split Oak — Block
- S07 Butcher Measure — Parry
- S08 Left-Hand Reaper — Parry
- S09 Deep Launch — Dodge
- S10 Guillotine Reel — Parry
- S21 Boar Spear — Block
- S27 Crown Splitter — Parry
- S28 Doorbreaker — Block
- S30 Spiral Oath — Block

## Dodge family

Dodge stances do not add a second sidestep system. Cross / LT / K delegates to the current Combat Arena dodge exactly as Rat Step does.

- An eligible dodge spends 12 stamina.
- Cooldown, movement-lock, and other eligibility checks happen before the spend.
- A positive reserve below 12 may Overdraw to zero and open Stance Catch.
- Starting from zero stamina cannot dodge.
- Playing a stance card during Catch continues to refill stamina through the existing rule.

## Parry family

- Tap defense to open a 0.22 second parry window.
- A hit during that window is negated and costs no stamina.
- A successful parry inflicts the existing significant 1.25 second stagger on the attacking enemy, cancels its current attack, and adds the short knockback/reaction.
- The successful cue uses the bright white-gold expanding ring, eight-spoke burst, enlarged pop, and stronger light flash.
- Missing the window costs 12 stamina and creates 0.32 seconds of recovery.
- A positive reserve below 12 may Overdraw on the miss and open Stance Catch.
- Starting from zero stamina cannot begin the parry attempt.

## Block family

Block stances use the existing Hammerfall kite-shield behavior.

- Tap defense to toggle the shield into frontal guard; tap again to lower it to the side.
- The shield remains raised without holding the defense button.
- Movement is reduced to 55% while guarding.
- Attacking moves the shield aside and temporarily removes its protection.
- Frontal protection uses a 120 degree arc.
- A successful block converts health damage into stamina cost.
- Block cost is the greater of 8 stamina or 1.5 stamina per incoming damage.
- A block may Overdraw from a positive reserve through the Gate 4 `stance-defense` source.
- Starting from zero stamina cannot block and causes guard break.
- Every successful block opens the existing 0.8 second Guard Counter window; pressing Heavy uses the current stance's heavy slot at full charge.

## Input routing

Combat Arena remains the sole owner of the defense button edge. Parry and Block consume the defense input. Dodge-family stances delegate to the existing `triggerDodge()` path, which requests the shared stance-defense stamina spend only after the dodge is eligible to begin.

## Damage pipeline

Resolution order remains:

1. Existing invulnerability checks inside the enemy system.
2. Gate 5 parry or shield evaluation.
3. Existing Arcana damage interception.
4. Remaining damage reaches player health.

## Validation

Automated coverage asserts the exact 30-card assignment, the Light / Medium / Heavy quotas, and off-sample runtime behavior for each family. Rat Step, Long Blade Form, and Hammerfall Guard remain regression anchors for the three canonical mechanics.

## Deferred

- Additional defense families beyond Dodge / Parry / Block.
- Weight-specific variants of those defenses.
- Shield running or shield strain as a second resource.
- Enemy-specific parry recoil, riposte, and counter animations.
