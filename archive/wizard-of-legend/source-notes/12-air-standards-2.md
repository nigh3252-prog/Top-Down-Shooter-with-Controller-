# 61. Airborne Slam

## Concrete source form

### Evidence

**[VIDEO — approximately 438.0–442.0 seconds]**

Airborne Slam is a forward invulnerable jump that lands behind/near the target lane and releases a large directional wind blast. The base landing produces one strong 50-damage wave; enhancement adds two smaller vortices that continue carrying enemies forward.

**[DOCUMENTED]**

Airborne Slam is an Air Standard Arcana with melee, jump, and movement classifications and a 6-second cooldown. Landing releases a forward 50-damage blast that knocks enemies back and slows them. The caster cannot be damaged while airborne. Enhancement adds two 10-damage wind hits that carry targets farther. Charged Signature repeats back-and-forth jumps and waves. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Airborne_Slam))

## Exact source recipe

```text
AIRBORNE SLAM

Input structure:
Tap Standard cast with directional aim

Jump:
Resolve valid forward landing point
Enter airborne invulnerability
Traverse visible jump arc

Landing:
End invulnerability at ground contact
Create 1 large forward air blast
Deal 50 damage, strong forward knockback, and slow

Enhanced follow-through:
Create 2 smaller vortices rippling forward from impact
Each deals 10 damage and continues carrying targets away

Charged Signature:
Perform authored back-and-forth jump sequence
Create one air wave per landing
Keep each airborne/landing defense boundary explicit

Cooldown:
6 seconds
```

## Important distinction

The attack is landing-owned and forward-facing, not a radial aura throughout the jump. Enhancement adds a traveling two-hit follow-through after the 50-damage landing event.

## Source-faithful acceptance test

1. The caster visibly jumps to a valid forward point.
2. Invulnerability exists only during airborne phases.
3. Landing creates one forward 50-damage blast.
4. That blast knocks enemies away and slows them.
5. Enhancement creates exactly two 10-damage forward ripple hits.
6. Ripple force carries enemies farther along the route.
7. Charged form repeats readable back-and-forth jump/landing phases.
8. Cooldown is approximately 6 seconds.

## Units extracted from Airborne Slam

### **Invulnerable Forward Jump to Directional Landing Wave**

A validated jump route resolves into a forward effect rather than a generic radial impact.

### **Landing-to-Ripple Enhancement**

Enhancement adds two moving carry events after the base finisher.

---

# 62. Heroic Leap

## Concrete source form

### Evidence

**[VIDEO — approximately 442.0–446.0 seconds]**

Heroic Leap rushes forward, rises vertically at the endpoint, leaves a projectile-blocking vortex below, and optionally carries the first contacted enemy into a special high-damage landing.

**[DOCUMENTED]**

Heroic Leap is an Air Standard melee/jump/movement Arcana with a 6-second cooldown. Its ground vortex deals five 5-damage hits and blocks projectiles; ordinary landing deals 25 damage in a large radius. If the rush catches a knockback-susceptible enemy, that enemy is pulled airborne, excluded from vortex hits, and takes an additional 50 damage at landing. Enhancement raises landing damage to 40 and adds slow. The caster is invulnerable while airborne. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Heroic_Leap))

## Exact source recipe

```text
HEROIC LEAP

Input structure:
Tap Standard cast with directional aim

Rush:
Move forward and search for first carry-eligible enemy

Takeoff:
At rush endpoint enter airborne invulnerability
If eligible contact exists, attach/carry that target into air
Create stationary ground vortex below

Ground vortex:
Resolve exactly 5 hits of 5 damage
Destroy eligible hostile projectiles
Exclude carried target from vortex hits

Landing:
End invulnerability
Deal 25 radial damage (40 enhanced) and enhanced slow
If carrying target, deal separate 50-damage carried-target slam
Release target safely

Cooldown:
6 seconds
```

## Important distinction

The carried target follows a different damage route from enemies left on the ground. It must not receive five vortex hits plus the special 50 damage. Knockback-immune large/boss targets cannot be carried.

## Source-faithful acceptance test

1. The move rushes before taking off.
2. The caster is invulnerable only while airborne.
3. One ground vortex remains below takeoff and blocks projectiles.
4. Ground targets receive exactly five 5-damage vortex hits.
5. The first eligible rush target can be carried airborne.
6. A carried target is excluded from vortex damage.
7. Base landing deals 25 radial damage; enhanced deals 40 and slow.
8. Carried-target landing adds one 50-damage event.
9. Immune large/boss targets remain grounded.
10. Cooldown is approximately 6 seconds.

## Units extracted from Heroic Leap

### **Rush-to-Vertical Carry Conversion**

First eligible contact changes a jump into a single-target aerial grab.

