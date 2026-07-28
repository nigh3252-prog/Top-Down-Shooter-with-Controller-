# 38. Blazing Vault

## Concrete source form

### Evidence

**[VIDEO — approximately 255.0–259.0 seconds]**

Blazing Vault is a directional jump whose takeoff trail gathers targets into a remote landing explosion.

The source sequence shows:

1. The caster commits to a forward leap and becomes airborne.
2. A line of short-lived flames erupts beneath the travel path rather than around the starting point alone.
3. Enemies touched by that trail receive repeated small hits and are pushed in the leap direction.
4. The trail's directional force helps carry targets toward the selected landing area.
5. The caster crashes down at the endpoint in one large circular explosion.
6. The landing blast owns the strong outward launch and, when enhanced, the burn result.

**[DOCUMENTED]**

Blazing Vault is a Fire Standard Arcana with melee, movement, and jump classifications and a 5.7-second cooldown. Its current form creates six trail hits of 5 damage during the leap, then a 35-damage landing explosion. The caster cannot be damaged while airborne. Enhancement adds level-one burn to the landing explosion rather than changing the route or trail count. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Blazing_Vault))

## Exact source recipe

```text
BLAZING VAULT

Input structure:
Tap Standard cast with directional aim

Startup:
Resolve a valid landing point along aim direction
Enter explicit airborne/invulnerable phase
Begin forward jump from cast point to landing point

Travel trail:
Emit a short-lived flame segment beneath each authored path interval
Resolve exactly 6 trail hits per continuously carried target
Deal 5 damage per trail hit
Push struck enemies toward the landing point
Keep trail force directional; do not radially scatter targets during travel

Landing:
Return caster to ground collision at valid endpoint
End airborne invulnerability
Create exactly one circular landing explosion
Deal 35 damage
Apply strong outward knockback

Enhanced landing:
Preserve trail and landing geometry
Add level-one burn to the landing explosion

Cooldown:
5.7 seconds
```

## Important distinction

Blazing Vault is not a teleport followed by an explosion. Its travel path is an active gathering phase:

```text
forward airborne path + six directional trail hits -> endpoint blast
```

The trail and landing use different force jobs. Trail hits move enemies toward the endpoint; the landing blast disperses them. Airborne invulnerability must end at the visible landing boundary.

## Source-faithful acceptance test

1. Aim selects a valid forward landing area.
2. The caster visibly traverses the route as a jump rather than teleporting.
3. The caster is invulnerable only during the named airborne phase.
4. Flames appear beneath the travel path at authored intervals.
5. A continuously affected target receives exactly six 5-damage trail hits.
6. Trail hits push enemies in the leap direction toward the endpoint.
7. Trail hits do not use the final blast's radial launch force.
8. The caster lands safely without crossing blocked walls or invalid terrain.
9. Exactly one 35-damage circular explosion occurs at landing.
10. The landing explosion knocks enemies away from the endpoint.
11. Enhancement adds burn to the landing explosion.
12. Enhancement does not add invented trail hits or a takeoff blast.
13. Cooldown is approximately 5.7 seconds.

## Units extracted from Blazing Vault

### **Directional Airborne Path Attack**

A jump traverses a validated route while its damaging trail is authored along that route.

### **Path-to-Endpoint Gathering Force**

Low travel hits move targets toward the future finisher rather than away from every local hit.

### **Landing-Owned Radial Finisher**

One endpoint event owns the high damage, outward force, and enhanced burn.

### **Phase-Bounded Jump Invulnerability**

Defensive state follows visible takeoff and landing phases instead of a free-running timer.

---

# 39. Explosive Charge

## Concrete source form

### Evidence

**[VIDEO — approximately 259.0–265.0 seconds]**

Explosive Charge is a three-charge marking dash: contact applies small immediate damage and a delayed explosive to every enemy crossed.

The source sequence shows:

1. The caster makes a short aimed dash through a cluster.
2. Each crossed enemy receives a small contact hit and a visible burning marker.
3. The caster is free to move after the dash while the markers remain attached to their individual targets.
4. Roughly one second later, each marker detonates on its owner.
5. The explosions knock targets in the original dash direction, not simply away from the caster's later position.
6. Repeated casts can place several independent markers before earlier timers resolve.

**[DOCUMENTED]**

Explosive Charge is a Fire Standard Arcana with melee and movement classifications. It passively stores up to three charges, each recovering in 3.5 seconds. A cast performs a short dash, deals 5 contact damage, and attaches a timed explosive to every enemy crossed. After 1 second each marker deals 25 damage and applies directional knockback. Multiple explosives can coexist on one enemy. Enhancement adds level-one burn to each detonation. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Explosive_Charge))

## Exact source recipe

```text
EXPLOSIVE CHARGE

Input structure:
Ammo Standard cast with directional aim

Charge system:
Passively store up to 3 charges
Recover each charge independently at 3.5 seconds
Spend 1 charge per cast

Dash:
Snapshot dash direction
Move caster a short validated distance
For every distinct enemy crossed:
  deal 5 contact damage once
  attach one independent explosive marker
  save original dash direction on that marker

Marker:
Remain attached to target for 1 second
Allow multiple marker instances on the same target
Clean up if target dies before detonation

Detonation:
Deal 25 damage once
Knock target along saved dash direction
Enhanced version also applies level-one burn
Remove only the marker instance that detonated
```

## Important distinction

Each marker must own its timer and saved direction. It is not one shared delayed area at the dash endpoint.

```text
cast A marker(target 1, direction A, timer A)
cast B marker(target 1, direction B, timer B)
```

Stacking is intentional. A second cast must not refresh, overwrite, or prematurely detonate the first marker unless a separate game rule explicitly says so.

## Source-faithful acceptance test

1. Explosive Charge stores no more than three casts.
2. Each spent charge recovers in approximately 3.5 seconds.
3. A cast performs a short dash in the aimed direction.
4. Every distinct enemy crossed receives exactly one 5-damage contact event per cast.
5. Every crossed enemy receives its own visible marker.
6. A marker remains attached as its target moves.
7. Each marker waits approximately 1 second before detonating.
8. A marker's explosion deals 25 damage exactly once.
9. Knockback follows the direction saved by that marker's dash.
10. Several markers can coexist on one target with independent timers.
11. Adding a marker does not overwrite an existing instance.
12. Target death safely removes all of that target's pending markers.
13. Enhancement adds burn to detonation, not to the initial dash hit.

## Units extracted from Explosive Charge

### **Multi-Target Dash Marker**

A movement volume applies an attached effect once to every distinct enemy crossed.

### **Per-Instance Delayed Detonation**

Each marker preserves its own countdown and resolves independently, including when stacked on one target.

### **Saved-Direction Deferred Knockback**

The future explosion uses direction captured at application time rather than the caster's current position.

### **Independently Recharging Ammo Dash**

Three passive charges permit rapid setup while retaining a readable per-charge recovery rule.

---

# 40. Blazing Blitz

## Concrete source form

### Evidence

**[VIDEO — approximately 265.0–274.0 seconds]**

Blazing Blitz is a contact-gated single-target rush. Missing produces only the dash; connecting converts the action into a locked punch sequence and explosive finisher.

The source sequence shows:

1. The caster dashes forward wrapped in a narrow flame streak.
2. Contact with the first target stops the travel and begins rapid alternating punches.
3. The target remains held near the caster during the small repeated hits.
4. A final heavy punch creates a separate explosion and launches the target away.
5. Enhanced footage uses a longer, faster flurry before the same finisher.
6. Charged Signature makes the punches themselves explosive, ends with a much larger blast, and leaves a visible burning pool on the ground.

**[DOCUMENTED]**

