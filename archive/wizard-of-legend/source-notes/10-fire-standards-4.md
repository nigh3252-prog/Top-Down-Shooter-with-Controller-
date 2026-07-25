# 49. Ignition Drive

## Concrete source form

### Evidence

**[VIDEO — approximately 353.0–357.0 seconds]**

Ignition Drive is a five-beat ground sequence that carries enemies forward through four small explosions and a larger burning finisher.

The source sequence shows:

1. The caster strikes forward and the first explosion appears close to their feet.
2. Four compact blasts step outward along one aimed ground line.
3. Enemies caught by early blasts are pushed into the next blast instead of scattered sideways.
4. A larger fifth explosion resolves at the far end of the route.
5. The final blast applies the strongest damage, knockback, and burn.
6. Enhanced form leaves a short-lived fire pool at the final blast position.

**[DOCUMENTED]**

Ignition Drive is a Fire Standard Arcana with a 5.5-second cooldown. It creates five sequential explosions: the first four deal 10 damage each, carry enemies forward, and lead into one 30-damage burning explosion. Enhancement adds a lingering pool at the final location; the pool deals 12 damage and applies burn. Despite their ground presentation, the explosions can travel over pits. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Ignition_Drive))

## Exact source recipe

```text
IGNITION DRIVE

Input structure:
Tap Standard cast with aim snapshot

Route:
Create 5 ordered explosion points along forward aim line
Allow authored route to continue across pits

Beats 1 through 4:
At each point create one compact explosion
Deal 10 damage per beat
Push/carry targets toward next route point
Use per-beat hit ownership so one target can follow the sequence

Beat 5:
Create one larger endpoint explosion
Deal 30 damage
Apply burn and strongest forward/outward knockback

Enhanced endpoint:
Create one bounded fire pool at beat-5 position
Pool deals 12-damage contact events under explicit per-target cadence
Apply burn

Cooldown:
5.5 seconds
```

## Important distinction

The explosions are discrete scheduled emitters, not one invisible moving hitbox. Their force is coordinated to make the sequence connect:

```text
four carry beats -> one endpoint finisher -> optional enhanced pool
```

## Source-faithful acceptance test

1. One cast creates exactly five visible explosion beats.
2. Their centers advance along the snapshotted aim line.
3. The first four blasts each deal 10 damage.
4. Early blasts carry affected targets toward later blast centers.
5. The fifth blast is visibly larger and deals 30 damage.
6. The fifth blast applies burn and the strongest displacement.
7. A target can be handed from one authored beat to the next without frame-based repeat hits.
8. The explosion route can continue over a pit even though the caster cannot stand there.
9. Enhancement creates one pool only at the final point.
10. The pool uses bounded 12-damage contact events and burn.
11. Cooldown is approximately 5.5 seconds.

## Units extracted from Ignition Drive

### **Sequential Ground-Point Emitter Line**

A cast schedules visibly separate world-space explosions along a declared route.

### **Forward Carry Handoff**

Early force intentionally moves targets into the next event rather than resolving each blast independently.

### **Endpoint-Owned Persistent Enhancement**

Enhancement adds one lingering hazard only after the authored finisher resolves.

---

# 50. Fire Wall

## Concrete source form

### Evidence

**[VIDEO — approximately 357.0–363.0 seconds]**

Fire Wall constructs a stationary line of flames in front of the caster that blocks hostile projectiles and repeatedly repels enemies attempting to cross.

The source sequence shows:

1. A line ignites segment by segment across the caster's forward space.
2. The wall is oriented across the approach lane rather than extending away like a beam.
3. Its flame body remains fixed after formation.
4. Enemies entering the line receive damage, burn, and a small push back out of it.
5. Hostile projectiles disappear when they contact the visible flames.
6. Enhanced form completes formation faster and spans roughly twice the width.

**[DOCUMENTED]**

Fire Wall is a Fire Standard Arcana with an 8-second cooldown. It ignites a wall in front of the caster; contact deals 10 damage, applies 10 knockback, and burns. The wall dissipates enemy projectiles. Enhancement doubles its width and forms it more quickly. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Fire_Wall))