### **Split Ground / Carried Damage Routes**

Grounded targets receive vortex hits while the carried target receives an exclusive slam payload.

### **Airborne Owner with Grounded Defensive Effect**

The caster leaves while a separate stationary vortex attacks and intercepts projectiles below.

---

# 63. Tearing Whirlwind

## Concrete source form

### Evidence

**[VIDEO — approximately 446.0–461.0 seconds]**

Tearing Whirlwind surrounds a freely moving caster with a one-second pull field. Enemies are dragged in the caster's wake through exactly eight ticks. Charged Signature first performs a room-scale pull, then creates a larger projectile-blocking mobile vortex.

**[DOCUMENTED]**

Tearing Whirlwind is an Air Signature melee/movement Arcana with a 5.25-second cooldown and 1-second base duration. It permits normal movement while dealing eight 4-damage pull hits. Enhancement increases movement speed and tick damage to 5. Charged Signature instantly pulls enemies from a large aura, then uses a larger, stronger moving whirlwind that blocks projectiles. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Tearing_Whirlwind))

## Exact source recipe

```text
TEARING WHIRLWIND

Input structure:
Tap Signature cast

Base:
Attach circular whirlwind to caster for 1 second
Allow normal directional movement
Do not allow ordinary movement to cross pits
Resolve exactly 8 hits per target
Deal 4 damage per hit and pull targets toward moving caster center

Enhanced:
Increase caster movement speed during action
Deal 5 damage for each of the same 8 hits

Charged Signature:
Create large instantaneous pull aura centered on caster
Then attach larger/stronger moving whirlwind
Destroy eligible hostile projectiles in visible charged volume

Cooldown:
5.25 seconds
```

## Important distinction

This is player-controlled movement with an attached pull volume, not a scripted dash. The caster can steer normally while enemies chase the moving center. Ordinary pit collision still applies unless another effect grants traversal.

## Source-faithful acceptance test

1. Base whirlwind remains attached to the caster for about 1 second.
2. The player retains normal steering during the action.
3. A continuously caught target receives exactly eight hits.
4. Base hits deal 4 damage and pull toward the moving center.
5. Normal movement cannot carry the caster over a pit.
6. Enhancement increases action movement speed and tick damage to 5.
7. Charged form begins with a substantially larger instant pull.
8. Charged moving vortex is larger and blocks eligible projectiles.
9. Cooldown is approximately 5.25 seconds.

## Units extracted from Tearing Whirlwind

### **Freely Steered Player-Attached Pull Field**

A bounded aura follows ordinary owner movement and continuously updates force toward the live center.

### **Room-Pull-to-Mobile-Vortex Signature**

Charged form separates an instantaneous acquisition event from a moving damage/defense phase.

---

# 64. Shearing Chain

## Concrete source form

### Evidence

**[VIDEO — approximately 461.0–472.0 seconds]**

Shearing Chain advances the caster while generating a sequence of wind slashes that continually push enemies ahead; one larger final slash resolves the route. Charged Signature replaces it with thirteen enormous rapid slashes and projectile clearing.

**[DOCUMENTED]**

Shearing Chain is an Air Signature melee/movement Arcana with a 6-second cooldown. Base form moves forward through six 7-damage slashes and a 15-damage final slash. Enhancement uses nine larger 7-damage slashes plus the finisher. Charged Signature creates thirteen enormous, increased-damage slashes; its final strike pushes enemies away, and the charged slashes destroy projectiles. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Shearing_Chain))

## Exact source recipe

```text
SHEARING CHAIN

Input structure:
Tap Signature cast with directional aim

Base:
Advance caster along validated forward route
Schedule exactly 6 wind slashes around forward attack space
Each deals 7 damage and pushes enemies along route
Resolve 1 larger final slash dealing 15 damage and stronger push

Enhanced:
Schedule exactly 9 larger preliminary slashes
Preserve one 15-damage finisher

Charged Signature:
Schedule exactly 13 enormous rapid slashes
Use increased charged damage
Destroy eligible projectiles in visible slash volumes
Reserve major enemy push for final strike

Cooldown:
6 seconds
```

## Important distinction

Caster advance and enemy push are synchronized so targets remain in the next slash. Charged form's projectile defense belongs to the visible enormous slashes and is not implied for the base chain.

## Source-faithful acceptance test

1. Base action advances the caster along aim.
2. It creates exactly six 7-damage preliminary slashes.
3. Push direction keeps enemies ahead of the advancing caster.
4. One larger 15-damage finisher completes the chain.
5. Enhanced form uses nine larger preliminary slashes plus finisher.
6. Charged Signature creates exactly thirteen enormous slashes.
7. Charged slash volumes destroy eligible projectiles.
8. Charged final strike owns the major push.
9. Cooldown is approximately 6 seconds.

