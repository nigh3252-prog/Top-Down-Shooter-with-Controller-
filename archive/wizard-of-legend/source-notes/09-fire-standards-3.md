# 44. Dragon Arc

## Concrete source form

### Evidence

**[VIDEO — approximately 310.0–315.0 seconds]**

Dragon Arc is stored ammunition released as a steerable stream of piercing dragon projectiles, not one sinusoidal missile.

The source sequence shows:

1. Several small dragon charges are visibly stored before activation.
2. Casting releases the available dragons one after another in a rapid stream.
3. Each dragon travels forward with an animated serpentine body while its overall route follows the current aim.
4. Dragons pass through the first target and continue through aligned enemies.
5. Aim can change during the release, bending later dragons toward a different lane.
6. The caster can interrupt the long full-stock release with movement rather than being committed until every possible dragon has fired.

Frame-by-frame visual review of the base release around `311.5â€“312.7` seconds shows that every carrier has a readable dragon silhouette rather than a generic fireball or chain of beads:

- A broad, angular head with an open upper/lower jaw.
- A near-white eye and mouth flash.
- A hot yellow inner face and body.
- A thick orange outer silhouette with a darker orange-red edge.
- A long tapered flame body with jagged mane/tongue shapes rather than round body segments.
- Small detached ember fragments behind and between carriers.
- A strong white contact flash with gold/orange fragments at every pierced target.
- No pale floor rings or repeating circular ground decals under the traveling dragons.

Several dragons overlap during the rapid stream, but their bright heads remain individually readable. Their bodies flicker independently; the volley does not move as one synchronized ribbon.

**[IMPLEMENTATION COMPARISON — local Enemy Lab render]**

An automated side-view cast and screenshot pass exposed that the interim replacement still collapsed into a narrow row of touching fire-arrow silhouettes. The corrected carrier uses a broader angular head, visibly separated upper and lower jaw planes, a short wide three-color flame body, and independently moving edge tongues. Emission speed and cadence now place neighboring carrier centers about `3.3` world units apart, leaving a readable gap while the complete eight-dragon release remains a rapid roughly `1.4`-second stream.

**[DOCUMENTED]**

Dragon Arc is a Fire Signature Arcana with projectile and dragon classifications. It passively stores up to eight charges, each recovering in 0.6 seconds. Activating it spends all charges currently available, releasing one piercing dragon per charge; each deals 8 damage with 8 knockback. It can be cast with any nonzero stock, and aim may be adjusted during the stream.

Enhancement increases maximum stock to ten and spends two charges simultaneously to shorten the release. Charged Signature rapidly launches twenty dragons across a wide area. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Dragon_Arc))

## Exact source recipe

```text
DRAGON ARC

Input structure:
Stock-release Signature cast
Charged Signature rewrite when meter is full

Stock system:
Passively store up to 8 dragon charges
Recover one charge every 0.6 seconds
Allow activation with any stock greater than zero
Snapshot stock-to-spend when cast begins

Base release:
Continuously read aim during release window
For each snapshotted charge:
  create 1 dragon along current aim
  spend 1 charge
  wait authored emission interval
Dragon travels forward while its body animates serpentine motion
Dragon pierces valid enemies
Deal 8 damage at most once per target per dragon
Apply 8 knockback
Allow declared movement/dash cancellation to end remaining emissions

Enhanced release:
Maximum stock becomes 10
Spend/fire 2 charges together per emission beat
Preserve one dragon per charge

Charged Signature:
Launch exactly 20 dragons rapidly across a wide aimed area
Preserve piercing and per-dragon hit ownership
```

## Important distinction

The dragon's visual undulation is not a single projectile's authored side-to-side path. The source identity comes from stock, sequential emission, piercing, and live aim.

This source-first analysis supersedes the current one-projectile sinusoidal prototype. Do not polish that prototype; replace it with the charge-fed stream and its enhancement/charged rewrites.

## Source-faithful acceptance test