Blazing Blitz is a Fire Signature Arcana with melee and movement classifications and a 6-second cooldown. On successful dash contact, the base form delivers six punches of 5 damage and one 50-damage finishing punch, for seven authored hits. Enhancement increases the flurry to ten faster punches plus the finisher, for eleven hits.

Charged Signature uses six explosive punches, a large final explosion, and a lingering pool of fire that damages and burns enemies. The long successful sequence does not make the caster invulnerable; threats behind the caster can still interrupt or damage them. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Blazing_Blitz))

## Exact source recipe

```text
BLAZING BLITZ

Input structure:
Tap Signature cast with directional aim
Charged Signature rewrite when meter is full

Approach:
Dash forward while enveloped in fire
Search for first valid enemy contact
If no contact occurs, end after dash recovery without punch sequence

Base successful contact:
Stop/align caster at contacted target
Temporarily hold target near strike point
Resolve exactly 6 punches
Deal 5 damage per punch
Use zero/low displacement during flurry
Resolve exactly 1 finishing punch
Deal 50 damage
Create small explosion and apply strong outward knockback

Enhanced successful contact:
Replace 6-punch flurry with 10 faster 5-damage punches
Preserve one 50-damage finisher

Charged Signature successful contact:
Resolve 6 explosive punches with authored local areas
Finish with one substantially larger explosion
Create one lingering fire pool at resolution point
Pool deals bounded timed hits and applies burn

Defense:
Do not grant blanket invulnerability during successful sequence

Cooldown:
6 seconds
```

## Important distinction

The punch sequence is conditional on contact. It must not begin at maximum dash distance when the player misses.

The move is also deliberately risky: locking the caster to one target does not remove attacks from enemies behind them. The charged explosions improve crowd coverage but do not silently add full-sequence invulnerability.

## Source-faithful acceptance test

1. Initial input produces a forward fire-wrapped dash.
2. Missing ends the action without spawning punches or a finisher at empty space.
3. The first valid contact converts the dash into the flurry.
4. Base contact resolves exactly six 5-damage punches.
5. Small punches keep the target near the strike point.
6. Exactly one 50-damage finishing punch follows.
7. Only the finisher owns the base form's meaningful explosion and launch.
8. Enhanced contact resolves ten faster small punches plus one finisher.
9. Successful casting does not grant blanket invulnerability.
10. Other enemies can still threaten the caster from uncovered directions.
11. Charged Signature uses six visibly explosive punches.
12. Charged Signature ends with a substantially larger final explosion.
13. Charged resolution creates one bounded lingering fire pool.
14. The pool damages and burns enemies that enter its visible area.
15. Cooldown is approximately 6 seconds whether the approach hits or misses.

## Units extracted from Blazing Blitz

### **Contact-Gated Rush Conversion**

A movement opener becomes a scripted attack only when its body finds a valid target.

### **Target-Holding Punch Sequence**

Low-force repeated hits preserve a stable duel position until the finisher takes ownership.

### **Risk-Preserving Scripted Melee**

The long animation does not automatically imply invulnerability or protection from other attackers.

### **Charged Explosive-Flurry Rewrite**

Signature charge turns each authored punch into local area pressure and adds a persistent endpoint hazard.

---

# 41. Blazing Onslaught

## Concrete source form

### Evidence

**[VIDEO — approximately 274.0–279.0 seconds]**

Blazing Onslaught is a short gathering dash followed by a point-blank fireball execution on every enemy captured by its path.

The source sequence shows:

1. The caster makes a short forward dash with a broad grab volume.
2. Enemies intersecting the route, including targets slightly behind the starting silhouette, are pulled into a compact group at the endpoint.
3. The captured group receives a rapid series of small close fireballs.
4. One visibly larger final fireball finishes the sequence and supplies the stronger knockback.
5. The move does not fire its full volley downrange when no target was gathered.
6. Enhancement increases the number of preliminary fireballs and accelerates the complete onslaught.

**[DOCUMENTED]**

