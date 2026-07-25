# 17. Searing Rush

## Concrete source form

### Evidence

**[VIDEO — approximately 91–99.5 seconds]**

Searing Rush is a directional dash that paints a short-lived line of fire along the space the caster just crossed.

In the base demonstration:

- The caster rapidly relocates along the movement direction.
- A dense row of yellow-orange flame plumes occupies the dash path behind them.
- The line remains in the world after the caster reaches the destination.
- Individual plumes merge visually into one continuous hazardous strip.
- Dark smoke and scorch-like marks briefly remain as the fire expires.
- Enemies contacting the line receive burn ticks.

In the enhanced demonstration, the same path trail appears, but the destination also erupts in a separate, larger fire burst. The endpoint event is visually distinct from the narrow line left behind.

The flame trail is not attached to the caster after the dash. It is deposited into world space.

**[DOCUMENTED]**

Searing Rush is a Fire Dash Arcana with movement subtype.

The dash leaves a flame trail that lasts approximately 0.35 seconds and applies a documented 28-damage burn payload to enemies on contact. The flames block enemy projectiles.

Its cooldown is 5.5 seconds. The locomotion remains available while the arcana is on cooldown, but a cooldown dash creates no flame trail.

When enhanced, the dash creates a separate explosion at its endpoint. The explosion deals 16 immediate damage, applies the burn payload, and can knock back and stun enemies. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Searing_Rush))

No inherent invulnerability or evasion is documented for the base move; those properties are supplied by separate relic interactions rather than by Searing Rush itself. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Searing_Rush))

## Exact source recipe

```text
SEARING RUSH

Input structure:
Directional dash activation

Direction:
Current movement direction

Caster carrier:
Player body performs rapid dash displacement

Magical path payload:
Deposit flame segments along completed dash path
Segments visually merge into continuous line

Trail lifetime:
Approximately 0.35 seconds

Trail contact:
Apply burn
Documented burn payload: 28
Destroy or block enemy projectiles

Cooldown:
5.5 seconds

Cooldown fallback:
Dash movement remains available
Do not create trail
Do not apply burn
Do not block projectiles

Enhanced endpoint overlay:
Create separate explosion at dash destination
16 immediate damage
Apply burn
Knockback/stun interaction

Defensive state:
No inherent invulnerability documented
```

## Source-faithful acceptance test

1. Activating the move rapidly relocates the caster in the movement direction.
2. An available magical payload leaves fire along the traveled path.
3. The fire is deposited in world space and does not continue following the caster.
4. The trail is visually continuous enough to read as one line.
5. The trail lasts approximately 0.35 seconds.
6. Contact with the trail applies burn.
7. The trail blocks enemy projectiles.
8. Using the dash on cooldown still performs the full movement.
9. A cooldown dash creates no flame trail.
10. A cooldown dash creates no burn or projectile-blocking effect.
11. The enhanced endpoint explosion occurs at the destination only.
12. The enhanced explosion remains distinct from the trail.
13. The move does not gain undocumented invulnerability.

## Units extracted from Searing Rush

### **Movement/Payload Decoupling**

The locomotion system and magical payload have separate availability states.

```text
movementReady = always
payloadReady = cooldown-dependent
```

### **Path Deposition**

A moving owner creates stationary world-space segments along its traveled route.

```text
for distance along dash:
    place trail segment
```

### **Fleeting Line Hazard**

Several short-lived segments visually and mechanically form one continuous temporary lane.

### **Cooldown Fallback**

An ability retains its baseline movement behavior while omitting all magical components during cooldown.

### **Endpoint Enhancement Overlay**

Enhancement preserves the complete base path behavior and adds a new destination event.

### **Active Defensive Trail**

Defense comes from deliberately placing a projectile-erasing line rather than receiving passive damage reduction.

---
