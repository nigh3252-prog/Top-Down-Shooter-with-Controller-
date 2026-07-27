# 68. Cyclone Boomerang

## Concrete source form

### Evidence

**[VIDEO - supplied 60 FPS showcase, approximately 08:12-08:24]**

The caster releases one broad, hollow current of pale wind. It travels away as a rapidly rotating brushstroke ring, reaches a resolved turn point, and curves back toward the caster. The same target can be struck once during the outward leg and once during the return leg. The enhanced demonstration creates an additional current, but that mutation is not part of the base implementation.

**[DOCUMENTED]**

Cyclone Boomerang deals 15 damage on the outbound pass and 15 damage on the return pass, applies 15 knockback, and has a 3.5 second cooldown. The enhanced version creates a secondary current. (https://wizardoflegend.fandom.com/wiki/Cyclone_Boomerang)

## Exact source recipe

```text
CYCLONE BOOMERANG - BASE

input: tap cast
aim: snapshot at launch
emission: one broad revolving wind current
outbound path: straight to resolved maximum distance
turn: preserve the actual collision-clipped turn point
return path: continuously home toward the caster's live position
hit ownership:
  outbound ledger -> 15 damage once per target
  return ledger -> 15 damage once per target
control: 15 knockback
cooldown: 3.5 seconds
world rule: no damage through scenery; blocked legs fizzle cleanly
enhanced mutation: secondary current, documented but disabled
```

## Source-faithful acceptance test

1. Exactly one current is emitted in the base form.
2. Its silhouette reads as a broad rotating wind ring rather than a small ball.
3. The outbound and return legs are visually and mechanically distinct.
4. A target may receive one 15-damage outbound hit and one 15-damage return hit.
5. Repeated overlap during one leg does not create extra hits.
6. The return path follows the caster's current position rather than the launch point.
7. A collision-clipped outbound leg turns from the actual resolved point.
8. Neither leg damages through scenery.
9. The effect, hit ledgers, and mesh clean up after return or fizzle.
10. The enhanced secondary current remains disabled.

## Units extracted from Cyclone Boomerang

### **Outbound-Return Carrier**

One carrier owns separate hit ledgers and steering rules for its outward and inward phases.

### **Live-Owner Return**

The return endpoint is sampled continuously from the owner's position.

---

# 69. Earthen Aegis

## Concrete source form

### Evidence

**[VIDEO - supplied 60 FPS showcase, approximately 09:57-10:08]**

Eight upright stone plates erupt around the caster and settle into a compact open-center ring. After roughly 0.2 seconds their slot positions remain fixed relative to the caster; each individual plate slowly yaws between a green-gold rune face, thin edge, and plain brown back. The formation follows caster translation and vanishes around 4.4 seconds later. Projectile interception is documented behavior but is not demonstrated in this base clip.

**[DOCUMENTED]**

Earthen Aegis creates eight shields for 4.5 seconds. Each shield deals 5 damage with 10 knockback and blocks most hostile projectiles. Cooldown is 8 seconds. (https://wizardoflegend.fandom.com/wiki/Earthen_Aegis)

## Exact source recipe

```text
EARTHEN AEGIS - BASE

input: tap cast
emission: eight independently identified stone shields
formation: owner-following fixed eight-slot ring with open center after a brief settle
shield articulation: each upright plate slowly yaws independently; the whole formation does not keep orbiting
duration: 4.5 seconds
cooldown: 8 seconds
enemy contact: each shield may deal 5 damage and 10 knockback once per target
projectile contact: destroy eligible hostile projectile; shield remains active
cleanup: duration, reset, room transition, or owner defeat
enhanced mutation: twelve shields and larger radius, documented but disabled
```

## Source-faithful acceptance test

1. The base cast produces exactly eight visible shields.
2. Each shield has a stable independent identity and collision carrier.
3. The ring follows the caster while preserving its open center.
4. Each shield deals 5 damage and 10 knockback at most once to one target.
5. Different shields may hit the same target independently.
6. Eligible hostile projectiles are destroyed at the shield that contacts them.
7. Projectile interception does not consume the base shield.
8. Enemies inside the open center are not falsely hit by a solid circular field.
9. All eight shields clean up after 4.5 seconds.
10. The enhanced twelve-shield form remains disabled.

## Units extracted from Earthen Aegis

### **Independent Formation Bank**

A fixed-count formation whose members own collision, hit, and interception state.

### **Open-Center Defense**

Protection is supplied by the visible fixed-slot bodies, not an invisible full-disc shield.

---

# 70. Ball Lightning

## Concrete source form

### Evidence

**[VIDEO - supplied 60 FPS showcase, approximately 14:53-15:09]**

The caster visibly gathers a dense yellow-white electrical sphere before releasing it. Greater hold time creates a larger, hotter, more articulated orb. On contact it remains centered on the target and resolves as a rapid series of readable electrical pulses. The caster remains exposed while charging. The separate charged-Signature constellation is not part of this base pass.

**[DOCUMENTED]**

An uncharged cast resolves five 12-damage hits. Charging increases the count up to ten; a full charge applies maximum shock on the initial and final contact. Cooldown is 5.5 seconds, and taking a hit can interrupt the vulnerable charge. (https://wizardoflegend.fandom.com/wiki/Ball_Lightning)

## Exact source recipe

```text
BALL LIGHTNING - BASE

input: press -> vulnerable hold -> explicit release
aim: live while charging, snapshot at release
charge output: five through ten 12-damage pulses
carrier: one dense electrical orb
travel: ordinary collision-clamped projectile
contact: attach briefly to first valid target and resolve authored pulse count
full charge: maximum shock on first and final pulse
interruption: incoming valid damage cancels charge and consumes cooldown
cooldown: 5.5 seconds
enhanced mutation: faster charge, documented but disabled
charged Signature: additional converging orbs, documented but disabled
```

## Source-faithful acceptance test

1. A quick release creates the five-hit base orb.
2. Holding visibly grows the orb and increases the pulse count to ten at full charge.
3. Intermediate charge thresholds use the frame-audited integer hit-count progression.
4. Aim remains live until release.
5. The caster receives no invulnerability or armor while charging.
6. A valid incoming hit interrupts and cleans the charge.
7. One projectile attaches to the first valid enemy and delivers the chosen pulse count.
8. Every pulse deals 12 damage before the global Arcana multiplier.
9. Only a full charge adds the documented maximum shock contacts.
10. Enhanced speed and the charged-Signature constellation remain disabled.

## Units extracted from Ball Lightning

### **Vulnerable Hold Charge**

Hold time changes a discrete output table while leaving the caster interruptible.

### **Contact-Attached Pulse Carrier**

One projectile converts into an authored multi-hit effect at first contact.

---

# 71. Aqua Beam

## Concrete source form

### Evidence

**[VIDEO - supplied 60 FPS showcase, approximately 18:38-18:49]**

The caster braces and releases a long, layered white-blue stream with a narrow hot pressure core, broad translucent water body, spray, and repeated endpoint impacts. The visible beam sweeps by about 20 degrees during the approximately 1.3-second base demonstration. Stock behavior, piercing, projectile destruction, and wall clipping are documented mechanics rather than actions proved by this particular training-room clip. The five-beam charged Signature shown afterward is not included.

**[DOCUMENTED]**

Aqua Beam passively stores up to ten charges at one charge every 0.75 seconds. It requires at least three charges and consumes all available stock. Each charge contributes one 10-damage hit and beam duration; the beam pierces, pushes enemies, and destroys hostile projectiles. Enhancement doubles width. (https://wizardoflegend.fandom.com/wiki/Aqua_Beam)

## Exact source recipe

```text
AQUA BEAM - BASE

resource: passive stock, maximum 10
recharge: one stock every 0.75 seconds
minimum cast stock: 3
cast: snapshot and consume all available stock
emission: one continuous high-pressure water beam
aim: limited live sweep during channel
hit schedule: one 10-damage piercing pulse per consumed stock
control: repeated forward push
defense: destroy eligible hostile projectiles inside visible beam body
duration: proportional to stock, with cadence frozen from the 60 FPS audit
world rule: beam stops at actual scenery contact and does not damage through walls
enhanced width: documented but disabled
charged Signature five-beam convergence: documented but disabled
```

## Source-faithful acceptance test

1. Stock grows once every 0.75 seconds and caps at ten.
2. Fewer than three charges rejects the cast without consuming the card.
3. A valid cast consumes all currently stored charges.
4. The emitted beam is one layered continuous stream, not separate water bullets.
5. It produces exactly one 10-damage pulse per consumed charge.
6. Different aligned targets can receive the same piercing pulse.
7. The player can sweep the beam only within the audited limited arc.
8. Eligible hostile projectiles are destroyed inside the visible beam.
9. Scenery clips both the visible beam and its damaging length.
10. Enhanced width and the charged-Signature five-beam convergence remain disabled.

## Units extracted from Aqua Beam

### **Passive Stock Channel**

Stored ammunition selects both channel duration and exact hit count.

### **Bounded Live-Aim Beam**

Aim may change during the cast but is constrained around its release direction.

---

# 72. Arcane Intervention

## Concrete source form

### Evidence

**[VIDEO - supplied 60 FPS showcase, approximately 20:03-20:19]**

The first activation throws a dark-purple rod to an aimed destination and draws a faint double-ring capture field around the caster. Roughly 1.8-2.0 seconds after field establishment in this demonstration, enemies inside vanish through near-black departure disks, reappear around the rod through matching arrival disks, and are engulfed first by a huge opaque black disk with a jagged purple rim and then by a violet brushstroke storm. The input that triggers this transfer is not visible, so the clip alone cannot distinguish a manual reactivation from timer expiry. Large-target immunity is documented but is not demonstrated here. The charged multi-rod circuit is excluded.

**[DOCUMENTED]**

Arcane Intervention has a 4.25 second cooldown, teleports nearby eligible enemies to the thrown rod, and reports 25 and 5 damage components with inward control. It may be reactivated before the automatic trigger; large enemies cannot be teleported. (https://wizardoflegend.fandom.com/wiki/Arcane_Intervention)

## Exact source recipe

```text
ARCANE INTERVENTION - BASE

first activation:
  throw one rod toward aim
  collision-clamp rod to a valid navigable destination
  create player-centered capture field linked to rod

second activation or timer expiry:
  snapshot eligible enemies currently inside capture field
  large/miniboss/boss targets remain in place
  teleport eligible targets to deterministic safe offsets around rod
  apply one 25-damage arrival event
  create 5-damage storm ticks at frame-audited cadence

teleport rule:
  may cross intervening walls
  never place targets inside scenery or outside valid arena space

cooldown: 4.25 seconds
charged multi-rod cycle: documented but disabled
```

## Source-faithful acceptance test

1. The first activation creates exactly one rod and one player-centered capture field.
2. The rod stops at a validated collision-clipped destination.
3. A second activation triggers the transfer early without creating another rod.
4. The timer triggers the same transfer automatically if not reactivated.
5. Eligibility is evaluated at the trigger frame, not the initial cast frame.
6. Ordinary targets teleport to deterministic safe offsets around the rod.
7. Large, miniboss, boss, dead, and invalid targets remain in place.
8. Arrival and storm damage remain separate semantic events.
9. Teleportation never embeds a target in scenery or outside the arena.
10. Rod, link, capture field, storm, and ownership state clean up completely.
11. The charged multi-rod cycle remains disabled.

## Units extracted from Arcane Intervention

### **Two-Anchor Delayed Transfer**

One endpoint belongs to the caster field and the other to a thrown destination anchor.

### **Reactivation-or-Expiry Trigger**

Manual reactivation and timer expiry converge on one deterministic resolution path.

---
