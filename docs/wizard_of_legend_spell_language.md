# Wizard of Legend spell construction language

Purpose: convert the user-provided all-arcana showcase and public Wizard of Legend reference data into a reusable spell-design vocabulary for this prototype. This is a documentation-only pass. It does **not** add arcana to the game.

Scope of this first pass:

- define a shared construction language for describing action spells;
- document ten mechanically representative arcana in enough detail to support a later implementation pass;
- identify what should be copied as a **design pattern** versus what should be changed for this game's combat, stamina, cards, weapons, and mobile readability;
- leave timing and tuning values explicit so future playtests can adjust them without changing a spell's identity.

The source names below are retained only so the reference can be checked against Wizard of Legend. Any public-facing implementation should use original names, visuals, audio, animations, and tuning.

## Evidence and confidence rules

Every future spell sheet should distinguish among these evidence levels:

- `documented`: explicitly stated in the Wizard of Legend community reference.
- `showcase-observed`: visible in the supplied 60 FPS showcase video.
- `frame-measured`: counted from video frame-by-frame.
- `inferred`: a strong behavioral inference that still needs direct testing.
- `adaptation`: a deliberate rule for this prototype rather than a claim about Wizard of Legend.

This pass uses documented and showcase-observed behavior. It does not claim exact startup, active, cancel, or recovery frames yet.

## Core idea

A spell should not be described as one opaque effect. It should be described as a composition of independently understandable behaviors:

```text
SPELL =
  INPUT CONTRACT
  + AIM RESOLVER
  + CASTER MOTION
  + EMITTER
  + PAYLOAD PATH
  + HIT SCHEDULE
  + TARGETING RULE
  + CONTROL RULE
  + DEFENSIVE RULE
  + LIFETIME / CLEANUP
  + RESOURCE RULE
  + UPGRADE REWRITE
  + FEEDBACK PACKAGE
```

This vocabulary should let future implementation work build many spells from a smaller library of reusable primitives instead of hard-coding every ability as a unique case.

---

# 1. Spell construction language

## 1.1 Input contract

The input contract determines what the player is committing to before any effect is spawned.

| Primitive | Meaning | Important questions |
|---|---|---|
| `tap-cast` | One press starts one complete cast. | Can it buffer? Can it be canceled? |
| `combo-cast(n)` | Repeated presses advance through an authored sequence. | Does the combo reset on delay, dodge, hit, or whiff? |
| `hold-repeat` | Holding repeats a basic sequence. | Does it repeat individual hits or full combos? |
| `hold-channel` | The spell remains active while held. | Can aim update continuously? What ends it? |
| `hold-charge` | Hold builds charge tiers, then release casts. | Are partial tiers useful or merely weaker? |
| `stock-release` | Charges accumulate, and one cast spends some or all of them. | Can the player release early? |
| `ammo-cast` | The spell stores discrete independent charges. | Do charges recover in parallel or sequentially? |
| `contact-gated` | The initial movement or projectile must connect before the main sequence occurs. | What is the miss behavior? |
| `reactivate` | A second press changes or detonates an existing spell. | Is reactivation optional or required? |
| `cooldown-fallback` | The movement/action still occurs on cooldown, but the magical payload does not. | Is the fallback clearly communicated? |

### Aim sampling

| Primitive | Meaning |
|---|---|
| `aim-snapshot` | Read the aim once when the cast begins. |
| `aim-at-release` | Read aim when a charge is released. |
| `aim-continuous` | Update aim during the cast. |
| `aim-per-emission` | Re-read aim before every projectile or strike. |
| `nearest-target` | Automatically select the closest valid enemy in range. |
| `first-contact` | The first enemy hit becomes the attached/captured target. |
| `cycle-nearby-targets` | Scripted hits jump among nearby enemies. |
| `return-anchor` | Save the starting position and return to it after the sequence. |

For this prototype, every spell sheet should state how right-stick aim, movement-facing aim, and soft aim assist interact. Aiming behavior is part of the spell, not a global afterthought.

## 1.2 Caster motion

| Primitive | Meaning |
|---|---|
| `root` | Caster stays in place for the committed section. |
| `free-move` | Normal movement remains available. |
| `lunge(distance)` | Short authored forward movement. |
| `dash(distance)` | Fast relocation, generally with a narrow path. |
| `forward-creep` | Slow forced advance while an attack continues. |
| `orbit-target` | Caster moves around a target during a scripted sequence. |
| `blink-between-targets` | Caster repeatedly relocates among selected enemies. |
| `leap` | Caster leaves the ground plane and lands later. |
| `recoil` | Caster moves away after firing or hitting. |
| `return-to-anchor` | Caster ends near the saved starting point. |
| `movement-replacement` | Normal movement is temporarily replaced by spell motion. |

Caster motion must declare its defensive state separately. Fast movement is not automatically invulnerability.

## 1.3 Emitters

An emitter decides where payloads originate and when they are created.

| Primitive | Meaning |
|---|---|
| `caster-emitter` | Spawn from the player. |
| `front-offset-emitter` | Spawn slightly in front to prevent self-overlap. |
| `path-emitter` | Spawn effects along the caster's traveled path. |
| `endpoint-emitter` | Spawn at the movement destination. |
| `ring-emitter(count)` | Spawn evenly around the player or target. |
| `fan-emitter(count, angle)` | Spawn across an angular spread. |
| `line-series(count, spacing)` | Spawn sequentially along a line. |
| `orbit-store(count)` | Create payloads that wait in orbit before acting. |
| `attached-emitter` | Keep the payload attached to the caster until a later phase. |
| `target-attached-emitter` | Attach the effect to the first valid target. |
| `continuous-emitter(rate)` | Emit repeatedly for a duration. |
| `per-basic-cast-emitter` | Trigger once for every basic-attack cast while a buff is active. |

## 1.4 Payload paths

