# Wizard of Legend Arcana Source Reference

This is the authoritative, source-first reference for the Wizard of Legend arcana analyzed from the user-provided 60 FPS showcase and the cited online documentation.

The per-ability analysis below is preserved verbatim from the project conversation. It intentionally separates concrete source behavior from reusable construction units. When this file conflicts with older per-spell summaries in `wizard_of_legend_spell_language.md`, use this file as the source of truth.


## Ability index

1. [Flame Strike](#1-flame-strike)
2. [Flame Cross](#2-flame-cross)
3. [Bouncing Blaze](#3-bouncing-blaze)
4. [Wind Slash](#4-wind-slash)
5. [Air Spinner](#5-air-spinner)
6. [Perforating Jet](#6-perforating-jet)
7. [Earth Knuckles](#7-earth-knuckles)
8. [Bladed Vine](#8-bladed-vine)
9. [Stone Shot](#9-stone-shot)
10. [Spark Contact](#10-spark-contact)
11. [Bolt Rail](#11-bolt-rail)
12. [Volt Disc](#12-volt-disc)
13. [Ice Dagger](#13-ice-dagger)
14. [Rip Tide](#14-rip-tide)
15. [Aqua Arc](#15-aqua-arc)
16. [Chaos Crusher](#16-chaos-crusher)
17. [Searing Rush](#17-searing-rush)
18. [Flare Rush](#18-flare-rush)

New source-first arcana analyses should be appended to this file. Do not create a separate analysis file for each new batch.

---

# First three abilities

Using the **actual first three arcana shown in the showcase**—**Flame Strike, Flame Cross, and Bouncing Blaze**—I think we can derive a cleaner construction language without letting our current implementations influence it.

The key is to describe each spell twice:

1. **Concrete source form:** exactly what Wizard of Legend appears to do.
2. **Extracted units:** only the reusable concepts that genuinely follow from that observation.

---

# 1. Flame Strike

## Concrete source form

### Evidence

**[VIDEO — approximately 0:00–5:10]**

The caster performs a three-beat close-range string. Each beat creates a short-lived plume of fire immediately in front of the caster.

The visible sequence is:

```text
Beat 1:
small forward fire plume

Beat 2:
another small forward fire plume

Beat 3:
larger, stronger forward fire plume
```

In the second demonstrated string, the last beat appears to be held and released as a considerably stronger blast.

The attack does **not** create a fireball that continues through the room. The fire exists briefly as an expanding frontal burst attached to the casting action.

The flame presentation has:

- A bright yellow-white center.
- A thick orange outer body.
- A roughly rounded or broad-cone footprint.
- Brief soot and embers after the main flash.
- A forceful white impact flash on struck targets.

**[DOCUMENTED]**

Flame Strike is a melee-classified basic arcana with a three-cast combo. The ordinary final cast deals more damage than the earlier casts, and holding the last cast charges a larger attack that covers more area and deals 28 damage. The enhanced charged attack also burns enemies and destroys enemy projectiles. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Flame_Strike))

Its documented damage progression is best represented as:

```text
Beat 1: 7
Beat 2: 7
Beat 3: 14

Charged Beat 3:
replaces the 14-damage finisher with 28 damage
```

## Exact source recipe

```text
FLAME STRIKE

Input structure:
Three-beat basic string
Hold input can continue the combo
Hold on final beat charges the finisher

Emission:
Caster-anchored frontal burst

Lifetime:
Very brief
No independent traveling object

Footprint:
Broad, rounded forward plume

Combo choreography:
Repeat → Repeat → Enlarged finisher

Optional state:
Final beat can enter Charge state

Charged transformation:
Larger footprint
Higher damage
Longer commitment before release

Base contact:
Immediate area hit
Knocks targets away

Enhanced mutation:
Charged finisher applies burn
Charged finisher destroys enemy projectiles
```

## Source-faithful acceptance test

A correct duplicate should satisfy all of these:

1. It is a three-beat basic string.
2. The fire bursts originate at the caster.
3. No fireball or ribbon travels independently across the room.
4. The first two plumes are compact and quick.
5. The normal third plume is noticeably stronger.
6. Holding the last beat visibly delays its release.
7. The charged plume is considerably larger than the normal finisher.
8. The caster remains vulnerable while charging.
9. Each plume can hit several closely grouped targets.
10. The enhanced effect modifies the charged finisher rather than every ordinary hit.

## Units extracted from Flame Strike

### **Caster-Anchored Burst**

A damaging footprint that appears relative to the caster, lives briefly, and does not become an independent moving object.

Parameters:

```text
originOffset
aimAngle
footprintShape
range
width
activeDuration
```

### **Scaling Repeat String**

A sequence that repeats the same broad action family, with the final beat receiving larger values.

```text
Burst
→ Burst
→ Stronger Burst
```

### **Chargeable Final Beat**

Only a particular beat in a combo can transition into a charging state.

```text
Combo reaches Beat 3
→ tap: normal finisher
→ hold: charge
→ release: transformed finisher
```

---

# 2. Flame Cross

## Concrete source form

### Evidence

**[VIDEO — approximately 5:15–11:50]**

The caster performs a rapid three-beat ranged string.

Each emission is a low, elongated wave of fire that travels away from the caster along the floor.

The sequence visible around 6.2–7.2 seconds is:

```text
Beat 1:
one traveling flame wave

Beat 2:
a second wave using the opposing or mirrored diagonal

Beat 3:
two waves launched together so their paths intersect
```

The waves are not round projectiles. They resemble moving ribbons or brushstrokes:

- A bright leading cluster.
- A thick yellow-orange body.
- An elongated fire trail behind the leading edge.
- A black soot wake that fades after the damaging wave has passed.
- Low vertical height relative to the characters.

The full string is extremely quick—roughly one second in the showcase.

**[DOCUMENTED]**

Flame Cross uses a three-cast basic combo. The first waves deal 6 damage. The final cast releases two intersecting waves, each dealing 9 damage and traveling slightly farther. Both final waves can hit the same target, producing 18 damage from the finisher. The waves pierce enemies. Enhancement makes them travel faster and farther. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Flame_Cross?utm_source=chatgpt.com))

## Exact source recipe

```text
FLAME CROSS

Input structure:
Three-beat basic string
Hold input performs full combo

Emission:
Independent traveling ground wave

Visual body:
Elongated flame ribbon
Bright moving head
Short soot wake

Path:
Forward travel
Alternating/mirrored diagonal orientation

Contact:
Pierces enemies

Hit rule:
Each wave can hit an enemy once
Different waves can hit the same enemy

Combo choreography:
Beat 1: Path A
Beat 2: Mirror(Path A)
Beat 3: Path A + Mirror(Path A), simultaneously

Finisher mutation:
Two carriers instead of one
Each carrier deals more damage
Each carrier travels slightly farther

Enhanced mutation:
Greater travel speed
Greater travel distance
No fundamental choreography change
```

## Source-faithful acceptance test

1. It is a three-beat basic string.
2. Beat 1 releases one moving wave.
3. Beat 2 releases one opposing wave.
4. Beat 3 releases two waves simultaneously.
5. The waves visibly travel; they are not stationary crossing lines.
6. The waves remain close to the ground.
7. Each wave has an elongated body, not a spherical silhouette.
8. Waves continue through enemies.
9. The two finisher waves are independent damaging objects.
10. One target can receive both finisher hits.
11. The final beat travels slightly farther.
12. Enhancement alters speed and range rather than adding an explosion or status.

## Units extracted from Flame Cross

### **Traveling Ribbon**

An independent moving attack with an elongated damaging body.

```text
movingHead
bodyLength
bodyWidth
wakeLength
travelSpeed
travelDistance
```

The body is not merely decoration behind a point projectile. It is the readable attack form.

### **Mirrored Emission**

A path or footprint can be reflected across the spell’s central aim axis.

```text
Path A
Mirror(Path A)
```

### **Paired Finisher**

A later combo beat emits both members of a mirrored pair simultaneously.

```text
Beat 1: A
Beat 2: B
Beat 3: A + B
```

### **Independent Overlap Damage**

The paired objects do not merge into one hitbox. Their overlap is meaningful because both may connect separately.

---

# 3. Bouncing Blaze

## Concrete source form

This is the one where our earlier interpretation was most wrong.

### Evidence

**[VIDEO — approximately 12:00–18:10]**

The caster throws three separate, large fireballs in rapid succession.

Each fireball:

- Is a clearly spherical object.
- Has a bright yellow-white core.
- Has an orange flaming rim.
- Has a dark shadow below it that helps communicate height.
- Travels generally forward.
- Appears to rise and fall or hop during its travel.
- Bursts into orange fragments and dark smoke when it hits a target in the base demonstration.

The player can have more than one fireball in flight. Around 13.2–13.5 seconds, a later fireball is being launched while an earlier one is still resolving farther downrange.

Most importantly:

> Nothing in this showcase suggests that the defining behavior is reflecting from room walls.

The visual idea is a **forward-thrown fireball with a bouncing or hopping travel cycle**, not a bank-shot projectile.

**[DOCUMENTED]**

Each input throws one fireball, with three fireballs per full basic combo. Every ball deals 12 damage, bounces twice, and dissipates on its second bounce. The enhanced version allows the fireballs to pass through enemies. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Bouncing_Blaze?utm_source=chatgpt.com))

The source also specifically distinguishes Bouncing Blaze from genuinely wall-ricocheting spells such as Bouncing Bubble, whose documented behavior includes bouncing from walls and intelligently ricocheting between enemies. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Bouncing_Bubble?utm_source=chatgpt.com))

## Exact source recipe

```text
BOUNCING BLAZE

Input structure:
Three-shot basic string
Each button press throws one fireball

Emission:
Independent spherical projectile

Path:
Forward travel divided into bouncing/hopping phases

Lifetime:
Maximum of two bounces
Expires on second bounce

Base enemy collision:
Projectile resolves on enemy contact
Does not continue through the target

Combo choreography:
Repeat identical shot three times

Shot differentiation:
No special third-shot finisher documented
All three projectiles use the same damage and behavior

Concurrency:
Multiple balls may coexist in flight

Enhanced mutation:
Enemy collision changes from stopping to piercing
Bounce lifetime remains the defining travel limit
```

## Important unresolved detail

The documentation says each ball “bounces twice,” while the top-down showcase communicates that bounce through sprite elevation, shadow, and contact animation.

The available material does **not yet let me confidently state**:

- The precise height curve.
- Whether “second bounce” counts the first landing after launch or two complete rebounds.
- Whether floor contact itself produces a damaging area.
- Whether solid walls simply terminate the projectile or have another interaction.

Those should remain marked **UNRESOLVED** until we isolate a clear unobstructed cast or test it directly in Wizard of Legend.

They should not be filled in using our previous wall-reflection behavior.

## Source-faithful acceptance test

1. Each press releases exactly one fireball.
2. A full basic string contains three fireballs.
3. The three shots are mechanically equivalent.
4. The third shot does not become a special double shot or larger finisher.
5. Multiple balls can exist simultaneously.
6. Each ball follows a visibly bouncing or hopping forward path.
7. The projectile is a large sphere, not a thin ribbon.
8. The ball has readable vertical separation from its shadow.
9. The base version does not pierce enemies.
10. The enhanced version does pierce enemies.
11. An unobstructed ball ends after its second bounce.
12. The implementation does not treat wall ricochet as its central behavior.

## Units extracted from Bouncing Blaze

### **Hopping Projectile Path**

A projectile path organized into repeated launch, descent, impact, and rebound phases.

```text
launch
→ airborne arc
→ bounce
→ second arc
→ final bounce
→ expire
```

Parameters:

```text
bounceCount
arcDuration
arcHeight
arcDistance
impactPause
shadowScaleCurve
expireOnFinalBounce
```

### **Uniform Repeated Volley**

A combo in which every beat emits the same object with the same behavior.

```text
Shot
→ Shot
→ Shot
```

This is distinct from Flame Strike’s scaling finisher and Flame Cross’s paired finisher.

### **Collision-Policy Upgrade**

Enhancement changes what happens when the carrier touches an enemy:

```text
Base:
enemy contact → terminate

Enhanced:
enemy contact → damage → continue
```

The path and choreography remain otherwise intact.

---

# What these three reveal together

These first three are especially useful because they are all **three-beat Fire basic arcana**, but they produce completely different play experiences.

That means the construction language should not define “basic fire attack” as one thing. It needs several independent axes.

## Unit 1: Combo driver

All three use a three-beat basic string.

```text
ThreeBeatBasic
```

But the playback rules differ:

| Spell | Input playback |
|---|---|
| Flame Strike | Hold continues the string; final hold charges |
| Flame Cross | Hold performs the complete rapid string |
| Bouncing Blaze | Each press emits one shot by default |

So we need:

```text
ComboLength
AdvancePolicy
HoldBehavior
FinalBeatHoldBehavior
ComboResetWindow
```

---

## Unit 2: Carrier form

The carrier determines what physically exists in the world.

| Spell | Carrier |
|---|---|
| Flame Strike | Caster-anchored burst |
| Flame Cross | Traveling ribbon |
| Bouncing Blaze | Spherical projectile |

These should be reusable high-level objects:

```text
AnchoredBurst
TravelingRibbon
OrbProjectile
```

---

## Unit 3: Choreography pattern

This determines how the three beats relate.

### Flame Strike

```text
Repeat
→ Repeat
→ Scale Up
```

**Scaling finisher**

### Flame Cross

```text
A
→ Mirror(A)
→ A + Mirror(A)
```

**Mirrored paired finisher**

### Bouncing Blaze

```text
A
→ A
→ A
```

**Uniform repeated volley**

This is a major conceptual layer that our earlier language underemphasized.

---

## Unit 4: Lifetime controller

Each carrier disappears for a different reason.

| Spell | Lifetime rule |
|---|---|
| Flame Strike | Fixed brief duration |
| Flame Cross | Maximum travel distance |
| Bouncing Blaze | Maximum bounce count |

So lifetime should be its own composable unit:

```text
TimedLifetime
DistanceLifetime
BounceCountLifetime
ContactLifetime
```

---

## Unit 5: Contact policy

| Spell | Enemy contact |
|---|---|
| Flame Strike | Immediate area hit |
| Flame Cross | Damage and continue |
| Bouncing Blaze | Damage and terminate; enhanced continues |

This gives us:

```text
AreaContact
PiercingContact
StoppingContact
```

---

## Unit 6: Finisher rule

A three-beat combo does not automatically require the third beat to be “more damage.”

Possible source-derived finisher rules are:

```text
ScaleFootprint
ScalePayload
AddCarrier
MirrorPair
ChargeTransform
NoSpecialFinisher
```

Applied here:

| Spell | Finisher rule |
|---|---|
| Flame Strike | Scale payload/footprint; optional charge transform |
| Flame Cross | Add mirrored carrier; increase each carrier |
| Bouncing Blaze | No special finisher |

---

## Unit 7: Enhancement mutation

The three upgrades modify entirely different dimensions:

| Spell | Enhancement changes |
|---|---|
| Flame Strike | Payload/defensive interaction on charged finisher |
| Flame Cross | Kinematics: speed and distance |
| Bouncing Blaze | Collision policy: gain piercing |

That suggests a powerful rule for the reference:

> Describe an enhancement by naming exactly which construction unit it mutates.

```text
Flame Strike:
Mutate ChargedFinisher.Payload

Flame Cross:
Mutate TravelingRibbon.Path

Bouncing Blaze:
Mutate OrbProjectile.EnemyContactPolicy
```

---

# The resulting source-derived grammar

These three spells can be represented without any custom “Flame Cross code” yet still remain exact:

```text
FLAME STRIKE =
ThreeBeatBasic
+ AnchoredBurst
+ ScalingFinisher
+ ChargeableFinalBeat
+ EnhancedChargedPayload
```

```text
FLAME CROSS =
ThreeBeatBasic
+ TravelingRibbon
+ MirroredSequence
+ PairedFinisher
+ PiercingContact
+ EnhancedKinematics
```

```text
BOUNCING BLAZE =
ThreeBeatBasic
+ OrbProjectile
+ HoppingPath
+ UniformVolley
+ BounceCountLifetime
+ StoppingContact
+ EnhancedPiercingContact
```

That feels like the right level: broad enough to become a reusable system, but derived from the source spells rather than from our approximations.

---

# Next five abilities

The exact next five in the showcase are:

1. **Wind Slash**
2. **Air Spinner**
3. **Perforating Jet**
4. **Earth Knuckles**
5. **Bladed Vine**

I’m treating the current versions in our game as irrelevant here. This is a fresh reconstruction from the showcase and documentation.

---

# 4. Wind Slash

## Concrete source form

### [VIDEO — approximately 18.7–23.5]

Wind Slash is a rapid three-beat close-range string made from **curved blades of air**.

Each beat:

- Begins at the caster.
- Sweeps through a short area in front.
- Appears and vanishes quickly.
- Is wider than a weapon blade but does not continue traveling across the room.
- Uses a pale blue-white crescent with thin trailing streaks.

The three attacks visibly increase in size. The caster also appears to lean or step slightly into the slashes, although the exact amount of gameplay displacement is unresolved.

The spell reads like magically extended melee—not three conventional projectiles.

### [DOCUMENTED]

The three slashes deal **8, 10, and 12 damage** and become progressively larger. When enhanced, each slash is accompanied by an additional wind gust dealing **3, 3, and 4 damage**. Those gusts pierce enemies and destroy projectiles. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Wind_Slash?utm_source=chatgpt.com))

## Exact source recipe

```text
WIND SLASH

Input structure:
Three-beat basic string

Carrier:
Caster-anchored swept arc

Beat progression:
Beat 1: small arc, 8 damage
Beat 2: medium arc, 10 damage
Beat 3: largest arc, 12 damage

Lifetime:
Very brief
No lingering field
No long-distance independent projectile

Contact:
One primary slash hit per beat
Can strike multiple enemies inside the arc

Enhanced mutation:
Add a secondary wind-gust layer to every beat

Enhanced secondary damage:
Beat 1: 3
Beat 2: 3
Beat 3: 4

Enhanced secondary behavior:
Pierces enemies
Destroys enemy projectiles
Extends the effective reach
```

The enhanced version should therefore not merely make the original slash larger. It adds a **second attack layer** behind or around the slash.

## Source-faithful acceptance test

1. The combo contains exactly three slashes.
2. Each slash is larger than the previous one.
3. The attack is a short swept arc, not a flat projectile fired downrange.
4. The base combo produces three damage events.
5. The enhanced combo produces six potential damage events: one slash and one gust per beat.
6. The enhanced gust extends beyond the primary melee arc.
7. Only the added gust receives the piercing and projectile-destruction behavior.

## Units extracted from Wind Slash

### **Caster-Anchored Swept Arc**

A brief footprint that rotates or sweeps around an origin near the player.

```text
originOffset
startAngle
endAngle
innerRadius
outerRadius
sweepDuration
```

### **Progressive Footprint String**

Each combo beat reuses the same carrier but increases its footprint and payload.

```text
Small Arc
→ Medium Arc
→ Large Arc
```

### **Secondary Attack Overlay**

An enhancement adds another independently resolved footprint to an existing attack.

```text
Primary Slash
+ Secondary Gust
```

This differs from simply increasing the slash’s damage because the added gust can have its own range, collision, piercing, and defensive interactions.

---

# 5. Air Spinner

## Concrete source form

### [VIDEO — approximately 23.7–28.5]

The first two beats throw small crescent-shaped air discs that travel into a **circular orbit around the caster**.

They are not straight boomerangs:

- The caster launches a disc toward the aim direction.
- The disc bends into a player-centered circular path.
- It passes around the player’s sides and back.
- An enemy placed along the orbit may be contacted more than once as the disc completes its revolution.

The third beat changes form. Instead of another small disc, a **large complete ring of air** rapidly surrounds the caster and pushes nearby targets outward.

The spell’s value is therefore not “ranged damage.” It is coverage around the player, including areas behind them.

### [DOCUMENTED]

Each ordinary disc deals **6 damage**, orbits the player once, and can hit an enemy twice when aimed through it. The three-cast combo ends with a large surrounding ring that deals **10 damage** and strongly pushes enemies away. When enhanced, each ordinary activation launches two discs, with the second beginning behind the player. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Air_Spinner?utm_source=chatgpt.com))

## Exact source recipe

```text
AIR SPINNER

Input structure:
Three-beat basic string

Beat 1:
Launch one orbiting air disc

Beat 2:
Launch one orbiting air disc

Beat 3:
Replace disc emission with a full surrounding air ring

Ordinary disc path:
Spawn near caster
Begin in aim direction
Complete one player-centered orbit
Expire after one revolution

Ordinary hit policy:
6 damage
May recontact the same target at another point in the orbit

Finisher:
Full 360-degree ring
10 damage
Strong outward knockback

Enhanced mutation:
Ordinary disc beats emit a second disc
Second disc begins on the opposite side of the caster
```

## Important distinction

The third beat is not merely a larger orbiting disc. It is a **carrier substitution**:

```text
Beats 1–2:
moving object following an orbit

Beat 3:
brief complete circular footprint
```

## Source-faithful acceptance test

1. Beats 1 and 2 each emit an actual moving disc.
2. Each disc circles the caster once.
3. The orbit covers the player’s rear, not just the aimed side.
4. One disc can hit the same stationary enemy twice if the orbit passes through it twice.
5. Beat 3 produces a complete ring rather than another disc.
6. The ring strongly pushes enemies outward.
7. Enhanced ordinary beats produce two discs beginning on opposite sides.
8. The discs remain short-range and player-centered.

## Units extracted from Air Spinner

### **Owner-Centered Orbit Path**

A carrier travels around an owner rather than around a fixed world point.

```text
owner
orbitRadius
startAngle
angularVelocity
revolutions
followOwnerMovement
```

### **Recontact Path**

A path may naturally cross the same target more than once.

This requires a hit policy such as:

```text
Can hit target again
after minimum angular separation
or minimum elapsed time
```

It should not use Flame Cross’s “once per carrier per enemy” policy.

### **Carrier-Substitution Finisher**

The final beat replaces the earlier carrier type.

```text
Orbiting Disc
→ Orbiting Disc
→ Instant Ring
```

### **Opposite-Phase Duplicate**

Enhancement adds a second copy positioned 180 degrees from the first.

---

# 6. Perforating Jet

## Concrete source form

### [VIDEO — approximately 28.7–31.1]

Perforating Jet fires **tight bursts of tiny air projectiles** along a narrow forward lane.

It is not one continuous beam.

Within each combo beat:

- Several individual jets are emitted in rapid succession.
- They follow nearly the same aim line.
- Each is a short pale-gray streak with a pointed front.
- Damage numbers appear as repeated small hits.
- The jets continue through the first target toward targets behind it.

The combo escalates by increasing the number of jets inside each burst—not primarily by making later jets larger.

### [DOCUMENTED]

The first activation releases **2 jets**, the second **3**, and the third **4**. Each jet deals **3 damage** and pierces enemies. Enhancement adds one jet to every activation, producing documented burst sizes of **3, 4, and 5**. The full string can be performed by holding the attack input. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Perforating_Jet?utm_source=chatgpt.com))

## Source conflict

The same wiki page lists the enhanced combo as having 11 hits, but its described burst counts add to:

```text
3 + 4 + 5 = 12
```

The written burst description and the arithmetic indicate **12**, while the summary-table hit count says **11**. That must remain marked unresolved until counted directly in controlled footage or tested in Wizard of Legend. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Perforating_Jet?utm_source=chatgpt.com))

## Exact source recipe

```text
PERFORATING JET

Input structure:
Three-beat basic string

Carrier:
Small independent air jet

Path:
Straight narrow forward lane

Contact:
3 damage
Pierces enemies
Continues after contact

Choreography:
Beat 1: micro-volley of 2
Beat 2: micro-volley of 3
Beat 3: micro-volley of 4

Intra-beat timing:
Jets emitted rapidly one after another
Not one combined multi-hit beam

Enhanced mutation:
Add one jet to each micro-volley

Enhanced pattern:
3 → 4 → 5
```

## Source-faithful acceptance test

1. The full combo contains three separate activations.
2. Each activation is itself a short volley.
3. Base volley sizes are exactly 2, 3, and 4.
4. Every jet is a separately moving and separately damaging object.
5. Jets occupy a narrow lane rather than a broad fan.
6. Each jet deals low damage and pierces all struck enemies.
7. Later beats gain projectile count, not projectile size.
8. Enhancement adds exactly one jet to each beat.
9. The enhanced total hit count remains flagged until the 11-versus-12 discrepancy is resolved.

## Units extracted from Perforating Jet

### **Nested Volley**

A combo beat can contain its own sequence of sub-emissions.

```text
Combo
  Beat 1
    shot, shot
  Beat 2
    shot, shot, shot
  Beat 3
    shot, shot, shot, shot
```

This is different from Bouncing Blaze, where each combo beat emits one projectile.

### **Count-Ramping String**

The carrier does not grow stronger individually. Each beat increases the number emitted.

```text
2 → 3 → 4
```

### **Piercing Micro-Projectile**

A small low-payload carrier designed to generate many individual contact events.

This creates very different synergy behavior from one attack dealing the same total damage in a single hit.

---

# 7. Earth Knuckles

## Concrete source form

### [VIDEO — approximately 31.4–38.5]

Earth Knuckles is a slow two-beat punching string.

For each cast:

- A massive stone fist forms directly in front of the player.
- The fist thrusts forward like an extension of the caster’s punch.
- Several smaller rocks form a short forearm or debris trail connecting the player to the fist.
- The fist exists only briefly at full extension.
- The impact produces a heavy white flash and substantial knockback.
- The caster visibly advances with the attack.

It is not a boulder launched across the room. The fist is a **summoned forward body extension**.

The two punches appear to alternate sides or punching poses and have a pronounced pause compared with the earlier rapid basics.

### [DOCUMENTED]

The first fist deals **16 damage** and the second **18**. Each input creates one fist. The forward movement helps the caster remain in range of enemies pushed away by the first punch. When enhanced, the two-beat combo is replaced by a single larger fist dealing **28 damage** over a larger area. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Earth_Knuckles?utm_source=chatgpt.com))