1. Dragon Arc stores no more than eight base charges.
2. One charge recovers approximately every 0.6 seconds.
3. Casting with partial stock spends only the available stock.
4. Base release emits exactly one dragon for each spent charge.
5. Later emissions follow live aim changes made during the stream.
6. Every dragon can pierce and hit several aligned enemies.
7. One dragon hits each target at most once.
8. Each hit uses the documented 8 damage and 8 knockback.
9. A declared dash/movement cancel ends future emissions cleanly without duplicating or refunding spent charges.
10. Each visible carrier reads as a tapered, open-jawed flame dragon rather than a sphere, caterpillar, or undifferentiated ribbon.
11. Yellow-white core, orange body, darker edge fragments, and white-hot impact punctuation remain separable from the top-down camera.
12. Overlapping dragons retain distinct heads and independently phased flame motion.
13. Main body colors remain orange/gold during overlap instead of additively blowing out into one white strip.
14. The carrier does not create scalloped floor rings along its path or a large ring when it reaches a wall.
15. Enhancement stores ten charges and emits two dragons per release beat.
16. Enhancement shortens the stream without reducing one-dragon-per-charge output.
17. Charged Signature launches exactly twenty dragons in a wide area.
18. The current sinusoidal single-projectile prototype does not count as source-first implementation completion.

## Units extracted from Dragon Arc

### **Passive-Stock Full Release**

One activation snapshots and spends every currently available unit rather than consuming one ammo per button press.

### **Live-Aim Sequential Stream**

Each emission reads current aim, allowing the player to sweep later projectiles independently of earlier ones.

### **Visual Serpentine / Logical Forward Separation**

Animation may undulate while the gameplay path remains readable and directed.

### **Paired-Emission Enhancement**

Enhancement spends two stored units per beat to compress cast duration while preserving total output.

### **Legacy-to-Source-First Replacement Boundary**

Improved research replaces a one-projectile approximation without erasing the prototype's history.

---

# 45. Exploding Fireball

## Concrete source form

### Evidence

**[VIDEO — approximately 315.0–325.0 seconds]**

Exploding Fireball is a non-piercing projectile whose first enemy, wall, or obstacle contact becomes a high-force radial blast.

The source sequence shows:

1. The base cast launches one large, fast fireball along the aimed line.
2. The projectile stops at its first target and immediately expands into a circular explosion.
3. Several enemies around that contact point receive the same strong damage/launch event.
4. Enhanced form increases the visible and effective blast radius without adding another projectile.
5. Charged Signature fires three fireballs in rapid succession.
6. Earlier charged shots can scatter targets, so the caster may adjust aim before the later shots.
7. The third fireball produces the strongest hit and adds burn.

**[DOCUMENTED]**

Exploding Fireball is a Fire Signature Arcana with projectile classification and a 5-second cooldown. The base projectile explodes on its first enemy, wall, or destructible-obstacle contact; the explosion deals 50 damage with high knockback. Enhancement increases blast radius.

Charged Signature fires three projectiles rapidly; the final projectile deals additional damage and burns enemies. Obstacles such as barrels and trees can trigger an early explosion. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Exploding_Fireball))

## Exact source recipe

```text
EXPLODING FIREBALL

Input structure:
Tap Signature cast with aim snapshot
Charged Signature rewrite when meter is full

Base projectile:
Launch 1 large fireball along aimed line
Do not pierce
Stop on first valid enemy, wall, or destructible-obstacle collision

Impact conversion:
Remove traveling projectile
Create exactly 1 circular explosion at contact point
Deal 50 damage once to each valid target in radius
Apply authored high outward knockback

Enhanced base:
Increase explosion radius
Preserve one projectile, one impact, and 50-damage event

Charged Signature:
Launch 3 fireballs in rapid authored sequence
Permit aim updates between emissions
First 2 use normal impact rules
Third uses increased damage and applies burn
Each projectile resolves independently against geometry

Cooldown:
5 seconds
```

## Important distinction

Projectile contact and explosion damage are one conversion event, not two stacked damage events on the direct target. The fireball is consumed before its area payload resolves.

The charged shots retain independent collision and aim. They should not be represented as one triple-damage projectile or as three guaranteed explosions at a preselected point.

## Source-faithful acceptance test

