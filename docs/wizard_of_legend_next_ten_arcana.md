---

# Next ten abilities

The exact next ten arcana shown after Flare Rush are:

1. **Ignition Rush**
2. **Air Burst**
3. **Gust Burst**
4. **Razor Burst**
5. **Spike Track**
6. **Toxic Trap**
7. **Snare Track**
8. **Thunder Line**
9. **Circuit Line**
10. **Shock Line**

These analyses continue to reconstruct the source move first. The current prototype implementations remain irrelevant to the source description. Where the current wiki notes that an older arcana was later replaced, this reference preserves the behavior shown in the supplied showcase rather than substituting the replacement.

# 19. Ignition Rush

## Concrete source form

### Evidence

**[VIDEO — approximately 104–110 seconds]**

Ignition Rush begins with a forward dash, but the dash is only the setup. Its defining effect is a circular fire aura that remains attached to the caster after the movement ends.

The source sequence reads as:

1. The caster dashes forward.
2. A bright orange ring of fire forms around the caster.
3. The ring continues following the caster during normal movement after the dash.
4. Enemies touched by the ring receive burn ticks and are nudged away from the caster.
5. In the enhanced demonstration, the aura ends with a separate circular explosion centered on the caster's current position.

The aura is not a trail deposited on the floor. It is not left at the dash origin or endpoint. The damaging boundary moves with the player for several seconds, allowing the player to deliberately run or dash into additional enemies after the initial activation.

Visually, the aura uses:

- A thick orange circular rim.
- Small flame tongues rotating or flickering around the circumference.
- An open center that leaves the player sprite readable.
- Repeated small burn numbers on touched targets.
- A larger, brighter radial flash when the enhanced aura expires.

**[DOCUMENTED]**

Ignition Rush is a Fire Dash Arcana with melee and movement subtypes. The dash creates a fiery aura lasting 3 seconds. Contact with the aura applies level-1 burn, whose documented total is 16 damage. The cooldown is 6 seconds.

When enhanced, the aura explodes as it expires. The expiration explosion applies another level-1 burn in a large area. The dash remains available while the magical payload is on cooldown, but cooldown uses create no aura. The aura is visually shield-like but provides no protection from incoming attacks. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Ignition_Rush))

The burn-status reference defines level-1 burn as eight 2-damage ticks for 16 total damage. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Status_effects))

## Exact source recipe

```text
IGNITION RUSH

Input structure:
Directional dash activation

Direction:
Current movement direction

Phase 1:
Caster performs rapid dash displacement

Phase 2:
Create player-attached fire aura

Aura attachment:
Follow caster position continuously
Remain centered on caster
Do not deposit into world space

Aura duration:
3 seconds

Aura contact:
Apply level-1 burn
Documented burn total: 16
Apply outward contact knockback

Contact policy:
A target entering or touching the aura can receive the burn application
Aura remains active after contact
Aura may affect multiple different targets during its lifetime

Cooldown:
6 seconds

Cooldown fallback:
Dash movement remains available
Do not create aura
Do not apply aura burn

Enhanced expiration:
When aura duration ends,
create large radial explosion at caster's current position
Apply level-1 burn again to enemies in the explosion

Defensive state:
No inherent shield
No inherent invulnerability documented
```

## Important distinction

Ignition Rush is a **player-attached hazard**, not a dash trail.

```text
Searing Rush:
Dash
→ danger remains along traveled path

Ignition Rush:
Dash
→ danger remains attached to moving player
```

The enhanced explosion also uses the caster's position when the aura expires, not necessarily the dash endpoint. The player can reposition during the three-second aura and deliberately choose where the final burst occurs.

## Source-faithful acceptance test

1. Activating the move performs a directional dash.
2. A successful magical activation creates one circular fire aura around the caster.
3. The aura follows the caster after the dash is complete.
4. The aura does not remain at the starting point.
5. The aura does not paint a stationary path behind the player.
6. The aura remains active for approximately 3 seconds.
7. Contact applies level-1 burn rather than one large direct-damage hit.
8. The aura remains active after touching an enemy.
9. The player can touch multiple enemies during one aura lifetime.
10. A cooldown activation still performs the dash.
11. A cooldown activation creates no aura.
12. The enhanced expiration burst occurs at the caster's current position.
13. The enhanced burst applies another burn application.
14. The aura does not block damage or function as a shield.