| Primitive | Meaning |
|---|---|
| `straight` | Constant forward path. |
| `piercing-straight` | Continues through enemies. |
| `ballistic-bounce(n)` | Travels with ground bounces before expiring. |
| `wall-ricochet(n)` | Reflects from scenery. |
| `orbit-once` | Circles the caster one time. |
| `orbit-until-triggered` | Waits around the caster until a target is selected. |
| `seek-target` | Curves toward a target. |
| `returning` | Travels outward, then comes back. |
| `sweep-around-caster` | Large attached weapon or hitbox rotates around the player. |
| `drag-forward` | Projectile carries or pulls struck enemies with it. |
| `stationary-zone` | Payload remains at one location. |
| `moving-zone` | Persistent zone moves on an authored path. |
| `scripted-multi-target` | Payload/caster jumps among selected targets. |
| `attach-to-target` | Payload follows one enemy for its lifetime. |

## 1.5 Collision policy

| Primitive | Meaning |
|---|---|
| `stop-on-first-enemy` | Ends or changes phase on first enemy contact. |
| `pierce-enemies` | Continues through enemies. |
| `pierce-after-upgrade` | Base stops; enhanced version passes through. |
| `bounce-on-ground` | Uses authored bounces independent of targets. |
| `destroy-on-projectile` | Collides with and removes enemy projectiles. |
| `destroy-projectiles-without-consuming` | Defensive hitbox clears projectiles and remains active. |
| `ignore-scenery` | Continues through walls/props, if intentionally allowed. |
| `stop-on-scenery` | Ends on solid environment. |
| `attach-on-first-contact` | Converts the first collision into a target-bound effect. |
| `overlap-multihit` | Several spawned shapes may damage the same target. |

Every projectile-like spell needs explicit answers for enemies, walls, props, pits, doors, and enemy projectiles.

## 1.6 Hit schedule

A spell's feel often comes from how damage is distributed, not its total damage.

| Primitive | Meaning |
|---|---|
| `impact-hit` | Immediate contact damage. |
| `tick-hit(interval, count)` | Repeating damage during a duration. |
| `combo-hit(index)` | Authored hit in a basic sequence. |
| `multi-contact-per-pass` | One path can contact the same enemy more than once. |
| `finisher-hit` | Distinct final strike with stronger control or damage. |
| `endpoint-burst` | Area hit at the end of movement. |
| `detonation` | Delayed or reactivated explosion. |
| `overlap-payoff` | Multiple shapes can overlap for extra damage. |
| `status-only-hit` | Hit primarily exists to apply a status. |
| `per-target-cooldown` | One payload cannot hit the same target again until a short interval passes. |

Each hit should declare damage, stagger, knockback, hitstop, status, and whether it contributes to card/stance triggers.

## 1.7 Targeting and target memory

| Primitive | Meaning |
|---|---|
| `aim-ray` | Use cast direction without target assistance. |
| `soft-cone-select` | Select a target within a narrow cone near aim. |
| `nearest-in-radius` | Automatically choose nearest valid enemy. |
| `first-hit-lock` | Lock to the first collision target. |
| `retarget-on-loss` | Seek a new target if the current target dies or leaves range. |
| `retarget-per-shot` | Every emission can choose a different target. |
| `target-list-snapshot` | Build a list once at cast start. |
| `random-nearby-next` | Choose the next scripted strike from nearby valid targets. |
| `single-target-stackable` | Multiple instances may attach to the same enemy. |

## 1.8 Control rules

| Primitive | Meaning |
|---|---|
| `push` | Move the enemy away from the source. |
| `pull` | Move the enemy toward the source. |
| `drag` | Carry the enemy with a moving payload. |
| `launch` | Strong displacement with a distinct airborne/knockdown response. |
| `stun` | Prevent action for a fixed duration. |
| `capture` | Prevent movement/action while the effect remains attached. |
| `shock` | Repeating interruption/control status. |
| `burn` | Damage-over-time status. |
| `group` | Pull several enemies into a shared position. |
| `space-maker` | Final hit intentionally ejects enemies from the caster. |
| `position-lock` | Target cannot be moved by other attacks while controlled. |

For this game, control must integrate with the existing stagger policy: ordinary small hits should not automatically interrupt everything. Control spells should use explicit stun, capture, launch, or stagger rules.

## 1.9 Defensive rules

| Primitive | Meaning |
|---|---|
| `invulnerable-window` | Caster cannot take damage during a defined interval. |
| `evade-window` | Attacks miss, but other effects may still interact. |
| `super-armor` | Caster can take damage but is not interrupted. |
| `projectile-erase` | Spell removes enemy projectiles. |
| `body-shield` | Payload physically occupies a protective orbit or wall. |
| `space-control-defense` | Defense comes from pushing/pulling enemies rather than damage reduction. |
| `miss-vulnerability` | A failed contact-gated cast creates a punishable recovery. |

Defensive value should be visible and active. This aligns with the project's preference that defense prevents mistakes instead of merely adding passive durability.

## 1.10 Lifetime, cleanup, and ownership

Every spell needs explicit cleanup rules:

- maximum lifetime;
- whether it ends on enemy hit, wall hit, bounce count, owner death, room transition, target death, or manual cancel;
- maximum simultaneous instances;
- what happens when a target becomes invalid;
- whether recasting replaces, stacks, refreshes, or adds another instance;
- whether cooldown begins at cast start, payload end, buff end, throw phase, or charge consumption.

Cooldown start is part of the spell's behavior. It changes how long the player is actually waiting after control returns.

## 1.11 Upgrade grammar

Upgrades should preferably rewrite the spell's topology rather than only multiply damage.

### Parameter upgrades

- more range;
- faster travel;
- larger radius;
- more charges;
- longer lifetime;
- more ticks.

### Topology upgrades

- one projectile becomes two opposite projectiles;
- a trail gains an endpoint explosion;
- a projectile gains piercing;
- a temporary buff gains an activation burst;
- sequential strikes become simultaneous;
- an orbit stores more projectiles and lasts longer;
- a single zone becomes a line or wall of zones;
- a movement spell gains a return, detonation, or follow-up phase.

Topology changes are generally more valuable for this project because they are discrete, legible, and change how the player uses the move.

## 1.12 Feedback package

A mechanically correct spell can still feel wrong without readable feedback. Each spell sheet should specify:

- anticipation pose or tell;
- aim line/cone/landing marker, where needed;
- movement smear or trail;
- payload silhouette;
- contact flash;
- hitstop class;
- camera shake class;
- enemy control animation;
- status indicator;
- end-of-cast recovery cue;
- cooldown-ready cue;
- enhanced/signature visual difference;
- controller rumble class;
- audio layers: cast, travel, impact, status, finisher, cleanup.

Mobile readability takes priority over particle density. Major hitboxes and phase changes should remain legible in landscape phone play.

---

# 2. Standard spell sheet template

Use this template for future source spells and original abilities.

```text
NAME:
Source / inspiration:
Evidence:
Showcase timestamp:

PLAYER PROMISE
- One sentence describing what the move lets the player accomplish.

ROLE
- opener / extender / finisher / defense / mobility / control / setup / payoff
- preferred range
- commitment
- miss risk

INPUT CONTRACT
- trigger
- aim sampling
- charge/ammo/stock behavior
- cancel and buffer rules

CAST PHASES
1. Startup
2. Movement/setup
3. Main active sequence
4. Finisher or transformation
5. Recovery/cleanup

CONSTRUCTION RECIPE
- input:
- aim:
- caster motion:
- emitter:
- path:
- collision:
- hit schedule:
- targeting:
- control:
- defense:
- lifetime:
- resource/cooldown:
- upgrade rewrite:

TUNING VARIABLES
- named values that should be data-driven

FEEL PACKAGE
- anticipation
- travel
- hits
- finisher
- audio
- camera
- rumble

PROTOTYPE ADAPTATION
- what to preserve
- what to change
- interactions with weapons, stance cards, stamina, stagger, and touch/controller aim

ACCEPTANCE TESTS
- observable pass/fail behaviors for a future implementation
```

---

# 3. Representative arcana set

These ten were selected for mechanical coverage, not elemental balance. Together they exercise a useful first version of the construction language.

| Arcana | Main construction lesson | Showcase |
|---|---|---|
| Flame Cross | Basic combo with a geometry-changing finisher | ~00:06 |
| Bouncing Blaze | Long-range ballistic bounce and enhanced piercing | ~00:11 |
| Searing Rush | Dash fallback, path hazard, and enhanced endpoint burst | ~01:32 |
| Homing Flares | Orbiting ammunition with autonomous target release | ~04:40 |
| Dragon Arc | Passively stored charges released as an aimable barrage | ~05:12 |
| Whirling Tornado | Defensive stationary multihit zone with a charged placement rewrite | ~07:02 |
| Magnetic Follow-up | Temporary buff that adds payloads to every basic cast | ~09:36 |
| Hammer of Atlas | Multi-phase attached melee weapon, forward movement, throw, drag, and explosion | ~10:28 |
| Shock Assault | Contact-gated invulnerable dash into scripted multi-target strikes and return | ~14:00 |
| Water Prison | Ammo projectile that becomes a stackable target-attached capture and DoT | ~17:32 |

## 3.1 Flame Cross

Source reference: https://wizardoflegend.fandom.com/wiki/Flame_Cross

### Player promise

Fire quick piercing waves down a lane, then finish the basic combo with crossing waves that reward central alignment.

### Documented source behavior

- Fire Basic Arcana.
- Three-cast basic combo.
- First two casts fire one ground-traveling flame wave for 6 damage.
- Third cast fires two intersecting waves for 9 damage each and slightly more range.
- Both finisher waves can hit the same target, producing an overlap payoff.
- Enhanced version travels faster and farther.
- The sequence can be held to perform the full combo.

### Construction recipe

```text
input: combo-cast(3) + optional hold-repeat
aim: aim-per-emission
caster motion: root or very small attack step
emitter: front-offset-emitter
path: piercing-straight
collision: pierce-enemies + overlap-multihit
hit schedule:
  casts 1-2 -> one impact-hit
  cast 3 -> two angled impact-hits with overlap-payoff
control: light push; stronger finisher push
defense: lane pressure only
lifetime: expire by range or scenery rule
resource: basic/no normal cooldown
upgrade rewrite: increase travel speed and range
```

### Why it works

The first two casts teach a simple lane. The third cast changes the geometry rather than merely increasing damage. The crossing center creates a small positioning puzzle: line the target up with the intersection to earn both hits.

### Prototype adaptation

Preserve:

- readable three-step cadence;
- a finisher that changes geometry;
- piercing lane pressure;
- overlap reward.

Change:

- use original visuals and name;
- make the third attack's crossing point extremely readable on a phone;
- decide whether this belongs to an ability card or a temporary spell-stance basic;
- do not let its rapid multihits bypass the project's stagger policy.

Potential weapon interaction:

- horizontal weapon attacks could widen the crossing angle;
- thrust weapons could lengthen the two final lanes;
- chop follow-up on a center-overlap target could gain reliable stagger.

### Data-driven tuning variables

`combo_reset_time`, `wave_speed`, `wave_range`, `wave_width`, `finisher_angle`, `finisher_range_bonus`, `hit_damage`, `finisher_damage`, `finisher_overlap_policy`, `light_push`, `finisher_push`, `recovery_by_step`.

### Future acceptance tests

- Pressing three times produces one wave, one wave, then two crossing waves.
- The two finisher waves can independently hit one centrally aligned target.
- A target off to one side receives only the relevant finisher wave.
- Enhanced behavior changes speed/range without changing the three-step identity.
- The combo resets correctly after its timeout, dodge, weapon swap, or card interruption.

## 3.2 Bouncing Blaze

Source reference: https://wizardoflegend.fandom.com/wiki/Bouncing_Blaze

### Player promise

Throw large, easy-to-read fireballs that travel far through authored bounces and become crowd-clearing piercing shots when enhanced.

### Documented source behavior

- Fire Basic Arcana with projectile subtype.
- Each press throws one 12-damage fireball.
- Each fireball bounces twice and dissipates on the second bounce.
- Basic combo is three casts.
- Long effective range.
- Enhanced fireballs pass through enemies before dissipating.

### Construction recipe

```text
input: combo-cast(3) + optional hold-repeat
aim: aim-per-emission
caster motion: root or small recoil
emitter: front-offset-emitter
path: ballistic-bounce(2)
collision:
  base -> enemy contact without piercing
  enhanced -> pierce-enemies while bounce lifetime continues
hit schedule: one impact-hit per valid target contact
control: modest push
defense: ranged spacing
lifetime: bounce-count cleanup
resource: basic/no normal cooldown
upgrade rewrite: pierce-after-upgrade
```

