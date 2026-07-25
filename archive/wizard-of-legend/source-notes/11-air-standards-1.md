# 55. Evading Zephyr

## Concrete source form

### Evidence

**[VIDEO — approximately 402.0–407.0 seconds]**

Evading Zephyr is a conditional four-second defense buff. Its wind current guarantees evasion only while the caster is moving or actively performing a Basic Arcana.

The showcase explicitly labels and demonstrates the rule: attacks miss during movement and Basic attacks, while standing idle or occupying the gap between Basic combo actions leaves a vulnerability window. The buff adds no attack of its own.

**[DOCUMENTED]**

Evading Zephyr is an Air Standard buff with a 4-second duration and a 7-second cooldown that starts after the duration ends. During the buff, incoming attacks are evaded while the player is moving or casting a Basic Arcana. Enhancement also increases movement speed and permits walking over pits. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Evading_Zephyr))

## Exact source recipe

```text
EVADING ZEPHYR

Input structure:
Tap Standard activation

Buff:
Apply visible air current for 4 seconds
Every incoming attack queries conditional evade:
  true while caster has meaningful movement input/velocity
  true during explicit active Basic-Arcana phases
  false while idle
  false during gaps between Basic combo actions
Successful evade resolves normal evade feedback and no damage/status/knockback

Enhanced buff:
Increase movement speed
Permit movement over pit terrain while active
Before expiration over a pit, resolve safe warning/fall behavior under world rules

Cooldown:
Begin 7-second cooldown when active duration ends
```

## Important distinction

This is not four seconds of unconditional invulnerability. Evasion is recalculated from named movement and Basic-action state when each attack arrives. The enhanced pit permission also changes traversal, not merely collision visuals.

## Source-faithful acceptance test

1. The buff lasts approximately 4 seconds with readable wind feedback.
2. Incoming attacks miss while the caster is moving.
3. Incoming attacks miss during explicit active Basic-Arcana phases.
4. Standing idle remains vulnerable.
5. Gaps between Basic combo actions remain vulnerable.
6. Successful evasion prevents damage, status, and knockback.
7. The unenhanced form does not grant pit traversal or speed.
8. Enhancement increases movement speed and allows crossing pits.
9. Expiration does not leave the caster suspended over invalid terrain.
10. The 7-second cooldown begins after the buff ends.

## Units extracted from Evading Zephyr

### **State-Conditional Guaranteed Evasion**

Defense is granted by current movement/action state at hit resolution rather than by a blanket timer.

### **Post-Duration Cooldown Start**

The recharge window begins only after the full active promise is delivered.

### **Temporary Terrain-Permission Enhancement**

Enhancement changes navigation rules for a bounded window and therefore requires explicit expiry safety.

---

# 56. Spiraling Typhoon

## Concrete source form

### Evidence

**[VIDEO — approximately 407.0–418.0 seconds]**

Spiraling Typhoon creates a controllable whirlwind in front of the caster that traps enemies through repeated low-damage hits, then throws them away with one finisher.

The source sequence shows the whirlwind orbiting around the caster as aim changes, not traveling freely away. Captured enemies tumble inside its volume through eight base ticks. Enhanced form holds them longer for twelve ticks. Charged Signature creates five winds that converge into a dense two-second capture before release.

**[DOCUMENTED]**

Spiraling Typhoon is an Air Signature melee Arcana with a 5.5-second cooldown. Base form deals eight 5-damage hits and a 25-damage final throw. Enhancement deals twelve 5-damage hits before the same finisher and throws farther. Charged Signature converges five whirlwinds in front of the caster for about 2 seconds. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Spiraling_Typhoon))

## Exact source recipe

```text
SPIRALING TYPHOON

Input structure:
Tap Signature cast; live aim during active phase

Base:
Create 1 whirlwind at fixed radial offset from caster
Rotate offset around caster toward live aim
Pull/capture enemies inside volume
Resolve exactly 8 hits of 5 damage per target
Finish with exactly 1 hit of 25 damage and strong outward throw

Enhanced:
Extend active duration to resolve exactly 12 small hits
Increase final throw distance

Charged Signature:
Create exactly 5 whirlwinds at authored approach offsets
Converge them in front of caster
Maintain dense capture/tick region for about 2 seconds
Resolve one terminal release/throw

Cooldown:
5.5 seconds
```