1. Base casting launches exactly one visible large fireball.
2. The projectile follows the aimed line and does not pierce.
3. First enemy contact consumes the projectile and creates one blast.
4. Wall, barrel, and tree contact can also trigger that blast.
5. Every target inside the blast receives one 50-damage event.
6. The direct-contact target does not receive an invented projectile hit plus explosion hit.
7. The blast applies strong outward knockback from its impact point.
8. Enhancement increases radius without adding projectiles or damage ticks.
9. Charged Signature emits exactly three fireballs.
10. Aim can be corrected between charged emissions.
11. Every charged fireball resolves its own first-contact explosion.
12. The final charged projectile deals additional damage and applies burn.
13. Cooldown is approximately 5 seconds.

## Units extracted from Exploding Fireball

### **First-Contact Projectile-to-Area Conversion**

A non-piercing projectile is consumed and replaced by one radial payload at its collision point.

### **Geometry-Triggerable Explosion**

Walls and destructible obstacles participate in the same impact contract as enemies.

### **Radius-Only Enhancement**

Enhancement changes spatial coverage without secretly adding hits or projectiles.

### **Aim-Correctable Three-Shot Signature**

A rapid sequence keeps separate projectiles and allows later shots to respond to earlier knockback.

---

# 46. Flame Cleaver

## Concrete source form

### Evidence

**[VIDEO — approximately 325.0–337.0 seconds]**

Flame Cleaver is a two-charge, wide piercing wave used as both offense and projectile defense. Charged Signature covers a full forward half-circle with seven enormous waves.

The source sequence shows:

1. A cast produces one broad curved wall of fire moving forward.
2. The wave passes through enemies and continues across the lane.
3. Its visible leading edge is wide enough to screen several hostile projectiles at once.
4. The wave inflicts an immediate hit and a burn result.
5. Enhanced form widens the wave and extends its travel distance.
6. Charged Signature emits seven overlapping massive waves distributed across roughly 180 degrees in front of the caster.
7. The charged fan clears a room-scale forward area while keeping the caster's rear exposed.

**[DOCUMENTED]**

Flame Cleaver is a Fire Signature Arcana with projectile classification. It passively stores two charges, each recovering in 4 seconds. Each cast creates one piercing fire wave that deals 16 damage, applies burn, and destroys all hostile projectiles it contacts. Enhancement makes the wave wider and longer-ranged.

Charged Signature releases seven massive waves across a 180-degree area, with increased damage and fiercer burn. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Flame_Cleaver))

## Exact source recipe

```text
FLAME CLEAVER

Input structure:
Ammo Signature cast with aim snapshot
Charged Signature rewrite when meter is full

Charge system:
Passively store up to 2 charges
Recover one charge every 4 seconds
Spend one charge per normal cast

Base wave:
Create 1 broad curved fire-wave projectile
Travel forward along aim
Pierce valid enemies
Deal 16 damage at most once per target
Apply burn
Destroy hostile projectiles intersecting visible wave
Continue until range/lifetime end

Enhanced wave:
Increase width and forward range
Preserve damage, piercing, and interception grammar

Charged Signature:
Create exactly 7 massive waves
Distribute wave directions across forward 180-degree sector
Use increased damage and fiercer burn
Preserve enemy piercing and projectile destruction
```

## Important distinction

The attack is a moving curved wall, not an instantaneous cone. Collision should track the visible wave front as it advances so interception and enemy hits occur at readable times.

Normal casts use independent ammo charges. Charged Signature's seven-wave fan is a topology rewrite, not seven deductions from the two-charge normal stock.

## Source-faithful acceptance test

1. Flame Cleaver stores no more than two normal charges.
2. Each normal charge recovers in approximately 4 seconds.
3. One normal cast emits exactly one broad curved wave.
4. The wave visibly advances rather than damaging an entire cone instantly.
5. It pierces and can hit several aligned enemies once each.
6. Each enemy hit deals 16 damage and applies burn.
7. The visible wave destroys hostile projectiles it contacts.
8. Enhancement increases both width and travel range.
9. Enhancement does not add an invented second normal wave.
10. Charged Signature emits exactly seven massive waves.
11. Charged directions cover approximately the forward 180 degrees.
12. Charged waves preserve piercing/interception and apply fiercer burn.
13. All waves clean up at their declared range or lifetime.

