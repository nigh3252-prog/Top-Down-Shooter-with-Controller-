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
