# 18. Flare Rush

## Concrete source form

### Evidence

**[VIDEO — approximately 99.5–104 seconds]**

Flare Rush is a forward dash followed by a delayed, parallel volley of fireballs traveling along the same direction.

The source sequence is visibly staged:

1. The caster dashes forward.
2. Three fireballs form behind the caster rather than at the destination.
3. The fireballs begin moving after the caster has already advanced.
4. They travel along three roughly parallel lanes aligned with the dash direction.
5. The volley follows through the space the caster just crossed and continues ahead into enemies.

The fireballs do not orbit, home, or ricochet. Their relationship to the dash is directional and temporal: the caster goes first, and the trailing volley follows.

The delay is important. The caster reaches the forward position before the fireballs catch up, creating a brief moment where the player has committed near the enemy but the supporting damage has not yet arrived.

In the showcase, direct fireball impacts display 10-damage numbers, followed by smaller burn ticks.

**[DOCUMENTED]**

Flare Rush is a Fire Dash Arcana with movement and projectile subtypes. It summons three fireballs behind the caster, or five when enhanced, and sends them in the dash direction. The dash remains usable while on cooldown, but cooldown uses summon no fireballs. Its cooldown is 5.5 seconds. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Flare_Rush))

The wiki prose states that each fireball deals 10 direct damage and applies burn, matching the visible 10-damage impact numbers in the supplied showcase. The same page's summary table currently lists a different damage pair of 18 and 16 burn. Because the prose and supplied video agree while the summary table conflicts, a showcase-faithful duplicate should initially use the observed 10-damage impact and keep the table values marked as version-dependent or unresolved. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Flare_Rush))

## Exact source recipe

```text
FLARE RUSH

Input structure:
Directional dash activation

Direction:
Current movement direction

Phase 1:
Caster performs rapid forward dash

Phase 2:
Spawn trailing fireball formation behind caster

Base formation:
Three independent fireballs
Roughly parallel lanes
Aligned to dash direction

Temporal relationship:
Caster moves first
Fireballs launch after or during late dash phase
Volley takes time to reach the caster's new forward position

Projectile path:
Straight
No homing
No orbit
No wall-ricochet identity

Projectile contact:
Observed direct impact: 10 damage
Apply burn
Projectile resolves on contact unless direct testing proves otherwise

Cooldown:
5.5 seconds

Cooldown fallback:
Dash remains available
No fireballs are summoned

Enhanced mutation:
Increase trailing formation from three fireballs to five
Preserve dash-first, volley-follows choreography
```

## Damage-source discrepancy

Available evidence currently contains two numeric claims:

```text
Showcase impact numbers:
10 direct damage per fireball

Wiki prose:
10 direct damage per fireball + burn

Wiki summary table:
18 direct damage + 16 burn
```

For an exact duplicate of the supplied showcase, the first prototype should follow the visible 10-damage behavior. The summary-table values should not silently replace what the reference video demonstrates.

## Source-faithful acceptance test

1. The caster dashes before the projectile volley reaches the forward lane.
2. Fireballs spawn behind the moving or newly relocated caster.
3. The base version creates exactly three fireballs.
4. The three fireballs are independent carriers.
5. They travel in roughly parallel lanes aligned with the dash direction.
6. They do not home toward nearby enemies.
7. They do not orbit the caster.
8. They do not use wall ricochet as their defining path behavior.
9. There is a readable delay before the trailing volley catches up.
10. Direct showcase-faithful impacts display 10 damage before burn ticks.
11. A cooldown use still performs the dash.
12. A cooldown use creates no fireballs.
13. Enhancement changes the formation count from three to five.
14. Enhancement preserves the same dash-first, volley-follows timing.

## Units extracted from Flare Rush

### **Trailing Volley Dash**

The caster's movement is followed by projectiles that traverse the same general direction after a delay.

```text
Dash
→ spawn behind
→ trailing volley
```

### **Delayed Pursuit Formation**

The projectiles are not attached to the caster, but their delayed launch makes them chase the caster's movement route.

### **Parallel-Lane Formation**

Several independent carriers share direction and timing while using lateral offsets.

```text
lane -1
lane  0
lane +1
```

### **Commitment Before Support**

The player reaches the aggressive position before the supporting payload arrives. That temporal vulnerability is part of the spell's feel.

### **Count-Only Formation Enhancement**

Enhancement adds carriers while preserving carrier type, path, timing, and contact behavior:

```text
Base formation: 3
Enhanced formation: 5
```

### **Dash Cooldown Fallback**

Like Searing Rush, the movement remains available while the magical payload is omitted.

# What these five add to the construction language

| Spell | Newly clarified unit |
|---|---|
| Rip Tide | One-press locked sequence and defensive final-emission spread |
| Aqua Arc | Per-carrier endpoint overlays and range extension by secondary footprint |
| Chaos Crusher | Per-beat carrier transformation and close-to-long-range two-phase coverage |
| Searing Rush | Movement/payload decoupling with world-space path deposition |
| Flare Rush | Dash-first trailing volley with delayed parallel support |

Their compact source-derived recipes are:

```text
RIP TIDE =
OnePressAuthoredSequence
+ LockedAimCommitment
+ PiercingProjectileEraseRipples
+ EnhancedFinalFan
```

```text
AQUA ARC =
ThreeBeatBasic
+ ShortPiercingWaterStream
+ PairedCarrierFinisher
+ EnhancedPerCarrierEndpointBurst
```

```text
CHAOS CRUSHER =
ThreeBeatBasic
+ ProximalRiftHit
+ PerBeatCarrierCompression
+ LongRangePiercingChaosCore
+ HybridMeleeProjectileSubtype
```

```text
SEARING RUSH =
DirectionalDash
+ CooldownFallbackMovement
+ WorldSpaceFlameTrail
+ ProjectileErase
+ EnhancedEndpointExplosion
```

```text
FLARE RUSH =
DirectionalDash
+ DelayedTrailingFormation
+ ParallelFireballVolley
+ CooldownFallbackMovement
+ EnhancedCarrierCount
```

The strongest new distinction is between two dash payload topologies:

```text
Searing Rush:
The dash deposits danger behind the player.

Flare Rush:
The dash schedules mobile damage that follows after the player.
```

Both begin with the same broad movement action, but one creates a stationary path and the other creates delayed traveling support.
