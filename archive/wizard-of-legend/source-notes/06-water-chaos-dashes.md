---

# 29. Wave Front

## Concrete source form

### Evidence

**[VIDEO — approximately 168.4–180.0 seconds]**

Wave Front wraps the dash in a large water globe that continues forward after the caster's own movement ends.

The source sequence shows:

1. The caster begins a directional dash.
2. A round, pale-blue shell of churning water forms around the moving caster.
3. The globe is substantially wider than the caster and overlaps enemies beside the travel line.
4. Enemies caught by the moving volume receive repeated 3-damage hits and are pushed along the dash direction.
5. Near the end of the dash, the caster separates from the effect while the globe travels a short additional distance.
6. The globe dissipates after that short projectile-like continuation.

The later pass through the target group demonstrates the enhanced shield state. The visible topology does not change: enhancement strengthens the water shell rather than adding another attack, changing its damage, or changing its route.

**[DOCUMENTED]**

Wave Front is a Water Dash Arcana with movement and shield subtypes. The globe deals 3 damage per hit, can hit up to nine times, and uses knockback values of 0 and 25. Its cooldown is 5 seconds.

The water globe absorbs up to 25 incoming damage in the base version and up to 50 when enhanced. It continues traveling briefly after the caster reaches the dash endpoint. A cooldown use retains ordinary dash movement but does not create the magical globe. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Wave_Front))

## Exact source recipe

```text
WAVE FRONT

Input structure:
Directional dash activation

Phase 1 — coupled movement:
Caster performs forward dash
Create large water globe centered on caster
Move globe with caster during dash

Globe footprint:
Round moving volume
Wider than caster body
Can overlap enemies beside the center line

Contact payload:
3 damage per authored hit
Up to 9 hits
Carry / push enemies along travel direction
Do not invent a separate endpoint burst

Shield payload:
Base globe absorbs up to 25 incoming damage
Enhanced globe absorbs up to 50 incoming damage
Shield durability is separate from attack lifetime

Phase 2 — decoupled continuation:
At caster dash endpoint, detach globe from caster
Globe continues forward for a short authored distance
Caster remains at dash endpoint

Cleanup:
Remove globe after continuation distance/lifetime
Remove immediately if its declared shield/effect rules require it

Cooldown:
5 seconds

Cooldown fallback:
Ordinary dash remains available
No water globe
No damage, carry, or shield from Wave Front
```

## Important distinction

Wave Front is not only invulnerability or a cosmetic bubble around an ordinary dash. The globe is a combined moving hit volume and finite-durability shield.

It also changes ownership at the endpoint:

```text
During dash:
globe position = caster position

After dash:
caster stops
globe continues briefly
```

That continuation makes the effect partly player-attached movement and partly short-range projectile without spawning a visibly unrelated second object.

Enhancement is a defensive scalar rewrite:

```text
base durability = 25
enhanced durability = 50
geometry and damage schedule remain the same
```

## Source-faithful acceptance test

1. Activating Wave Front performs a directional dash.
2. A large round water globe forms around the caster during a magical dash.
3. The globe footprint is wider than the caster body.
4. Enemies are damaged by overlapping the moving globe rather than an invisible dash-line hitbox.
5. Each authored hit deals 3 damage.
6. One cast cannot exceed the documented maximum of nine hits.
7. Repeated contact pushes or carries enemies in the travel direction.
8. The base globe can absorb 25 incoming damage.
9. Enhancement increases absorption to 50 damage.
10. Enhancement does not add invented damage, a second globe, or an endpoint explosion.
11. The caster stops at the dash endpoint while the same globe continues forward briefly.
12. The detached globe can still affect enemies during that continuation.
13. The globe cleans up after its short continuation.
14. A cooldown use still moves the caster but creates no globe, shield, or damage payload.

## Units extracted from Wave Front

### **Dash-Coupled Moving Shell**

A large effect volume remains centered on the caster for the movement phase.

### **Endpoint Ownership Transfer**

One effect changes from player-attached to independently traveling without being replaced by a second visual object.

### **Finite-Durability Active Shield**

The dash's defensive promise uses an explicit absorb budget instead of assumed full invulnerability.

### **Wide-Body Directional Carry**

A moving circular footprint can gather and translate enemies even when they are offset from the caster's center line.

### **Defensive-Only Enhancement Scalar**

Enhancement changes shield durability while preserving the attack geometry and hit schedule.

---

# 30. Frost Feint

## Concrete source form

### Evidence

**[VIDEO — approximately 180.0–183.0 seconds]**

Frost Feint is a movement dash that leaves a player-shaped ice decoy at a meaningful endpoint.

The compact showcase demonstrates the enhanced form:

1. The caster dashes through the target lane.
2. A translucent blue-white frozen copy appears where the dash begins.
3. A second frozen copy appears where the dash ends.
4. The caster is free to move away while the decoys remain stationary.
5. When a decoy is struck, it breaks into an icy radial burst rather than behaving as a persistent damaging turret.

The decoys are readable as false player bodies, not generic mines: they reuse the caster silhouette and exist to redirect enemy attention before converting the enemy's attack into a freeze opportunity.

**[DOCUMENTED]**

Frost Feint is an Ice/Water Dash Arcana with movement subtype. It passively stores up to two charges, each recovering in 3.5 seconds.

A magical dash leaves one frozen player decoy at the dash origin. The decoy lasts 2 seconds, attracts normal enemy aggression, and shatters when struck. The shatter deals 12 damage and freezes enemies in a small radius. Minibosses and council members do not retarget to it.

When enhanced, a second decoy is placed at the dash endpoint. A cooldown dash remains available but creates no decoy. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Frost_Feint))

## Exact source recipe

```text
FROST FEINT

Input structure:
Directional dash activation

Charge system:
Passively store up to 2 magical charges
Recover one charge every 3.5 seconds
Spend one charge per decoy-producing dash

Phase 1:
Snapshot dash origin
Perform ordinary directional dash movement

Base placement:
Create one player-shaped frozen decoy at dash origin

Enhanced placement:
Preserve origin decoy
Create second matching decoy at dash endpoint

Decoy lifetime:
2 seconds maximum
Stationary in world space
Expire harmlessly if not triggered

Targeting contract:
Normal enemies may prefer decoy over player
Minibosses and council members ignore the taunt

Trigger:
First valid enemy attack that strikes decoy

On trigger:
Destroy decoy exactly once
Create small radial ice shatter
Deal 12 damage
Apply freeze to valid enemies in radius

Cooldown fallback:
Dash remains available
No origin or endpoint decoy
```

## Important distinction

Frost Feint does not automatically explode on a timer and does not damage merely because an enemy walks near the statue.

```text
placement -> taunt window -> struck by enemy attack -> shatter
```

The damage is reactive: an enemy must commit an attack to trigger it. The decoy therefore owns target redirection and hit reception before it owns an area payload.

The enhanced endpoint copy is additive and strategically asymmetric. It can protect both sides of the route, but because it appears beside the caster's destination, it may draw enemies toward the player's new position. That tradeoff should not be erased by treating both copies as ordinary safe-distance mines.

## Source-faithful acceptance test

1. Frost Feint stores no more than two magical charges.
2. Each magical charge recovers in approximately 3.5 seconds.
3. A base magical dash places exactly one decoy at the dash origin.
4. The decoy visibly resembles a frozen copy of the caster.
5. The decoy remains stationary for up to 2 seconds.
6. Normal enemies can redirect aggression toward the decoy.
7. Minibosses and council members do not obey the decoy taunt.
8. Proximity alone does not trigger the shatter.
9. A valid enemy attack striking the decoy triggers one shatter.
10. The shatter deals 12 damage in a small radius.
11. The shatter freezes valid affected enemies.
12. One decoy cannot trigger more than once.
13. An unstruck decoy expires without inventing an automatic damage burst.
14. Enhancement preserves the origin decoy and adds a second decoy at the endpoint.
15. A cooldown dash creates no decoys or freeze payload.

## Units extracted from Frost Feint

### **Attack-Triggered Decoy Payload**

A placed false target converts an enemy attack, rather than proximity or time alone, into the offensive event.

### **Aggression-Redirecting Player Copy**

The decoy participates in enemy target selection and is readable as the player rather than as an anonymous hazard.

### **Origin / Endpoint Decoy Pair**

Enhancement preserves the origin object and adds a strategically different copy at the destination.

### **Target-Class Taunt Exemption**

Normal enemies, minibosses, and bosses explicitly use different retargeting rules.

### **Two-Charge Defensive Setup Dash**

Independent charges let the player author several short distraction windows without making the fallback movement unavailable.

---

# 31. Frost Wing

## Concrete source form

### Evidence

**[VIDEO — approximately 183.0–194.0 seconds]**

Frost Wing moves the caster forward while firing an ice-feather fan backward.

The source sequence shows:

1. A pair of bright crystalline wings flashes around the caster at dash startup.
2. The caster moves quickly in the chosen dash direction.
3. Four separate icy feathers spread behind the moving caster in a broad rear-facing arc.
4. The projectiles travel away from the destination, opposite the caster's movement.
5. Each feather is independently collidable and produces a 20-damage freeze hit.
6. The spread leaves a narrow blind region directly behind the center of the caster.
7. The enhanced demonstration widens/densifies the fan by emitting six feathers instead of four.