## Exact source recipe

```text
FIRE WALL

Input structure:
Tap Standard cast with aim snapshot

Placement:
Choose valid point a short distance in front of caster
Orient line perpendicular to aim direction
Grow flame segments outward from center over authored formation time

Active wall:
Remain stationary at placement transform
On valid enemy contact:
  deal 10 damage under explicit re-entry/per-target cadence
  apply 10-class push away from wall crossing
  apply burn
On eligible hostile-projectile contact:
  destroy projectile

Enhanced wall:
Use approximately twice the base line width
Shorten formation time
Preserve damage, burn, and blocking rules

Cooldown:
8 seconds
```

## Important distinction

Fire Wall is physical area denial, not a damage-over-time rectangle that enemies and projectiles ignore. Its collision line must match the visible flames and push melee enemies back toward the side they entered from.

## Source-faithful acceptance test

1. The wall appears a short distance in front of the caster.
2. Its long axis is perpendicular to the aimed approach direction.
3. Flame segments visibly form a continuous blocking line.
4. The wall remains stationary after placement.
5. Enemy contact deals a bounded 10-damage event and burn.
6. Contact pushes the enemy out of the wall rather than along it.
7. Repeated pressure cannot produce frame-rate-dependent damage.
8. Eligible hostile projectiles disappear on visible wall contact.
9. Projectiles outside the visible line are not blocked.
10. Enhanced wall spans roughly twice the width and forms faster.
11. Cooldown is approximately 8 seconds.

## Units extracted from Fire Wall

### **Aim-Perpendicular Barrier Placement**

Forward aim selects a position while the authored barrier rotates across the threat lane.

### **Bidirectional Entry Repulsion**

Contact force returns an enemy toward its entry side rather than using the caster's later position.

### **Persistent Projectile-Erasing Line**

A visible stationary barrier supplies active defense for its declared footprint and lifetime.

---

# 51. Crashing Meteor

## Concrete source form

### Evidence

**[VIDEO — approximately 363.0–369.0 seconds]**

Crashing Meteor separates targeting from impact: a warning circle appears first, remains committed in world space, and is struck from above after a long delay.

The source sequence shows:

1. The caster places a large circular sigil at the aimed ground point.
2. The caster regains freedom while the sigil remains fixed and warns of the future impact.
3. Roughly one and a half seconds later, one meteor crashes into that exact circle.
4. The impact produces one high-damage radial stun/knockback event.
5. Enhanced form inserts a rapid shower of small hit-stunning meteors immediately before the main impact.
6. Charged Signature expands into a room-scale randomized meteor storm lasting several seconds.

**[DOCUMENTED]**

Crashing Meteor is a Fire Signature Arcana with a 6-second cooldown. The base cast marks a circle, waits about 1.5 seconds, then deals one 75-damage meteor hit with 30 knockback and stun. Enhancement first drops ten small meteors at 4 damage each, then a reduced 60-damage main meteor.

Charged Signature calls roughly 10–20 large meteors plus many smaller meteors across a massive area for about 3 seconds; large impact placement is intentionally distributed rather than guaranteed to stack on one target. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Crashing_Meteor))

## Exact source recipe

```text
CRASHING METEOR

Input structure:
Tap Signature ground-target cast
Charged Signature rewrite when meter is full

Base telegraph:
Resolve valid aimed ground point
Create fixed circular warning sigil
Wait approximately 1.5 seconds

Base impact:
Create exactly 1 meteor at sigil center
Deal 75 damage once in circle
Apply stun and 30-class radial knockback
Remove sigil/meteor feedback

Enhanced impact sequence:
Immediately before main impact, schedule exactly 10 small meteors inside circle
Each small meteor deals 4 damage and hit-stuns
Then create one 60-damage main meteor

Charged Signature:
Create massive storm region for approximately 3 seconds
Schedule roughly 10–20 large impacts plus numerous small impacts
Distribute impact points across region using seeded/readable sampling
Do not force all large meteors onto one target

Cooldown:
6 seconds
```