### Why it works

The projectile's lifetime is authored by bounces rather than a generic timer. That gives it rhythm and makes long range visible. The enhanced version does not need a new animation; it changes collision topology and therefore changes target selection and room-clearing behavior.

### Prototype adaptation

Preserve:

- large readable projectile;
- discrete bounce count;
- long-range basic option;
- enhanced piercing.

Change:

- define whether bounces are ground pulses, wall ricochets, or authored hops in this game's top-down plane;
- avoid visually implying a wall ricochet if the logic is only timed ground bounces;
- add an impact shadow or ground marker so the path is legible on mobile.

Potential original variation:

- each bounce could alternate between horizontal and vertical attack tags;
- the final bounce could prime a stance-card timing window;
- heavy weapons could turn the last bounce into a small launch instead of granting more damage.

### Data-driven tuning variables

`projectile_speed`, `projectile_radius`, `bounce_count`, `bounce_interval`, `bounce_height_visual`, `max_range`, `damage`, `push`, `pierce_on_enhanced`, `per_target_hit_cooldown`, `recovery`.

### Future acceptance tests

- One cast always produces exactly the authored number of bounces.
- Cleanup occurs on the final bounce even when no enemy is hit.
- Enhanced shots can hit multiple enemies without losing the remaining bounce sequence.
- The projectile cannot repeatedly damage one target every frame while overlapping.
- Wall/door/pit behavior matches the declared collision policy.

## 3.3 Searing Rush

Source reference: https://wizardoflegend.fandom.com/wiki/Searing_Rush

### Player promise

Dash through danger and leave a temporary burning line behind; enhanced use turns accurate endpoint placement into an aggressive opener.

### Documented source behavior

- Fire Dash Arcana.
- Dash leaves a short-lived flame trail that burns enemies.
- Listed trail duration is approximately 0.35 seconds.
- Enhanced version adds an endpoint explosion that deals impact damage and applies burn.
- The dash can still be used while the arcana is on cooldown, but no flame trail is created.
- The flame trail can block enemy projectiles.
- Cooldown is documented as 5.5 seconds.

### Construction recipe

```text
input: tap-cast + cooldown-fallback
aim: movement direction or explicit dash aim
caster motion: dash(distance)
emitter:
  path-emitter during active magical use
  endpoint-emitter when enhanced
path: stationary-zone segments laid along dash path
collision: projectile-erase on trail, if retained
hit schedule:
  trail -> burn/status contact
  enhanced endpoint -> endpoint-burst + burn
control: endpoint knockback/stun on enhanced version
defense: relocation + temporary projectile-denial line
lifetime: trail segments expire rapidly
resource: cooldown governs payload, not locomotion
upgrade rewrite: add endpoint-burst
```

### Why it works

The spell separates movement availability from magical availability. The player never loses the basic dash, but the damaging/defensive trail is a timed reward. Enhanced behavior also flips the optimal use: the base trail is naturally good while retreating, while the endpoint explosion rewards dashing toward a carefully chosen location.

### Prototype adaptation

This pattern is highly compatible with the game's active-defense direction.

Preserve:

- dash remains usable while payload is unavailable;
- retreat line versus aggressive endpoint decision;
- clear enhanced topology change.

Change:

- use the Warden's established backward/directional slide behavior rather than importing Wizard of Legend's dash animation;
- decide whether the trail destroys projectiles, weakens them, or only blocks specific projectile classes;
- avoid free passive damage from repeatedly crossing stationary targets; use a per-target trail cooldown.

Potential stance interaction:

- a knife/light stance could make the trail curved by allowing aim steering;
- a shield stance could trade endpoint damage for a wider projectile-blocking wake;
- Exhaustion Catch timing could restore only the magical payload, not the movement fallback.

### Data-driven tuning variables

`dash_distance`, `dash_duration`, `payload_cooldown`, `trail_spacing`, `trail_width`, `trail_lifetime`, `burn_ticks`, `projectile_block_classes`, `endpoint_radius`, `endpoint_damage`, `endpoint_stun`, `per_target_trail_cooldown`.

### Future acceptance tests

- Dash movement works both on and off payload cooldown.
- On cooldown, no trail, burn, projectile blocking, or endpoint burst occurs.
- Active trail appears continuously enough that enemies cannot slip through visual gaps.
- Enhanced endpoint burst occurs only at the destination and is separately readable.
- Trail ownership and cleanup work across room transitions and player defeat.

## 3.4 Homing Flares

Source reference: https://wizardoflegend.fandom.com/wiki/Homing_Flares

### Player promise

Preload a halo of autonomous fireballs, then move and fight while the stored projectiles protect space and fire at nearby enemies.

### Documented source behavior

- Fire Signature Arcana.
- Creates 7 fireballs orbiting clockwise for 4 seconds.
- Each fireball targets the nearest enemy in range and deals 7 damage.
- Enhanced version creates 10 and lasts 5 seconds.
- Charged Signature continuously creates fireballs for 4 seconds, up to 32 total; the first ring of 10 deals double damage.
- Orbiting flares can collide with enemy projectiles, consuming themselves.

### Construction recipe

```text
input: tap-cast; charged-signature variant
aim: nearest-target + retarget-per-shot
caster motion: free-move
emitter: orbit-store(7)
path:
  waiting -> orbit-until-triggered
  firing -> seek-target
collision:
  enemy hit -> consume flare
  projectile hit -> destroy both, if retained
hit schedule: one impact-hit per flare
control: noticeable push from repeated autonomous hits
defense: body-shield + autonomous interception
lifetime: individual flare fires, is destroyed, or expires with halo duration
resource: cooldown at cast; maximum simultaneous halo rules required
upgrade rewrite: more stored flares + longer lifetime
charged rewrite: continuous-emitter feeding the orbit store
```

### Why it works

The cast separates setup time from execution time. The player spends one action to create future actions. It is simultaneously offense, soft defense, and mental-load reduction because it can fire while the player focuses on movement or another combo.

### Prototype adaptation

Preserve:

- visible inventory of remaining orbiting shots;
- autonomous nearest-target release;
- projectile interception that consumes ammunition;
- setup-then-act rhythm.

Change:

- keep flare count low enough to read on a phone;
- use strong spacing and silhouettes rather than particle noise;
- impose a target acquisition radius and fire cadence so all stored shots do not dump instantly into the nearest minor enemy;
- define whether soft aim preference can bias auto-targeting.

Potential timeline/card role:

- excellent candidate for a long timeline block that creates a temporary parallel attack system;
- could trigger one stored shot on each weapon hit rather than pure time-based auto-fire;
- an upgrade could choose between defensive interception and offensive target seeking.

### Data-driven tuning variables

`stored_count`, `orbit_radius`, `orbit_speed`, `duration`, `acquire_radius`, `fire_interval`, `projectile_speed`, `turn_rate`, `damage`, `push`, `intercepts_projectiles`, `max_simultaneous_instances`, `charged_spawn_rate`, `charged_total_count`.

### Future acceptance tests

- Remaining ammunition is visually countable.
- Flares acquire only targets inside the declared radius.
- Every flare is consumed exactly once by firing, interception, or expiry.
- Target death before impact follows the declared retarget or miss rule.
- Multiple halos obey the simultaneous-instance cap.
- Enhanced and charged states are immediately distinguishable.

## 3.5 Dragon Arc

Source reference: https://wizardoflegend.fandom.com/wiki/Dragon_Arc

### Player promise

Bank power passively, then release the entire stored stock as a long, piercing barrage whose aim can be swept during the cast.

### Documented source behavior

- Fire Standard/Signature Arcana with projectile and dragon subtypes.
- Passively builds up to 8 charges.
- Documented recharge is 0.6 seconds per charge.
- Casting spends all available charges; each charge releases one piercing dragon for 8 damage.
- The cast can be used with any number of stored charges.
- Aim can be adjusted during the barrage.
- Enhanced version stores up to 10 and spends/releases two at a time.
- Charged Signature fires a rapid wide barrage of 20 dragons.

### Construction recipe

```text
input: stock-release
aim: aim-per-emission or aim-continuous during barrage
caster motion: rooted or limited movement during emission
emitter: continuous-emitter driven by current stock
path: piercing-straight with wide projectile body
collision: pierce-enemies
hit schedule: one impact-hit per dragon per target
control: medium push
defense: pressure through range; no assumed invulnerability
lifetime: each dragon expires by range/scenery
resource: passive stock meter, cast spends all current stock
upgrade rewrite:
  increase max stock
  emit two stock units simultaneously to shorten commitment
charged rewrite: authored 20-projectile wide barrage
```

### Why it works

The power curve is not a conventional cooldown. Waiting changes both damage and commitment length. Releasing early gives a quick low-risk cast; releasing at full stock gives stronger lane control but exposes the caster for longer. Enhanced behavior improves both capacity and safety by compressing emission time.

### Prototype adaptation

This is a strong model for card cooldowns that begin on draw or for the proposed looping timeline.

Possible translation:

- the card accumulates visible pips while sitting in the tray;
- pressing it spends all pips;
- every pip adds one projectile and a small amount of cast commitment;
- enhancements can increase maximum pips or release several pips per emission.

Weapon interaction:

- thrust follow-up aligns enemies for piercing;
- horizontal attacks can widen the barrage;
- a heavy chop could spend remaining pips in one large final projectile.

### Data-driven tuning variables

`max_stock`, `stock_interval`, `stock_spent_per_emission`, `emission_interval`, `projectile_width`, `projectile_speed`, `range`, `damage`, `push`, `aim_turn_rate`, `movement_allowed`, `recovery_after_last_emission`.

### Future acceptance tests

- Stock visibly increases to a hard cap.
- The spell can fire at partial stock.
- A cast spends exactly the stock present when the cast begins, unless intentionally allowing new stock mid-cast.
- Aim updates during the sequence without snapping unpredictably.
- Enhanced simultaneous release shortens full-stock commitment.
- Piercing uses a per-target rule and does not multi-hit one target every frame.

## 3.6 Whirling Tornado

Source reference: https://wizardoflegend.fandom.com/wiki/Whirling_Tornado

### Player promise

Create immediate breathing room with a projectile-clearing multihit vortex, then eject nearby enemies with a strong final blast.

### Documented source behavior

- Air Signature Arcana.
- Creates a large stationary vortex around the caster.
- Vortex blocks/destroys projectiles.
- Base deals up to four 8-damage ticks, then a 10-damage final blast with strong push.
- Enhanced version lasts longer and can deal up to six 8-damage ticks before the final blast.
- Charged Signature creates a line of five overlapping vortexes.
- The charged placement can be curved or turned into a wall by changing aim during creation.

### Construction recipe

```text
input: tap-cast; charged-signature variant
aim:
  base -> none or aim-snapshot
  charged -> aim-continuous / aim-per-placement
caster motion: root during brief cast; zone remains stationary
emitter:
  base -> caster-emitter
  charged -> line-series(5, spacing) with aim steering
path: stationary-zone
collision: destroy-projectiles-without-consuming
hit schedule: repeated tick-hits + finisher-hit
control:
  ticks -> tiny inward/holding force or low push
  finisher -> space-maker
defense: projectile-erase + surrounding melee control
lifetime: fixed short duration, then finisher and cleanup
resource: cooldown begins at declared cast phase
upgrade rewrite: increase tick count/duration
charged rewrite: one personal zone becomes five placed overlapping zones
```

### Why it works

The move is defensive without becoming passive armor. It solves two immediate threats—projectile density and nearby melee pressure—through active timing. The final knockback also ends the protected period by deliberately resetting spacing.

### Prototype adaptation

This matches the project's active-defense preference particularly well.

Preserve:

- fast emergency activation;
- projectile erase;
- repeated close control;
- final space-making blast;
- charged topology that turns self-defense into placed battlefield control.

Change:

- do not let every tick cause full stagger;
- use one explicit control state while inside the vortex;
- ensure large enemies and bosses have readable resistance rules;
- the charged steering should be constrained enough for controller and touch use.

Potential stance interaction:

- shield stance: stronger projectile erase, weaker final push;
- knife stance: shorter vortex, but dodge-cancel after any tick;
- heavy stance: fewer ticks, massive final launch.

### Data-driven tuning variables

`radius`, `duration`, `tick_interval`, `tick_count`, `tick_damage`, `tick_control_force`, `finisher_damage`, `finisher_push`, `projectile_classes_erased`, `startup`, `recovery`, `charged_zone_count`, `charged_spacing`, `charged_turn_rate`.

### Future acceptance tests

- Projectiles entering the active zone are removed according to class rules.
- Enemies receive only the authored number of ticks.
- The final blast happens once and is visually/audibly distinct.
- Bosses resist movement without ignoring damage or feedback.
- Charged placement can form a line, curve, or wall without spawning zones on top of invalid scenery.

## 3.7 Magnetic Follow-up

Source reference: https://wizardoflegend.fandom.com/wiki/Magnetic_Follow-up

### Player promise

Temporarily turn every basic attack cast into a hybrid attack that also throws a pair of low-damage stone projectiles.

### Documented source behavior

- Earth Standard Arcana with projectile and buff subtypes.
- Creates a 5-second aura.
- Every basic Arcana cast throws 2 forward stones.
- Each stone deals 3 damage with very low knockback.
- Cooldown begins after the active duration ends.
- Enhanced activation immediately throws a 16-stone ring that briefly stuns enemies.

### Construction recipe

```text
input: tap-cast buff
aim:
  buff payload -> inherit each basic cast's aim
  enhanced burst -> ring-emitter with no aim requirement
caster motion: free-move
emitter:
  active -> per-basic-cast-emitter, count 2
  enhanced activation -> ring-emitter(16)
path: straight
collision: standard projectile collision
hit schedule: low-damage impact-hits
targeting: inherited from basic cast
control:
  normal stones -> minimal push
  enhanced activation ring -> brief stun
defense: indirect; adds range to short basic attacks
lifetime: fixed buff duration
resource: cooldown starts when buff ends
upgrade rewrite: add activation burst with stun
```

### Why it works

This is not merely a damage buff. It rewrites another action. Its value changes dramatically depending on the selected basic spell's cadence, range, and combo structure. It therefore creates build identity and cross-card synergy.

### Prototype adaptation

This is one of the best direct references for the project's desired “hooks, not passives.”

Potential translations:

- while active, every weapon attack launches a stance-dependent shard;
- trigger once per authored attack, not once per collision or animation frame;
- light, medium, and heavy weapons could produce different shard patterns;
- stance cards could change the auxiliary projectile without replacing the buff.

Important guardrail:

- define the trigger unit as `basic cast`, `weapon swing`, or `landed hit`;
- never let multi-hit hitboxes recursively create projectiles;
- cap emissions per second for rapid or held basics.

Potential discrete upgrades:

- activation ring;
- stones return after reaching max range;
- every third basic fires a heavy boulder instead of two shards;
- vertical attacks send stones in a narrow line, horizontal attacks in a spread.

### Data-driven tuning variables

`buff_duration`, `cooldown_after_buff`, `emissions_per_basic`, `emission_cap_per_second`, `stone_speed`, `stone_range`, `stone_damage`, `stone_push`, `inherit_aim`, `activation_ring_count`, `activation_ring_stun`, `max_active_instances`.

### Future acceptance tests

- Exactly two auxiliary projectiles are emitted per qualifying basic cast.
- Multi-hit collisions do not create additional auxiliary projectiles.
- The buff timer and post-buff cooldown are separate and readable.
- Rapid basics respect the emission cap.
- Enhanced activation ring fires once, independently of the later per-basic triggers.
- Changing weapon or stance during the buff follows an explicit inheritance rule.

## 3.8 Hammer of Atlas

Source reference: https://wizardoflegend.fandom.com/wiki/Hammer_of_Atlas

### Player promise

Advance behind a huge rotating hammer that clears nearby threats and projectiles, then hurl it to drag enemies forward before a violent detonation.

### Documented source behavior

- Earth Signature Arcana with melee, projectile, and movement subtypes.
- Caster moves forward while swinging a large stone hammer.
- Base spin can deal up to five 12-damage hits.
- The spinning hammer destroys projectiles.
- Hammer is then thrown in the current aim direction.
- Thrown hammer drags enemies and can deal up to two 5-damage hits.
- It then explodes for 25 damage.
- Enhanced version is larger and deals six spin hits.
- Charged Signature spins faster and increases damage.
- Cooldown begins when the hammer is thrown.

### Cast phases

1. **Manifest/startup** — attached hammer appears.
2. **Attached sweep** — hammer rotates while caster creeps forward.
3. **Detach/throw** — current aim is sampled and hammer becomes a projectile.
4. **Drag travel** — struck enemies move with the hammer.
5. **Endpoint detonation** — strong burst and cleanup.
6. **Recovery** — control returns after the authored finish.

### Construction recipe

```text
input: tap-cast
aim:
  sweep -> caster facing / steerable movement
  throw -> aim-at-release
caster motion: forward-creep during sweep
emitter: attached-emitter -> detach into front-offset-emitter
path:
  phase 1 -> sweep-around-caster
  phase 2 -> drag-forward
collision:
  sweep -> destroy-projectiles-without-consuming
  throw -> carry valid enemies
hit schedule:
  sweep -> multi-tick contacts with per-target interval
  throw -> up to two travel contacts
  end -> detonation
control:
  sweep -> keep-away
  throw -> drag
  detonation -> heavy push/launch
defense: projectile-erase + moving body shield
lifetime: phase-driven; cooldown begins at throw
resource: standard cooldown
upgrade rewrite: larger sweep and one additional spin hit
charged rewrite: faster spin and stronger hit package
```

### Why it works

This is a complete miniature sequence rather than one hitbox. Each phase solves a different problem:

- attached spin protects and advances;
- throw converts defense into directional control;
- drag groups enemies at a chosen endpoint;
- explosion cashes out the setup.

The cooldown timing also matters: it does not begin until the throw, so the long protective opening is paid for with real post-cast downtime.

### Prototype adaptation

This should be treated as a high-commitment ability, not as a normal hammer basic.

