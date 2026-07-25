---

# 27. Circuit Line

## Concrete source form

### Evidence

**[VIDEO — approximately 157.9–165.8 seconds]**

Circuit Line turns repeated dashes into a delayed network of electrical nodes and connecting wires.

With one dash:

1. The caster dashes forward.
2. One glowing electric orb remains at the starting point.
3. A second orb remains at the endpoint.
4. The two orbs wait briefly without dealing the main damage.
5. After the delay, a jagged lightning stream connects them.
6. Enemies standing across the segment receive many small 2-damage hits.

The later demonstration uses several dashes in quick succession. Each dash adds another orb to the arrangement. When the delay ends, the nodes connect into multiple line segments, and the final node links back to the first to close the circuit. The result is a temporary electrical cage or polygon rather than several unrelated dash trails.

The delay is restarted or extended by adding another node. This gives the player time to author the shape before the whole network activates.

**[DOCUMENTED]**

Circuit Line is a Lightning Dash Arcana with movement subtype. It stores up to three charges, with a cooldown of 4 seconds per charge.

Each dash leaves an orb at its start and endpoint. After 1.5 seconds, the orbs connect with a lightning stream that deals six hits of 2 damage. When enhanced, each stream deals eight hits of 2 damage.

Using multiple dashes before activation adds more orbs. After 1.5 seconds from the final addition, nearby orbs connect, and the final orb links back to the first. Each additional chain causes all chains to hit two additional times. Orbs placed too far apart do not connect, and particular timing can separate nodes into different groups. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Circuit_Line))

## Exact source recipe

```text
CIRCUIT LINE

Input structure:
Directional dash activation

Charge system:
Passively store up to 3 charges
Cooldown: 4 seconds per charge
Spend one charge per magical dash

On each magical dash:
Place electric node at dash start
Place electric node at dash endpoint
Add nodes to current pending circuit group

Pending delay:
1.5 seconds after most recent node addition
Adding another valid node restarts or extends activation timing

Single-dash topology:
Node A connected to Node B
One lightning segment

Multi-dash topology:
Connect nearby nodes in authored order or valid chain
Final node connects back to first node
Create closed circuit when possible

Connection distance:
Nodes too far apart do not connect

Base line payload:
2 damage per tick
Minimum 6 ticks per stream

Enhanced line payload:
2 damage per tick
Minimum 8 ticks per stream

Topology scaling:
Each additional chain causes all active chains to gain 2 additional hits

Activation:
All valid streams appear after pending delay
Streams damage enemies overlapping their line footprints

Cleanup:
Circuit exists for authored stream duration
Then nodes and streams disappear
```

## Important distinction

Circuit Line is not a dash that directly leaves a finished lightning trail.

```text
Dash now:
place nodes only

Wait / add more dashes:
author graph

After delay:
activate all connecting edges
```

Its gameplay object is a **delayed graph**:

```text
nodes = dash endpoints
edges = valid lightning connections
closed loop = final node links to first
```

The number of lines and the number of ticks per line both grow as the network gains connections. The topology itself therefore scales the payload.

## Source-faithful acceptance test

1. Circuit Line stores a maximum of three charges.
2. A magical dash places one node at the start and one at the endpoint.
3. The main lightning line does not activate immediately.
4. The activation delay is approximately 1.5 seconds after the latest node addition.
5. One dash creates a two-node connection.
6. A base stream deals six 2-damage ticks at minimum.
7. An enhanced stream deals eight 2-damage ticks at minimum.
8. Additional quick dashes add nodes to the pending network.
9. The final node connects back to the first when a valid closed circuit is formed.
10. Nodes beyond the allowed connection distance do not create a line.
11. Every added chain increases the hit count of all chains by two.
12. The network activates as a coordinated delayed event rather than one line immediately after each dash.
13. Enemies are damaged by overlapping the actual connecting segments.
14. Timing that separates node groups can produce separate circuits rather than one impossible long connection.

## Units extracted from Circuit Line

### **Dash-Authored Node Placement**