## Units extracted from Flame Cleaver

### **Advancing Curved-Wall Projectile**

A wide moving front supplies spatially honest enemy collision and projectile interception.

### **Piercing Defensive Offense**

One projectile can damage lined enemies while erasing hostile projectiles in the same visible footprint.

### **Independent Two-Charge Signature Ammo**

Normal use is reliable in repeated defensive beats without becoming a free continuous screen.

### **Seven-Wave Forward-Hemisphere Rewrite**

Charged Signature scales topology to a room-wide 180-degree fan while retaining an exposed rear.

---

# 47. Flame Fusion

## Concrete source form

### Evidence

**[VIDEO — approximately 337.0–342.0 seconds]**

Flame Fusion is a two-projectile interaction spell: a slow fireball is followed by a separately aimed arrow, and colliding the arrow with the fireball transforms it into a wide arrow burst.

The source sequence shows:

1. The caster first releases one slow, large fireball.
2. A short beat later, a kick launches a much faster narrow flame arrow.
3. The arrow may use a new aim direction rather than being locked to the first projectile's route.
4. If the arrow catches the fireball, the fireball disappears into a broad fan of smaller arrows.
5. The burst originates at the mid-flight collision point, not at the caster or an enemy.
6. If the two friendly projectiles do not meet, each remains independently capable of hitting an enemy.

**[DOCUMENTED]**

Flame Fusion is a Fire Standard Arcana with projectile classification and a 6-second cooldown. It launches a slow 28-damage fireball and then a separately aimable 10-damage arrow; both apply level-one burn. If the arrow collides with the fireball, the pair fuses into five wide-spread arrows, each dealing 12 damage and applying level-two burn. Enhancement releases seven fusion arrows. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Flame_Fusion))

## Exact source recipe

```text
FLAME FUSION

Input structure:
Two-phase Standard cast with live aim between emissions

Phase 1:
Snapshot first aim
Launch 1 slow fireball
On enemy contact: deal 28 damage and apply level-one burn

Phase 2:
After authored kick delay, read aim again
Launch 1 faster flame arrow
On enemy contact: deal 10 damage and apply level-one burn

Friendly fusion collision:
If this cast's arrow intersects a valid fusion fireball:
  consume arrow and fireball without applying their enemy-contact damage
  save collision point and arrow travel direction
  emit 5 arrows across wide fan from collision point
  each fusion arrow deals 12 damage and applies level-two burn

Enhanced fusion:
Emit 7 fan arrows instead of 5

Cooldown:
6 seconds
```

## Important distinction

This spell depends on friendly-projectile collision as a deliberate player-authored event. The fusion must happen where the arrow actually catches the fireball.

Aim is sampled twice. Locking both projectiles to one initial direction would remove the option to split targets or intentionally miss the fusion; auto-fusing them regardless of geometry would remove the timing/range skill.

## Source-faithful acceptance test

1. Phase one launches exactly one slow fireball.
2. The fireball deals 28 damage and level-one burn on enemy contact.
3. Phase two launches exactly one faster narrow arrow after a visible kick beat.
4. Phase-two aim can differ from phase-one aim.
5. The arrow deals 10 damage and level-one burn if it hits an enemy normally.
6. Fusion occurs only when the two compatible projectiles visibly intersect.
7. Fusion consumes both parents without also applying their enemy-contact payloads.
8. Five base fusion arrows originate at the collision point.
9. Fusion arrows spread around the incoming arrow direction.
10. Each fusion arrow deals 12 damage and applies level-two burn.
11. Enhancement emits seven fusion arrows rather than five.
12. Missing the fusion leaves the two parent projectiles independent.
13. Cooldown is approximately 6 seconds.

## Units extracted from Flame Fusion

### **Friendly-Projectile Transform Collision**

Two owned projectiles can consume each other and create a third authored projectile family at their real meeting point.

### **Per-Emission Aim Sampling**

