---

# 25. Snare Track

## Concrete source form

### Evidence

**[VIDEO — approximately 147.4–151.3 seconds]**

Snare Track is a forward dash that releases three thorny vine lines behind the caster in a widening V formation.

In the base demonstration:

- The caster dashes forward through the target group.
- Three separate vine carriers emerge in the wake.
- The center vine follows the dash axis.
- The two outer vines spread away from that center line as they travel behind the caster.
- Targets touched by a vine take one 20-damage hit and become wrapped in visible roots or vines.
- The entangled targets remain able to attack even though they cannot move, a behavior called out directly in the showcase text.

In the enhanced demonstration, the vine formation continues into the space in front of the caster. The forward portions move inward rather than continuing to spread, giving the complete formation a divergence-then-convergence shape around the dash.

The vines are moving line carriers rather than a single circular trap or one stationary field. Their formation and travel direction are central to the move's identity.

**[DOCUMENTED]**

Snare Track is an Earth Dash Arcana with movement subtype. The base dash leaves three vine lines traveling outward in a V behind the caster. Each vine deals 20 damage and applies entanglement.

When enhanced, the vines also travel in front of the caster while moving inward. The cooldown is 6 seconds. The dash remains available on cooldown, but no vines are created. The wiki notes that Snare Track was later removed and replaced by Tunneling Drive; the supplied showcase demonstrates the older Snare Track behavior preserved here. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Snare_Track))

Entanglement locks a target's position but does not prevent ranged attacks or otherwise fully disable its actions. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Status_effects))

## Exact source recipe

```text
SNARE TRACK

Input structure:
Directional dash activation

Phase 1:
Caster performs forward dash

Base formation:
Create 3 moving vine lines behind caster

Formation lanes:
Center vine aligned to dash axis
Left vine moves outward from center
Right vine mirrors left vine

Base path:
Rearward wake relative to caster's completed dash
Outer vines diverge into V shape

Contact:
20 direct damage per vine contact
Apply entanglement
Each vine remains an independent carrier

Entanglement behavior:
Prevent target movement
Do not silence or fully disable target attacks

Enhanced continuation:
Allow vine formation to continue into space in front of caster
Forward portions move inward toward center
Preserve rear divergent formation

Cooldown:
6 seconds

Cooldown fallback:
Dash remains available
No vine carriers are created
No entanglement is applied by the arcana
```

## Important distinction

Snare Track's enhancement changes the **formation path**, not merely the range.

```text
Base rear section:
three vines diverge outward

Enhanced forward section:
three vines converge inward
```

The move therefore describes a coordinated formation around the dash instead of six unrelated vine attacks.

Entanglement must also remain distinct from stun:

```text
Entangled:
movement locked
attacks may continue

Stunned:
movement and attacks disabled
```

## Source-faithful acceptance test

1. Activating Snare Track performs a forward dash.
2. The base version creates exactly three vine carriers.
3. The vines originate in the caster's wake.
4. The center vine follows the dash axis.
5. The two outer vines spread outward in mirrored directions.
6. Each valid vine contact deals 20 damage.
7. Contact applies entanglement.
8. Entangled enemies cannot move.
9. Entangled enemies are not automatically prevented from attacking.
10. A cooldown use still performs the dash.
11. A cooldown use creates no vines.
12. Enhancement preserves the rear divergent formation.
13. Enhancement continues the vines into the space ahead.
14. The enhanced forward portions move inward toward the center line.
15. The implementation reproduces Snare Track rather than substituting Tunneling Drive.

## Units extracted from Snare Track

### **Multi-Line Dash Formation**

One movement action creates several coordinated line carriers with shared timing and different lateral paths.

### **Divergent Wake Formation**

Outer carriers move away from a central axis as they travel through the rear area.

### **Divergence-to-Convergence Continuation**

Enhancement continues the same formation through the endpoint while reversing its lateral motion.

```text
rear: spread outward
front: fold inward
```

### **Movement-Lock Status Without Action Lock**

Control can remove locomotion while preserving attacks, facing logic, and other actions.

---

# 26. Thunder Line

## Concrete source form

### Evidence

**[VIDEO — approximately 151.4–157.8 seconds]**