The documented enhanced visual is somewhat misleading: only the palm portion counts as the damaging hitbox, while enemies under the visible fingers may not be hit. That is a source quirk we should record separately rather than accidentally reproducing through an imprecise placeholder. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Earth_Knuckles?utm_source=chatgpt.com))

## Exact source recipe

```text
EARTH KNUCKLES

Base input structure:
Two-beat basic string

Carrier:
Caster-anchored forward thrust
represented as a giant summoned fist

Beat 1:
16 damage
heavy knockback
small forward caster advance

Beat 2:
18 damage
heavy knockback
small forward caster advance

Lifetime:
Appears during punch extension
Disappears during recovery
No independent continued travel

Enhanced transformation:
Replace the entire two-beat string
with one larger single-fist attack

Enhanced result:
One beat
28 damage
greater visual and attack area
different attack rhythm
```

## Source-faithful acceptance test

1. The base string has two beats, not three.
2. Each beat creates exactly one large stone fist.
3. The fist is connected visually to the player through rocks or an earthen forearm.
4. It behaves like a thrusting extension, not a free projectile.
5. The caster advances during each punch.
6. The first punch’s knockback does not prevent the second from connecting when the player continues the string.
7. Beat 2 is slightly stronger.
8. Enhancement collapses the string into one attack.
9. The enhanced attack feels slower and heavier, not like two punches played simultaneously.