## Important distinction

The base whirlwind is aim-positioned around the caster, not a forward projectile. Low-force ticks preserve capture; the final event alone owns major displacement.

## Source-faithful acceptance test

1. Base form creates one whirlwind at a controlled offset from the caster.
2. Live aim can move that offset around the caster.
3. Base capture resolves exactly eight 5-damage hits.
4. Small hits keep enemies trapped rather than ejecting them.
5. One 25-damage finisher throws enemies away.
6. Enhanced form resolves twelve small hits and a farther final throw.
7. Charged Signature creates exactly five converging winds.
8. Charged capture lasts approximately 2 seconds before release.
9. Hit schedules remain deterministic across overlapping targets.
10. Cooldown is approximately 5.5 seconds.

## Units extracted from Spiraling Typhoon

### **Live-Aim Orbital Control Volume**

Aim rotates a close effect around its owner instead of steering a free projectile.

### **Capture-Tick-to-Throw Sequence**

Repeated low-force hits preserve occupancy before one terminal displacement.

### **Five-Source Convergence Signature**

Charged form moves several independent winds into one dense control region.

---

# 57. Dragon Blast

## Concrete source form

### Evidence

**[VIDEO — approximately 418.0–420.0 seconds]**

Dragon Blast manifests a stationary wind-dragon head in front of the caster. It draws enemies inward through five hits, erases hostile projectiles in its footprint, then blasts enemies away and slows them.

The compact clip shows targets converging into the dragon mouth before the stronger outward burst. Enhanced form adds a second adjacent head, widening coverage rather than lengthening the sequence.

**[DOCUMENTED]**

Dragon Blast is an Air Standard dragon Arcana with a 5.5-second cooldown. It deals five 8-damage pull hits followed by one 24-damage blast with strong knockback and slow. Projectiles entering the area are destroyed. Enhancement creates a second head beside the first, approximately doubling area. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Dragon_Blast))

## Exact source recipe

```text
DRAGON BLAST

Input structure:
Tap Standard cast with aim snapshot

Base:
Place 1 stationary dragon-head volume in front of caster
Destroy eligible hostile projectiles entering visible area
Resolve exactly 5 pull hits per target
Deal 8 damage per pull hit
Pull enemies toward head center
Resolve exactly 1 final blast
Deal 24 damage, apply strong outward knockback and slow

Enhanced:
Place 2 adjacent dragon heads spanning a wider front
Coordinate overlapping heads under one per-target hit schedule
Preserve five pulls plus one finisher

Cooldown:
5.5 seconds
```

## Important distinction

The second enhanced head increases geometry; it must not silently double every hit on targets standing in the overlap. Projectile destruction belongs to the visible active head area.

## Source-faithful acceptance test

1. Base form places one dragon head directly in front of the caster.
2. It remains stationary for its short sequence.
3. A target receives exactly five 8-damage pull hits.
4. Pull hits move targets inward.
5. One 24-damage blast follows, knocking targets away and slowing them.
6. Hostile projectiles are destroyed only when entering the visible active area.
7. Enhancement creates two adjacent heads and wider coverage.
8. Overlap between heads does not unintentionally double the authored hit count.
9. Cooldown is approximately 5.5 seconds.

## Units extracted from Dragon Blast

### **Stationary Pull-and-Blast Mouth**

A forward control volume gathers through fixed ticks and reverses force on a terminal event.

### **Geometry-Only Twin-Head Enhancement**

An additional visual/effect body expands coverage while shared target hit ownership preserves balance.

### **Volume-Bound Projectile Erasure**

Defensive interception exactly matches the visible dragon-head footprint.

---

# 58. Whirling Tornado

## Concrete source form

### Evidence

**[VIDEO — approximately 420.0–430.0 seconds]**

Whirling Tornado is a short stationary protective vortex centered on the caster, followed by one space-making blast. Charged Signature instead lays five overlapping vortices along a steerable line.

The source sequence shows:

1. A broad vortex forms around the caster without traveling away.
2. Enemies inside receive four repeated base hits while remaining close.
3. Hostile projectiles entering the wind are destroyed.
4. A final blast creates the strong outward knockback.
5. Enhanced form extends the same stationary vortex to six repeated hits.
6. Charged Signature creates five separate overlapping vortices in sequence; aim movement can curve the chain or turn it into a wall.

