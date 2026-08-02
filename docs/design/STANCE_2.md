# Stance 2.0

> Working design and implementation reference for stance/weapon weight compatibility. Read with `GAMEPLAY_CORE.md`, `COMBAT_TERMS.md`, and `DESIGN_FRONTIER.md`.

## Core model

Weapons and stances each belong to **Light**, **Medium**, or **Heavy** classes.

- **FULL:** stance and weapon classes match.
- **ADAPTED:** the classes are one step apart. The character uses a compromised technique such as half-swording, choking up, bracing, or shortening the motion.
- **UNUSABLE:** the classes are two steps apart. The character performs a readable failed-use motion instead of a real attack.

The stance represents embodied RPG attributes such as handling, leverage, commitment, and training. Weapons remain universally equippable; there are no conventional Strength or Dexterity requirements.

## Gate 1 — CURRENT

All 30 stance cards are classified as Light, Medium, or Heavy. Enemy Lab exposes the full 3×3 compatibility matrix and current pairing.

Gate 1 is diagnostic and shared infrastructure. Preferred-weapon metadata remains separate from weight compatibility.

## Gate 2 — CURRENT PILOT

The first playable 3×3 slice uses:

- Rat Step — Light stance
- Long Blade Form — Medium stance
- Hammerfall Guard — Heavy stance
- Dagger — Light weapon
- Longsword — Medium weapon
- Greatsword — Heavy weapon

### Full expression

Matching pairs keep the stance-authored three-move chain and use stance-dominant cadence.

### Adapted expression

One-class mismatches receive alternate compact moves, modified grip, shortened effective reach, and reduced damage/stagger.

### Failed expression

Two-class mismatches use authored failed-use animations, create no damaging weapon hit zones, cannot charge their heavy input, and retain meaningful recovery.

## Gate 3 — CURRENT PILOT

Gate 3 gives each matched class a distinct rule payoff rather than one universal damage bonus.

### Light + Light — Mobile Expression

Rat Step + dagger remains fully mobile during normal attacks and has no post-swing movement penalty. The dagger remains focused and may cleave only with its fully charged finisher.

### Medium + Medium — Confirmed Form

Long Blade Form + longsword gains 0.35 seconds on the Light 1 follow-up window after a confirmed hit. Horizontal and vertical cuts may cleave; thrusts remain focused on one target.

### Heavy + Heavy — Breaking Form

Hammerfall + greatsword doubles weapon-zone stagger, establishes minimum stun thresholds, and allows all attacks to cleave. The fully charged finisher uses the stronger stun floor.

### Nine-pair movement commitment

Weapon weight establishes how much momentum must be recovered. Stance affinity determines how cleanly the character manages that momentum. Movement profiles affect both the active swing and the brief period after it ends.

| Pair | Active swing | Post-swing recovery |
| --- | --- | --- |
| Rat Step + dagger | Mobile | None |
| Rat Step + longsword | Walk | 0.22 sec settling recovery |
| Rat Step + greatsword | Failure animation | Authored failure recovery only |
| Long Blade Form + dagger | Mobile preparation, committed contact | 0.18 sec settling recovery |
| Long Blade Form + longsword | Controlled walk | 0.25 sec modest recovery |
| Long Blade Form + greatsword | Slow adjustment, planted contact | 0.42 sec recovery; first 0.12 sec fully stopped |
| Hammerfall + dagger | Failure animation | Authored failure recovery only |
| Hammerfall + longsword | Planted contact | 0.32 sec recovery; first 0.10 sec fully stopped |
| Hammerfall + greatsword | Slow setup, complete plant | 0.50 sec recovery; first 0.18 sec fully stopped |

After the fully stopped portion, planted recoveries smoothly accelerate back to full movement rather than switching instantly. Failure pairs do not receive an additional generic movement lock on top of their authored failure animation.

Dodge-cancel timing is intentionally unchanged in this movement pass. It should be tuned after the movement and recovery profiles are evaluated so the two variables can be judged separately.

### Adapted cleave restrictions

Adapted pairings do not inherit the matched class's full privilege:

- Adapted Light weapons do not cleave.
- Adapted Medium and Heavy weapons cleave only on a fully charged finisher.
- Unusable pairings never cleave.

## Gate 4 — EXPERIMENTAL PILOT

Gate 4 makes reaching zero stamina an active stance-transition test rather than passive waiting.

### Exhaustion Catch

- Spending the final available stamina opens a **0.72-second** catch window.
- When a landed attack leaves less stamina than the cheapest move in the active stance/weapon pairing, that unusable remainder is folded into the swing and treated as zero. This prevents Exhaustion Catch frequency from depending on whether costs divide evenly into 100.
- The folded remainder joins the swing's refundable spend, so a whiff restores it rather than silently deleting stamina.
- Playing a true stance card during the window succeeds, changes stance through the ordinary card path, and restores stamina through the existing full-refill rule.
- Ability and modifier cards do not count as a catch.
- A successful catch clears outstanding post-swing movement recovery so the transition reads as clean continuation.
- A whiff that creates recoverable stamina cancels the catch. Missing an attack should not create an exhaustion punishment when its stamina is already being refunded.

### Missed timing

- When the catch window expires, the miss waits for the committed attack to finish before applying the stumble.
- Failure creates a **3.0-second attack lock**.
- The first **0.35 seconds** are a pronounced stumble at sharply reduced movement.
- Movement then accelerates smoothly back toward full speed over the remaining lock duration.
- Dodge remains available and is not slowed by the stumble curve.
- Stance cards remain playable, allowing stamina recovery, but a late card does not erase the already-missed timing penalty.
- Dodging does not cancel the attack lock; the Gate 4 runtime reapplies its owned lock after the ordinary dodge chain reset.

### Current stamina scope

The prototype retains the current 100-point stamina capacity and current weapon-class costs. Capacity should be tuned only after the catch timing and failure severity are judged in play. This avoids changing both the frequency and the consequence of exhaustion in the same pass.

There is still no ordinary passive stamina regeneration.

## Deferred gate

### Gate 5

Stance-specific defensive actions and full rollout across all 30 stances and the complete weapon roster.

## Follow-up animation work

GitHub issue #111 tracks a later polish pass for sword failure animations. The goal is stronger top-down silhouettes and exaggerated readable misuse, potentially informed by Smash Bros.-style animation language.