Blazing Onslaught is a Fire Standard Arcana with projectile and movement classifications and a 5.2-second cooldown. The dash/grab deals 10 damage and collects every enemy in its path. It then launches three 10-damage fireballs before one 25-damage ending fireball. Enhancement uses four preliminary fireballs and executes the sequence faster. The grab can catch enemies slightly behind the caster and can move rooted enemies. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Blazing_Onslaught))

## Exact source recipe

```text
BLAZING ONSLAUGHT

Input structure:
Tap Standard cast with directional aim

Gather dash:
Use short forward movement range
Create broad grab volume spanning slightly behind caster through dash path
For every distinct valid enemy contacted:
  deal 10 grab damage once
  add target to captured set
  carry target toward common endpoint
Allow rooted enemies to be translated by this authored grab

Miss result:
If captured set is empty, end after limited miss/recovery behavior
Do not execute a full volley into empty space

Base execution:
Hold captured set in compact endpoint group
Launch 3 close fireballs, each dealing 10 damage
Launch 1 final fireball dealing 25 damage
Apply strongest knockback on final fireball

Enhanced execution:
Launch 4 preliminary 10-damage fireballs
Preserve 1 final 25-damage fireball
Shorten authored intervals for faster total sequence

Cooldown:
5.2 seconds
```

## Important distinction

Blazing Onslaught gathers multiple enemies; it does not lock to only the first contacted target. The grab is deliberately wider than the forward travel line and is allowed to translate otherwise rooted targets.

The preliminary projectiles are point-blank execution beats on the captured group. They are not an unrelated free-aim volley that continues if the dash captures nothing.

## Source-faithful acceptance test

1. Blazing Onslaught uses a shorter approach range than a normal long-distance dash attack.
2. The grab volume can catch more than one enemy in one cast.
3. It can catch a target slightly behind the caster at startup.
4. Each captured enemy receives one 10-damage grab event.
5. Captured enemies are moved into one readable endpoint group.
6. Authored grab movement can translate a rooted enemy.
7. A complete miss does not produce the full execution volley.
8. Base success launches exactly three 10-damage preliminary fireballs.
9. Exactly one 25-damage final fireball follows.
10. The final fireball owns the strongest knockback.
11. Enhanced success uses four preliminary fireballs and one finisher.
12. Enhancement accelerates the sequence rather than adding an unrelated explosion.
13. Every captured target is handled safely if another effect kills it mid-sequence.
14. Cooldown is approximately 5.2 seconds.

## Units extracted from Blazing Onslaught

### **Wide Multi-Target Gathering Dash**

A short movement volume records and carries every valid contact, including limited space behind startup.

### **Authored Root-Override Translation**

One explicit grab action can move rooted targets without globally disabling root rules.

### **Captured-Set Endpoint Execution**

A later projectile sequence operates on the surviving group gathered by an earlier movement phase.

### **Preliminary-to-Final Projectile Cadence**

Several low-damage fireballs maintain the group before one larger projectile owns the launch.

---

# 42. Homing Flares

## Concrete source form

### Evidence

**[VIDEO — approximately 279.0–299.0 seconds]**

Homing Flares creates stored orbiting ammunition that independently chooses when to launch, and its charged Signature continuously replenishes that halo.

The source sequence shows:

1. The base cast creates seven distinct fireballs in a clockwise ring around the caster.
2. The ring travels with the caster while unused flares maintain their orbital spacing.
3. When an enemy enters acquisition range, individual flares leave the ring and curve toward the nearest valid target.
4. Several flares can peel away toward different targets; launch timing is staggered rather than one simultaneous radial burst.
5. Unspent flares expire after the bounded halo duration.
6. The enhanced demonstration uses a denser ten-flare ring with a longer persistence window.
7. Charged Signature begins with ten stronger flares and continuously adds replacements over four seconds, producing a much longer stream instead of one fixed volley.

**[DOCUMENTED]**