**[DOCUMENTED]**

Whirling Tornado is an Air Signature Arcana with a 6-second cooldown. Base duration is about 0.8 seconds: four hits of 8 damage followed by a 10-damage final blast, for five hits total. Enhancement lasts about 1.2 seconds and uses six 8-damage hits plus the finisher. The vortex blocks projectiles.

Charged Signature places five overlapping vortices along the aimed route. Analog aim changes during placement can bend the route into an arc or a perpendicular wall. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Whirling_Tornado))

## Exact source recipe

```text
WHIRLING TORNADO

Input structure:
Tap Signature cast
Charged Signature rewrite with live aim

Base:
Create 1 stationary vortex centered on caster
Duration approximately 0.8 seconds
Destroy eligible hostile projectiles in visible vortex
Resolve exactly 4 hits of 8 damage per target
Use low/inward force during ticks
Resolve exactly 1 final 10-damage blast with strong outward knockback

Enhanced:
Extend duration to approximately 1.2 seconds
Resolve exactly 6 small hits plus the same finisher

Charged Signature:
Create exactly 5 overlapping stationary vortex instances
Place sequential centers using live aim direction
Allow aim curvature to form line, arc, or wall topology
Each instance uses declared overlap-safe target scheduling

Cooldown:
6 seconds
```

## Important distinction

The source base form is not a traveling pull zone. It is centered on the caster, lasts less than two seconds, blocks projectiles, and ends with a discrete blast.

This source-first analysis supersedes the current game prototype's traveling three-second circular zone. Do not polish that prototype; replace its ownership, duration, tick count, projectile defense, and charged topology.

## Source-faithful acceptance test

1. Base vortex remains centered on the caster instead of traveling independently.
2. Base duration is approximately 0.8 seconds.
3. Base resolves exactly four 8-damage ticks per overlapping target.
4. Ticks preserve targets near the caster.
5. The visible vortex destroys eligible hostile projectiles.
6. Exactly one 10-damage final blast applies strong outward knockback.
7. Enhanced duration is approximately 1.2 seconds with six small ticks plus finisher.
8. Charged Signature creates exactly five overlapping vortices.
9. Live aim can arrange the five centers as a line, curve, or wall.
10. Overlaps use explicit target scheduling rather than frame-rate damage.
11. Cooldown is approximately 6 seconds.
12. The current traveling-zone prototype does not count as source-first implementation completion.

## Units extracted from Whirling Tornado

### **Caster-Centered Protective Tick Vortex**

A short stationary body combines bounded damage with hostile projectile interception.

### **Tick-to-Space-Making Blast**

Low-force repeated hits hand off to one explicit outward finisher.

### **Live-Aim Five-Vortex Path Authoring**

Charged placement samples aim repeatedly so the player draws a line, arc, or wall of effects.

### **Legacy-to-Source-First Replacement Boundary**

Improved evidence replaces the traveling-zone approximation while retaining its implementation history.

---

# 59. Scales of Babylon

## Concrete source form

### Evidence

**[VIDEO — approximately 430.0–434.0 seconds]**

Scales of Babylon is a radial hit-confirm utility spell: the blast damages, slows, and throws enemies away, but cooldown reduction and player speed are awarded only if at least one enemy is struck.

The source shows a large circular gust centered on the caster, followed immediately by a visible mobility/cooldown benefit on successful contact.

**[DOCUMENTED]**

Scales of Babylon is an Air Standard Arcana with a 10-second cooldown. Its radial blast deals 25 damage, uses 50 knockback, and slows affected enemies. On at least one successful enemy hit, all currently active Arcana cooldowns are reduced by 3 seconds (5 enhanced) and player movement speed is increased for about 2 seconds. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Scales_of_Babylon))

## Exact source recipe

```text
SCALES OF BABYLON

Input structure:
Tap Standard cast

Blast:
Create 1 large radial air burst centered on caster
For each valid enemy: deal 25 damage, apply 50 knockback, apply slow
Record whether cast hit at least one enemy

On successful hit only:
Reduce every currently active Arcana cooldown by 3 seconds
Enhanced version reduces active cooldowns by 5 seconds
Clamp cooldowns at zero
Apply approximately 2-second player movement-speed buff

On miss:
Do not reduce cooldowns or grant speed

Own cooldown:
10 seconds, subject to the same declared cooldown-reduction system
```

