---

# 23. Spike Track

## Concrete source form

### Evidence

**[VIDEO — approximately 132.3–139.3 seconds]**

Spike Track is a forward dash that causes a narrow line of earthen spikes to erupt sequentially from the ground along the route behind the caster.

In the base demonstration:

- The caster dashes through or past the target line.
- Large brown rock spikes rise one after another along the completed dash path.
- The separate spike models visually combine into one continuous rocky track.
- Targets intersecting the track receive one large 30-damage hit rather than a damage tick from every visible rock.
- The track is narrow, so the dash must be aligned through the enemies rather than merely near them.

In the enhanced demonstration, spikes continue erupting beyond the caster's stopping point. The final result is one extended line that covers the path behind the caster and then continues forward from the endpoint, approximately doubling the total length.

The spikes are not thrown projectiles. Their sequential appearance communicates a line propagating through the floor, but the source treats the completed track as one high-damage attack event per affected target.

**[DOCUMENTED]**

Spike Track is an Earth Dash Arcana with movement subtype. It deals 30 damage with 10 knockback and has a 5-second cooldown. The base dash leaves a line of spikes behind the caster. When enhanced, the spike formation continues ahead after the dash, doubling the track's length.

The dash remains usable while the magical payload is on cooldown, but no spikes are created. Despite visually emerging from the ground, the track can extend across pits. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Spike_Track))

## Exact source recipe

```text
SPIKE TRACK

Input structure:
Directional dash activation

Phase 1:
Caster performs forward dash

Phase 2 — base track:
Sequentially erupt earthen spike segments
Place segments along completed dash path behind caster

Track geometry:
Narrow line
Aligned to dash direction
Length approximately equal to dash path

Visual carrier count:
Multiple individual spike formations

Logical hit structure:
One 30-damage hit per valid target
10 knockback
Do not multiply damage by number of visible rock segments

Enhanced continuation:
After caster reaches dash endpoint,
continue erupting spike segments forward
Preserve line direction
Approximately double total track length

Cooldown:
5 seconds

Cooldown fallback:
Dash remains available
No spike track is created

World traversal:
Track may continue across pits
```

## Important distinction

Spike Track uses many visible pieces to represent one continuous logical attack.

```text
Rendered objects:
rock + rock + rock + rock + rock

Logical attack:
one narrow 30-damage track
```

The enhanced version is also not a second independent trail. It is a **directional continuation** of the original line beyond the dash endpoint.

## Source-faithful acceptance test

1. Activating Spike Track performs a forward dash.
2. Spikes erupt sequentially along the route behind the caster.
3. The spike formations create a narrow line aligned with the dash.
4. The base line does not extend substantially ahead of the destination.
5. A target intersecting the line receives one 30-damage hit.
6. Each visible rock segment does not independently damage the same target.
7. The hit applies 10 knockback.
8. A cooldown use still performs the dash.
9. A cooldown use creates no spikes.
10. Enhancement preserves the rear track.
11. Enhanced spikes continue forward beyond the endpoint.
12. The enhanced total line is approximately twice the base length.
13. The spike propagation can cross pits despite its ground-emergence visual.

## Units extracted from Spike Track

### **Path-Following Sequential Eruption**

A line attack is revealed over time by spawning visual segments along a previously traveled path.

### **Many-Visuals One-Hit Track**

Multiple rendered segments share one logical collision and hit ledger.

### **Endpoint Directional Continuation**

Enhancement continues the same authored line past the movement endpoint.

```text
Base:
start → endpoint

Enhanced:
start → endpoint → forward continuation
```

### **Visual Ground Dependence Without Terrain Dependence**

An attack can look as though it rises from the floor while its source collision rules allow it to cross pits.

---

# 24. Toxic Trap

## Concrete source form

### Evidence

**[VIDEO — approximately 139.4–147.3 seconds]**

Toxic Trap is a forward dash that leaves a circular poison trap behind rather than painting the entire dash route.

The source sequence is:

1. The caster dashes forward.
2. A small purple-green toxic bomb or seed is thrown or dropped behind the moving caster.
3. It opens into a large translucent green puddle at the rear position.
4. Enemies touching the puddle receive poison.
5. The ongoing 5-damage poison ticks continue on the affected enemy after the initial application.

The puddle is broad and circular, with green mist, plant-like particles, and a darker central deposit. It is a placed trap, not a narrow line and not a projectile that chases targets.

In the enhanced demonstration, a second puddle is created in front of the caster. The two puddles occupy opposite sides of the dash, allowing the move to threaten both the space being exited and the space being entered.

**[DOCUMENTED]**

Toxic Trap is an Earth Dash Arcana with movement subtype. The base dash creates a toxic puddle behind the caster that applies level-1 poison. Level-1 poison deals five ticks of 5 damage for 25 total damage.

When enhanced, a second poison puddle is created in front of the caster. The cooldown is 6 seconds. The dash remains available on cooldown, but no puddles are created. Toxic Trap deals damage exclusively through poison rather than through a separate direct impact. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Toxic_Trap))

The status reference defines level-1 poison as five 5-damage ticks over its status duration. Poison also causes hit stun and briefly changes the target's facing during its ticks. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Status_effects))

## Exact source recipe

```text
TOXIC TRAP

Input structure:
Directional dash activation

Phase 1:
Caster performs forward dash

Base trap placement:
Create one stationary toxic puddle behind caster
Rear anchor associated with dash origin or wake

Puddle geometry:
Broad circular area
Fixed in world space
No homing
No path-long trail

Puddle contact:
Apply level-1 poison
No separate direct-damage payload documented

Poison payload:
5 ticks
5 damage per tick
25 total
Status continues on target after application

Enhanced placement:
Preserve rear puddle
Create second toxic puddle in front of caster
Use opposite-side placement around dash movement

Cooldown:
6 seconds

Cooldown fallback:
Dash remains available
No rear puddle
No forward puddle
No poison application from the arcana
```

## Important distinction

The puddle and the poison status have separate lifetimes and ownership.

```text
World-space puddle:
waits for contact

On contact:
apply target-owned poison status

After target leaves puddle:
poison ticks continue
```

Toxic Trap is therefore not a field that must overlap the enemy for every damage tick. The field applies a status, and the status becomes responsible for the ongoing damage.

## Source-faithful acceptance test

1. Activating Toxic Trap performs a forward dash.
2. The base version creates one circular puddle behind the caster.
3. The puddle remains stationary in world space.
4. The base version does not create a continuous trail along the dash path.
5. The puddle does not home toward enemies.
6. Contact applies level-1 poison.
7. The source damage is five 5-damage poison ticks for 25 total.
8. The arcana does not add an invented direct-impact hit before the poison.
9. Poison continues after the affected target leaves the puddle.
10. A cooldown use still performs the dash.
11. A cooldown use creates no puddle.
12. Enhancement preserves the rear puddle.
13. Enhancement adds one second puddle in front of the caster.
14. The enhanced version creates two discrete circular traps rather than one longer line.

## Units extracted from Toxic Trap

### **Dash-Placed Rear Trap**

Movement places a stationary circular hazard in the space the player leaves behind.

### **Opposite-Anchor Trap Pair**

Enhancement creates equivalent traps on the rear and forward sides of the dash.

```text
Base: rear
Enhanced: rear + forward
```

### **Field-to-Target Status Handoff**

A world-space contact event transfers an independently timed status to the target.

### **Status-Only Damage Source**

All damage comes from the applied status, so ordinary direct-damage modifiers do not alter the source payload.