## Units extracted from Earth Knuckles

### **Summoned Body Extension**

A temporary construct extends from the player and behaves like an oversized limb or weapon.

```text
anchor
extensionDirection
extensionLength
extensionDuration
returnDuration
```

### **Self-Advance Beat**

Executing the attack moves the caster forward as part of the authored action.

This is not projectile recoil or free movement; it is attack choreography.

### **Combo Collapse**

Enhancement replaces a multi-beat sequence with fewer, stronger beats.

```text
Base:
Punch → Punch

Enhanced:
Giant Punch
```

This is the opposite of enhancements that add projectiles or extra hits.

### **Knockback-Chasing String**

The caster’s movement and attack reach are coordinated so later beats follow enemies displaced by earlier beats.

---

# 8. Bladed Vine

## Concrete source form

### [VIDEO — approximately 38.6–43.0]

Bladed Vine is a three-beat whipping string.

The first two beats:

- Produce a thin thorny vine attached to the caster.
- Sweep or snap through a long, narrow area in front.
- Use a green-yellow segmented line with visible thorns or leaves.
- Behave like flexible melee extensions, not autonomous projectiles.

The third beat changes the visual structure:

- Several longer vine strands are thrust forward together.
- The footprint is longer and denser.
- The vines look like a bundled tendril attack rather than one lateral whip.
- The bundle resolves as the stronger finisher hit.