Homing Flares is a Fire Signature Arcana with projectile classification and a 5-second cooldown. The base form creates seven clockwise-orbiting flares for up to 4 seconds. Each flare targets the nearest enemy in range, deals 7 damage, and uses 15 knockback. A flare can destroy an eligible hostile projectile, destroying itself in the exchange.

Enhancement creates ten flares and extends their duration to 5 seconds. Charged Signature continuously creates flares for 4 seconds, for 32 total; its initial ring of ten deals double damage. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Homing_Flares))

## Exact source recipe

```text
HOMING FLARES

Input structure:
Tap Signature cast
Charged Signature rewrite when meter is full

Base storage:
Create exactly 7 flare instances
Place them at evenly distributed clockwise orbit slots around caster
Move unused orbit center with caster
Maximum storage duration: 4 seconds

Per-flare acquisition:
While stored, search for nearest valid enemy inside acquisition range
When found, detach that flare from orbit
Steer toward the selected target
On enemy contact: deal 7 damage, apply 15 knockback, consume flare
On eligible hostile-projectile contact: destroy both projectiles, consume flare
If target becomes invalid, reacquire or expire under one declared rule

Enhanced storage:
Create exactly 10 flares
Extend maximum storage duration to 5 seconds

Charged Signature:
Create initial ring of 10 double-damage flares
For a 4-second generation window, continuously add authored replacement flares
Cap total flares created by the cast at 32
Each generated flare uses the same orbit, acquisition, and cleanup rules

Cooldown:
5 seconds
```

## Important distinction

The orbit is storage, not decorative startup for a pre-timed volley. Each flare owns its own nearest-target decision, departure time, collision, and lifetime.

This source-first analysis supersedes the initial game prototype as the implementation target. The existing prototype's five staggered seeking projectiles capture part of the visual idea, but the correct replacement needs seven/four-second base storage, ten/five-second enhancement, projectile interception, and the charged 32-flare feed. Do not polish the five-flare version.

## Source-faithful acceptance test

1. Base Homing Flares creates exactly seven visible flare instances.
2. Unused flares orbit clockwise in a stable ring that follows the caster.
3. The base ring persists for no more than approximately 4 seconds.
4. Each flare independently selects the nearest valid enemy in range.
5. Flares depart individually rather than as one automatic simultaneous burst.
6. Several flares can choose different targets when nearest-target relationships differ.
7. Each enemy contact deals one 7-damage event and consumes that flare.
8. Each flare uses the documented 15 knockback.
9. An eligible hostile projectile collision destroys both the hostile projectile and flare.
10. Invalid/dead targets cannot strand a flare indefinitely.
11. Enhancement creates exactly ten flares and allows up to approximately 5 seconds of storage.
12. Charged Signature begins with ten double-damage flares.
13. Charged Signature continuously adds flares over approximately 4 seconds.
14. One charged cast creates no more than 32 flares total.
15. Every stored, launched, intercepted, expired, or owner-orphaned flare cleans up exactly once.
16. The current five-flare game prototype does not count as source-first implementation completion.

## Units extracted from Homing Flares

### **Player-Attached Orbit Storage**

Unused projectiles occupy persistent slots around a moving owner until acquisition or expiry.

### **Independent Nearest-Target Departure**

Every stored projectile makes its own target and launch-time decision.

### **Mutual Projectile Interception**

A friendly flare can trade itself for an eligible hostile projectile as active defense.

### **Continuous Charged Ammo Feed**

Charged Signature generates new orbiting units over time under both duration and total-count caps.

### **Legacy-to-Source-First Replacement Boundary**

Improved research becomes authoritative while the existing approximation remains documented but incomplete.

---

# 43. Tracer Barrage

## Concrete source form

### Evidence

**[VIDEO — approximately 299.0–310.0 seconds]**

Tracer Barrage is a fan of boomerang fireballs. The outward and return paths are both damaging, and the return destination follows the caster's movement.

