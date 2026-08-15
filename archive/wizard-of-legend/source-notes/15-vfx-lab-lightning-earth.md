# 73. Terra Ring

## Concrete source form

### Evidence

**[VIDEO — supplied 60 FPS showcase, approximately 608–612 seconds]**

The base Terra Ring cast strikes the ground and sends a fan of earthen lanes outward from the caster. Each lane is independently staggered: a dark ground mark opens, a tunnel of rocks advances, and small sparks, dust, and scorch remain behind it. The lanes read as nine separate radial paths rather than one opaque circular hitbox.

**[DOCUMENTED]**

Terra Ring is an Earth Signature Arcana. Its documented base behavior tunnels spikes of earth outward from the player, dealing up to five hits of 15 damage. The enhanced and charged demonstrations are separate source branches and are not part of this base-form implementation. (https://wizardoflegend.fandom.com/wiki/Terra_Ring)

## Exact source recipe

```text
TERRA RING - BASE

input: tap cast
aim: caster-centered radial emission
emission: 9 independently jittered earth lanes
reach: 4.6 tiles
dig speed: 3.3 tiles per second
rock spacing: 0.30 tiles
contact: 15 damage, maximum 5 hits per target
control: 3.6 outward knockback along the lane
cooldown: 5.0 seconds
feedback: tunnel rocks, scorch, sparks, dust, and ground star
enhanced branch: all spikes at once, documented but disabled
charged branch: five ground strikes plus a final strike, documented but disabled
cleanup: source lane, rock, scorch, and spark pools release on completion/reset
```

The supplied source implementation is the authoritative renderer and choreography: `castTerraRing(false)`, `updateTerraRing`, `spawnRock`, `spawnScorch`, and `spawnSpark` are carried into the Enemy Lab source port without replacing the lane art with a second approximation.

## Source-faithful acceptance test

1. One base card cast creates nine independently readable radial lanes.
2. Lane origin, jitter, tunnel rocks, scorch, sparks, and dust remain caster-centered and source-shaped.
3. Lanes advance point-first to the source reach instead of becoming a full opaque ring.
4. A target can receive at most five 15-damage contact events from the base cast.
5. Contact knockback follows the lane's outward direction.
6. Enhanced and charged ground-strike branches remain disabled.
7. Reset, target death, and effect expiry release every pooled source object.
8. Arcana Size changes the visible lane and contact footprint while preserving damage, speed, timing, knockback, and cooldown.

## Units extracted from Terra Ring

### **Independent Radial Lane**

One authored lane owns its own emission time, rocks, scorch, contact cadence, and cleanup.

### **Tunnel Contact Schedule**

The moving tunnel is a carrier for discrete per-target contacts, not a frame-overlap field with unlimited damage.

---

# 74. Grasping Earth

## Concrete source form

### Evidence

**[VIDEO — supplied 60 FPS showcase, approximately 618–626 seconds]**

The caster holds an earthen sigil that grows while the input is held. On release, stone crags dispatch toward enemies inside the circle. Each crag becomes a large stone fist around its target: the target is visibly held, the fist squeezes through repeated pulses, and a final heavier crush closes the sequence.

**[DOCUMENTED]**

Grasping Earth is an Earth Standard Arcana. The base behavior deals 10 damage on crag impact, then five 3-damage fist ticks and one 25-damage finisher. The faster ten-tick enhanced branch and separate charged behavior remain documented but disabled. (https://wizardoflegend.fandom.com/wiki/Grasping_Earth)

## Exact source recipe

```text
GRASPING EARTH - BASE

input: vulnerable hold, automatic base release at the source hold cap
charge circle: 1.25-tile minimum radius, grows over 1.35 seconds
release: send source crags to valid targets in the circle
impact: 10 damage
capture: one stone fist per captured target; hold target in place
grip schedule: 5 ticks of 3 damage at 0.45-second gaps
finisher: one 25-damage crush
control: held target cannot leave the source fist
enhanced branch: 10 faster ticks, documented but disabled
cleanup: release held targets and return crag, fist, sigil, and particle pools
```

The supplied source functions are the authoritative effect: `beginGraspHold`, `updateGraspHold`, `releaseGrasp`, `updateGrasp`, `buildFist`, and `spawnFist` remain the visual and timing implementation. The game adapter supplies live target proxies and native stun/damage services at the source callbacks.

## Source-faithful acceptance test

1. Holding the base card displays a growing source sigil and does not damage enemies before release.
2. Release dispatches crags only to valid targets within the source circle.
3. Each valid crag applies one 10-damage impact and creates one visible stone fist.
4. A captured target is held for exactly five 3-damage grip ticks followed by one 25-damage finisher.
5. The enhanced ten-tick branch remains disabled.
6. Held targets are released on completion, reset, death, or room cleanup.
7. Arcana Size changes sigil, crag, and fist footprint without changing damage, hold timing, tick timing, control duration, or cooldown.

## Units extracted from Grasping Earth

### **Vulnerable Growth Hold**

The caster trades time and exposure for a larger source-owned capture radius.

### **Crag-to-Fist Handoff**

The dispatch carrier is separate from the target-attached fist, so impact, capture, repeated ticks, and release each remain readable phases.

---

# 75. Shock Nova

## Concrete source form

### Evidence

**[VIDEO — supplied 60 FPS showcase, approximately 808–814 seconds]**

The caster charges a jagged gold lightning wheel, then releases a bright broken rim and eight spokes around the player. The base wheel has a compact, caster-centered footprint and a short luminous discharge. Targets touched by the source wheel flash cyan and retain a visible shock state that later discharges.

**[DOCUMENTED]**

Shock Nova is a Lightning Signature Arcana. The source lab tuning for the base visual path is a 1.43-second charge, 2.10-tile radius, 0.70-second discharge, eight spokes, 0.12-second source tick rhythm, and 12 source contact damage. The wider/faster enhanced wheel and charged overlapping-circle branch remain documented but disabled. (https://wizardoflegend.fandom.com/wiki/Shock_Nova)

## Exact source recipe

```text
SHOCK NOVA - BASE

input: vulnerable charge, then source release
charge time: 1.43 seconds
emission: one jagged gold wheel with broken rim and 8 spokes
radius: 2.10 tiles
discharge duration: 0.70 seconds
source tick: 0.12 seconds
contact value: 12 damage
status: apply source shock stack and hold timer to valid contacts
cleanup: fade wheel, spokes, shock arcs, sparks, light, and source pools
enhanced branch: 0.90-second charge, 4.00-tile radius, 12 spokes, documented but disabled
charged branch: overlapping lightning circles, documented but disabled
```

The supplied `NovaCharge`, `ShockNova`, `applyShock`, `dischargeShock`, `ShockBurst`, `Ribbon`, and `Sparks` source routines are retained in the port. The adapter only maps their source dummy contacts to the native enemy and shock services.

## Source-faithful acceptance test

1. The base cast starts as a vulnerable source charge rather than an instant nova.
2. Full base charge takes 1.43 seconds before the wheel releases.
3. The release is one compact eight-spoke gold wheel with a 2.10-tile radius.
4. The source discharge lasts 0.70 seconds and preserves the 0.12-second source tick rhythm.
5. Valid contacts use the source 12-damage value and create visible shock state.
6. Shock discharge and source cleanup remain distinct from the wheel's initial contact.
7. Enhanced and charged lightning branches remain disabled.
8. Arcana Size changes the wheel, spokes, shock arcs, and collision footprint while preserving damage, charge, discharge timing, status duration, and cooldown.

## Units extracted from Shock Nova

### **Charged Wheel Release**

The charge phase communicates commitment; the release phase owns the radial collision and visual discharge.

### **Delayed Shock Ledger**

The target's source shock stack owns a later discharge instead of being folded into the wheel's initial damage event.

---

# 76. Star Bolt

## Concrete source form

### Evidence

**[VIDEO — supplied 60 FPS showcase, approximately 869–875 seconds]**

The caster releases a compact gold-and-stone star with a bright core, fast spin, and a short luminous trail. The source sequence shows repeated throws on a regular cadence; each star travels point-first along the aim line and creates a sharp contact flash before its shock state persists on the target.

**[DOCUMENTED]**

Star Bolt is a Lightning Standard projectile Arcana. The supplied source lab’s base Star Bolt uses a 0.13-second windup, speed 20, range 9, 0.75-second demonstration cadence, size 0.34, spin 34, and 8 source contact damage. The enhanced longer-shock branch remains documented but disabled. (https://wizardoflegend.fandom.com/wiki/Star_Bolt)

## Exact source recipe

```text
STAR BOLT - BASE

input: one source projectile per cast
windup: 0.13 seconds
carrier: compact spinning star, source size 0.34
flight speed: 20 tiles per second
maximum range: 9 tiles
spin: 34 radians per second
contact: one 8-damage hit, then source shock application
cadence reference: repeated source casts are spaced at 0.75 seconds
cleanup: contact, range expiry, or source lifetime
enhanced branch: longer shock duration, documented but disabled
```

The supplied `StarBolt`, `Bolt`, `Sparks`, `Flash`, `applyShock`, and source camera-facing ribbon routines are retained directly. The Enemy Lab card starts the source Star Bolt once; repeated source demonstrations remain separate casts at the authored cadence.

## Source-faithful acceptance test

1. One base card play creates one compact source Star Bolt after the 0.13-second windup.
2. The projectile travels point-first at the source speed and expires at the source range.
3. The carrier retains its spinning star silhouette, bright core, trail, sparks, and contact flash.
4. A valid target receives exactly one source 8-damage contact event.
5. The contact applies source shock without inventing a second ordinary hit.
6. Enhanced behavior remains documented but disabled.
7. Arcana Size changes star visuals and collision footprint while preserving damage, speed, range, windup, cadence, shock duration, and cooldown.

## Units extracted from Star Bolt

### **Single-Contact Projectile**

One star owns one valid contact and then resolves; repeated casts are separate source-owned instances.

### **Fast Shock Carrier**

The small visual body, bright trail, and delayed shock status make a single hit legible without turning it into a multi-hit beam.

---

# 77. Tectonic Drill

## Concrete source form

### Evidence

**[VFX LAB — supplied wizard-of-legend-earth-arcana.html]**

The source presents a point-first earthen auger: a tapered stone body and helical fins rotate as one moving carrier, with contact stars, flying slabs, dust, and a churned track behind it.

**[DOCUMENTED]**

Tectonic Drill is an Earth Signature movement carrier. The base source path uses bounded 10-damage contact events while the drill advances along the committed route. Its second charge and charged four-drill branch remain outside this base-form pass. (https://wizardoflegend.fandom.com/wiki/Tectonic_Drill)

## Exact source recipe

```text
input: tap Signature cast with aim snapshot
carrier: one point-first conical earthen drill
motion: authored forward route with rotating helical fins
contact: finite per-target cadence, 10 damage per event
control: carry or pin targets along the route
feedback: contact stars, slabs, dust, fading bore track
base scope: enhanced second charge and charged four-drill branch disabled
```

## Source-faithful acceptance test

1. One cast creates one readable conical auger, not a generic circular hitbox.
2. The drill points along the committed aim direction and advances point-first.
3. A target receives only the finite authored contact cadence.
4. Each resolved contact uses the documented 10-damage event.
5. Contact force carries or pins targets along the forward route.
6. Stars, slabs, dust, and the churned track communicate contact and aftermath.
7. Enhanced and charged branches remain disabled.

## Units extracted from Tectonic Drill

### **Moving Earth Carrier**

The auger owns source silhouette, route motion, contact cadence, and cleanup.

### **Churned Bore Aftermath**

Scorch, slabs, dust, and the fading track make the moving carrier's route readable.

---

# 78. Rock-Solid Tomahawk

## Concrete source form

### Evidence

**[VFX LAB — supplied wizard-of-legend-earth-arcana.html]**

The source presents a compact double-bitted stone tomahawk with an olive binding and a readable raise, spinning throw, and curved return. A small shadow, white impact star, rock chips, and dust sell the physical projectile.

**[DOCUMENTED]**

Rock-Solid Tomahawk is an Earth Standard returning projectile with one 15-damage contact per target. The enhanced double-throw rewrite remains outside this base-form pass. (https://wizardoflegend.fandom.com/wiki/Rock_Solid_Tomahawk)

## Exact source recipe

```text
input: tap Standard cast with aim snapshot
startup: raise one double-bitted stone tomahawk overhead
flight: throw outward, spin, resolve one 15-damage hit per target, then arc back
feedback: ground shadow, white impact star, stone chips, flight dust
base scope: enhanced double-throw branch disabled
```

## Source-faithful acceptance test

1. The cast creates a recognizable double-bitted stone axe with a short haft and binding.
2. The axe visibly raises before it leaves the caster.
3. Outbound and return travel follow one committed route and readable curve.
4. A target is damaged only once by one base cast.
5. The contact event deals 15 damage.
6. The impact star, stone chips, and dust do not hide the projectile.
7. The projectile returns and cleans up when it hits nothing.
8. The enhanced double-throw form remains disabled.

## Units extracted from Rock-Solid Tomahawk

### **Returning Stone Projectile**

One source-owned projectile controls raise, outbound flight, return, hit ledger, and cleanup.

### **Single-Impact Debris**

The impact star and stone chips are a distinct source contact package.

---

# 79. Aqua Vortex

## Concrete source form

### Evidence

**[VFX LAB — supplied wizard-of-legend-water source]**

The source opens around the caster rather than launching a traveling water bolt: six tapered hooked arms rotate on a log spiral, the inner wash brightens at contact, and the effect collapses into a low sheet and ripple.

**[DOCUMENTED]**

Aqua Vortex is a Water Standard caster-centered vortex. Its base source contract uses three timed 8-damage contact ticks and pulls valid targets toward the caster; extra charges and the enhanced ice burst remain outside this base-form pass. (https://wizardoflegend.fandom.com/wiki/Aqua_Vortex)

## Exact source recipe

```text
input: tap Standard cast centered on the player
volume: six tapered water arms on a rotating spiral
defense: destroy eligible hostile projectiles inside the source volume
hit schedule: exactly three timed per-target ticks, 8 damage per tick
control: pull valid targets toward the caster
end: collapse into a low water sheet and ripple
base scope: extra charges and enhanced ice burst disabled
```

## Source-faithful acceptance test

1. One cast opens around the player instead of becoming a traveling projectile.
2. Six distinct hooked arms remain readable as the spiral blooms and rotates.
3. Eligible hostile projectiles are erased only inside the visible source volume.
4. A target receives exactly three 8-damage base ticks.
5. The pull is source-owned and does not invent a finisher hit.
6. The low sheet and ripple close the sequence before cleanup.
7. Extra charges and enhanced branches remain disabled.

## Units extracted from Aqua Vortex

### **Caster-Centered Water Spiral**

The rotating six-arm carrier owns the visible defensive and damaging footprint.

### **Timed Pull Tick**

Each contact is a discrete source tick with bounded per-target ownership.

---

# 80. Aqua Breaker

## Concrete source form

### Evidence

**[VFX LAB — supplied wizard-of-legend-water source]**

The source shows a charge-and-release projectile: a compact coiled water body grows in front of the caster, a blue-to-green bar exposes charge state, and the released coil rolls forward before breaking into a broad fan.

**[DOCUMENTED]**

Aqua Breaker is a Water Standard charge/roll/finish sequence. The base source contract is one 15-damage entry event, bounded 10-damage pass events, and a 35-damage crash. Extra charges and enhanced branches remain outside this base-form pass. (https://wizardoflegend.fandom.com/wiki/Aqua_Breaker)

## Exact source recipe

```text
input: hold Standard cast to charge; release to travel
charge: grow a coiled water breaker in front of the caster with an explicit bar
travel: roll along the committed aim route
contact: one 15-damage entry hit plus bounded 10-damage pass events
control: carry or draw struck targets into the rolling body
finisher: endpoint breaks into a wide fan with one 35-damage crash
base scope: extra charges and enhanced branches disabled
```

## Source-faithful acceptance test

1. The cast begins with a visible coiled water body and readable charge bar.
2. The coil grows during charge without damaging enemies before release.
3. Release sends the coil along the committed route.
4. A target receives one 15-damage entry event and only bounded 10-damage pass events.
5. The rolling body carries or draws targets along its route.
6. The endpoint creates one larger crashing fan and one 35-damage finisher.
7. The finisher cannot fire twice.
8. Extra charges and enhanced branches remain disabled.

## Units extracted from Aqua Breaker

### **Charge-and-Release Projectile**

The source separates vulnerable charge, rolling carrier, contact schedule, and deluge finisher.

### **Rolling Water Coil**

The carrier owns target carry, bounded pass hits, endpoint timing, and cleanup.