The enhanced finisher visibly repeats the forward tendril emission several times rather than simply enlarging the one bundle.

### [DOCUMENTED]

The first two casts each deal **7 damage**. The normal third cast sends out three longer visual vines but deals one **15-damage** finisher hit. When enhanced, the finisher becomes three separate sets of vines dealing **9 damage each**. The documented enhanced combo has five hits total: two ordinary whip hits followed by three finisher hits. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Bladed_Vine?utm_source=chatgpt.com))

That reveals an important distinction:

> Three visible strands do not necessarily mean three damage events.

The normal finisher is a multi-strand visual bundle representing one attack. The enhanced version repeats that bundle three times, creating three actual hit events.

## Exact source recipe

```text
BLADED VINE

Input structure:
Three-beat basic string

Beats 1 and 2:
One attached vine whip
7 damage each
long narrow frontal sweep

Normal Beat 3:
One forward tendril-bundle attack
Three visible long strands
One combined 15-damage event

Enhanced Beat 3:
Three tendril-bundle emissions
9 damage per emission
Three separate hit events

Contact:
Flexible melee footprint
Can cover several aligned or grouped enemies

Hold behavior:
Full combo may be continued by holding attack
```

The hold behavior and combo structure are documented by the arcana reference. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Bladed_Vine?utm_source=chatgpt.com))

## Source-faithful acceptance test

1. The string contains three beats.
2. Beats 1 and 2 are individual attached vine whips.
3. The vines remain visually connected to the caster.
4. The ordinary third beat has greater range and multiple visible strands.
5. The normal finisher deals one combined hit, not one hit per visible strand.
6. Enhancement does not change the first two beats.
7. The enhanced finisher emits three temporally separate vine sets.
8. Those three sets can produce three separate 9-damage hits.
9. The full enhanced combo therefore has five damage events.

## Units extracted from Bladed Vine

### **Attached Flexible Strike**

A line-shaped attack remains attached to the caster while its endpoint and body sweep through space.

It differs from both:

- A rigid swept arc such as Wind Slash.
- An independent traveling ribbon such as Flame Cross.

```text
rootAnchor
controlPoints
tipPath
bodyWidth
activeSweep
```

### **Visual Strand Bundle**

Several rendered strands can represent one logical damaging carrier.

```text
One attack event
Many visual strands
One shared hit ledger
```

This is important for keeping visuals expressive without accidentally multiplying damage.

### **Repeated-Bundle Finisher**

Enhancement turns one bundled attack into several successive bundled attacks.

```text
Base finisher:
Bundle

Enhanced finisher:
Bundle → Bundle → Bundle
```

---

# What these five add to the construction language

The first three established anchored bursts, traveling ribbons, hopping projectiles, and several combo patterns. These five add:

| Source spell | New high-level unit |
|---|---|
| Wind Slash | Swept arc with a secondary overlay |
| Air Spinner | Owner-centered orbit and carrier-substitution finisher |
| Perforating Jet | Nested volley with rising sub-shot count |
| Earth Knuckles | Summoned body extension and combo collapse |
| Bladed Vine | Attached flexible strike and visual strand bundle |

The source-derived recipes now read:

```text
WIND SLASH =
ThreeBeatBasic
+ CasterAnchoredSweptArc
+ ProgressiveFootprintString
+ EnhancedSecondaryOverlay
```

```text
AIR SPINNER =
ThreeBeatBasic
+ OwnerCenteredOrbit
+ RecontactPolicy
+ RingFinisher
+ EnhancedOppositePhaseDuplicate
```

```text
PERFORATING JET =
ThreeBeatBasic
+ NestedVolley
+ CountRampingString
+ PiercingMicroProjectile
```

```text
EARTH KNUCKLES =
TwoBeatBasic
+ SummonedBodyExtension
+ SelfAdvance
+ KnockbackChasingString
+ EnhancedComboCollapse
```

```text
BLADED VINE =
ThreeBeatBasic
+ AttachedFlexibleStrike
+ VisualStrandBundle
+ RepeatedBundleFinisher
```

The strongest lesson so far is that **visual objects, damaging objects, combo beats, and emissions cannot be treated as the same thing**. Bladed Vine may show three strands but produce one hit; Perforating Jet produces several damaging objects inside one beat; Air Spinner changes carrier type on its third beat; and Earth Knuckles changes the number of combo beats when enhanced.

---

# Five more abilities

I caught one ordering mistake from the previous pass: **Stone Shot comes immediately after Bladed Vine**. So the correct next five are:

1. **Stone Shot**
2. **Spark Contact**
3. **Bolt Rail**
4. **Volt Disc**
5. **Ice Dagger**

**Rip Tide comes after these five.**

---

# 9. Stone Shot

## Concrete source form

### [VIDEO — approximately 43–46 seconds]

Stone Shot is a three-beat ranged combo.

The first two beats each fire a compact, fast-moving stone:

- Small, irregular rocky silhouette.
- Narrow straight-line trajectory.
- Strong impact flash relative to the projectile’s size.
- Noticeable enemy knockback.
- Short gap between shots.

The third beat replaces the small stone with a **larger spiked boulder**:

- Visibly broader.
- Rougher and more threatening silhouette.
- Stronger impact and knockback accent.
- Still travels like a projectile rather than becoming a close-range earth punch.

The enhanced demonstration changes the first two beats. Each of those beats releases **two small stones in rapid succession**, while the spiked-boulder finisher remains unchanged.

### [DOCUMENTED]

The ordinary three-beat combo deals **12, 12, and 15 damage**. The final cast is the spiked boulder. Enhanced Stone Shot changes each of the first two casts into two quick 8-damage stones, while leaving the 15-damage final boulder intact. That produces five total projectile hits:

```text
Base:
1 + 1 + 1 = 3 projectiles

Enhanced:
2 + 2 + 1 = 5 projectiles
```

The stones also have unusually strong projectile-breaking capability even without a dedicated projectile-destruction relic, although the exact hierarchy of which enemy shots they can destroy is not fully cataloged. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Stone_Shot?utm_source=chatgpt.com))

## Exact source recipe

```text
STONE SHOT

Input structure:
Three-beat basic combo
Hold can perform the full combo

Beats 1–2:
Small straight stone projectile
12 damage
Strong knockback for its size

Beat 3:
Replace small stone with spiked boulder
15 damage
Larger visual body
Stronger impact emphasis

Enhanced Beats 1–2:
Each beat emits a two-shot micro-volley
8 damage per stone
Shots occur sequentially, not as one merged projectile

Enhanced Beat 3:
Unchanged spiked boulder
15 damage
```

## Source-faithful acceptance test

1. The combo contains three beats.
2. Beats 1 and 2 each fire one small stone in the base version.
3. Beat 3 fires one visibly different spiked boulder.
4. The boulder is not merely the small stone scaled up; its silhouette is distinct.
5. All projectiles move independently through the world.
6. Each impact pushes the target noticeably.
7. Enhancement produces two quick stones on beat 1.
8. Enhancement produces two quick stones on beat 2.
9. The enhanced finisher remains one spiked boulder.
10. The paired enhanced stones are individually damaging objects.

## Units extracted from Stone Shot

### **Finisher Carrier Swap**

The final combo beat replaces the ordinary projectile with a different carrier.

```text
Small Stone
→ Small Stone
→ Spiked Boulder
```

This differs from merely increasing damage or scale.

### **Within-Beat Doublet**

One combo beat can emit the same carrier twice with a brief internal delay.

```text
Beat:
Stone → short delay → Stone
```

### **Partial-Combo Mutation**

Enhancement changes selected beats while preserving the finisher exactly.

```text
Mutate Beats 1–2
Preserve Beat 3
```

This is useful because not every enhancement needs to alter the entire string.

---

# 10. Spark Contact

## Concrete source form

### [VIDEO — approximately 46–51 seconds]

Spark Contact is an extremely fast close-range lightning string.

The caster performs a series of short forward strikes:

- Each strike produces a compact yellow electrical flash at contact.
- The player advances slightly with each beat.
- The footprint is narrow and focused directly ahead.
- The rapid movement helps the caster remain attached to a target.
- The strikes visually read as electrically empowered punches or hand attacks rather than projectiles.

The final beat has two simultaneous layers:

1. The ordinary close contact strike.
2. A noticeably larger curved arc of electricity that sweeps forward around the struck area.

The enhanced version appears nearly identical until the finisher, where the large arc gains the shock effect.

### [DOCUMENTED]

Spark Contact has **four casts but five damage events**:

```text
Beat 1: 6
Beat 2: 7
Beat 3: 8
Beat 4 primary strike: 9
Beat 4 electric arc: 10
```

Each beat advances the player slightly. Holding the attack performs the complete rapid combo. Enhancement does not add another attack; it causes the final 10-damage electrical arc to apply level-1 shock. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Spark_Contact?utm_source=chatgpt.com))

## Exact source recipe

```text
SPARK CONTACT

Input structure:
Four-beat basic combo
Hold performs complete combo

Carrier:
Caster-anchored close-contact strike

Movement:
Small authored forward step on every beat

Damage progression:
6 → 7 → 8 → 9

Final-beat overlay:
Large electric arc
10 additional damage
Occurs alongside the fourth strike

Enhanced mutation:
Final arc applies shock
No additional carrier
No change to early beats
```

## Source-faithful acceptance test

1. The combo has four visible attack motions.
2. It produces five possible damage events.
3. The first three beats each produce one compact contact hit.
4. The player moves forward slightly on every beat.
5. The fourth beat still contains its own ordinary strike.
6. The large electrical arc occurs alongside that fourth strike.
7. The arc covers more area than the preceding contact hits.
8. The sequence is exceptionally fast.
9. Enhancement does not modify beats 1–3.
10. Enhancement adds shock specifically to the final arc.

## Units extracted from Spark Contact

### **Self-Advancing Contact String**

Each close-range attack beat includes authored forward movement.

```text
Strike + Step
→ Strike + Step
→ Strike + Step
→ Strike + Step
```

This is similar to Earth Knuckles’ knockback-chasing movement, but Spark Contact uses many very small, fast advances instead of two heavy lunges.

### **Progressive Payload String**

The footprint remains broadly similar while damage rises each beat:

```text
6 → 7 → 8 → 9
```

### **Final-Beat Overlay**

The finisher retains the normal attack and adds a second independently resolved footprint.

```text
Final Beat =
Primary Contact Strike
+ Large Electric Arc
```

### **Status-Only Enhancement**

The enhancement alters neither geometry nor damage count. It adds a status payload to an existing component:

```text
FinalArc.Status = Shock
```

---

# 11. Bolt Rail

## Concrete source form

### [VIDEO — approximately 52–57 seconds]

Bolt Rail creates very short-lived streams of lightning directly in front of the caster.

Each beat:

- Produces a jagged yellow-white electrical line.
- Exists only for an instant.
- Connects the caster’s hand area to the target lane.
- Has a short but clear reach.
- Is not a moving projectile.
- Vanishes before the next stream is produced.

The full combo is five rapid streams. On the final successful connection, the target area erupts in a larger electrical burst.

The enhanced demonstration shows that the final electricity branches from the primary target toward nearby targets.

## [DOCUMENTED]

Bolt Rail has five casts. Each stream deals **5 damage**. A successful final cast adds a **10-damage electrical burst**, giving six potential hits in the ordinary full combo. The extra burst only occurs if the final stream actually hits an enemy. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Bolt_Rail?utm_source=chatgpt.com))

The stream ignores normal environmental collision, allowing it to affect enemies through walls or statues if they are inside its range. Enhanced Bolt Rail causes the final electricity to chain to nearby enemies and apply shock; the chained effect does not knock those enemies away. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Bolt_Rail?utm_source=chatgpt.com))

## Exact source recipe

```text
BOLT RAIL

Input structure:
Five-beat basic combo
Hold performs full combo

Carrier:
Instantaneous short lightning stream
No independently traveling projectile

Ordinary beats:
5 damage each

World collision:
Ignored
Enemy collision:
Enabled within the stream footprint

Final-beat condition:
If final stream hits an enemy:
    create 10-damage electrical burst
If final stream misses:
    do not create burst

Enhanced finisher:
Chain electricity from the struck target
to nearby secondary targets
Apply shock
Do not apply normal finisher knockback to chained targets
```

## Source-faithful acceptance test

1. The combo contains five visible stream activations.
2. The streams are separate pulses, not one continuous channel.
3. No projectile travels from the player to the enemy over time.
4. Each ordinary stream deals one 5-damage hit.
5. The final 10-damage burst requires a successful fifth-stream contact.
6. Missing with the fifth stream produces no distant burst.
7. The stream can affect enemies through world obstacles.
8. The range remains short despite ignoring walls.
9. Enhancement begins its chain from a successfully struck target.
10. The chain seeks nearby enemies rather than reflecting randomly through the room.

## Units extracted from Bolt Rail

### **Instantaneous Directed Stream**

A brief line-shaped carrier is evaluated immediately instead of moving over time.

```text
origin
direction
range
width
activeFrames
```

It differs from:

- Flame Cross’s moving ribbon.
- Perforating Jet’s individual micro-projectiles.
- Wind Slash’s rotating arc.

### **Separate World and Enemy Collision Policies**

The attack can ignore world geometry while still detecting actors:

```text
worldCollision = ignore
enemyCollision = hit
```

This should be a general property rather than a special Bolt Rail exception.

### **Contact-Gated Finisher**

The finisher only exists if an earlier part of the same beat successfully connects.

```text
Final stream hits
→ create burst

Final stream misses
→ no burst
```

### **Chain-From-Contact Mutation**

Enhancement transforms the successful target into the origin of a secondary attack.

```text
Caster → Primary Target
Primary Target → Nearby Targets
```

---

# 12. Volt Disc

## Concrete source form

### [VIDEO — approximately 58–63 seconds]

Volt Disc launches a glowing circular ring of electricity.

The disc:

- Travels straight ahead.
- Has a clearly readable hollow center.
- Uses a yellow-white rim with small lightning fragments around it.
- Travels only a relatively short distance.
- Ends in a compact electrical burst.

Three discs form the basic combo, but each press throws only one disc. Unlike most hold-continuable basics, Volt Disc expects repeated presses unless another effect changes its input behavior.

When a disc directly reaches a target, it flashes at the target and dissipates. In the enhanced demonstration, the disc redirects from the first struck target toward another nearby target. This is **target-to-target redirection**, not wall ricochet.

### [DOCUMENTED]

Each disc has a single 9-damage payload, but the owner of that payload changes depending on what happens:

- If the disc reaches maximum range without a direct hit, its terminal electrical burst deals 9.
- If the disc directly hits an enemy, the disc itself deals 9 and the accompanying burst deals 0 damage while still registering as a second hit event.

The combo contains three discs. Enhanced discs redirect toward one additional target after directly hitting the first and repeat the same impact behavior there. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Volt_Disc?utm_source=chatgpt.com))

## Exact source recipe

```text
VOLT DISC

Input structure:
Three-beat combo
One disc per button press

Carrier:
Short-range electric ring projectile

Path:
Straight

Terminal behavior on no enemy contact:
Expire at maximum distance
Create electric burst
Burst deals 9 damage

Behavior on direct enemy contact:
Disc deals 9 damage
Create burst at contact point
Burst deals 0 damage
Burst still registers as a hit event
Disc expires

Enhanced contact behavior:
After first direct hit,
redirect disc toward one additional target
Repeat equivalent impact behavior
```

## Why the zero-damage burst matters

The direct-hit version does not simply deal 9 once. It records:

```text
Direct carrier hit: 9
Impact burst event: 0
```

That can matter for systems that count hits, trigger effects per contact, build signature charge, or react to electrical bursts even when the secondary event contributes no damage.

## Source-faithful acceptance test

1. The combo contains three discs.
2. Each button press releases one disc.
3. Each disc has a hollow circular visual body.
4. The disc travels a short straight path.
5. An unobstructed disc ends with a 9-damage electrical burst.
6. A directly contacting disc deals its 9 damage through the disc.
7. Direct contact still creates a second zero-damage burst event.
8. Base discs do not seek a second target.
9. Enhanced discs redirect only after hitting the first target.
10. Enhanced redirection seeks another enemy rather than bouncing from a wall.

## Units extracted from Volt Disc

### **Terminal-Burst Projectile**

A carrier creates another footprint when its lifetime ends.

```text
Projectile expires
→ create burst at final position
```

### **Payload Handoff**

Exactly one component receives the damaging payload depending on the outcome:

```text
No direct hit:
TerminalBurst.damage = 9

Direct hit:
ProjectileContact.damage = 9
TerminalBurst.damage = 0
```

This avoids double damage while preserving two event types.

### **Zero-Damage Event**

A collision or burst may still count as a hit even when its damage value is zero.

That should be a deliberate system capability, not an accidental side effect.

### **Target-Redirect Bounce**

“Bounce” here means:

```text
Hit Target A
→ acquire Target B
→ redirect toward B
```

It is distinct from Bouncing Blaze’s hopping path and Bouncing Bubble’s wall/enemy ricochet.

---

# 13. Ice Dagger

## Concrete source form

### [VIDEO — approximately 64–69 seconds]

Ice Dagger is a four-beat forward stabbing string.

Each beat:

- Creates a long, narrow ice blade attached to the caster’s hand.
- Thrusts directly along the aim direction.
- Moves the caster forward.
- Pushes struck enemies along with the advancing sequence.
- Has a bright white-blue impact flash.
- Is narrow enough that target alignment matters.

The sequence can be redirected during execution. The caster is not simply locked to the initial aim; later stabs can turn as the player changes direction.

The enhanced version visibly produces **two parallel ice blades** during the thrusts. The final enhanced stab also releases two long ice shards downrange after the close attack.

### [DOCUMENTED]

The four melee strikes deal:

```text
6 → 6 → 8 → 10
```

The player moves forward while stabbing, and the aim can be adjusted during the combo. The movement can be suppressed by returning the controller stick to neutral after initially aiming. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Ice_Dagger?utm_source=chatgpt.com))

Enhanced Ice Dagger visually conjures two side-by-side daggers and releases two piercing ice shards after the final strike. The shard payload is documented as **12 damage**, and the projectiles pass through enemies until just before the edge of the screen. The published hit-count summary lists five total hits—four melee beats plus one shard event—even though two shards are rendered, so the exact per-shard logical collision treatment should remain marked unresolved until directly tested. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Ice_Dagger?utm_source=chatgpt.com))

## Exact source recipe

