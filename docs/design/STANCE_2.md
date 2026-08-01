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

## Gate 3 — EXPERIMENTAL PILOT

Gate 3 gives each matched class a distinct rule payoff rather than one universal damage bonus.

### Light + Light — Mobile Expression

Rat Step + dagger retains at least 92% movement speed during normal attacks. The dagger remains focused and may cleave only with its fully charged finisher.

### Medium + Medium — Confirmed Form

Long Blade Form + longsword gains 0.35 seconds on the Light 1 follow-up window after a confirmed hit. Horizontal and vertical cuts may cleave; thrusts remain focused on one target.

### Heavy + Heavy — Breaking Form

Hammerfall + greatsword doubles weapon-zone stagger, establishes minimum stun thresholds, and allows all attacks to cleave. The fully charged finisher uses the stronger stun floor.

### Adapted cleave restrictions

Adapted pairings do not inherit the matched class's full privilege:

- Adapted Light weapons do not cleave.
- Adapted Medium and Heavy weapons cleave only on a fully charged finisher.
- Unusable pairings never cleave.

These values and exact rules are prototype tuning, not final balance.

## Deferred gates

### Gate 4

Exhaustion Catch, stance-transition timing, stumble/exhaustion failure, and final stamina-capacity tuning.

### Gate 5

Stance-specific defensive actions and full rollout across all 30 stances and the complete weapon roster.

## Follow-up animation work

GitHub issue #111 tracks a later polish pass for sword failure animations. The goal is stronger top-down silhouettes and exaggerated readable misuse, potentially informed by Smash Bros.-style animation language. It does not block Gate 3.