Movement creates persistent nodes at meaningful positions instead of directly creating the final attack.

### **Delayed Spatial Graph**

Nodes become vertices and electrical streams become edges after an authoring window.

### **Input-Extended Arming Delay**

Adding another component postpones resolution so the player can continue constructing the pattern.

### **Automatic Loop Closure**

The final valid node reconnects to the first to transform a path into a closed circuit.

### **Topology-Scaled Hit Schedule**

Adding an edge increases not only coverage but also the number of ticks produced by every edge.

### **Distance-Gated Connectivity**

Graph edges exist only between nodes within a declared connection distance.

---

# 28. Shock Line

## Concrete source form

### Evidence

**[VIDEO — approximately 165.9–168.3 seconds]**

Shock Line is a forward dash that leaves a short electrical wire across the dash route, oriented perpendicular to the caster's movement.

The source sequence is compact:

1. The caster dashes forward.
2. A vertical-looking line of yellow electricity appears across the lane behind the caster.
3. The line spans sideways relative to the dash direction rather than following the path lengthwise.
4. Enemies touching the line receive rapid shock ticks and remain briefly hit-stunned.
5. The line can erase hostile projectiles that attempt to cross it.

In the enhanced demonstration, a second parallel line is created farther forward. The two wires form a narrow band or gate around the dash route, allowing the player to shock enemies either while retreating through them or while advancing into them.

The line itself has no separate direct-impact payload documented. Its damage comes entirely from the shock status it applies.

**[DOCUMENTED]**

Shock Line is a Lightning Dash Arcana with movement subtype. The dash leaves behind a wire of electricity perpendicular to the movement direction. Contact applies level-3 shock and destroys enemy projectiles.

Level-3 shock deals eight ticks of 2 damage over about 1 second, for 16 total damage. When enhanced, a second wire is created in front of the first. The cooldown is 6 seconds. A cooldown dash remains available but creates no wires. Because the source damage is entirely shock damage, ordinary damage modifiers do not affect it. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Shock_Line)) ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Status_effects))

## Exact source recipe

```text
SHOCK LINE

Input structure:
Directional dash activation

Phase 1:
Caster performs forward dash

Orientation resolver:
Read dash direction
Rotate line footprint 90 degrees
Place wire perpendicular to dash axis

Base placement:
Create one stationary electrical wire behind caster

Wire geometry:
Short line segment
Crosses dash lane laterally
Fixed in world space

Wire contact:
Apply level-3 shock
Destroy enemy projectiles
No separate direct-damage hit documented

Level-3 shock payload:
8 ticks
2 damage per tick
16 total
Repeated hit stun during ticks

Enhanced placement:
Preserve first wire
Create second parallel wire in front of first

Cooldown:
6 seconds

Cooldown fallback:
Dash remains available
No wires are created
No shock or projectile erasure from the arcana
```

## Important distinction

Shock Line's name does not mean the electricity follows the dash path.

```text
Dash direction: →
Wire orientation: |
```

The footprint uses the **normal** of the movement vector. That makes it a gate across a lane rather than a trail along one.

Shock Line also uses status-only damage:

```text
wire direct damage = none documented
wire contact = apply shock
shock status = all source damage
```

## Source-faithful acceptance test

1. Activating Shock Line performs a forward dash.
2. The base version creates exactly one electrical wire.
3. The wire remains stationary in world space.
4. The wire is perpendicular to the dash direction.
5. The wire is not laid lengthwise along the full dash path.
6. Contact applies level-3 shock.
7. Level-3 shock deals eight 2-damage ticks for 16 total.
8. The wire has no invented direct-impact damage before the shock.
9. Shock ticks repeatedly hit-stun affected enemies.
10. The wire destroys enemy projectiles that cross it.
11. A cooldown use still performs the dash.
12. A cooldown use creates no wire.
13. Enhancement preserves the first wire.
14. Enhancement adds one second parallel wire in front of it.
15. The enhanced pair remains perpendicular to the dash axis.

## Units extracted from Shock Line

### **Motion-Normal Footprint**