## Units extracted from Ignition Rush

### **Player-Attached Contact Aura**

A persistent footprint follows an owner and applies a payload when its boundary overlaps another actor.

```text
owner = caster
position = owner.position
lifetime = fixed duration
contactPayload = burn
```

### **Post-Dash Persistent State**

The movement action ends quickly, but the ability continues in a different active state.

```text
Dash state
→ Attached Aura state
→ Expiration state
```

### **Mobile Contact Offense**

The player's subsequent movement becomes the targeting mechanism. The player chooses new victims by physically carrying the aura into them.

### **Current-Position Expiration Burst**

A delayed finisher resolves wherever the moving owner is when the timer ends, rather than at the original cast location.

### **Visual Shield Without Defensive Rule**

A spell may surround the player visually while declaring no block, armor, evasion, or invulnerability behavior.

---

# 20. Air Burst

## Concrete source form

### Evidence

**[VIDEO — approximately 110–114.7 seconds]**

Air Burst is a direct forward dash accompanied by a wind shockwave generated behind and around the caster's movement.

In the base demonstration:

- The caster darts forward.
- A small pale-gray burst curls outward from the rear of the dash.
- Enemies caught close to that burst are pushed in the same general direction as the caster.
- The effect is brief and does not remain as a persistent zone.

In the enhanced demonstration, the rear burst becomes a much larger U-shaped wave. The enlarged wind shape wraps farther around the caster's rear and sides, making the control footprint substantially easier to read. The enhanced burst also applies slow.

The move is not a projectile that travels independently after the caster. The burst is an instantaneous movement-linked footprint whose purpose is to collect and carry nearby enemies along the dash direction.

**[DOCUMENTED]**

Air Burst is an Air Dash Arcana with movement and melee subtypes. Its base dash creates a small wind burst behind the caster, dealing 15 damage and pushing enemies along with the dash. When enhanced, it creates a larger U-shaped burst, deals 20 damage, and applies slow. Its listed cooldown is 4 seconds. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Air_Burst))

The current general Arcana page describes the starter Air Burst as having no additional effect unless enhanced, while the dedicated Air Burst page and supplied showcase preserve the older damaging-burst behavior. This source reference follows the demonstrated version rather than silently replacing it with a later revision. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Arcana))

## Exact source recipe

```text
AIR BURST

Input structure:
Directional dash activation

Caster carrier:
Player performs forward dash displacement

Attack timing:
Create wind burst during or immediately after dash movement

Base footprint:
Small curved burst behind caster
Rear-biased area
Brief lifetime

Base payload:
15 direct damage
Push caught enemies along dash direction

Control relationship:
Enemy displacement follows caster's forward movement
Burst is used to carry or drag enemies with the dash

Enhanced footprint:
Replace small rear burst with larger U-shaped burst
Greater rear and lateral coverage

Enhanced payload:
20 direct damage
Apply slow
Preserve forward enemy displacement

Lifetime:
Immediate burst
No lingering moving projectile
No persistent world-space zone

Cooldown:
4 seconds for magical burst behavior
Dash locomotion follows the source dash system
```

## Version-sensitive note

The showcase includes the source behavior represented by the dedicated Air Burst page: a damaging base burst and a larger enhanced burst. Because the game's later updates changed several dash arcana and the overview text is not fully aligned with the dedicated page, implementation should be judged against the supplied video rather than against the overview sentence alone.

## Source-faithful acceptance test

1. Activating Air Burst rapidly moves the caster forward.
2. The attack footprint forms behind or around the rear of the moving caster.
3. The base footprint is small and short-lived.
4. The base burst deals 15 direct damage.
5. Enemies caught by the burst are displaced in the caster's dash direction.
6. The burst does not become a free-moving projectile.
7. The burst does not remain as a stationary hazard after the dash.
8. Enhancement replaces the small footprint with a clearly larger U-shaped footprint.
9. The enhanced burst deals 20 direct damage.
10. The enhanced burst applies slow.
11. Enhancement preserves the enemy-carrying direction rather than changing it to radial knockback.

