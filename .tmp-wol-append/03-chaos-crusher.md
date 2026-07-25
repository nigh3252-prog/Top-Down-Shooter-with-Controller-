# 16. Chaos Crusher

## Concrete source form

### Evidence

**[VIDEO — approximately 80–91 seconds]**

Chaos Crusher is a rapid three-beat sequence in which every beat has two linked phases.

For each beat:

1. A large black-violet chaos rift forms at short range in front of the caster.
2. The rift strikes the nearby area with a bright white contact flash.
3. The large rift compresses into a much smaller dark projectile.
4. The compressed projectile shoots forward along the aim lane.

The first phase is broad and proximal. The second is small, fast, and long-ranged.

The large rift does not travel through the room in its expanded state. The spell repeatedly creates a close-range mass, collapses it, and sends the compressed result onward.

This gives every beat two useful ranges:

- A nearby enemy can be struck by both the initial rift and the fired projectile.
- A distant enemy is reached only by the compressed projectile.

The showcase demonstrates the move repeatedly from both close and longer positions, emphasizing that dual-range identity.

**[DOCUMENTED]**

Chaos Crusher is a Chaos Basic Arcana with both melee and projectile subtypes. Its documented damage values are:

```text
Initial rift strike: 8
Compressed projectile: 6
```

The published hit count is six. Combined with the documented three-cast basic sequence, this supports two attack events per beat:

```text
3 beats × 2 phases = 6 hits
```

The compressed projectiles pass through enemies. All portions of the move count as both melee and projectile attacks, and they can destroy some enemy projectiles. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Chaos_Crusher))

Chaos Crusher has no enhanced state documented or demonstrated. Its source topology is fixed rather than having a normal/enhanced pair.

## Exact source recipe

```text
CHAOS CRUSHER

Input structure:
Three-beat basic combo

Per-beat phase 1:
Create large chaos rift at short forward offset
Rift immediately strikes nearby area
8 damage
15 knockback

Per-beat transformation:
Compress expanded rift into small chaos projectile

Per-beat phase 2:
Fire compressed projectile forward
6 damage
10 knockback

Projectile path:
Straight
Long range
Pierces enemies

Maximum complete-combo hit structure:
Three proximal rift hits
+ three compressed projectile hits
= six attack events

Subtype policy:
Every phase counts as melee
Every phase counts as projectile

Defensive interaction:
Can destroy some enemy projectiles

Enhanced mutation:
None documented
```

## Important distinction

Chaos Crusher is not:

```text
Melee attack
then an unrelated bonus projectile
```

Its source visual and behavior are a carrier transformation:

```text
Expanded Rift
→ compress
→ Fired Chaos Core
```

The second phase is the first phase converted into another spatial form.

## Source-faithful acceptance test

1. The complete combo contains three beats.
2. Every beat begins with one large short-range chaos rift.
3. The large rift itself produces an 8-damage attack event.
4. The expanded rift does not travel downrange.
5. Every rift visibly compresses before the ranged phase.
6. Every beat then fires one small 6-damage projectile.
7. The compressed projectile travels much farther than the initial rift reaches.
8. The projectile pierces enemies.
9. A close target can receive both phases of the same beat.
10. A distant target receives only the compressed projectile.
11. A full close-range combo can produce six source attack events.
12. All phases retain both melee and projectile subtype behavior.
13. No invented enhanced version is added.

## Units extracted from Chaos Crusher

### **Per-Beat Carrier Transformation**

One logical carrier changes form inside every combo beat.

```text
Expanded carrier
→ compression transition
→ small traveling carrier
```

### **Proximal-to-Distal Attack**

One activation covers close and long range through sequential phases rather than one oversized hitbox.

### **Same-Source Two-Phase Hit**

Both attack events are produced by the same visual object at different transformation states.

### **Hybrid Subtype Policy**

A spell component can intentionally participate in more than one interaction taxonomy:

```text
subtypes = [melee, projectile]
```

This policy applies to every phase, not only to the component that visibly travels.

### **Fixed-Topology Source Spell**

Not every arcana requires an enhancement mutation. The construction system must support source moves whose complete identity is already present in the base form.

---