```text
ICE DAGGER

Input structure:
Four-beat basic combo
Hold performs full combo

Carrier:
Caster-attached narrow thrusting blade

Damage progression:
6 → 6 → 8 → 10

Movement:
Authored forward displacement on every beat

Steering:
Current aim may change between or during beats
Later thrusts follow updated direction

Neutral behavior:
Neutralizing aim can suppress or reduce forward travel

Enhanced visual mutation:
Create two parallel ice daggers for melee thrusts

Enhanced final-beat overlay:
After final melee thrust,
release two long-range piercing ice shards

Documented shard payload:
12 damage

Projectile lifetime:
Continue through enemies
Expire near screen boundary
```

## Unresolved paired-shard rule

The available sources establish:

- Two shard visuals.
- A 12-damage shard payload.
- One additional documented hit in the combo summary.

They do not conclusively establish whether:

1. Both shard visuals share one combined hitbox.
2. Each has a hitbox but overlapping damage is consolidated.
3. The published hit count is incomplete.

That should be tested rather than guessed.

## Source-faithful acceptance test

1. The base combo has four stabs.
2. Damage progresses 6, 6, 8, and 10.
3. Each stab moves the caster forward.
4. The attack footprint is narrow and thrust-shaped.
5. The player can redirect later stabs during the combo.
6. Returning the aim stick to neutral changes the forward movement behavior.
7. Base Ice Dagger releases no long-range shard.
8. Enhanced melee attacks visibly use two parallel daggers.
9. The enhanced final stab releases two shard visuals.
10. The shards travel a long distance and pierce enemies.
11. Ice Dagger does not automatically freeze enemies merely because it is ice-themed. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Ice_Dagger?utm_source=chatgpt.com))

## Units extracted from Ice Dagger

### **Steerable Self-Propelled String**

Each beat combines an attack and movement, but later beats can use updated aim:

```text
Thrust(direction₁) + Move(direction₁)
→ Thrust(direction₂) + Move(direction₂)
→ ...
```

### **Aim-Magnitude Movement Gate**

The attack direction and the movement behavior can share direction while using different input rules:

```text
Aim direction retained
Stick neutral
→ attack still faces target
→ forward movement reduced or stopped
```

### **Paired Visual Blade**

Enhancement adds a second rendered weapon without necessarily adding another logical melee hit.

```text
One logical strike
Two visible blades
```

### **Melee-to-Projectile Finisher Overlay**

The final beat remains a melee thrust but adds a ranged continuation:

```text
Final thrust
+ piercing shard volley
```

# What these five add to the construction language

| Spell | Newly clarified unit |
|---|---|
| Stone Shot | Finisher carrier swap and enhanced within-beat doublets |
| Spark Contact | Rapid self-advancing contact string with final overlay |
| Bolt Rail | Instantaneous stream, world-collision bypass, contact-gated finisher |
| Volt Disc | Payload handoff, zero-damage event, target-redirection bounce |
| Ice Dagger | Steerable attack movement and melee-to-projectile continuation |

Their compact source-derived recipes are:

```text
STONE SHOT =
ThreeBeatBasic
+ StraightStoneProjectile
+ FinalCarrierSwap
+ EnhancedDoubletsOnEarlyBeats
```

```text
SPARK CONTACT =
FourBeatBasic
+ SelfAdvancingContactStrike
+ ProgressiveDamage
+ FinalArcOverlay
+ StatusOnlyEnhancement
```

```text
BOLT RAIL =
FiveBeatBasic
+ InstantaneousDirectedStream
+ IgnoreWorldCollision
+ ContactGatedBurst
+ EnhancedTargetChain
```

```text
VOLT DISC =
ThreeBeatManualBasic
+ ShortRangeDisc
+ TerminalBurst
+ ConditionalPayloadHandoff
+ EnhancedTargetRedirect
```

```text
ICE DAGGER =
FourBeatBasic
+ SteerableSelfAdvance
+ NarrowThrust
+ EnhancedPairedVisualBlades
+ FinalPiercingProjectileOverlay
```

The most valuable new idea is probably **payload handoff** from Volt Disc: the same spell can preserve its intended damage while assigning that damage to a different component depending on whether the projectile directly connects or expires naturally.

---

# Next five abilities

The exact next five arcana shown after Ice Dagger are:

1. **Rip Tide**
2. **Aqua Arc**
3. **Chaos Crusher**
4. **Searing Rush**
5. **Flare Rush**

The analyses below continue to treat the current prototype implementations as irrelevant. They reconstruct the source move first, then extract reusable conceptual units from that reconstruction.

# 14. Rip Tide

## Concrete source form

### Evidence

**[VIDEO — approximately 69–75 seconds]**

Rip Tide is a one-input, rapid three-ripple sequence.

The caster plants in place and releases three pale-blue water ripples one after another along a fixed forward lane:

- Each ripple is a separate moving water shape.
- Each has a broad crescent or curved-sheet silhouette rather than a spherical body.
- White foam and spray define the leading edge.
- The three emissions arrive in very quick succession.
- The caster does not visibly retarget between them.
- The sequence completes automatically after the initial input.

The enhanced demonstration preserves the first two central ripples. On the final emission, two additional side ripples appear with the central ripple, creating a three-way spread.

The move reads as a compact defensive burst: the player commits to one direction, rapidly fills that lane with piercing water, and uses the final spread to widen the protected area.

**[DOCUMENTED]**

Rip Tide is a Water Basic Arcana with projectile subtype. One input performs the entire three-ripple combo, and the sequence cannot be interrupted or redirected once it begins. The caster cannot move or adjust aim during the animation.

The three base ripples deal:

```text
Ripple 1: 8
Ripple 2: 7
Ripple 3: 5
```

Each ripple pierces enemies and destroys enemy projectiles that it contacts.

When enhanced, the final emission gains two additional ripples that spread outward in an arc. This produces five total ripple hits per sequence and allows multiple final ripples to connect at very close range. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Rip_Tide))

## Exact source recipe

```text
RIP TIDE

Input structure:
One press begins one complete three-emission sequence

Commitment:
Sequence is uninterruptible once started
Caster cannot move during sequence
Aim cannot change during sequence

Aim:
Snapshot direction at activation
Use that direction for every emission

Carrier:
Independent traveling water ripple

Visual form:
Broad crescent or curved sheet
Pale-blue body
Bright foaming leading edge
Short spray breakup on expiration or contact

Path:
Short straight forward lane

Contact:
Pierces enemies
Destroys enemy projectiles
Continues after enemy contact

Emission schedule:
Emission 1: one central ripple, 8 damage
Emission 2: one central ripple, 7 damage
Emission 3: one central ripple, 5 damage

Enhanced final emission:
Central final ripple
+ one outward-angled side ripple
+ mirrored outward-angled side ripple

Enhanced total:
Five ripple carriers across the complete sequence
```

## Important distinction

Rip Tide is not a normal three-button basic combo.

```text
Normal combo-cast:
Press → Beat 1
Press → Beat 2
Press → Beat 3

Rip Tide:
Press once
→ Ripple 1
→ Ripple 2
→ Ripple 3 automatically
```

The inability to move or update aim is part of its source behavior, not an incidental animation limitation. It is the cost paid for an extremely fast, defensive, projectile-clearing sequence.

## Source-faithful acceptance test

1. One button press always begins the complete three-emission base sequence.
2. Additional presses are not required to advance the sequence.
3. The caster cannot move while the sequence is executing.
4. The aim direction is captured at activation and remains fixed.
5. The base version releases exactly three separate ripple carriers.
6. Their damage order is 8, then 7, then 5.
7. Every ripple continues through enemies.
8. Every ripple can destroy enemy projectiles it contacts.
9. The enhanced version leaves the first two emissions unchanged.
10. The enhanced final emission contains three simultaneous ripples.
11. The two added final ripples spread to opposite sides.
12. Rip Tide does not become a continuous beam or a lingering water field.

## Units extracted from Rip Tide

### **One-Press Authored Sequence**

One activation schedules several separate emissions without requesting another input.

```text
Activate
→ Emission A
→ Emission B
→ Emission C
```

### **Locked-Aim Commitment**

The sequence uses an aim snapshot and rejects later movement or aim updates until it ends.

```text
activationDirection = currentAim
movement = locked
aimUpdates = ignored
```

### **Defensive Piercing Volley**