## Important distinction

The telegraph is a committed promise: the meteor must land at its recorded world position even if the caster moves, turns, or attacks elsewhere. Enhancement trades main-hit damage for ten setup hits that help keep targets inside the circle.

## Source-faithful acceptance test

1. A cast places one readable circular warning at a valid aimed point.
2. The circle remains fixed in world space after casting.
3. Base impact waits approximately 1.5 seconds.
4. One base meteor lands at the center and deals 75 damage.
5. The impact stuns and radially knocks affected enemies.
6. Moving the caster does not drag the telegraph or impact.
7. Enhanced form drops exactly ten 4-damage small meteors before the main one.
8. Enhanced main meteor deals 60 damage.
9. Charged Signature covers a substantially larger area for about 3 seconds.
10. Charged large impacts are spatially distributed rather than guaranteed single-target stacks.
11. Every delayed cast cleans up on room transition and invalid scene teardown.
12. Cooldown is approximately 6 seconds.

## Units extracted from Crashing Meteor

### **Committed Delayed Ground Telegraph**

A cast records one world-space promise that survives after control returns to the player.

### **Setup-Shower-to-Main-Impact Enhancement**

Several low hits buy target retention before one reduced but decisive main event.

### **Seeded Distributed Room Storm**

A charged area schedules many impacts across readable space without guaranteeing all random events on one enemy.

---

# 52. Engulfing Fissure

## Concrete source form

### Evidence

**[VIDEO — approximately 369.0–378.0 seconds]**

Engulfing Fissure places independent dormant traps around the caster; proximity activates one trap, pulls a target to its center, and consumes it through a fixed five-hit sequence.

The source sequence shows:

1. The caster strikes the floor and dark burning cracks appear at separate nearby positions.
2. Base placement creates three traps rather than one continuous circular field.
3. Traps remain dormant and stationary while the caster moves away.
4. An enemy entering one trap causes that fissure to flare, pull the enemy inward, and repeatedly hit it.
5. The activated trap disappears after its own sequence while unused traps remain.
6. Enhanced placement creates five fissures in an X-shaped arrangement beneath/around the caster.

**[DOCUMENTED]**

Engulfing Fissure is a Fire Standard Arcana with a 5-second cooldown. Base casting places three traps for up to 8 seconds. When triggered, a trap pulls an enemy into its center and deals five hits of 5 damage, then disappears. Enhancement places five traps in an X pattern. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Engulfing_Fissure))

## Exact source recipe

```text
ENGULFING FISSURE

Input structure:
Tap Standard cast

Base placement:
Create exactly 3 stationary fissure traps at authored local offsets around caster

Enhanced placement:
Create exactly 5 traps in X-shaped offset pattern

Per-trap dormant state:
Remain armed for up to 8 seconds
Do not damage without a valid trigger
Own independent trigger and lifetime state

Trigger:
First valid enemy enters trap radius
Lock that trap to triggering target
Pull target toward trap center
Resolve exactly 5 timed hits
Deal 5 damage per hit
Maintain readable hit-stun during short sequence

Cleanup:
Consume activated trap after fifth hit or safe invalid-target resolution
Expire unused trap harmlessly at 8 seconds

Cooldown:
5 seconds
```

## Important distinction

The spell is a collection of independent consumable traps, not one area with three decorations. Triggering one fissure must not start or remove the others. Dormant proximity is the gate; the trap does not tick simply because it exists.

## Source-faithful acceptance test

1. Base cast places exactly three distinct fissures.
2. Enhanced cast places exactly five fissures in an X pattern.
3. Every trap remains fixed where placed for up to 8 seconds.
4. A dormant trap does not deal damage before an enemy enters its trigger.
5. Triggering one trap leaves other traps independently armed.
6. The triggered trap pulls its target toward the trap center.
7. It resolves exactly five 5-damage hits.
8. It disappears after completing its sequence.
9. An unused trap expires without an invented explosion.
10. Target death mid-sequence cleans the trap safely.
11. Cooldown is approximately 5 seconds.

