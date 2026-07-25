# Wizard of Legend spell construction language

Purpose: convert the user-provided all-arcana showcase and public Wizard of Legend reference data into a reusable spell-design vocabulary for this prototype. This branch also contains playable Enemy Lab source tests; detailed implementation specifications live beside this file.

Detailed source-test specifications currently available:

- `wizard_of_legend_flame_strike_spec.md`
- `wizard_of_legend_flame_cross_spec.md`
- `wizard_of_legend_bouncing_blaze_spec.md`

Scope of this first pass:

- define a shared construction language for describing action spells;
- document mechanically representative arcana in enough detail to support implementation and playtest passes;
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

This pass uses documented and showcase-observed behavior. It does not claim exact startup, active, cancel, or recovery frames unless a dedicated spell specification explicitly labels a value as prototype timing.

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
| `chargeable-final-beat` | Only the designated combo finisher can transition into charge. | What input state is sampled when the final beat is reached? |
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
| `caster-anchored-burst` | Create a brief final footprint relative to the caster without spawning an independent traveling payload. |
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
| `none` | The hit footprint appears at the emitter and never becomes an independent moving object. |
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
| `immediate-area-query` | Resolve all valid targets in the authored footprint at emission time. |
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

Every projectile-like spell needs explicit answers for enemies, walls, props, pits, doors, and enemy projectiles. Caster-anchored bursts instead need explicit range, width, origin offset, and multi-target policy.

## 1.6 Hit schedule

A spell's feel often comes from how damage is distributed, not its total damage.

| Primitive | Meaning |
|---|---|
| `impact-hit` | Immediate contact damage. |
| `tick-hit(interval, count)` | Repeating damage during a duration. |
| `combo-hit(index)` | Authored hit in a basic sequence. |
| `scaling-repeat-string` | Repeated action family whose final beat receives larger values. |
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
| `vulnerable-charge` | Charging grants no invulnerability or armor; the enlarged payoff is purchased with exposure. |

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
- a movement spell gains a return, detonation, or follow-up phase;
- a charged finisher gains burn or projectile destruction while ordinary beats remain unchanged.

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

The original ten-spell reference set was selected for mechanical coverage rather than elemental balance. The playable Enemy Lab sample now also includes Flame Strike as the first explicit `caster-anchored-burst + scaling-repeat-string + chargeable-final-beat` implementation.

| Arcana | Main construction lesson | Showcase |
|---|---|---|
| Flame Strike | Caster-anchored repeat string with chargeable final beat | supplied first-ability interval |
| Flame Cross | Basic combo with a geometry-changing finisher | ~00:06 |
| Bouncing Blaze | Long-range authored ground bounces and enhanced piercing | ~00:11 |
| Searing Rush | Dash fallback, path hazard, and enhanced endpoint burst | ~01:32 |
| Homing Flares | Orbiting ammunition with autonomous target release | ~04:40 |
| Dragon Arc | Passively stored charges released as an aimable barrage | ~05:12 |
| Whirling Tornado | Defensive stationary multihit zone with a charged placement rewrite | ~07:02 |
| Magnetic Follow-up | Temporary buff that adds payloads to every basic cast | ~09:36 |
| Hammer of Atlas | Multi-phase attached melee weapon, forward movement, throw, drag, and explosion | ~10:28 |
| Shock Assault | Contact-gated invulnerable dash into scripted multi-target strikes and return | ~14:00 |
| Water Prison | Ammo projectile that becomes a stackable target-attached capture and DoT | ~17:32 |

For full Flame Strike behavior, timing, visuals, charge input, and acceptance criteria, use `wizard_of_legend_flame_strike_spec.md`.

For the original detailed entries below, source references and implementation notes remain unchanged from the earlier pass.