The same carriers both damage enemies and erase hostile projectiles while continuing forward.

### **Final-Emission Fan Expansion**

Enhancement mutates only the final scheduled emission:

```text
Base final:
Center

Enhanced final:
Left + Center + Right
```

---

# 15. Aqua Arc

## Concrete source form

### Evidence

**[VIDEO — approximately 75–80 seconds]**

Aqua Arc is a three-beat ranged basic string made from short, piercing streams of water.

Each ordinary stream:

- Begins just in front of the caster.
- Travels forward as a compact, curved body of water.
- Uses a bright white foaming front and a pale-blue trailing body.
- Occupies a narrow lane.
- Continues through struck targets.
- Dissipates after a relatively short travel distance.

The base sequence emits one stream on the first beat, one on the second, and two streams simultaneously on the third.

In the enhanced demonstration, every stream ends in a sharp, star-shaped icy burst at maximum range. The burst visibly extends the threatened endpoint beyond the ordinary water stream.

**[DOCUMENTED]**

Aqua Arc is a Water Basic Arcana with projectile subtype. Each stream deals 8 damage and pierces enemies.

Its three-cast combo is:

```text
Beat 1: one stream
Beat 2: one stream
Beat 3: two simultaneous streams
```

The complete base combo therefore contains four stream carriers. Their documented knockback progression is 5, 5, 8, and 8.

When enhanced, each stream creates a small icy endpoint burst at maximum range. Each burst deals 5 damage, increases effective range, and raises the full combo from four to eight hit events. The attack button can be held to perform the full combo. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Aqua_Arc))

The final two streams may occasionally display as one combined 16-damage number even though they remain separate source attacks. The icy burst does not convert Aqua Arc into an Ice-classified arcana. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Aqua_Arc))

## Exact source recipe

```text
AQUA ARC

Input structure:
Three-beat basic combo
Hold performs full combo

Carrier:
Short independent water stream

Visual form:
Compact curved water body
Foaming white leading edge
Pale-blue trailing spray

Path:
Straight forward lane
Short range

Contact:
8 damage per stream
Pierces enemies
Continues after contact

Choreography:
Beat 1: one stream
Beat 2: one stream
Beat 3: two simultaneous streams

Base carrier count:
Four streams per complete combo

Finisher:
Adds a second simultaneous stream
Does not replace the original final stream

Enhanced mutation:
Every stream creates one endpoint ice burst
Burst occurs at maximum stream range
Burst deals 5 damage in a small area
Burst extends effective range

Enhanced carrier/event structure:
Four piercing stream hits
+ four endpoint burst hits
```

## Source-faithful acceptance test

1. The base combo contains three input beats.
2. Beat 1 emits exactly one water stream.
3. Beat 2 emits exactly one water stream.
4. Beat 3 emits exactly two simultaneous streams.
5. Each stream deals 8 damage.
6. Each stream pierces enemies.
7. The streams have short range and do not behave as long-lived water balls.
8. The two final streams remain independently damaging even when one 16-damage number is displayed.
9. Enhancement adds one endpoint burst to every stream, not only to the finisher.
10. Endpoint bursts occur at maximum range rather than on the first enemy contacted.
11. Each endpoint burst deals 5 damage in a small area.
12. The enhanced icy visual does not add freeze or change the arcana's elemental classification.

## Units extracted from Aqua Arc

### **Short Piercing Stream Carrier**

A compact moving carrier that visually reads as flowing material rather than an orb, beam, or long ribbon.

### **Paired-Carrier Finisher**

The final beat preserves its ordinary carrier and adds a second simultaneous copy.

```text
A
→ A
→ A + A
```

Unlike Flame Cross, the payoff does not depend on mirrored crossing paths.

### **Per-Carrier Endpoint Overlay**

Enhancement attaches a terminal effect to every carrier created by the combo.

```text
for each stream:
    travel
    expire at max range
    create endpoint burst
```

### **Range Extension by Secondary Footprint**

The projectile's own range need not increase. A new endpoint footprint can extend the total threatened distance.

### **Visual Sub-Element Without Classification Rewrite**

An icy visual and payload can be added to a Water spell without converting the source arcana into the Ice subcategory.

---

# 16. Chaos Crusher

## Concrete source form

### Evidence

**[VIDEO — approximately 80–91 seconds]**

Chaos Crusher is a rapid three-beat sequence in which every beat has two linked phases.

For each beat:

1. A large black-violet chaos rift forms at short range in front of the caster.
2. The rift strikes the nearby area with a bright white contact flash.
3. The large rift compresses into a much smaller dark projectile.
4. The compressed projectile shoots forward along the aim lane.

The first phase is broad and proximal. The second is small, fast, and long-ranged.

The large rift does not travel through the room in its expanded state. The spell repeatedly creates a close-range mass, collapses it, and sends the compressed result onward.

This gives every beat two useful ranges:

- A nearby enemy can be struck by both the initial rift and the fired projectile.
- A distant enemy is reached only by the compressed projectile.

The showcase demonstrates the move repeatedly from both close and longer positions, emphasizing that dual-range identity.

**[DOCUMENTED]**

Chaos Crusher is a Chaos Basic Arcana with both melee and projectile subtypes. Its documented damage values are:

```text
Initial rift strike: 8
Compressed projectile: 6
```

The published hit count is six. Combined with the documented three-cast basic sequence, this supports two attack events per beat:

```text
3 beats × 2 phases = 6 hits
```

The compressed projectiles pass through enemies. All portions of the move count as both melee and projectile attacks, and they can destroy some enemy projectiles. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Chaos_Crusher))

Chaos Crusher has no enhanced state documented or demonstrated. Its source topology is fixed rather than having a normal/enhanced pair.

## Exact source recipe

```text
CHAOS CRUSHER

Input structure:
Three-beat basic combo

Per-beat phase 1:
Create large chaos rift at short forward offset
Rift immediately strikes nearby area
8 damage
15 knockback

Per-beat transformation:
Compress expanded rift into small chaos projectile

Per-beat phase 2:
Fire compressed projectile forward
6 damage
10 knockback

Projectile path:
Straight
Long range
Pierces enemies

Maximum complete-combo hit structure:
Three proximal rift hits
+ three compressed projectile hits
= six attack events

Subtype policy:
Every phase counts as melee
Every phase counts as projectile

Defensive interaction:
Can destroy some enemy projectiles

Enhanced mutation:
None documented
```

## Important distinction

Chaos Crusher is not:

```text
Melee attack
then an unrelated bonus projectile
```

Its source visual and behavior are a carrier transformation:

```text
Expanded Rift
→ compress
→ Fired Chaos Core
```

The second phase is the first phase converted into another spatial form.

## Source-faithful acceptance test

1. The complete combo contains three beats.
2. Every beat begins with one large short-range chaos rift.
3. The large rift itself produces an 8-damage attack event.
4. The expanded rift does not travel downrange.
5. Every rift visibly compresses before the ranged phase.
6. Every beat then fires one small 6-damage projectile.
7. The compressed projectile travels much farther than the initial rift reaches.
8. The projectile pierces enemies.
9. A close target can receive both phases of the same beat.
10. A distant target receives only the compressed projectile.
11. A full close-range combo can produce six source attack events.
12. All phases retain both melee and projectile subtype behavior.
13. No invented enhanced version is added.

## Units extracted from Chaos Crusher

### **Per-Beat Carrier Transformation**

One logical carrier changes form inside every combo beat.

```text
Expanded carrier
→ compression transition
→ small traveling carrier
```

### **Proximal-to-Distal Attack**

One activation covers close and long range through sequential phases rather than one oversized hitbox.

### **Same-Source Two-Phase Hit**

Both attack events are produced by the same visual object at different transformation states.

### **Hybrid Subtype Policy**

A spell component can intentionally participate in more than one interaction taxonomy:

```text
subtypes = [melee, projectile]
```

This policy applies to every phase, not only to the component that visibly travels.

### **Fixed-Topology Source Spell**

Not every arcana requires an enhancement mutation. The construction system must support source moves whose complete identity is already present in the base form.

---

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
