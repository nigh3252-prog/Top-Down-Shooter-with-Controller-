---

# Next five abilities

The exact next five arcana shown after Ice Dagger are:

1. **Rip Tide**
2. **Aqua Arc**
3. **Chaos Crusher**
4. **Searing Rush**
5. **Flare Rush**

The analyses below continue to treat the current prototype implementations as irrelevant. They reconstruct the source move first, then extract reusable conceptual units from that reconstruction.

# 14. Rip Tide

## Concrete source form

### Evidence

**[VIDEO — approximately 69–75 seconds]**

Rip Tide is a one-input, rapid three-ripple sequence.

The caster plants in place and releases three pale-blue water ripples one after another along a fixed forward lane:

- Each ripple is a separate moving water shape.
- Each has a broad crescent or curved-sheet silhouette rather than a spherical body.
- White foam and spray define the leading edge.
- The three emissions arrive in very quick succession.
- The caster does not visibly retarget between them.
- The sequence completes automatically after the initial input.

The enhanced demonstration preserves the first two central ripples. On the final emission, two additional side ripples appear with the central ripple, creating a three-way spread.

The move reads as a compact defensive burst: the player commits to one direction, rapidly fills that lane with piercing water, and uses the final spread to widen the protected area.

**[DOCUMENTED]**

Rip Tide is a Water Basic Arcana with projectile subtype. One input performs the entire three-ripple combo, and the sequence cannot be interrupted or redirected once it begins. The caster cannot move or adjust aim during the animation.

The three base ripples deal:

```text
Ripple 1: 8
Ripple 2: 7
Ripple 3: 5
```

Each ripple pierces enemies and destroys enemy projectiles that it contacts.

When enhanced, the final emission gains two additional ripples that spread outward in an arc. This produces five total ripple hits per sequence and allows multiple final ripples to connect at very close range. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Rip_Tide))

## Exact source recipe

```text
RIP TIDE

Input structure:
One press begins one complete three-emission sequence

Commitment:
Sequence is uninterruptible once started
Caster cannot move during sequence
Aim cannot change during sequence

Aim:
Snapshot direction at activation
Use that direction for every emission

Carrier:
Independent traveling water ripple

Visual form:
Broad crescent or curved sheet
Pale-blue body
Bright foaming leading edge
Short spray breakup on expiration or contact

Path:
Short straight forward lane

Contact:
Pierces enemies
Destroys enemy projectiles
Continues after enemy contact

Emission schedule:
Emission 1: one central ripple, 8 damage
Emission 2: one central ripple, 7 damage
Emission 3: one central ripple, 5 damage

Enhanced final emission:
Central final ripple
+ one outward-angled side ripple
+ mirrored outward-angled side ripple

Enhanced total:
Five ripple carriers across the complete sequence
```

## Important distinction

Rip Tide is not a normal three-button basic combo.

```text
Normal combo-cast:
Press → Beat 1
Press → Beat 2
Press → Beat 3

Rip Tide:
Press once
→ Ripple 1
→ Ripple 2
→ Ripple 3 automatically
```

The inability to move or update aim is part of its source behavior, not an incidental animation limitation. It is the cost paid for an extremely fast, defensive, projectile-clearing sequence.

## Source-faithful acceptance test

1. One button press always begins the complete three-emission base sequence.
2. Additional presses are not required to advance the sequence.
3. The caster cannot move while the sequence is executing.
4. The aim direction is captured at activation and remains fixed.
5. The base version releases exactly three separate ripple carriers.
6. Their damage order is 8, then 7, then 5.
7. Every ripple continues through enemies.
8. Every ripple can destroy enemy projectiles it contacts.
9. The enhanced version leaves the first two emissions unchanged.
10. The enhanced final emission contains three simultaneous ripples.
11. The two added final ripples spread to opposite sides.
12. Rip Tide does not become a continuous beam or a lingering water field.

## Units extracted from Rip Tide

### **One-Press Authored Sequence**

One activation schedules several separate emissions without requesting another input.

```text
Activate
→ Emission A
→ Emission B
→ Emission C
```

### **Locked-Aim Commitment**

The sequence uses an aim snapshot and rejects later movement or aim updates until it ends.

```text
activationDirection = currentAim
movement = locked
aimUpdates = ignored
```

### **Defensive Piercing Volley**

The same carriers both damage enemies and erase hostile projectiles while continuing forward.

### **Final-Emission Fan Expansion**

Enhancement mutates only the final scheduled emission:

```text
Base final:
Center

Enhanced final:
Left + Center + Right
```

---
