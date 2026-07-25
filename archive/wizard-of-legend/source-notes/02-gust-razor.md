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