Thunder Line is a forward dash that calls a vertical lightning strike onto the location where the dash began.

The sequence reads as:

1. The caster jolts forward.
2. A yellow targeting spark or electrical mark remains at the starting position.
3. A vertical lightning bolt strikes that origin point after the caster has moved away.
4. The bolt releases a circular electrical burst around the strike.
5. Targets inside the burst receive rapid shock ticks.
6. A target standing directly under the narrow central bolt receives an additional direct strike hit.

This means the move contains a small high-value core inside a larger control area. The caster creates distance first, then the delayed origin strike punishes enemies left behind.

In the enhanced demonstration, the same origin strike produces a much larger circular burst and a visibly longer shock sequence. The bolt location remains tied to the beginning of the dash.

**[DOCUMENTED]**

Thunder Line is a Lightning Dash Arcana with movement subtype. It passively stores up to two charges, with a cooldown of 5 seconds per charge.

Each magical use calls a lightning strike at the beginning of the dash. The strike releases a burst dealing 10 damage and applying level-2 shock. If the narrow lightning strike directly overlaps an enemy, it deals an additional 10 damage alongside the burst.

When enhanced, the burst covers a larger area and applies level-4 shock. Level-2 shock deals six 2-damage ticks for 12 total status damage; level-4 shock deals ten 2-damage ticks for 20 total. A cooldown dash remains available but creates no lightning strike. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Thunder_Line)) ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Status_effects))

## Exact source recipe

```text
THUNDER LINE

Input structure:
Directional dash activation

Charge system:
Passively store up to 2 charges
Cooldown: 5 seconds per charge
Spend one charge per magical activation

Phase 1:
Caster dashes forward

Strike anchor:
Snapshot dash starting position

Phase 2:
Call vertical lightning bolt at start position

Direct core hit:
Narrow footprint under bolt
10 direct damage
Occurs only when enemy overlaps strike core

Area burst:
Circular footprint around bolt
10 direct damage
Apply level-2 shock

Base shock:
6 ticks
2 damage per tick
12 total status damage

Enhanced area mutation:
Increase burst radius
Replace level-2 shock with level-4 shock

Enhanced shock:
10 ticks
2 damage per tick
20 total status damage

Cooldown fallback:
Dash remains available
Do not create bolt
Do not create burst
Do not apply shock
```

## Important distinction

Thunder Line has two overlapping attack layers:

```text
Narrow direct-strike core:
10 direct damage

Larger surrounding burst:
10 direct damage + shock
```

A centrally aligned target can receive both. A target near the edge receives the burst and shock but not the extra core hit.

The move is also an **origin attack**, not a path or destination attack. Its spatial decision is often to dash away from enemies while leaving the damaging event where the player started.

## Source-faithful acceptance test

1. Thunder Line stores a maximum of two magical charges.
2. A magical activation dashes the caster forward.
3. The lightning strike is anchored to the dash's starting position.
4. The strike does not follow the caster to the endpoint.
5. The base strike creates a circular 10-damage burst.
6. The burst applies level-2 shock.
7. Level-2 shock produces six 2-damage ticks for 12 total.
8. A target directly beneath the bolt receives an additional 10-damage core hit.
9. A target near the burst edge does not receive the core hit.
10. A cooldown use still performs the dash.
11. A cooldown use creates no strike or shock.
12. Enhancement increases the burst radius.
13. Enhancement upgrades the status to level-4 shock.
14. Level-4 shock produces ten 2-damage ticks for 20 total.
15. Enhancement does not move the strike from the dash origin.

## Units extracted from Thunder Line

### **Dash-Origin Delayed Strike**

Movement saves its starting point and schedules an attack there after the caster relocates.

### **Core-and-Burst Layering**

One visual strike contains a narrow direct-hit center and a larger surrounding payload.

### **Positional Double-Hit Sweet Spot**

Targets in the core receive both layers; targets in the outer area receive only the burst.

### **Status-Tier Enhancement**

Enhancement changes the level and duration of an existing status rather than adding a new status type.

### **Charge-Stored Origin Payload**

Regenerating charges govern the lightning event while the dash remains the movement carrier.