Preserve:

- phase change from attached weapon to projectile;
- active projectile defense;
- slow forward advance;
- aim-at-throw;
- drag into endpoint finisher.

Change:

- use original weapon silhouette and effects;
- respect the game's weapon-weight and stance rules;
- make area/jump attacks an intentional vulnerability instead of hidden inconsistency;
- consider allowing a stance-card cancel only after the throw, not during the protected sweep.

Potential original version:

- a spectral siege head mounted on a chain;
- first phase rotates close, second phase launches on chain, third phase retracts or detonates;
- heavy weapon equipped: larger sweep but slower advance;
- light weapon equipped: smaller hammer, faster turn and early throw option.

### Data-driven tuning variables

`sweep_radius`, `sweep_angular_speed`, `sweep_duration`, `sweep_hit_count_cap`, `sweep_damage`, `per_target_sweep_interval`, `forward_speed`, `projectile_erase_classes`, `throw_speed`, `throw_range`, `drag_targets_max`, `drag_strength`, `travel_hit_count`, `detonation_radius`, `detonation_damage`, `detonation_launch`, `cooldown_start_phase`, `recovery`.

### Future acceptance tests

- Spin, throw, drag, and detonation are distinct phases.
- Projectiles are erased only by the hammer body, not an unexplained full-screen shield.
- One enemy cannot receive unlimited spin hits.
- Throw direction uses the declared aim sampling moment.
- Dragged enemies remain collision-safe and do not clip through invalid walls or pits.
- Cooldown starts at the throw phase.
- Interruption before throw follows an explicit cooldown and cleanup rule.

## 3.9 Shock Assault

Source reference: https://wizardoflegend.fandom.com/wiki/Shock_Assault

### Player promise

Commit to a precise lightning dash; on contact, become temporarily untouchable while rapidly striking nearby enemies, then return near the starting position.

### Documented source behavior

- Lightning Signature Arcana with melee and movement subtypes.
- Initial dash is invulnerable.
- If the dash connects, base version performs 5 strikes; enhanced performs 7.
- Strikes deal 5 damage and apply shock.
- Sequence can jump among nearby enemies.
- Caster returns near the initial position after a successful sequence.
- Charged Signature performs 31 rapid hits.
- Cooldown begins as soon as cast; the successful attack animation lasts about one second.
- Missing wastes the cooldown and leaves the player exposed.

### Construction recipe

```text
input: tap-cast + contact-gated
aim: aim-snapshot for initial dash
caster motion:
  phase 1 -> dash
  phase 2 -> blink-between-targets
  phase 3 -> return-to-anchor
emitter: caster-body melee strikes or strike-at-target emitters
path: scripted-multi-target
collision: stop/convert on first valid dash contact
hit schedule: fixed strike count + shock application
targeting:
  first dash target
  then random-nearby-next or deterministic nearby cycle
control: shock across one or several enemies
defense: invulnerable-window during successful scripted sequence
miss rule: miss-vulnerability + cooldown consumed
lifetime: fixed strike count, then return and cleanup
resource: cooldown starts at cast start
upgrade rewrite: increase strike count
charged rewrite: extreme strike-count version
```

### Why it works

The move's power is conditional. Correct aim buys damage, crowd control, and temporary safety. A miss creates an emotionally sharp failure because the player spends both position and cooldown. Returning to the start also makes it a “raid” into enemy space rather than a normal gap closer.

### Prototype adaptation

This is a strong high-skill active-defense spell, but needs careful safety rules.

Preserve:

- contact gate;
- strong hit/miss contrast;
- saved origin anchor;
- scripted multi-target sequence;
- return at completion.

Change:

- choose deterministic target ordering where possible so the player can learn it;
- do not use 31 hits in the prototype unless visual and performance tests justify it;
- prevent the return from dropping the player into a pit, wall, newly spawned hazard, or invalid room edge;
- clarify whether projectiles continue traveling during the sequence and can hit after return.

Potential original rule:

- first target is selected by the dash;
- subsequent strikes prioritize unstruck enemies, then return to the marked primary target;
- a stance card pressed during the final flash chooses “return to anchor” or “remain at final target.”

### Data-driven tuning variables

`dash_distance`, `dash_speed`, `dash_width`, `contact_grace`, `strike_count`, `strike_interval`, `strike_damage`, `shock_strength`, `target_search_radius`, `target_repeat_policy`, `invulnerability_start`, `invulnerability_end`, `return_offset`, `safe_return_search_radius`, `miss_recovery`, `hit_recovery`, `cooldown`.

### Future acceptance tests

- Missing never starts the strike sequence.
- Successful contact always saves and later resolves a safe return anchor.
- Strike count is exact and target ordering follows the declared rule.
- Invulnerability begins and ends on explicit phases.
- Enemies outside target radius are never selected.
- If all targets die early, the sequence ends cleanly and returns safely.
- The cast cannot strand the player across walls, pits, or closed doors.

## 3.10 Water Prison

Source reference: https://wizardoflegend.fandom.com/wiki/Water_Prison

### Player promise

Fire a precise single-target control projectile that locks the first enemy in place, deals damage over time, and can be stacked by spending additional ammo.

### Documented source behavior

- Water Standard Arcana with projectile subtype.
- Ammo-type spell with 2 base charges.
- Projectile attaches to the first enemy it hits.
- Deals 15 impact damage plus five 5-damage ticks, for 40 documented total.
- Prison lasts roughly 5–6 seconds.
- Captured enemies cannot move until it expires, with immunity/resistance exceptions.
- Effect ends when duration expires or target dies.
- Multiple prisons can stack on one target.
- Enhanced version grants one additional charge and faster projectile speed.
- Prison holds the target in place and prevents other attacks from moving it.

### Construction recipe

```text
input: ammo-cast
aim: aim-snapshot
caster motion: root or small recoil
emitter: front-offset-emitter
path: straight
collision: attach-on-first-contact
hit schedule:
  impact-hit
  tick-hit(interval, 5)
targeting: first-hit-lock + single-target-stackable
control: capture + position-lock
defense: removes one threat through active crowd control
lifetime: attached duration or target death
resource: independent ammo charges
upgrade rewrite: add ammo charge + increase projectile speed
```