The source sequence shows:

1. The base cast releases six bright fireballs in a broad forward fan.
2. Each tracer follows a slightly different arcing lane through the same general aim sector.
3. At a fixed travel distance, the projectiles turn and fly back toward the caster.
4. A target can be hit once on the outward leg and again on the return leg.
5. Moving after the cast changes the convergence point and therefore bends the return lanes through new space.
6. The enhanced form uses seven visibly larger tracers.
7. Charged Signature fills a much larger fan with twenty tracers while retaining the outbound-and-return behavior.

**[DOCUMENTED]**

Tracer Barrage is a Fire Signature Arcana with projectile classification and a 5-second cooldown. The base form fires six projectiles in the aimed direction. Each deals 7 damage and can hit a target once outbound and once inbound, for up to twelve authored hits across the volley. Enhancement fires seven larger projectiles for up to fourteen hits.

Charged Signature fires twenty fireballs at once across a larger area and retains the boomerang properties with increased range/damage. None of these forms inherently inflicts burn. Returning trajectories can be manipulated by moving the caster after launch. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Tracer_Barrage))

## Exact source recipe

```text
TRACER BARRAGE

Input structure:
Tap Signature cast with aim snapshot
Charged Signature rewrite when meter is full

Base emission:
Create exactly 6 fireball instances
Distribute aim directions across authored forward fan
Each fireball begins in OUTBOUND state

Outbound state:
Follow assigned arcing lane to fixed turn distance
Deal 7 damage at most once per target in OUTBOUND state

Turn event:
Switch projectile to RETURNING state
Do not clear projectile identity or outbound hit history

Returning state:
Steer toward caster's current position
Deal 7 damage at most once per target in RETURNING state
Allow a target already hit outbound to be hit once again
Destroy projectile on valid return/expiry rule

Enhanced emission:
Create exactly 7 larger fireballs
Preserve two-leg hit ownership

Charged Signature emission:
Create exactly 20 fireballs across larger fan
Preserve outbound turn and live-owner return targeting

Status:
Do not apply burn by default

Cooldown:
5 seconds
```

## Important distinction

Tracer Barrage needs hit memory by travel phase, not one lifetime-wide `alreadyHit` set.

```text
outbound: target A may be hit once
returning: target A may be hit once again
```

The return path aims at the caster's current position. Saving the original cast point would remove the source's movement-based trajectory control and make the two legs overlap too predictably.

## Source-faithful acceptance test

1. Base Tracer Barrage creates exactly six fireballs.
2. Their outbound lanes form a readable forward fan rather than one stacked projectile line.
3. Every tracer switches to a return phase after a fixed authored distance.
4. A target receives at most one 7-damage hit from one tracer's outbound leg.
5. The same target may receive one additional 7-damage hit from that tracer's return leg.
6. One tracer cannot repeatedly hit a target within the same travel phase.
7. Return steering follows the caster's current position.
8. Moving after casting visibly changes the returning convergence paths.
9. Enhanced Tracer Barrage creates exactly seven larger tracers.
10. Charged Signature creates exactly twenty tracers across a larger area.
11. Charged tracers retain outbound and return states.
12. No form applies an invented default burn.
13. Owner defeat/room transition safely cleans all remaining tracers.
14. Cooldown is approximately 5 seconds.

## Units extracted from Tracer Barrage

### **Two-Leg Projectile Hit Memory**

One projectile may hit the same target once in each named travel phase without frame-based repeat damage.

### **Fan-of-Arcs Emission**

A volley distributes distinct curved lanes across one aim sector.

### **Live-Owner Return Homing**

The return destination follows the caster, letting post-cast movement reshape projectile coverage.

### **Count-and-Scale Enhancement**

Enhancement adds one larger tracer while preserving the base state machine.

### **High-Count Charged Fan Rewrite**

Signature charge expands the same boomerang grammar to twenty lanes rather than substituting an unrelated explosion.

