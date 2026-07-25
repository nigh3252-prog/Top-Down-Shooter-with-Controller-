# Wizard of Legend — Flame Strike reference

Status: authoritative source-test specification for the Enemy Lab prototype.

Evidence boundary: this entry is based only on the user-supplied Flame Strike analysis, including the cited video interval and documented values pasted into the project conversation. No additional behavior is being inferred from other arcana.

## Source identity

Flame Strike is a close-range, melee-classified basic arcana built as a three-beat repeat string:

```text
Compact frontal burst
→ Compact frontal burst
→ Stronger frontal burst
```

The third beat has an optional charge branch:

```text
Beat 3 reached
→ input released/tapped: normal 14-damage finisher
→ input still held: enter charge
→ release: enlarged 28-damage finisher
```

The defining rule is that every damaging shape is a brief caster-anchored plume. Flame Strike must not become a projectile, traveling ribbon, persistent wall, or independently moving fire object.

## Evidence summary

### Video-observed form

Approximate supplied showcase interval: `0:00–5:10`.

- The caster performs three close-range casts.
- Beat 1 creates a compact plume immediately in front of the caster.
- Beat 2 repeats the same broad action family with another compact plume.
- Beat 3 creates a visibly larger and stronger frontal plume.
- A later demonstrated string appears to hold the final beat before releasing a considerably larger blast.
- The fire expands and disappears as part of the casting action rather than traveling across the room.
- Several closely grouped targets can be caught in one plume.

### Documented values supplied for this pass

```text
Beat 1: 7 damage
Beat 2: 7 damage
Beat 3: 14 damage
Charged Beat 3: 28 damage, replacing the normal 14
```

The supplied enhanced mutation belongs only to the charged finisher:

- apply burn;
- destroy enemy projectiles.

Those enhanced mutations are documented in the card text but are not enabled in the first Enemy Lab implementation.

## Player promise

Stand close to a group, deliver two fast fire punches, then either release a stronger third plume immediately or accept a vulnerable charge commitment for a much larger blast.

## Exact construction recipe

```text
input:
  three-beat repeat string
  hold detection applies only when Beat 3 is reached

aim:
  sample current facing separately for each emitted plume
  charged plume samples aim at release

caster motion:
  no forced dash or teleport
  caster remains vulnerable during the charge

emitter:
  caster-anchored, forward-offset emitter

path:
  none
  each plume is created at its final footprint and does not travel

collision:
  immediate broad frontal area query
  each plume may hit several enemies once

hit schedule:
  Beat 1 -> 7
  Beat 2 -> 7
  Beat 3 tap -> 14
  Beat 3 hold/release -> 28 instead of 14

control:
  forward knockback
  stronger push on normal finisher
  strongest push on charged finisher

lifetime:
  very brief flash, expansion, ember, and soot cleanup

upgrade rewrite:
  enhanced charged finisher adds burn and projectile destruction
  ordinary hits remain unchanged
```

## Prototype input adaptation

One Enemy Lab card play begins the complete three-beat string.

For the charge branch:

- Touch: keep the card pressed through the third-beat decision point, then release.
- Controller: keep the corresponding LB or RB shoulder held through the third-beat decision point, then release.
- A quick press/release produces the ordinary third plume.
- Holding visibly delays the final release and displays a growing charge effect in front of the caster.
- The charge automatically releases at a safety cap if the input remains held too long.

The card is still consumed when the string begins, because the existing Enemy Lab deck runtime replaces a played card immediately. The charge tracker therefore follows the physical input that initiated the card rather than the card currently displayed in that slot.

## Timing target

First-pass test timing:

```text
0.06 s: Beat 1
0.28 s: Beat 2
0.50 s: Beat 3 decision

Tap path:
0.50 s: normal finisher

Hold path:
0.50 s: enter charge
release or maximum hold: charged finisher
```

These are prototype tuning values, not claims of exact source frame data.

## Footprint

All footprints are broad, rounded forward plumes.

### Beats 1 and 2

- compact range;
- enough width to catch a small close group;
- low commitment;
- identical damage and near-identical footprint.

### Normal Beat 3

- noticeably longer and wider;
- larger visual volume;
- stronger knockback;
- 14 damage.

### Charged Beat 3

- substantially longer and wider than the normal finisher;
- expanded enough that the transformation is immediately legible on a phone;
- 28 damage;
- longest commitment;
- no invulnerability or armor is granted by the charge.

## Visual package

### Main plume

Each burst uses layered fire rather than a single transparent cone:

1. pale yellow-white impact core;
2. thick gold/orange main body;
3. darker orange outer flame lobes;
4. brief low floor glow;
5. soot and ember remnants after the main flash.

The shape should feel like a rounded explosion pushed forward from the caster, not a clean laser cone.

### Impact

A struck target receives a forceful white flash centered on its body. The flash expands rapidly and fades before the plume fully disappears.

### Charge

The charged finisher displays a growing hot core and rotating ground ring at the emitter position. The effect remains attached to the caster's current facing while held. It must clearly communicate that the final hit has not yet happened.

### Relative emphasis

```text
Beat 1 visual scale: 1.00
Beat 2 visual scale: 1.00
Beat 3 visual scale: about 1.28
Charged visual scale: about 1.72 before global Arcana Size
```

## Arcana Tweaks interaction

Arcana Size scales:

- visible plume dimensions;
- hit footprint range and width;
- charge indicator scale;
- impact-flash scale.

Arcana Damage scales:

- 7-damage ordinary hits;
- 14-damage normal finisher;
- 28-damage charged finisher.

Neither tweak changes:

- beat cadence;
- charge duration;
- player vulnerability;
- knockback;
- input rules.

## Acceptance tests

A correct first implementation must satisfy all of the following:

1. Flame Strike appears in the Wizard Arcana card family.
2. One card play begins a three-beat string.
3. Beats 1 and 2 each create one compact caster-anchored plume.
4. The ordinary third plume is larger and deals 14 rather than 7.
5. No plume becomes an independent moving projectile.
6. A quick card input produces the normal third beat.
7. Holding the initiating touch card or shoulder through Beat 3 visibly enters charge.
8. Releasing during charge creates one enlarged 28-damage finisher and does not also create the normal 14-damage finisher.
9. The caster receives no invulnerability while charging.
10. Each plume can hit several nearby enemies.
11. Each target is hit at most once by each individual plume.
12. Charged range and width are substantially larger than the normal finisher.
13. Arcana Size changes footprint and visuals without changing damage or timing.
14. Arcana Damage changes all four documented damage values without changing footprint or timing.
15. Enhanced burn and projectile destruction remain isolated from ordinary hits when added later.