### Why it works

This is a control spell first and a damage spell second. The position lock creates a clear tactical trade: the enemy cannot act or move, but the player also cannot push it into a pit or group it with other displacement effects. Stacking charges converts control ammunition into focused damage.

### Prototype adaptation

Preserve:

- first-target attachment;
- visible prison lifetime;
- discrete ammo charges;
- impact plus periodic ticks;
- position-lock tradeoff;
- explicit boss/elite resistance.

Change:

- captured normal enemies may need shorter duration in longer ARPG encounters;
- bosses should show a “held but resisting” state rather than silently ignoring the spell;
- avoid clutter from several fully opaque prisons stacked on one target;
- define whether attacks can break the prison as an original interaction.

Potential original discrete upgrades:

- breaking the prison with a chop creates a radial wave;
- thrusting the prisoner pins the prison to a wall;
- horizontal hits rotate the prison and strike nearby enemies;
- stance card timing at expiration converts the final tick into a pull or launch.

### Data-driven tuning variables

`ammo_max`, `ammo_recharge`, `projectile_speed`, `projectile_radius`, `impact_damage`, `tick_damage`, `tick_count`, `tick_interval`, `capture_duration`, `elite_duration_multiplier`, `boss_control_rule`, `position_lock`, `stack_limit`, `stack_visual_policy`, `target_death_cleanup`.

### Future acceptance tests

- The projectile attaches only to the first valid enemy.
- Impact and exactly five periodic ticks are separately observable.
- Captured targets cannot move or be displaced when position lock is active.
- Multiple charges stack according to the declared limit without corrupting timers.
- Target death cleans every attached instance.
- Resistant enemies display a readable reduced-control result.
- Enhanced version changes ammo count and projectile speed, not hidden damage.

---

# 4. What these ten imply for a reusable ability framework

A later implementation pass should not start by creating ten isolated classes. These references imply a small set of shared systems.

## 4.1 Minimum reusable modules

1. **Cast controller**
   - tap, combo, charge, channel, ammo, and stock-release inputs;
   - input buffering and cancellation;
   - cooldown-start phase.

2. **Aim resolver**
   - snapshot, continuous, per-emission, nearest target, first-contact lock;
   - controller right stick, movement aim, touch aim, and soft assist.

3. **Phase sequencer**
   - named cast phases;
   - transitions on time, contact, stock depletion, target death, or reactivation;
   - phase-specific movement, defense, and cooldown events.

4. **Caster motion driver**
   - dash, lunge, forward creep, scripted target jumps, safe return anchor.

5. **Emitter library**
   - front, path, endpoint, ring, fan, line series, orbit storage, attached, target-attached, per-basic trigger.

6. **Projectile/path library**
   - straight, piercing, bouncing, seeking, orbiting, sweeping, dragging, stationary zone.

7. **Hit schedule**
   - per-target hit cooldowns;
   - tick counts;
   - overlap policy;
   - finisher events;
   - status and stagger rules.

8. **Control resolver**
   - push, pull, drag, launch, capture, position lock, shock, burn;
   - boss/elite resistance and super-armor integration.

9. **Defense resolver**
   - invulnerability, evade, super armor, projectile erase, body shield;
   - phase-specific defense.

10. **Lifetime/cleanup manager**
    - room transitions, invalid targets, owner defeat, stack caps, instance replacement.

11. **Modifier hooks**
    - on basic cast;
    - on weapon attack;
    - on landed hit;
    - on stance play;
    - on dodge;
    - on spell phase transition;
    - on projectile erased.

12. **Feedback descriptors**
    - anticipation, active silhouette, impact class, finisher class, status icon, camera/rumble/audio cues.

## 4.2 Recommended prototype implementation order

When the project moves from research to implementation, build vertical slices in this order:

### Slice A: clean projectile grammar

- Flame Cross
- Bouncing Blaze
- Water Prison

This tests combo emissions, piercing/overlap, bounce lifetime, first-contact attachment, ammo, ticks, and cleanup.

### Slice B: movement and phase grammar

- Searing Rush
- Shock Assault
- Hammer of Atlas

This tests dash fallback, path emitters, contact gating, anchor return, forward creep, attached-to-detached payload transitions, dragging, and safe movement.

### Slice C: parallel and systemic effects

- Homing Flares
- Dragon Arc
- Magnetic Follow-up
- Whirling Tornado

This tests orbit storage, auto-targeting, passive stock, cross-action trigger hooks, projectile erase, tick zones, and signature topology rewrites.

Do not attempt final damage balance during these slices. First verify that the spell's decisions, phases, and failure cases feel correct.

---

# 5. Playtest questions for the later implementation pass

For every prototype spell, Ryan should be able to answer:

- Can I explain the move's purpose after one use?
- Is its danger area readable on the phone?
- Can I tell which phase I am in?
- Does hitting feel materially different from missing?
- Does the upgrade make me use it differently?
- Does the move create a decision, or is it merely free damage?
- Does it interact cleanly with my weapon and stance?
- Does it respect the game's non-regenerating stamina rules?
- Does it produce active defense rather than passive durability?
- Does it create excessive hit-stun or violate the chop-focused stagger direction?
- Can I aim it comfortably with a Backbone controller?
- Can I predict wall, pit, doorway, and room-edge behavior?
- Is the cooldown actually readable from the time control returns?
- Are there any effects that continue after the player thinks the spell is over?
- Would I still choose this spell if its raw damage were average?

---

# 6. Open verification work

A future research pass can improve these sheets with frame-level measurements from the supplied 60 FPS video:

- startup to first active frame;
- active duration;
- recovery to movement/attack;
- aim-lock frame;
- cancel windows;
- player travel distance measured against floor tiles;
- projectile speed and range;
- hit intervals;
- endpoint radius;
- knockback distance;
- exact enhanced and charged showcase boundaries.

Those values should be added as `frame-measured`, while the current documented/source behavior remains intact.

## Current source set

- User-provided 22:09 all-arcana showcase video, 1280×720 at 60 FPS.
- Wizard of Legend community arcana index: https://wizardoflegend.fandom.com/wiki/Arcana
- Individual arcana pages linked in each representative sheet.