## Important distinction

The utility reward is one cast-level hit-confirm, not a bonus repeated per enemy. Hitting five enemies still reduces cooldowns once. Only cooldowns already active at resolution are changed.

## Source-faithful acceptance test

1. One large radial gust is centered on the caster.
2. Each enemy receives one 25-damage hit, slow, and strong knockback.
3. A complete miss gives no cooldown or speed reward.
4. Any successful hit reduces all currently active cooldowns once by 3 seconds.
5. Hitting several enemies does not multiply the reduction.
6. Inactive/ready Arcana remain ready and cooldown values never become negative.
7. Enhancement changes the reduction to 5 seconds.
8. Successful contact grants a short player speed increase.
9. Base cooldown is approximately 10 seconds.

## Units extracted from Scales of Babylon

### **Cast-Level Multi-Target Hit Confirm**

Several collisions collapse into one Boolean success event for systemic rewards.

### **Active-Cooldown Batch Reduction**

One utility action safely subtracts time from every currently recharging ability.

### **Enemy Slow / Player Speed Exchange**

The radial hit simultaneously removes enemy mobility and grants brief owner mobility.

---

# 60. Mentis Imperium

## Concrete source form

### Evidence

**[VIDEO — approximately 434.0–438.0 seconds]**

Mentis Imperium is a precise short-range charm arrow that turns one ordinary enemy into a persistent temporary ally target-state.

The source sequence shows one cloudy arrow striking a target, after which that enemy ignores the caster and attacks nearby enemies. Only one target carries the control state; the spell is not an area confusion pulse.

**[DOCUMENTED]**

Mentis Imperium is an Air Standard projectile with a 6-second cooldown. The arrow deals 35 damage with 10 knockback and dissipates after a short range. A valid hit charms the enemy indefinitely, making it ignore the player and attack other enemies. Only one enemy can be charmed at a time; large enemies, minibosses, and Council members are immune. Enhancement increases the charmed enemy's movement speed and reduces delay between its attacks. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Mentis_Imperium))

## Exact source recipe

```text
MENTIS IMPERIUM

Input structure:
Tap Standard cast with aim snapshot

Arrow:
Launch 1 cloudy projectile along aim
Use short authored range
On first valid enemy contact: deal 35 damage, apply 10 knockback

Charm eligibility:
Reject large enemies, minibosses, Council members, and declared immune classes

On eligible hit:
Remove charm from previously charmed enemy, if any
Assign this enemy as sole charmed target
Change allegiance/targeting so it ignores player and attacks enemies
Keep player damage against charmed target valid
Exclude charmed target from friendly agents/seekers/autotarget attacks

Enhanced charm:
Increase charmed enemy movement speed
Reduce its delay between attacks

Cleanup:
Clear sole-charm reference on target death, room transition, or invalidation

Cooldown:
6 seconds
```

## Important distinction

Charm is an allegiance/target-selection rewrite, not a stun. The enemy continues using its own attacks and can still be damaged by the player. Recasting transfers the one allowed charm rather than accumulating an army.

## Source-faithful acceptance test

1. Casting launches one short-range precision arrow.
2. First contact deals one 35-damage event and 10 knockback.
3. A valid target stops selecting the player and attacks other enemies.
4. The charmed enemy continues using its native movement and attacks.
5. Only one enemy can remain charmed; a new success clears the previous charm.
6. Large enemies, minibosses, and bosses are not charmed.
7. The player can still damage the charmed enemy.
8. Friendly agents and automatic targeting do not select the charmed enemy.
9. Enhancement speeds the charmed enemy's movement and attack cadence.
10. Target death and room transition clear charm references safely.
11. Cooldown is approximately 6 seconds.

## Units extracted from Mentis Imperium

### **Sole-Target Persistent Allegiance Rewrite**

One bounded status changes combat relationships until replacement or cleanup.

### **Native-AI Enemy Ally**

The controlled unit keeps its authored attacks rather than becoming a generic summon.

### **Cross-System Friendly Target Exclusion**

Agents, seekers, and auto-target systems share the charm relationship rule.

### **Target-Class Charm Immunity**

Large and boss-class enemies return a readable immune result without corrupting the existing charm.

