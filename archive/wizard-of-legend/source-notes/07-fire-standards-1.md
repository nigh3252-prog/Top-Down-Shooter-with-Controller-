# 33. Fuelled Berserk

## Concrete source form

### Evidence

**[VIDEO — approximately 205.0–217.0 seconds]**

Fuelled Berserk is a timed Basic-Arcana modifier, not a standalone flame projectile or melee strike.

The source sequence shows:

1. The caster activates a compact red-orange aura around their body.
2. While the aura is active, a held Basic input repeats the equipped Basic sequence automatically.
3. The repeated attacks occur at a visibly accelerated cadence.
4. The buff does not replace the Basic Arcana's own geometry, projectiles, movement, or combo order.
5. In the enhanced demonstration, activation also produces one immediate circular fire burst around the caster.
6. The activation burst is distinct from the repeated Basic attacks and does not continue ticking for the full buff duration.

**[DOCUMENTED]**

Fuelled Berserk is a Fire Standard Arcana with a 7-second cooldown and a 5-second active duration. During the buff, Basic Arcana are accelerated and their combo sequences repeat automatically while the input remains held. The cooldown begins after the active duration finishes rather than at the initial button press.

When enhanced, activation creates a close radial explosion that deals 10 damage and inflicts burn. The buff still delegates its actual attack geometry and hit rules to the equipped Basic Arcana. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Fuelled_Berserk))

## Exact source recipe

```text
FUELLED BERSERK

Input structure:
Tap Standard activation

Activation:
Apply visible fire aura to caster
Begin 5-second buff window

Buff contract:
Read the currently equipped Basic Arcana
Accelerate its authored attack cadence
While Basic input is held, automatically request each next combo step
After the final combo step, loop back to the first step
Preserve the Basic Arcana's own emitters, paths, damage, movement, and collision rules

Enhanced activation payload:
Create one close radial fire explosion at cast time
Deal 10 direct damage
Apply burn
Do not repeat this explosion with each Basic attack

Expiration:
Remove aura and automatic-repeat modifier after 5 seconds
Allow an already-started Basic action to resolve under the Basic system's normal rules

Cooldown:
Begin 7-second cooldown when the buff duration ends
```

## Important distinction

Fuelled Berserk is an action-system modifier. It must call through the equipped Basic Arcana instead of cloning one particular Basic attack.

```text
wrong: buff timer -> spawn generic rapid fire hitboxes
right: buff timer -> accelerate and repeat the equipped Basic's own actions
```

This distinction preserves unusual Basic behavior such as Flame Cross's three-beat sequence, Bouncing Blaze's hopping projectiles, and movement embedded in other Basic Arcana. Enhancement adds one activation event; it does not rewrite the repeated attacks into burning attacks.

## Source-faithful acceptance test

1. Activating Fuelled Berserk starts a clearly readable 5-second buff.
2. The unenhanced activation does not deal an invented hit.
3. Tapping Basic during the buff still produces the equipped Basic's normal next combo step.
4. Holding Basic automatically advances through that Basic's complete authored combo.
5. A completed combo loops while the input remains held and time remains.
6. The buff accelerates attack cadence without replacing projectile paths, hitboxes, movement, or damage values.
7. Releasing Basic stops requesting new repeated attacks.
8. Changing the equipped Basic causes the modifier to use that Basic rather than a hard-coded fire attack.
9. Enhanced activation creates exactly one close radial explosion.
10. That explosion deals 10 direct damage and applies burn.
11. The enhanced explosion does not repeat on every automatic Basic attack.
12. The buff expires after approximately 5 seconds and removes both the aura and repeat modifier.
13. The 7-second cooldown begins at buff expiration, not at initial activation.

## Units extracted from Fuelled Berserk

### **Delegated Basic-Action Repeater**

A timed effect requests attacks from the equipped Basic's own action definition rather than owning replacement attack geometry.

### **Combo-Wrapping Held Input**

A held input advances through every authored step and deliberately returns to step one after the finisher.

### **Post-Duration Cooldown Start**

Cooldown timing is anchored to buff expiration so the advertised active window is not hidden inside the cooldown.