## Units extracted from Air Burst

### **Rear-Biased Dash Burst**

A movement action creates a brief attack footprint behind or around the caster rather than at the destination.

### **Directional Enemy Carry**

Control displacement is tied to the caster's movement vector:

```text
enemyDisplacementDirection = dashDirection
```

The burst does not merely push away from its own center.

### **Footprint-Replacement Enhancement**

Enhancement substitutes a larger authored shape for the base shape:

```text
Base: small rear curl
Enhanced: large U-shaped burst
```

### **Geometry Plus Status Enhancement**

The enhanced state changes both spatial coverage and payload by adding slow, while preserving the move's central carrying behavior.

---

# 21. Gust Burst

## Concrete source form

### Evidence

**[VIDEO — approximately 114.7–124.7 seconds]**

Gust Burst is a charged dash move built around pulling enemies into the caster's wake rather than simply knocking them away.

The source sequence has two linked control phases:

1. The caster dashes forward.
2. A compact wind burst forms near the beginning of the dash and gathers nearby enemies inward.
3. A following draught of air moves the gathered enemies toward the caster's new position.
4. The enemies arrive close to the caster, setting up a short-range follow-up.

The first event reads as a circular or curled suction burst. The second reads as a directional pull through the space the caster crossed. The enemy is not merely struck twice in place; the two events cooperate to collect and reposition it.

In the enhanced demonstration, a second circular burst appears at the dash destination. This endpoint burst is separate from the initial gathering burst and the directional draught.

**[DOCUMENTED]**

Gust Burst is an Air Dash Arcana with movement subtype. It passively stores up to two charges, with a cooldown of 3.5 seconds per charge.

Each use leaves a burst of air that deals 5 damage and pulls enemies together. A draught then pushes those enemies toward the caster, dealing 10 damage. When enhanced, a second 5-damage burst occurs at the end of the dash. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Gust_Burst))

The wiki notes that Gust Burst was later removed and replaced by Wind Salvo. The supplied showcase demonstrates Gust Burst itself, so this reference preserves that pre-replacement behavior.

## Exact source recipe

```text
GUST BURST

Input structure:
Directional dash activation

Charge system:
Passively store up to 2 charges
Cooldown: 3.5 seconds per charge
Spend one charge per magical activation

Phase 1 — movement:
Caster dashes in current movement direction

Phase 2 — origin gathering burst:
Create compact wind burst near dash origin or early dash path
5 damage
Pull nearby enemies inward toward burst center

Phase 3 — directional draught:
Move gathered enemies toward caster's post-dash position
10 damage
End with enemies near caster

Control ordering:
First group enemies
Then translate grouped enemies toward destination

Enhanced phase 4:
Create second burst at dash endpoint
5 damage
Preserve the base gathering and draught phases
```

## Important distinction

Gust Burst is not one generic pull hit attached to a dash.

```text
Event 1:
Radial gathering into a compact group

Event 2:
Directional transport toward the caster
```

Those phases solve different spatial problems. The first reduces separation between several targets; the second changes the group's location.

The source behavior can make retreating risky because nearby enemies are carried toward the player rather than left behind.

## Source-faithful acceptance test

1. Gust Burst stores a maximum of two magical charges.
2. Each magical use spends one charge.
3. Activating it performs a forward dash.
4. A distinct 5-damage gathering burst occurs near the beginning of the dash.
5. That burst pulls nearby enemies toward a shared center.
6. A separate 10-damage draught then moves affected enemies toward the caster's destination.
7. Enemies end close enough for a short-range follow-up.
8. The control is not replaced by simple radial knockback.
9. Base Gust Burst contains two damage/control events.
10. Enhanced Gust Burst preserves both base events.
11. Enhanced Gust Burst adds one separate 5-damage endpoint burst.
12. The implementation follows the demonstrated Gust Burst rather than substituting Wind Salvo.

## Units extracted from Gust Burst