The attack is designed around retreating at an angle or dashing through a threat. It does not fire toward the dash destination and is not a damaging wing-shaped body attached to the caster.

**[DOCUMENTED]**

Frost Wing is an Ice/Water Dash Arcana with movement and projectile subtypes. A magical dash releases four non-piercing icy feathers behind the caster. Each feather deals 20 damage, applies freeze, uses 20 knockback, and can destroy eligible enemy projectiles.

When enhanced, six feathers are emitted. The cooldown is 5.5 seconds. A cooldown dash remains available but emits no feathers. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Frost_Wing))

## Exact source recipe

```text
FROST WING

Input structure:
Directional dash activation

Phase 1:
Read dash direction
Perform forward dash movement
Display brief crystalline wing startup silhouette

Emission frame:
rear = negative dash direction
right = perpendicular to dash direction

Base fan:
Emit 4 independent ice feathers
Spread across a rear-facing arc
Preserve narrow center-rear blind region

Enhanced fan:
Replace count 4 with count 6
Preserve rear-facing topology
Increase fan density without inventing a forward volley

Per-feather path:
Straight outward travel along authored fan angle

Per-feather collision:
Stop on first valid enemy or scenery
Do not pierce enemies
Destroy eligible hostile projectiles on contact

Per-feather payload:
20 damage
20 knockback
Apply freeze
Consume feather

Cooldown:
5.5 seconds

Cooldown fallback:
Dash remains available
No wing volley
```

## Important distinction

Frost Wing's attack direction is the inverse of its movement direction:

```text
caster dash:      ->
feather fan:   <<<
```

This is a retreat-covering or pass-through attack. Auto-aim must not rotate the volley toward a target in front of the destination.

The fan is made from independent non-piercing projectiles, not one conical area hit. Each feather owns its own collision, damage, freeze, projectile interception, and cleanup. The gaps between authored feather paths—including the center blind region—are real gameplay space.

## Source-faithful acceptance test

1. Activating Frost Wing performs a directional dash.
2. A brief crystalline wing silhouette appears around the caster at startup.
3. The base magical dash emits exactly four feathers.
4. Every feather travels generally opposite the dash direction.
5. The feathers form a spread rather than one overlapping line.
6. The authored spread retains a narrow blind region directly behind the caster.
7. Each feather is an independent projectile.
8. Each feather deals 20 damage on a valid enemy hit.
9. Each feather applies freeze and 20 knockback.
10. A feather stops on its first valid enemy; it does not pierce a cluster.
11. Eligible hostile projectiles can be destroyed by feather contact.
12. Enhancement emits exactly six feathers.
13. Enhancement does not redirect the fan forward or replace it with a cone hitbox.
14. A cooldown dash emits no feathers and applies no freeze payload.

## Units extracted from Frost Wing

### **Movement-Inverse Volley**

An attack derives its primary direction by negating the caster's movement vector.

### **Authored Fan With Functional Gaps**

Several projectile rays create coverage and blind regions instead of approximating the spread as a filled cone.

### **Per-Projectile Freeze and Interception**

Every projectile independently owns enemy collision, freeze, and hostile-projectile destruction.

### **Count-Only Fan Enhancement**

Enhancement densifies the existing topology by increasing projectile count from four to six.

### **Pass-Through Retreat Cover**

Forward movement and backward control combine so the safest alignment may require dashing through or diagonally away from a threat.

---

# 32. Chaotic Rift

## Concrete source form

### Evidence

**[VIDEO — approximately 194.0–205.0 seconds]**

Chaotic Rift replaces visible travel with a delayed entry-and-exit teleport.

The source sequence shows:

1. A dark-purple rift opens around the caster at the starting point.
2. The caster disappears completely rather than sliding along the dash route.
3. A second rift opens at the destination after a short fixed interval.
4. The caster reappears from the exit rift facing the selected direction.
5. In the dungeon demonstration, the destination can lie beyond narrow intervening walls.
6. No damage numbers, attack hitbox, or residual damaging trail appear.

The camera follows the transition smoothly, but the caster does not occupy or collide with intermediate points. The move's value is untargetability and topology-skipping movement, not an offensive payload.

**[DOCUMENTED]**

Chaotic Rift is a Chaos Dash Arcana with movement subtype and a 0.5-second cooldown.

The caster enters a rift, becomes untargetable for the entire teleport animation, and appears at the destination after a fixed delay. It can cross projectiles and narrow or medium walls. If a wall obstructs the selected endpoint, the exit normally resolves to the maximum available distance; some invalid destinations can return the caster to the origin. Status effects already on the caster can continue dealing damage during the teleport.

The transition time is fixed rather than proportional to distance. Dash-distance modifiers do not extend it, and the arcana deals no damage. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Chaotic_Rift))