## Units extracted from Shearing Chain

### **Movement-Synchronized Slash Conveyor**

Repeated attacks and caster motion share a forward frame so targets remain inside the authored chain.

### **High-Count Projectile-Clearing Charged Chain**

Charged form expands count and geometry while adding visible-volume interception.

---

# 65. Rushing Typhoon

## Concrete source form

### Evidence

**[VIDEO — approximately 472.0–476.0 seconds]**

Rushing Typhoon is a contact-gated forward kick. First contact launches the target, then attaches a lingering pulling wind mass to that target's new position.

**[DOCUMENTED]**

Rushing Typhoon is an Air Standard melee/movement Arcana with a 5.5-second cooldown. The opening kick deals 25 damage and strong knockback. On hit it creates a wind mass dealing seven 5-damage pull hits; enhancement extends that to ten hits. The mass can gather additional nearby enemies. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Rushing_Typhoon))

## Exact source recipe

```text
RUSHING TYPHOON

Input structure:
Tap Standard cast with directional aim

Approach:
Dash forward and search for first enemy contact
On miss, end without wind mass

On contact:
Deal 25 kick damage and strong forward knockback
Create tumbling wind mass at/attached to struck target
Base mass resolves exactly 7 hits of 5 damage
Enhanced mass resolves exactly 10 hits of 5 damage
Pull primary and nearby enemies toward mass center

Cooldown:
5.5 seconds
```

## Important distinction

The lingering mass is earned by contact and follows the struck enemy's displacement. It is not an unconditional endpoint zone created on a miss.

## Source-faithful acceptance test

1. The opening dash searches for first valid contact.
2. A miss creates no lingering wind mass.
3. Contact deals one 25-damage kick and strong forward knockback.
4. The wind mass appears with the struck target after launch.
5. Base mass deals exactly seven 5-damage pull hits.
6. Enhanced mass deals exactly ten such hits.
7. Nearby enemies are drawn toward the same mass.
8. Cooldown is approximately 5.5 seconds.

## Units extracted from Rushing Typhoon

### **Contact-Gated Target-Attached Aftereffect**

A movement hit creates a later control object only on successful collision.

### **Launched-Target Gathering Anchor**

The first enemy's displaced position becomes the center that draws in others.

---

# 66. Gale-force Alignment

## Concrete source form

### Evidence

**[VIDEO — approximately 476.0–480.0 seconds]**

Gale-force Alignment places a line of stationary small tornadoes extending away from the caster. Their repeated inward pulls arrange enemies along the line for piercing follow-ups.

**[DOCUMENTED]**

Gale-force Alignment is an Air Standard Arcana with a 6-second cooldown. Base form creates five tornadoes. Each deals rapid 3-damage pull hits: 12 for the nearest, 11 for the second and third, and 10 for the final two. Enhancement creates seven longer-lived tornadoes with hit counts 15, 14, 14, 13, 13, 12, 12. The tornadoes do not block projectiles. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Gale-force_Alignment))

## Exact source recipe

```text
GALE-FORCE ALIGNMENT

Input structure:
Tap Standard cast with aim snapshot

Base placement:
Place exactly 5 stationary tornado centers at increasing distances along aim line
Per-center hit ceilings: [12, 11, 11, 10, 10]

Enhanced placement:
Place exactly 7 centers along longer line
Per-center hit ceilings: [15, 14, 14, 13, 13, 12, 12]

Per tornado:
Deal 3 damage per authored hit
Pull enemies toward that tornado center
Use shared/declared overlap scheduling to prevent unintended frame damage
Do not destroy hostile projectiles

Cooldown:
6 seconds
```

## Important distinction

This is a line of separate stationary pull centers, not one moving gust. Different positions deliberately have different lifetimes/hit ceilings, and no form gains projectile blocking.

## Source-faithful acceptance test

1. Base form creates exactly five tornadoes in a straight aimed line.
2. Centers remain stationary after placement.
3. Base per-center hit ceilings are 12, 11, 11, 10, and 10.
4. Every authored hit deals 3 damage and pulls toward its local center.
5. The resulting force arranges enemies along the overall line.
6. Enhancement creates exactly seven longer-lived centers.
7. Enhanced ceilings are 15, 14, 14, 13, 13, 12, and 12.
8. Overlapping centers do not create frame-rate-dependent damage.
9. Hostile projectiles pass through unaffected.
10. Cooldown is approximately 6 seconds.

## Units extracted from Gale-force Alignment

### **Ordered Stationary Pull-Center Line**

Several local control fields share one aim axis but retain independent centers and schedules.

### **Position-Indexed Lifetime Schedule**

Near and far instances use explicit different hit ceilings to shape the overall alignment behavior.