## Units extracted from Engulfing Fissure

### **Independent Multi-Trap Placement**

One cast creates several world objects with separate arming, trigger, and cleanup state.

### **Trigger-Locked Pull Sequence**

First proximity contact binds a trap to one target and converts it into a fixed-count control attack.

### **Pattern-Rewrite Enhancement**

Enhancement changes the spatial placement set from three offsets to an explicit five-point X.

---

# 53. Rapid Fire Agent

## Concrete source form

### Evidence

**[VIDEO — approximately 378.0–391.0 seconds]**

Rapid Fire Agent is a vulnerable autonomous summon that follows the caster, chooses the nearest enemy, and fires repeated discrete fireballs for ten seconds.

The source sequence shows:

1. A small flame-bodied agent appears beside the caster.
2. It floats independently while loosely following the caster's movement.
3. The agent turns toward the nearest target and repeatedly launches visible fireball projectiles.
4. Its shots travel through world space and can retarget as enemies change.
5. The caster continues moving and using other Arcana while the agent attacks.
6. If separated too far, the agent teleports back near its owner rather than pathing indefinitely.
7. Enhanced form fires noticeably faster but uses smaller per-shot damage.

**[DOCUMENTED]**

Rapid Fire Agent is a Fire Standard Arcana with projectile and summon classifications, a 15-second cooldown, and a 10-second summon duration. One agent fires 5-damage projectiles at 2.5 shots per second toward the nearest enemy. It has finite health, can be targeted and killed, loosely follows the player, and teleports back when too distant.

Enhancement lowers each shot to 4 damage but increases fire rate to 4 shots per second, producing about forty possible shots over a full uninterrupted lifetime instead of about twenty-five. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Rapid_Fire_Agent))

## Exact source recipe

```text
RAPID FIRE AGENT

Input structure:
Tap Standard summon

Spawn:
Create 1 agent near valid caster-side point
Assign finite health and normal enemy-targetable summon body
Maximum active duration: 10 seconds

Follow:
Maintain loose preferred offset from caster
Use local movement/path rules
If owner distance exceeds hard threshold, teleport to safe nearby owner point

Base attack loop:
At 2.5 shots per second, select nearest valid enemy in attack range
Launch 1 visible fireball toward target snapshot
Each projectile deals 5 damage and 10 knockback on valid contact

Enhanced attack loop:
Fire at 4 shots per second
Each projectile deals 4 damage
Preserve targeting, travel, and lifetime rules

Cleanup:
Despawn on 10-second expiry, zero health, owner invalidation, or room teardown

Cooldown:
15 seconds
```

## Important distinction

An agent is an autonomous combat actor, not a player-attached turret effect. It owns health, target selection, follow/teleport movement, projectile timing, and death cleanup. Enhancement deliberately trades individual impact for frequency.

## Source-faithful acceptance test

1. One cast creates exactly one agent at a valid nearby point.
2. The caster remains free to act while the agent operates.
3. The agent loosely follows rather than remaining fixed or rigidly attached.
4. Excess owner distance triggers a safe teleport back.
5. The agent selects the nearest valid enemy in range for each attack decision.
6. Base fire rate is approximately 2.5 projectiles per second.
7. Base projectiles each deal 5 damage and use 10 knockback.
8. Enhanced fire rate is approximately 4 projectiles per second.
9. Enhanced projectiles each deal 4 damage.
10. The agent has finite health and can be killed by enemy attacks.
11. It expires after approximately 10 seconds even if unharmed.
12. Death, expiry, owner invalidation, and room change each clean up once.
13. Cooldown is approximately 15 seconds.

## Units extracted from Rapid Fire Agent

### **Health-Bearing Autonomous Summon**

A temporary allied actor participates in targeting, damage reception, and death rather than existing as an untouchable effect.

### **Loose Follow with Hard Leash Teleport**

Local motion preserves agent independence while a distance threshold guarantees owner recovery.

### **Per-Shot Nearest-Target Loop**