An attack derives its orientation by rotating the movement vector 90 degrees.

### **Dash-Placed Gate**

The caster crosses a location and leaves a lateral barrier behind rather than a longitudinal trail.

### **Status-Only Line Hazard**

The line owns collision and status application while the status owns all damage and repeated hit stun.

### **Projectile-Erasing Wire**

A narrow persistent footprint acts as an active defensive barrier against hostile projectiles.

### **Parallel-Gate Enhancement**

Enhancement preserves the original wire and adds a second offset copy with the same orientation.

# What these ten add to the construction language

| Spell | Newly clarified unit |
|---|---|
| Ignition Rush | Player-attached contact aura with current-position expiration burst |
| Air Burst | Rear-biased dash burst that carries enemies along the movement vector |
| Gust Burst | Gather-then-translate control across a dash |
| Razor Burst | Dash-deposited stationary vortex with lifetime-coupled ticks |
| Spike Track | Many-visuals one-hit path with endpoint continuation |
| Toxic Trap | Rear trap that hands damage ownership to a target status |
| Snare Track | Divergent-to-convergent multi-line formation and movement-only disable |
| Thunder Line | Dash-origin delayed strike with core-and-burst layering |
| Circuit Line | Delayed node graph whose topology scales hit count |
| Shock Line | Perpendicular dash gate with status-only damage and projectile erasure |

Their compact source-derived recipes are:

```text
IGNITION RUSH =
DirectionalDash
+ PlayerAttachedFireAura
+ ContactBurn
+ CooldownFallbackMovement
+ EnhancedCurrentPositionExpirationBurst
```

```text
AIR BURST =
DirectionalDash
+ RearBiasedWindBurst
+ DirectionalEnemyCarry
+ EnhancedUShapeReplacement
+ EnhancedSlow
```

```text
GUST BURST =
TwoChargeDash
+ OriginGatherBurst
+ DirectionalEnemyTransport
+ EnhancedEndpointBurst
```

```text
RAZOR BURST =
DirectionalDash
+ StationaryWakeVortex
+ PullAndSlow
+ PeriodicTickSchedule
+ EnhancedDuration
```

```text
SPIKE TRACK =
DirectionalDash
+ SequentialPathEruption
+ ManyVisualsOneHit
+ CooldownFallbackMovement
+ EnhancedEndpointContinuation
```

```text
TOXIC TRAP =
DirectionalDash
+ RearCircularTrap
+ FieldToTargetPoisonHandoff
+ StatusOnlyDamage
+ EnhancedForwardTrap
```

```text
SNARE TRACK =
DirectionalDash
+ ThreeLineDivergentWake
+ Entanglement
+ EnhancedConvergentForwardContinuation
```

```text
THUNDER LINE =
TwoChargeDash
+ OriginLightningStrike
+ DirectCoreHit
+ AreaBurstAndShock
+ EnhancedRadiusAndShockTier
```

```text
CIRCUIT LINE =
ThreeChargeDash
+ EndpointNodePlacement
+ InputExtendedArmingDelay
+ DistanceGatedGraphConnections
+ AutomaticLoopClosure
+ TopologyScaledTicks
```

```text
SHOCK LINE =
DirectionalDash
+ PerpendicularWorldSpaceWire
+ StatusOnlyShockDamage
+ ProjectileErase
+ EnhancedParallelWire
```

The strongest new distinction is that a dash payload can relate to the movement in many fundamentally different ways:

```text
Ignition Rush:
payload follows the player

Air Burst:
payload briefly carries enemies with the player

Gust Burst:
payload transports enemies from origin toward destination

Razor Burst:
payload remains as a vortex in the wake

Spike Track:
payload reproduces the traveled path

Toxic Trap:
payload places a discrete trap behind

Snare Track:
payload releases an authored moving formation behind and ahead

Thunder Line:
payload attacks the saved origin after the player leaves

Circuit Line:
movement authors nodes for a delayed network

Shock Line:
payload creates a lateral gate across the route
```

Treating all of these as merely `dash + effect` would erase the source behavior that makes each one feel different.