### **One-Time Enhanced Activation Payload**

Enhancement adds an event at buff startup without contaminating every delegated attack with extra effects.

---

# 34. Flame Breath

## Concrete source form

### Evidence

**[VIDEO — approximately 217.0–227.0 seconds]**

Flame Breath is a short, rounded forward cone followed by a substantially different charged Signature form.

The source sequence shows:

1. The base cast plants the caster and projects a broad, close flame plume forward.
2. The plume has a rounded cone footprint rather than a narrow beam or traveling fireball.
3. A target standing inside the plume receives several discrete hits before the flame ends.
4. The caster can orient the cast, but the base event is a compact burst rather than a long channel.
5. The charged Signature begins with a separate fire eruption centered on the caster.
6. After the radial startup, the caster sustains a larger forward flame stream and can steer its direction during the channel.
7. The charged stream produces a denser five-hit schedule with larger damage events and a stronger burn result.

**[DOCUMENTED]**

Flame Breath is a Fire Standard/Signature Arcana with melee classification and a 4.5-second cooldown. The base rounded cone can hit up to three times for 18 damage per hit, with knockback values of 20, 20, and 10, and can destroy eligible enemy projectiles. Enhancement adds burn.

The charged Signature first releases fire around the caster, then produces an aimable continuous forward flame that can hit up to five times for 36 damage per hit and inflicts a fiercer burn. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Flame_Breath))

## Exact source recipe

```text
FLAME BREATH

Input structure:
Tap Standard cast
Charged Signature rewrite when Signature meter is full

Base cast:
Root or strongly slow caster for authored cast window
Snapshot forward aim
Create one close rounded-cone flame volume
Resolve up to 3 discrete per-target hits
Deal 18 damage per hit
Use authored knockback sequence: 20, 20, 10
Destroy eligible enemy projectiles intersecting the active flame
End after compact burst duration

Enhanced base:
Preserve geometry and three-hit schedule
Add burn to valid targets

Charged Signature startup:
Create separate radial fire eruption centered on caster
Transition into sustained forward breath

Charged Signature channel:
Continuously read aim direction
Rotate broad forward flame volume toward aim
Resolve up to 5 authored per-target hits
Deal 36 damage per hit
Apply fiercer burn

Cooldown:
4.5 seconds
```

## Important distinction

The base and charged forms are not the same cone with a damage multiplier. Charged Signature changes the temporal and spatial recipe:

```text
base: compact forward cone -> three-hit ceiling -> end
charged: radial startup -> steerable sustained cone -> five-hit ceiling -> end
```

The hit ceiling must be explicit. A continuous overlap test running every frame would turn the visible flame into uncontrolled damage and make frame rate affect results.

## Source-faithful acceptance test

1. The base cast creates a broad rounded cone immediately in front of the caster.
2. It does not launch a traveling fire projectile.
3. A target can receive no more than three base hits from one cast.
4. Each base hit deals 18 damage before project-specific balancing conversions.
5. Knockback follows the authored multi-hit sequence rather than triggering full launch on every tick.
6. The active flame destroys eligible enemy projectiles it visibly overlaps.
7. The unenhanced base cast does not silently add burn.
8. Enhancement adds burn without changing the cone into the charged form.
9. Charged Signature begins with a distinct radial fire eruption around the caster.
10. The charged cast then transitions into a larger sustained forward flame.
11. Aim can rotate the charged forward flame during its active channel.
12. A target can receive no more than five charged-stream hits.
13. Each charged-stream hit uses the documented 36-damage event.
14. Charged Signature applies the fiercer burn result.
15. Cooldown is approximately 4.5 seconds.

## Units extracted from Flame Breath

### **Rounded-Cone Multi-Hit Volume**

A short-lived close attack owns a fixed per-target hit schedule rather than using projectile travel.

### **Projectile-Erasing Active Flame**

The same visible attack volume handles hostile projectile interception during its active frames.

### **Radial-to-Directed Signature Transition**

A charged cast moves from a caster-centered safety event into a steerable forward offense phase.

### **Continuously Aimable Channel Volume**