## Exact source recipe

```text
CHAOTIC RIFT

Input structure:
Directional dash activation

Target resolver:
Read desired dash direction
Compute authored teleport distance
Test destination and intervening topology using rift rules

Valid destination:
Allow narrow/medium wall crossing
Allow projectile crossing
Place exit at selected destination

Obstructed / invalid destination:
Resolve to maximum valid distance when supported
If destination contract fails completely, return to origin
Never strand caster inside solid geometry or outside room bounds

Phase 1 — entry:
Open chaos rift at origin
Hide caster travel body
Make caster untargetable
Remove caster from ordinary path collision

Transit:
Fixed authored delay independent of distance
No intermediate caster positions
Existing status effects may continue ticking
No attack payload

Phase 2 — exit:
Open chaos rift at resolved destination
Place and reveal caster
Restore targetability and ordinary collision

Cooldown:
0.5 seconds

Distance modifiers:
Do not extend teleport distance
```

## Important distinction

Chaotic Rift is a teleport, not a very fast continuous dash.

```text
continuous dash:
origin -> intermediate positions -> destination

Chaotic Rift:
origin -> hidden fixed-delay transit -> destination
```

There is no sweep collision across the route, no trail damage, and no caster body that can be struck by a projectile between the two portals.

Untargetable is also narrower than invulnerable. New ordinary attacks cannot hit the absent caster, but damage-over-time statuses already attached to the caster may continue. Implementing blanket immunity would silently strengthen the source move.

## Source-faithful acceptance test

1. Activating Chaotic Rift opens a visible entry rift at the origin.
2. The caster disappears instead of moving continuously across the route.
3. The caster has no ordinary intermediate world positions during transit.
4. A visible exit rift opens at the resolved destination.
5. Transit uses a fixed delay rather than distance-scaled travel time.
6. The caster is untargetable for the teleport animation.
7. Ordinary projectiles can be crossed without colliding with the caster.
8. Narrow and supported medium walls can be crossed.
9. Destination validation never places the caster inside solid scenery or outside valid room bounds.
10. Obstructed destinations resolve to a valid fallback distance or the origin according to the declared rule.
11. Existing status damage can continue during transit.
12. The move deals no direct or trail damage.
13. No invented rift explosion affects enemies at entry or exit.
14. The cooldown is approximately 0.5 seconds.
15. Dash-distance modifiers do not extend the teleport.

## Units extracted from Chaotic Rift

### **Discrete Origin-to-Destination Teleport**

Movement has entry and exit states but no collidable intermediate trajectory.

### **Fixed-Delay Distance-Independent Transit**

The timing contract remains constant even when the resolved teleport distance changes.

### **Untargetable but Status-Vulnerable State**

Ordinary targeting and collision are disabled without granting universal immunity to already-owned effects.

### **Topology-Skipping Destination Validation**

The resolver permits declared wall classes while still enforcing safe endpoints and fallbacks.

### **Zero-Payload Mobility Arcana**

The move's entire power budget is movement and avoidance; entry and exit visuals do not imply damage.

# What these four complete in the dash construction language

| Spell | Newly clarified unit |
|---|---|
| Wave Front | Player-coupled shell that becomes an independent short continuation |
| Frost Feint | Enemy-attack-triggered player decoy with target-class taunt rules |
| Frost Wing | Movement-inverse projectile fan with functional gaps |
| Chaotic Rift | Fixed-delay teleport with no intermediate collision path |

Their compact source-derived recipes are:

```text
WAVE FRONT =
DirectionalDash
+ PlayerCoupledWaterGlobe
+ FiniteShieldDurability
+ WideBodyEnemyCarry
+ EndpointIndependentContinuation
+ DefensiveOnlyEnhancement
```

```text
FROST FEINT =
TwoChargeDash
+ OriginPlayerDecoy
+ EnemyAggressionRedirect
+ AttackTriggeredFreezeShatter
+ EnhancedEndpointDecoy
```

```text
FROST WING =
DirectionalDash
+ MovementInverseFan
+ IndependentNonPiercingFeathers
+ PerFeatherFreezeAndInterception
+ EnhancedCountIncrease
```

```text
CHAOTIC RIFT =
DirectionalTeleport
+ EntryExitRifts
+ FixedDelayTransit
+ UntargetableStatusVulnerableState
+ WallSkippingDestinationResolver
+ ZeroDamagePayload
```

The complete dash set now requires four separate movement models:

```text
continuous movement with attached payload
continuous movement that deposits or launches payloads
continuous movement that transports enemies
discrete teleport with no intermediate caster path
```

Those models should remain explicit in the later implementation layer. A shared `dash + effect` flag is not sufficient to preserve their source identities.
