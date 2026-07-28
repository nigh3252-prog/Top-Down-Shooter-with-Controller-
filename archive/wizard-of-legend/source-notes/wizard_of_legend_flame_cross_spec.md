# Wizard of Legend reference — Flame Cross

Status: **authoritative detailed supplement** to section 3.1 of `wizard_of_legend_spell_language.md`.

Purpose: define Flame Cross precisely enough that the Enemy Lab version can be judged against the source spell's behavior and visual rhythm. This is still a reference/adaptation document, not a claim that the prototype uses Wizard of Legend's original code, assets, animation, or exact internal frame data.

Source checks:

- User-provided all-arcana showcase, approximately `00:06–00:08`.
- Community reference: https://wizardoflegend.fandom.com/wiki/Flame_Cross

## Evidence labels

- `documented`: explicitly stated in the community reference.
- `showcase-observed`: visible in the supplied 60 FPS showcase.
- `frame-estimate`: approximate timing counted from the showcase; not internal game data.
- `adaptation`: intentional behavior for this prototype's one-play ability cards.

---

## Correct high-level identity

Flame Cross is **not a stationary X-shaped burst**.

It is a rapid, three-beat Fire Basic combo made from **four traveling, ground-hugging, piercing flame waves**:

```text
Beat 1: one diagonal wave
Beat 2: one mirrored diagonal wave
Beat 3: both diagonal paths at once

Rhythm: ONE → TWO → ONE-TWO
```

The name reads over time. The first two waves establish opposite paths; the simultaneous final pair creates the cross and rewards lining a target up where both waves travel through it.

## Player promise

Send quick flame ribbons through a lane, then finish with two intersecting piercing waves that can both hit a centrally aligned target.

## Role

- basic-style rapid spell string;
- lane pressure and light crowd clear;
- low-commitment combo tool;
- positioning payoff on the double-wave finisher;
- preferred range: short to medium;
- miss risk: low per wave, but poor alignment loses the finisher overlap.

---

# Source behavior

## Documented rules

- Fire Basic Arcana.
- Three-cast basic combo.
- Cast 1 fires one flame wave for 6 damage.
- Cast 2 fires one flame wave for 6 damage.
- Cast 3 fires two intersecting flame waves for 9 damage each.
- The final waves travel slightly farther.
- Both final waves can hit the same target.
- The waves pierce enemies.
- Holding the input can perform the full basic combo.
- Enhanced Flame Cross makes the waves faster and longer-ranged without changing the three-beat structure.

Maximum clean source damage when every wave connects with one target:

```text
6 + 6 + 9 + 9 = 30
```

## Showcase-observed sequence

### Beat 1 — first diagonal wave

- The caster performs a quick lateral fire-casting gesture.
- One low flame ribbon launches slightly from one side of the body.
- Its path moves forward while crossing toward the opposite side of the aim axis.
- The damaging head is at the front of the moving ribbon.
- A short orange flame and dark soot wake follows behind it.

### Beat 2 — mirrored diagonal wave

- A second quick gesture launches one wave from the opposite side.
- Its trajectory mirrors Beat 1.
- The first wave can still be dissipating while the second is active, so the attack begins to visually braid across the lane.

### Beat 3 — simultaneous double-wave finisher

- The final gesture launches both authored paths at once.
- The two waves are independent damaging objects.
- They are brighter/stronger and travel slightly farther than the first two.
- A target near the crossing region can receive both 9-damage hits.

## Approximate showcase cadence

These are `frame-estimate` values and should be tuned by feel rather than treated as exact source internals:

```text
0.00 s  card/basic sequence begins
0.08 s  Beat 1 launches
0.34 s  Beat 2 launches
0.62 s  Beat 3 launches both finisher waves
0.80–0.95 s sequence has fully released
```

The important invariant is the rhythm, not an exact millisecond match:

```text
ONE … TWO … ONE-TWO
```

---

# Visual specification

## Overall silhouette

Each payload is a **moving flame brushstroke**, not a beam, rectangle, static line, or tall wall of fire.

The visual needs a clear forward-moving head and a short irregular tail. It should remain readable at phone scale without filling the lane with dense particles.

## Required visual layers

### 1. Hot leading head

- Compact pale-yellow or near-white flame mass.
- Clearly marks the current damaging front.
- Slightly wider and brighter on the finisher waves.

### 2. Golden body

- Several overlapping rounded flame clusters immediately behind the head.
- Forms a connected ribbon rather than individual bullets.
- Low enough that the attack reads as traveling along the floor.

### 3. Orange flame tongues

- Uneven pointed or stretched shapes breaking up the body.
- Small scale/height variation creates flicker.
- Must not obscure the direction of travel.

### 4. Soot wake

- Short charcoal/black wake near the ground.
- Lingers only briefly behind the hot body.
- Gives the wave weight and prevents the additive orange effect from reading like a neon laser.

### 5. Floor response

- Small warm glow directly beneath the active ribbon.
- Moves with the wave rather than creating a long persistent hazard decal.
- Optional tiny embers can shed backward, but the collision silhouette must remain clearer than the particles.

## Vertical profile

- Core remains around ankle-to-waist height.
- Flame tips can briefly rise higher.
- No tall wall or pillar.
- No overhead arc.

## Relative size

First-pass prototype target:

- damaging width: approximately one character width;
- visible tail: roughly 1.5–2.5 character lengths;
- finisher waves: around 10–15% larger/brighter, not a wholly different effect;
- crossing payoff comes from two simultaneous waves, not one oversized area hit.

---

# Spatial construction

Use an aim-relative frame:

```text
forward = current cast direction
right   = perpendicular to forward
```

For each wave:

```text
start = player
      + forward * front_offset
      + right * lateral_start

direction = normalize(
    forward
  + right * lateral_aim
)
```

The lateral start and lateral aim must have opposite signs. A wave starting on the right travels slightly left across the central aim line; the mirrored wave does the reverse.

Recommended initial values for Enemy Lab:

```text
base lateral_start: ±0.92 world units
base lateral_aim:   ∓0.22
base speed:          11.7 units/sec
base range:           9.8 units

finisher lateral_start: ±1.02
finisher lateral_aim:   ∓0.245
finisher speed:          12.4 units/sec
finisher range:          11.2 units
```

These are `adaptation` tuning values, not source measurements.

## Collision

Each wave:

- sweeps a moving circular/capsule hit area between its previous and current positions;
- pierces enemies;
- can damage a given enemy at most once;
- remains independent from every other wave;
- stops and cleans up on solid maze scenery;
- expires after its authored range;
- does not leave a persistent damage zone.

The final pair may both damage the same enemy because they are separate wave instances.

---

# Hit and control schedule

```text
Beat 1 wave:
  damage: 6
  push: light
  stagger: none unless another explicit system grants it

Beat 2 wave:
  damage: 6
  push: light
  stagger: none unless another explicit system grants it

Each Beat 3 wave:
  damage: 9
  push: moderately stronger
  hit feedback: stronger than Beats 1–2
```

The small source hits should not bypass this project's stagger policy. The finisher may receive stronger hitstop, knockback, audio, and visual flash without automatically becoming a reliable hard stagger.

---

# Input adaptation for the Enemy Lab card

Wizard of Legend uses Flame Cross as a repeatable Basic Arcana. The current prototype uses one-use-in-hand ability cards, so one card play should release the complete source pattern automatically:

```text
play card
→ Beat 1 single wave
→ Beat 2 mirrored single wave
→ Beat 3 simultaneous pair
→ card has already moved through the normal discard/draw flow
```

Aim should be sampled again before each beat. This lets the player make a small course correction during the string and approximates three individual basic casts without requiring three separate card presses.

The sequence should not refill stamina or replace the active stance.

## Cancel policy for later refinement

Current test goal: always complete the short sequence after a successful card play.

Possible later rule:

- dodge cancels unreleased beats;
- already launched waves remain alive;
- room transition, death, or runtime reset removes all remaining waves and the combo controller.

---

# Construction-language recipe

```text
input: one-card adaptation of combo-cast(3)
aim: aim-per-emission
caster motion: free-move or very small authored cast step
emitter: alternating front-offset-emitter
path: piercing-straight with opposite diagonal bias
collision: pierce-enemies + stop-on-scenery + overlap-multihit
hit schedule:
  beat 1 -> one 6-damage impact hit
  beat 2 -> one 6-damage impact hit
  beat 3 -> two independent 9-damage finisher hits
control: light push; stronger finisher push
defense: lane pressure only
lifetime: expire by range, wall, room reset, or owner/runtime cleanup
resource: ordinary ability-card consumption; no stamina refill
upgrade rewrite: faster travel + longer range
feedback: hot head + flame ribbon + soot wake + stronger double-launch accent
```

---

# Audio and feel

## Cast rhythm

- Beat 1: short fire swipe.
- Beat 2: mirrored swipe at similar volume/pitch.
- Beat 3: layered double release with a stronger attack accent.

## Travel

- Soft rushing flame loop or short pass-by sound.
- Avoid a continuous laser hum.

## Hit

- Base wave: light fire contact with minimal camera movement.
- Finisher wave: stronger contact accent.
- Double-finisher contact: both impacts remain distinct but close enough to feel like a combined payoff.

## Camera and rumble

- Beats 1–2: none or extremely light.
- Beat 3 launch: tiny directional kick.
- Both finisher waves hitting one target: brief medium-light pulse, not heavy-weapon impact.

---

# Data-driven tuning variables

```text
beat_times
front_offset
base_lateral_start
base_lateral_aim
finisher_lateral_start
finisher_lateral_aim
base_speed
finisher_speed
base_range
finisher_range
base_damage
finisher_damage
base_push
finisher_push
wave_collision_radius
base_visual_scale
finisher_visual_scale
trail_segment_count
trail_length
soot_opacity
floor_glow_strength
wall_collision_policy
cancel_policy
```

---

# Acceptance tests

1. One card play produces exactly three beats.
2. The beat emission count is `1, 1, 2`.
3. Four traveling waves exist across the full sequence.
4. No stationary X or beam-shaped hitbox appears.
5. Beat 1 starts on one side and crosses toward the opposite side of the aim axis.
6. Beat 2 mirrors Beat 1.
7. Beat 3 launches both paths simultaneously.
8. Each wave visibly has a hot moving head and a short trailing body.
9. Every wave pierces multiple enemies.
10. One wave cannot damage the same enemy more than once.
11. A target in the finisher overlap can receive both final hits.
12. An off-center target receives only the wave whose path reaches it.
13. Base waves deal 6 test damage each.
14. Finisher waves deal 9 test damage each and push more strongly.
15. The final waves travel slightly farther than the first two.
16. Waves stop at solid maze collision.
17. Playing the card preserves the active stance and current stamina state.
18. Room reset removes the combo controller and every active wave.
19. Enhanced behavior, when added, changes speed and range without removing the `1 → 1 → 2` identity.

---

# Superseded prototype behavior

The original Enemy Lab implementation created two stationary crossing bars immediately on card play. That version was useful only as an early overlap-hitbox test and should no longer be treated as Flame Cross.

The corrected implementation target is:

```text
moving wave
→ mirrored moving wave
→ simultaneous moving pair
```
