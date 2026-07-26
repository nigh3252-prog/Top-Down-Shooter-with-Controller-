# 67. Water Prison

## Concrete source form

### Evidence

**[VIDEO â€” approximately 17:32.2â€“17:40.0 / 1052.2â€“1060.0 seconds]**

Water Prison begins as a compact pale-blue projectile emitted just in front of the caster. It travels in a straight aimed lane and becomes a much larger spherical shell only after contacting a target.

The captured target remains inside a translucent blue globe with a bright moving inner mass, a white-blue rim, and small orbiting droplets. The globe stays anchored to the target's contact position while periodic `5` damage numbers appear. The long attached lifetime is visually distinct from the brief incoming projectile.

The showcase also fires another Water Prison while an earlier prison is still visible. That establishes independent ammunition/instance ownership rather than a single global prison timer.

The visible sequence is:

```text
small straight bubble
â†’ first enemy contact
â†’ large target-attached spherical prison
â†’ repeated discrete 5-damage ticks
â†’ shell collapse and cleanup
```

**[DOCUMENTED]**

Water Prison is an ammo-type Water Standard Arcana with two base charges. The projectile attaches to the first enemy it hits, deals 15 impact damage, then resolves five 5-damage ticks for 40 total documented damage. The prison lasts roughly five to six seconds, prevents the target from moving or being displaced, and allows multiple prison instances to stack on one target. Enhancement adds one ammo charge and increases projectile speed. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Water_Prison))

## Exact source recipe

```text
WATER PRISON

Input structure:
Ammo cast
Base maximum: 2 charges

Emission:
Compact front-offset water bubble

Path:
Straight aim-snapshot lane

Collision:
Attach to first valid enemy contact
Miss expires without creating a remote prison

Impact:
Deal 15 damage once

Attached state:
Create large visible spherical prison around target
Save target contact position as lock anchor
Prevent target movement and displacement while prison owns the lock
End on authored duration or target death

Hit schedule:
Exactly 5 periodic ticks
5 damage per tick
Documented total with impact: 40

Stacking:
Each spent charge creates an independently timed prison instance
Several instances may attach to one target
Shared target remains locked until its final attached prison ends

Base lifetime:
Approximately 5â€“6 seconds

Enhanced mutation:
Maximum ammo becomes 3
Projectile travels faster
Damage and tick count do not change
```

## Source-faithful acceptance test

1. Base Water Prison exposes exactly two ammo charges.
2. Each activation spends one charge and creates one independently owned projectile.
3. The projectile travels straight from a front-offset emitter.
4. The projectile attaches only to the first valid enemy it contacts.
5. Contact creates one separately observable 15-damage impact event.
6. The incoming projectile transforms into a substantially larger target-attached spherical prison.
7. The prison remains visible for approximately five to six seconds unless the target dies.
8. The captured target cannot move or be displaced while at least one prison owns its lock.
9. Exactly five separately observable 5-damage ticks resolve per prison.
10. One prison therefore produces 40 documented total damage when every event lands.
11. Multiple charges can create independently timed prisons on the same target.
12. Removing one stacked prison does not release a target still owned by another prison.
13. Target death cleans every attached visual and lock without leaving stale control state.
14. Enhancement changes ammo capacity and projectile speed, not damage or tick count.
15. The previous 2.15-second repeated-stun prototype does not count as this implementation.

## Important distinction

Water Prison is a long position lock with a sparse authored damage schedule, not a short generic stun bubble. Damage, control ownership, ammo, stacking, and cleanup are separate systems.

The original Enemy Lab prototype had the correct broad contact-to-attachment idea, but it used one card as one untracked bubble, ticked rapidly for about 2.15 seconds, and ended in an invented final hit. The source-first replacement must use the two-charge resource, `15 + (5 Ã— 5)` schedule, long lock, and instance-safe stacking above.

## Units extracted from Water Prison

### **Attach-on-First-Contact Projectile**

A moving carrier that converts into a target-owned effect when it touches the first valid enemy.

### **Position-Lock Ownership**

A control effect saves an anchor and suppresses movement/displacement until the final owning instance releases it.

### **Stackable Attached Timers**

Several effects can share a target while preserving independent tick schedules, visuals, and cleanup.

### **Ammo Capacity Rewrite**

Enhancement changes charge capacity and delivery speed without silently changing the payload.

---