Each emission can reconsider the battlefield instead of remaining locked to the first target for ten seconds.

### **Damage-for-Frequency Enhancement Trade**

Enhancement explicitly lowers per-shot damage while raising cadence and total opportunity count.

---

# 54. Ward of Flames

## Concrete source form

### Evidence

**[VIDEO — approximately 391.0–402.0 seconds]**

Ward of Flames is a stationary, destructible summon that pulses damage and applies an elemental vulnerability field to enemies inside its ring.

The source sequence shows:

1. The caster places a rune-bearing ward slightly in front of them.
2. A large orange ring establishes the ward's fixed area.
3. Placement deals one strong immediate hit to overlapping enemies.
4. The ward then emits one expanding fire ring each second for repeated smaller hits.
5. Enemies inside the marked area display the effect while other Fire attacks deal amplified damage.
6. The ward remains after the caster moves away but can be attacked and destroyed.
7. Enhanced form uses a substantially larger ring and extends its vulnerability bonus to Water damage.

**[DOCUMENTED]**

Ward of Flames is a Fire Standard Arcana with summon and buff classifications, an 8-second cooldown, and an 8-second duration. It has 50 health. Summoning deals 30 damage, then the ward emits a 5-damage ring every second. Enemies inside take 20% more Fire damage, including increased burn damage and the ward's own Fire attacks.

Enhancement makes the area much larger and also causes enemies inside to take 20% more Water damage. Overlapping wards do not stack the 20% vulnerability. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Ward_of_Flames))

## Exact source recipe

```text
WARD OF FLAMES

Input structure:
Tap Standard ground placement

Spawn:
Place 1 stationary ward at valid point slightly in front of caster
Assign 50 health
Maximum duration: 8 seconds
Create visible circular influence boundary

Placement payload:
Deal 30 Fire damage once to valid enemies in area

Pulse loop:
Every 1 second emit one visible expanding fire ring
Deal 5 Fire damage under one-hit-per-pulse ownership

Vulnerability field:
While enemy is inside boundary, apply +20% incoming Fire damage
Include burn and ward's own Fire damage under normal elemental tagging
Do not stack multiplier from overlapping Ward of Flames instances

Enhanced field:
Increase boundary radius substantially
Also apply +20% incoming Water damage
Do not change non-Fire/non-Water damage

Cleanup:
Remove field and pulse loop at 8 seconds, zero health, owner/room invalidation

Cooldown:
8 seconds
```

## Important distinction

The ward debuffs enemies inside its world-space area; it is not a global player Fire-damage buff. Entry and exit must update vulnerability promptly, and overlapping wards must resolve to one 20% modifier rather than multiplying repeatedly.

## Source-faithful acceptance test

1. The ward appears at a valid stationary point in front of the caster.
2. Its circular influence area is always visibly readable.
3. Placement deals exactly one 30-damage event.
4. One 5-damage ring is emitted approximately every second.
5. A target receives at most one hit from each pulse.
6. Enemies inside take 20% more Fire-tagged damage.
7. Burn damage and the ward's own attacks follow the Fire vulnerability rule.
8. Leaving the area removes the vulnerability.
9. Two overlapping wards do not stack beyond 20%.
10. The ward has 50 health and can be destroyed by enemy attacks.
11. It expires after approximately 8 seconds if not destroyed.
12. Enhancement enlarges the area and adds 20% Water vulnerability.
13. Enhancement does not amplify unrelated elements.
14. Cooldown is approximately 8 seconds.

## Units extracted from Ward of Flames

### **Destructible Stationary Ward Actor**

A placed allied object owns health, lifetime, pulses, and a visible influence boundary.

### **Placement Hit plus Periodic Rings**

One strong spawn event is followed by discrete one-second pulse events with separate hit ownership.

### **Enemy-Local Elemental Vulnerability Field**

Damage amplification is attached to targets currently inside the area, not granted globally to the caster.

### **Non-Stacking Overlap Resolver**

Several fields may overlap geometrically while one canonical elemental modifier remains active.