Later projectiles read live aim so one multi-phase cast can intentionally split routes.

### **Parent-Payload Suppression on Fusion**

Transformation prevents accidental stacking of parent enemy-hit damage with the spawned fan.

### **Collision-Point Fan Emitter**

The world-space meeting point and incoming direction become the origin frame for the new spread.

---

# 48. Raging Inferno

## Concrete source form

### Evidence

**[VIDEO — approximately 342.0–353.0 seconds]**

Raging Inferno is a hold-to-charge projectile whose impact becomes a pulling fire vortex; full charge adds more pull ticks and an explosive burning finisher.

The source sequence shows:

1. Holding the cast grows a bright fireball in the caster's hands while the caster remains vulnerable.
2. Releasing sends the stored fireball forward along the aimed line.
3. First enemy contact anchors a circular vortex at the impact point.
4. Enemies around the vortex are pulled inward by repeated small hits.
5. A short/uncharged release ends after the compact five-hit gathering sequence.
6. Full charge creates a larger/longer vortex with additional repeated hits.
7. The fully charged sequence ends in a separate outward explosion that applies burn.

**[DOCUMENTED]**

Raging Inferno is a Fire Standard Arcana with projectile classification and a 6.5-second cooldown. On enemy impact it creates a vortex that pulls targets inward and deals five 10-damage hits. Holding the input charges the fireball; full charge increases the vortex to as many as nine 10-damage ticks, then adds a 20-damage outward explosion and burn, for up to ten authored hits. The caster is vulnerable and interruptible while charging. Enhancement doubles charge speed rather than changing the final recipe. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Raging_Inferno))

## Exact source recipe

```text
RAGING INFERNO

Input structure:
Hold-to-charge Standard cast; release to fire

Charge phase:
Root or strongly slow caster
Keep caster vulnerable and interruptible
Grow visible held fireball with normalized charge
Enhanced version reaches full charge in half the base time

Release:
Launch fireball along current aim
On first valid enemy impact, consume projectile and create vortex

Uncharged/partial vortex:
Anchor circular volume at impact point
Resolve exactly 5 timed hits per target
Deal 10 damage per hit
Apply inward pull on repeated hits
End without invented finisher if full-charge threshold was not reached

Fully charged vortex:
Resolve up to 9 timed inward-pull hits per target
Deal 10 damage per tick
After tick sequence, resolve exactly 1 explosion
Deal 20 damage
Apply strong outward knockback and burn

Cooldown:
6.5 seconds
```

## Important distinction

Charging changes the post-impact state machine, not merely projectile size or damage.

```text
short release = five pull ticks -> cleanup
full charge = up to nine pull ticks -> outward explosion + burn
```

The caster's vulnerability is part of the cost. Charge visuals must not imply invulnerability or super armor unless a separate system grants it.

## Source-faithful acceptance test

1. Holding input visibly grows a fireball before release.
2. The caster remains vulnerable and interruptible during charge.
3. Release launches one projectile along current aim.
4. First enemy impact converts that projectile into an anchored vortex.
5. A short-release vortex deals exactly five 10-damage ticks to a continuously overlapping target.
6. Those ticks pull enemies toward the impact center.
7. A short release does not create the full-charge explosion or burn.
8. Full charge permits up to nine 10-damage vortex ticks.
9. Exactly one 20-damage explosion follows the full-charge tick sequence.
10. The finisher pushes enemies outward and applies burn.
11. Enhancement halves charge time without adding hits or damage to the completed recipe.
12. Per-target hit scheduling is deterministic and not frame-rate dependent.
13. Cooldown is approximately 6.5 seconds.

## Units extracted from Raging Inferno

### **Charge-Selected Impact State Machine**

Stored charge determines which post-contact sequence is instantiated rather than only scaling raw damage.

### **Projectile-to-Anchored Pull Vortex**

A traveling object converts at enemy contact into a stationary multi-hit gathering area.

### **Full-Charge-Only Finisher**

The outward blast and burn are discrete rewards reserved for reaching the declared threshold.

### **Risk-Preserving Vulnerable Charge**

The longer recipe is purchased with stationary, interruptible preparation time.