The sustained phase follows live aim while keeping hit cadence deterministic and bounded.

---

# 35. Searing Crown

## Concrete source form

### Evidence

**[VIDEO — approximately 227.0–233.0 seconds]**

Searing Crown is a two-stage radial attack: a ring of repeated low-force hits followed by one forceful finisher.

The source sequence shows:

1. The caster slams down and a fiery circular crown expands around their feet.
2. Enemies inside the ring receive a rapid sequence of small damage ticks.
3. The repeated ticks hold the visual focus near the caster but do not launch enemies away immediately.
4. Dark smoke and embers accumulate during the tick phase.
5. One final blast resolves the sequence, applies the meaningful knockback, and leaves the burning result.
6. The enhanced version preserves this shape and finisher but inserts additional/stronger crown ticks before the blast.

**[DOCUMENTED]**

Searing Crown is a Fire Standard Arcana with a 6-second cooldown. The base form deals five crown hits of 5 damage followed by a 20-damage final blast; the documented hit count is six, with knockback values of 4, 4, and 35. The finisher inflicts burn.

When enhanced, the crown phase becomes seven hits of 7 damage before the same final blast, for eight authored hits total. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Searing_Crown))

## Exact source recipe

```text
SEARING CROWN

Input structure:
Tap Standard cast

Cast:
Root caster for short slam animation
Create one circular attack volume centered on caster

Base crown phase:
Resolve exactly 5 timed hits per target
Deal 5 damage per crown hit
Use low knockback / holding force during repeated hits
Build smoke, ember, and heat feedback toward finisher

Enhanced crown phase:
Replace base crown schedule with exactly 7 timed hits per target
Deal 7 damage per crown hit
Preserve the same radial footprint and finisher transition

Finisher:
Resolve exactly 1 radial blast after crown ticks
Deal 20 damage
Apply strong 35-class knockback
Apply burn

Cooldown:
6 seconds
```

## Important distinction

Searing Crown is not a generic damage-over-time field. It is one authored cast sequence with a known number of attacks and an explicit final event.

```text
base = 5 small hits + 1 finisher
enhanced = 7 stronger small hits + 1 finisher
```

The final blast owns the major displacement. Applying the finisher's knockback on every crown tick would eject targets before the sequence can connect and would erase the move's gathering pressure.

## Source-faithful acceptance test

1. Searing Crown forms one clear circle centered on the caster.
2. The circle remains anchored to the cast position/caster for its short authored sequence.
3. The base version resolves exactly five crown hits on a continuously overlapping target.
4. Each base crown hit deals 5 damage.
5. Crown hits use low displacement and do not immediately launch the target out of the ring.
6. Exactly one 20-damage blast follows the base tick sequence.
7. The final blast applies the strong knockback and burn.
8. The finisher cannot fire twice from one cast.
9. Enhanced Searing Crown resolves exactly seven crown hits before the finisher.
10. Each enhanced crown hit deals 7 damage.
11. Enhancement does not add a second finisher or invent a moving projectile.
12. Leaving and re-entering the area cannot exceed the authored per-target hit count.
13. The complete action uses a 6-second cooldown.

## Units extracted from Searing Crown

### **Fixed-Count Radial Tick Sequence**

A caster-centered attack schedules a known number of low-force hits instead of relying on frame-based overlap damage.

### **Tick-to-Finisher Knockback Handoff**

Early hits preserve target occupancy while one terminal event owns the decisive displacement.

### **Authored Hit-Schedule Enhancement**

Enhancement replaces tick count and tick damage without duplicating the whole zone or its final event.

### **Escalating Radial Feedback**

Smoke and heat buildup communicates that the repeated-hit phase is moving toward a stronger resolution.

---

# 36. Heroic Blaze

## Concrete source form

### Evidence

**[VIDEO — approximately 233.0–244.0 seconds]**

Heroic Blaze is a stationary vertical jump attack: it creates safety and repeated hits above the cast point, then lands with one separate blast.

The source sequence shows:

1. The caster launches vertically while a narrow fire vortex forms at the original position.
2. The caster spirals in place rather than traveling to a distant target or chosen endpoint.
3. Enemies touching the vortex receive a rapid series of small hits while the caster is airborne.
4. The airborne caster is visually removed from ordinary ground contact during the repeated-hit phase.
5. The caster descends to the same location and creates a distinct landing explosion.
6. The charged Signature remains airborne longer, produces a denser/larger spiral, and resolves with a stronger burning landing.

**[DOCUMENTED]**

Heroic Blaze is a Fire Signature Arcana with melee, movement, and jump classifications. It has a 6-second cooldown and an approximately 1.5-second base duration. The base vortex delivers seven 8-damage hits followed by a 20-damage landing crash. The caster is invulnerable while airborne but becomes vulnerable at landing.

Enhancement adds an eighth vortex hit and burn to the landing. The charged Signature extends the airborne spiral, increases its damage, and applies a fiercer burn. Unlike other jump Arcana, Heroic Blaze does not travel away from its cast location. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Heroic_Blaze))

## Exact source recipe

```text
HEROIC BLAZE

Input structure:
Tap Signature cast
Charged Signature rewrite when meter is full

Startup:
Save cast position
Launch caster vertically without horizontal destination travel
Enter airborne invulnerability phase
Create fiery vortex at saved cast position

Base airborne phase:
Keep attack centered at saved position
Resolve exactly 7 vortex hits per target
Deal 8 damage per vortex hit
Use low/inward authored force so targets remain available for the sequence

Enhanced airborne phase:
Resolve exactly 8 vortex hits per target
Preserve stationary vertical topology

Landing:
Return caster to a valid point at/near saved cast position
End airborne invulnerability before ordinary post-landing vulnerability resumes
Create exactly one radial landing crash
Deal 20 damage
Apply authored outward knockback
Enhanced version also applies burn

Charged Signature rewrite:
Extend airborne spiral duration
Increase vortex/landing damage according to charged data
Use larger/denser feedback
Apply fiercer burn on resolution

Cooldown:
6 seconds
```

## Important distinction

Heroic Blaze uses jump-phase defense but is not a targeted leap.

```text
horizontal displacement = approximately zero
airborne phase = invulnerable repeated-hit window
landing phase = separate vulnerable resolution event
```

The invulnerability boundary matters as much as the damage. It must begin and end on named phases rather than being attached to a loose timer that can outlive the visible airborne state.

## Source-faithful acceptance test

1. Heroic Blaze saves the cast location and launches vertically.
2. The caster does not choose or travel to a remote landing target.
3. The vortex remains centered on the saved cast location.
4. A continuously overlapping target receives exactly seven base vortex hits.
5. Each base vortex hit deals 8 damage.
6. The caster is invulnerable during the explicit airborne phase.
7. Ground hazards and body contact do not damage the caster while that airborne phase is active.
8. Invulnerability ends with the visible landing transition.
9. The caster returns to the same valid local area rather than clipping into blocked terrain.
10. Exactly one 20-damage landing crash follows the vortex.
11. Enhancement adds one vortex hit and burn on landing.
12. Charged Signature has a visibly longer/stronger airborne spiral.
13. Charged Signature preserves the stationary vertical topology.
14. Charged resolution applies the fiercer burn result.
15. Cooldown is approximately 6 seconds.

## Units extracted from Heroic Blaze

### **Stationary Vertical Jump Attack**

A jump-phase action changes elevation and collision state while intentionally preserving horizontal position.

### **Phase-Bounded Airborne Invulnerability**

Defense begins with takeoff and ends at the visible landing boundary.

### **Saved-Position Vortex Sequence**

Repeated hits are anchored to the cast location, independent of the caster's temporary airborne presentation.

### **Airborne-to-Landing Finisher**

The final damage and knockback event is owned by landing rather than by the repeated vortex ticks.

---

# 37. Blazing Lariat

## Concrete source form

### Evidence

**[VIDEO — approximately 244.0–255.0 seconds]**

Blazing Lariat combines a short forward slide with enormous rotating fire-whip arcs; its charged Signature changes those arcs into a persistent three-whip hazard.

The source sequence shows:

1. The base cast slides the caster forward while a long fire whip sweeps around them.
2. A second large sweep follows from a different angular position, completing a two-hit rotating pattern.
3. The whip reach is much larger than the caster body and can catch enemies beside or behind the movement line.
4. Hits apply immediate outward displacement and leave a burning result.
5. The enhanced form keeps the two-sweep recipe while extending the visible whip reach/radius.
6. Charged Signature produces three whips rotating repeatedly around one center.
7. The charged whips persist independently long enough for the caster to dash or move away while the rotating attack remains active.

**[DOCUMENTED]**

Blazing Lariat is a Fire Standard/Signature Arcana with melee and movement classifications and a 5.5-second cooldown. The base cast slides forward and spins two large fire-whip attacks, each dealing 26 damage, inflicting burn, and knocking enemies away. Documented knockback values include 20, 25, and 12. Enhancement increases whip length and effective radius.

Charged Signature creates three blazing whips that spin around the player/activation center multiple times. Staying near the center can maximize overlap, but the persistent whips can continue after the caster moves away. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Blazing_Lariat))

## Exact source recipe

```text
BLAZING LARIAT

Input structure:
Tap Standard cast
Charged Signature rewrite when meter is full

Base movement:
Read forward aim
Slide caster a short authored distance

Base attack:
Create first long rotating fire-whip sweep around caster
Resolve at most one first-sweep hit per target
Deal 26 damage, apply burn, and apply authored outward force
Create second sweep at authored angular offset/timing
Resolve at most one second-sweep hit per target
Deal 26 damage, apply burn, and apply authored outward force
End both whips after their sweep arcs complete

Enhanced base:
Preserve two-sweep timing and damage schedule
Increase whip length / radial reach

Charged Signature rewrite:
Create 3 distinct fire whips around activation center
Rotate all three through multiple authored revolutions
Keep effect anchored to its declared center after startup
Allow caster movement to decouple from persistent whips
Use per-whip/per-target hit cooldowns to bound overlap damage
Clean up every whip at charged lifetime end

Cooldown:
5.5 seconds
```

## Important distinction

The base form is a moving two-sweep melee action. Charged Signature is a topology rewrite into a persistent rotating hazard.

```text
base: caster slide + 2 authored sweeps
charged: 3 persistent whips + repeated rotations + caster may leave
```

The whip must be represented by its long curved sweep volume, not by a simple circle that damages everything in range simultaneously. In the charged form, visual persistence and damage persistence must share the same center and lifetime.

## Source-faithful acceptance test

1. Base Blazing Lariat moves the caster a short distance forward.
2. The base attack produces exactly two visibly separate whip sweeps.
3. Each sweep follows a rotating arc with reach substantially beyond the caster body.
4. Each base sweep deals one 26-damage event per valid target.
5. Hits apply burn and authored outward knockback.
6. Enemies beside or behind the slide line can be hit by the visible rotating arcs.
7. Enhancement lengthens the whips/radius without adding an invented third base sweep.
8. Charged Signature creates exactly three distinct rotating whips.
9. The charged whips complete multiple authored rotations.
10. The caster can move away while the charged effect remains visibly and mechanically active.
11. Charged overlap damage is bounded by explicit per-target hit scheduling.
12. A target is never damaged by an invisible full-radius circle outside the visible whip arcs.
13. All persistent whips clean up together at the authored lifetime end.
14. Cooldown is approximately 5.5 seconds.

## Units extracted from Blazing Lariat

### **Movement-Coupled Rotating Sweep Pair**

A short caster slide is synchronized with two large angular melee volumes rather than a forward line attack.

### **Curved Whip Collision Volume**

Damage follows a long rotating arc so the visible lash, not an invisible radial disk, defines contact.

### **Range-Only Geometry Enhancement**

Enhancement changes whip length while preserving the base action's two-hit cadence.

### **Persistent Three-Arm Signature Hazard**

Charged Signature rewrites a caster-coupled move into three independently persistent rotating arms.

### **Caster / Effect Decoupling After Startup**

The owner may leave without dragging or prematurely deleting an already-established charged attack.