### **Gather-Then-Translate Control**

A two-stage control sequence first compresses target spacing, then moves the resulting group.

```text
Targets spread apart
→ gather to center
→ transport group toward destination
```

### **Origin-to-Endpoint Enemy Transport**

The dash defines a source and destination, and the enemy control moves targets across that authored vector.

### **Charge-Stored Dash Payload**

The magical effect uses discrete regenerating charges while the movement belongs to the dash action.

### **Endpoint Additive Enhancement**

Enhancement adds a destination event without replacing the source burst or transport phase.

---

# 22. Razor Burst

## Concrete source form

### Evidence

**[VIDEO — approximately 124.8–132.3 seconds]**

Razor Burst performs a forward dash and leaves a small cutting vortex behind in the space the caster just exited.

The vortex:

- Is a compact circular swirl of pale-gray cutting wind.
- Remains stationary in world space after the caster moves away.
- Repeatedly strikes enemies caught inside it.
- Pulls targets toward its center rather than ejecting them.
- Keeps affected enemies clustered while applying slow.
- Disappears after a brief duration.

The caster is free of the vortex after the dash. The hazard does not follow the player, and it does not travel forward like a projectile.

In the enhanced demonstration, the same vortex remains active longer. Its basic geometry and location do not change; the longer lifetime creates two additional damage ticks.

**[DOCUMENTED]**

Razor Burst is an Air Dash Arcana with movement subtype. The dash leaves behind a small vortex lasting about 1 second. The vortex deals five hits of 4 damage, pulls enemies inward, and slows them.

When enhanced, the vortex lasts about 1.5 seconds and deals seven hits of 4 damage. The listed cooldown is 5.12 seconds. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Razor_Burst))

## Exact source recipe

```text
RAZOR BURST

Input structure:
Directional dash activation

Phase 1:
Caster performs forward dash

Phase 2:
Create stationary wind vortex behind caster

Vortex position:
World-space location near dash origin or wake
Do not follow caster
Do not continue traveling

Base lifetime:
Approximately 1 second

Base hit schedule:
5 periodic hits
4 damage per hit

Control payload:
Pull enemies toward vortex center
Apply slow
Keep enemies within repeated-hit footprint

Enhanced mutation:
Increase vortex lifetime to approximately 1.5 seconds
Increase hit count from 5 to 7
Preserve 4 damage per hit
Preserve location, geometry, pull, and slow

Cooldown:
5.12 seconds
```

## Important distinction

Razor Burst uses **lifetime as its enhancement dimension**.

```text
Base:
Same vortex geometry
5 ticks
~1 second

Enhanced:
Same vortex geometry
7 ticks
~1.5 seconds
```

It does not gain a second vortex, a larger endpoint explosion, or a moving path. More damage emerges from keeping the same control field active for longer.

## Source-faithful acceptance test

1. Activating the move dashes the caster forward.
2. One small vortex is created behind the caster.
3. The vortex remains fixed in world space.
4. The vortex does not follow the player.
5. The vortex does not travel after creation.
6. Base Razor Burst produces five periodic 4-damage hits.
7. The vortex pulls enemies inward.
8. The vortex applies slow.
9. The pull helps keep targets inside the repeated-hit area.
10. The base vortex lasts approximately 1 second.
11. Enhanced Razor Burst still creates exactly one vortex.
12. The enhanced vortex lasts approximately 1.5 seconds.
13. The enhanced vortex produces seven 4-damage hits.
14. Enhancement does not invent a new endpoint event.

## Units extracted from Razor Burst

### **Dash-Deposited Stationary Vortex**

A movement action leaves a persistent control field in world space behind the caster.

### **Self-Retaining Tick Field**

The field's control payload pulls enemies into the same area that delivers periodic damage.

```text
pull toward center
→ target remains in footprint
→ later ticks can connect
```

### **Lifetime-to-Hit-Count Coupling**

A longer duration deterministically produces more scheduled hits without changing per-hit damage.

### **Pure Duration Enhancement**

The enhanced topology is unchanged. Only lifetime and the resulting hit schedule increase.



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
