# Wizard of Legend reference — Bouncing Blaze

Purpose: authoritative behavior and visual reference for recreating **Bouncing Blaze** closely enough to compare its feel against the source before making original adaptations.

This file supersedes the first Enemy Lab interpretation that treated Bouncing Blaze as a wall-ricocheting projectile.

## Evidence

- `documented`: Wizard of Legend community reference — https://wizardoflegend.fandom.com/wiki/Bouncing_Blaze
- `showcase-observed`: user-provided all-arcana showcase, approximately `00:12.55–00:17.90`
- `frame-measured`: approximate timing measured from the supplied 60 FPS footage
- `adaptation`: decisions required because this prototype plays the complete Basic Arcana string from one deck-card activation

The source wiki provides the exact structural rules and listed combat values. The showcase is the authority for cadence, silhouette, travel presentation, bounce readability, contact feedback, and enhanced piercing behavior.

---

# 1. Source identity

Bouncing Blaze is a Fire **Basic Arcana** and projectile attack.

Its defining behavior is:

```text
press 1 -> one large bouncing fireball
press 2 -> one large bouncing fireball
press 3 -> one large bouncing fireball
```

Each fireball:

- travels forward in the current aim direction;
- follows an authored ground-bounce / hop motion;
- reaches the ground twice;
- dissipates on the second bounce;
- deals 12 damage;
- has strong listed knockback;
- has no normal cooldown because it is a Basic Arcana attack;
- stops on enemy contact in the base version;
- passes through enemies when enhanced, while retaining the same bounce lifetime.

The word **bounce** refers to the fireball hopping along the ground plane. It is not a wall-reflection rule.

---

# 2. What the reference video shows

## 2.1 Combo cadence

The showcase demonstrates a fast three-shot string. Approximate visible release spacing is around `0.22–0.30 seconds` between shots, depending on which frame is treated as the release frame.

A useful implementation rhythm is:

```text
ONE -> TWO -> THREE
```

The next ball is released before the previous ball has finished traveling. At normal range, two or all three fireballs can therefore be visible in the lane at the same time.

The current Enemy Lab timing target is:

```text
0.08 s  shot 1
0.31 s  shot 2
0.54 s  shot 3
```

These are prototype timing values derived from the footage, not claimed internal Wizard of Legend frame data.

## 2.2 Caster presentation

For each release, the wizard performs a quick forward throwing gesture with a small body lean. The gesture reads as repeatedly hurling a heavy ball rather than channeling one continuous spell.

Important presentation rules:

- each shot has its own release accent;
- the caster does not remain locked in a long recovery after shot 1 or 2;
- the three gestures form one quick repeated rhythm;
- the aim can change between releases in the source Basic Arcana string.

For the deck-card adaptation, each beat should sample aim independently so the player can make a small correction during the automatic three-shot sequence.

## 2.3 Fireball silhouette

The projectile is a large, rounded, readable ball of fire.

It is not:

- a small spark;
- a narrow bolt;
- a rigid glowing sphere with no flame motion;
- a rolling ball that stays glued to the floor;
- a projectile with a long laser-like trail.

Visual layers visible in the showcase:

1. **White-yellow hot core** — small, bright central mass.
2. **Broad orange shell** — the main readable circular silhouette.
3. **Jagged flame lobes** — irregular yellow/orange shapes breaking the circle.
4. **Short rear flame tail** — compact and turbulent, not a long ribbon.
5. **Dark soot residue** — appears most clearly at impact and ground contact.
6. **Ground relationship** — the ball visibly rises and falls relative to its shadow/contact effects.

At source-like scale, the orb is visually substantial—roughly comparable to the wizard's torso or larger in the showcase camera.

## 2.4 Bounce motion

The projectile advances along a straight horizontal aim lane while its visible height follows two arcs.

Conceptually:

```text
launch
  -> airborne arc
  -> ground contact 1
  -> airborne arc
  -> ground contact 2
  -> dissipate
```

The forward speed remains readable and consistent. The bounce does not send the ball backward or sideways.

The motion should be modeled as:

```text
forward position = constant-speed travel
visual height = repeating half-sine hop
```

The two ground contacts are authored by traveled distance, not by random terrain collision.

## 2.5 Ground-contact feedback

A bounce should be visible even when no enemy is hit.

Each ground contact should produce a compact package:

- quick yellow/orange floor flash;
- short radial flame splash;
- small soot puff;
- momentary compression or squash of the ball;
- immediate continuation after the first bounce;
- stronger cleanup burst after the second bounce.

The first bounce is punctuation. The second bounce is punctuation plus cleanup.

## 2.6 Enemy-contact feedback

In the base demonstration, enemy contact produces:

- a white-hot contact flash;
- orange flame fragments around the target;
- a clear `12` damage number;
- noticeable knockback;
- immediate destruction of that individual fireball.

The impact should not become a persistent fire zone. The source identity remains a projectile hit.

Because the shots are released rapidly, the lingering impact from shot 1 may still be visible when shot 2 enters the same area. This can make the string look denser without changing the one-hit rule for each projectile.

## 2.7 Enhanced behavior

The enhanced showcase demonstrates the same fundamental projectile and bounce sequence, but the fireballs continue through enemies.

Evidence visible in the footage includes multiple `12` damage numbers occurring along the projectile lane while a ball remains active.

Enhanced is therefore a collision rewrite:

```text
base:
  enemy contact -> deal 12 -> destroy this fireball

enhanced:
  first contact -> deal 12 -> continue
  later contact -> deal 12 -> continue
  second ground bounce -> destroy fireball
```

Enhanced does not need a new trajectory or extra bounce count. Its important change is piercing.

---

# 3. Correct construction recipe

```text
input:
  source -> combo-cast(3) + optional hold-repeat
  Enemy Lab card -> one activation schedules all three releases

aim:
  aim-per-emission

caster motion:
  root or very small throwing step

emitter:
  front-offset-emitter

path:
  straight forward travel
  + authored vertical hop cycle
  + exactly two ground contacts

collision:
  base -> stop-on-first-enemy
  enhanced -> pierce-enemies
  scenery -> stop-on-scenery, never reflect

hit schedule:
  one 12-damage impact per fireball per target

control:
  strong forward push / knockback

defense:
  long-range spacing only

lifetime:
  expire on base enemy contact
  or solid scenery
  or second ground bounce

upgrade rewrite:
  enhanced changes enemy collision from stop to pierce
```

---

# 4. Enemy Lab adaptation

One Bouncing Blaze card represents the complete three-shot Basic Arcana string.

```text
card played
-> shot 1
-> shot 2
-> shot 3
-> card enters discard normally
```

Preserve:

- three individually visible releases;
- large readable fireballs;
- overlapping projectile travel during the string;
- exactly two authored ground contacts per missed shot;
- 12 damage per projectile;
- base stop-on-enemy behavior;
- enhanced piercing as the source upgrade rule;
- long-range identity;
- straight aim lane.

Do not add:

- wall ricochets;
- homing;
- random bounce angles;
- a lingering fire patch;
- damage on every animation frame of overlap;
- extra damage merely because the ball touches the floor;
- automatic retargeting after launch.

Current test implementation intentionally uses the base collision rule. Enhanced piercing is documented and data-modeled, but is not yet exposed as an Enemy Lab toggle.

---

# 5. Arcana Size control

The Enemy Lab **ARCANA TWEAKS** size multiplier ranges from `1x` to `5x`.

For Bouncing Blaze, size changes:

- orb diameter;
- flame-tail dimensions;
- shadow size;
- ground-contact burst size;
- enemy-contact footprint.

Size does not change:

- damage;
- knockback;
- forward speed;
- shot cadence;
- bounce spacing;
- bounce count;
- maximum travel range;
- enhanced/base collision rule.

The multiplier is a laboratory readability and collision-footprint control, not a power multiplier.

---

# 6. Prototype tuning values

These are first-pass Enemy Lab values, not asserted source internals.

```text
combo release times: 0.08, 0.31, 0.54 s
combo controller lifetime: 0.72 s
projectile damage: 12
projectile speed: 13.4 world units/s
bounce count: 2
bounce spacing: 6.2 world units
maximum range: 12.4 world units
base projectile radius: 0.50 world units
visual hop height: 1.18 world units
base ground height: approximately 0.28 world units
base collision: stop on first enemy
source enhanced collision: pierce enemies
```

Variables that must remain data-driven:

`release_times`, `damage`, `push`, `speed`, `bounce_count`, `bounce_spacing`, `range`, `radius`, `hop_height`, `ground_height`, `base_pierce`, `enhanced_pierce`, `impact_lifetime`, `bounce_burst_lifetime`, `size_multiplier`.

---

# 7. Why the first implementation felt wrong

The original Enemy Lab test did this:

```text
one card
-> one fireball
-> reflect from room walls up to three times
-> damage each enemy once
```

That replaced the source spell's identity with a different projectile family.

| First test | Source behavior |
|---|---|
| One projectile | Three-shot Basic combo |
| Wall reflection | Forward ground hops |
| Three wall bounces | Two authored ground contacts |
| Room-bank-shot gameplay | Long straight-lane pressure |
| Lifetime controlled by walls/timer | Lifetime controlled by enemy contact or second bounce |
| Could strike several enemies by default | Base stops on first enemy |
| No distinct enhanced collision rewrite | Enhanced pierces enemies |

The corrected implementation should feel like repeatedly throwing three heavy, long-range fireballs—not like playing billiards with one fire orb.

---

# 8. Acceptance tests

A source-faithful Bouncing Blaze test should satisfy all of the following:

1. One card activation releases exactly three fireballs.
2. The releases occur as three distinct beats rather than one simultaneous volley.
3. Aim is sampled independently for every release.
4. More than one fireball can be active at the same time.
5. Every fireball advances along a straight lane.
6. Every fireball visibly rises and falls through two hop arcs.
7. A missed fireball creates two ground-contact effects.
8. The projectile disappears immediately after the second ground contact.
9. The base projectile deals exactly one 12-damage hit before disappearing on enemy contact.
10. The base projectile does not continue through the struck enemy.
11. The projectile stops at solid scenery instead of reflecting.
12. No wall-ricochet behavior remains.
13. The enhanced rule, when enabled, allows one fireball to hit multiple enemies while retaining the same two-bounce lifetime.
14. The same enhanced fireball cannot repeatedly damage one target every frame.
15. Arcana Size scales the ball, effects, shadow, and collision footprint without changing damage, speed, range, cadence, or bounce count.
16. At `1x`, the projectile retains a large but source-comparable silhouette.
17. At `5x`, the test remains readable and does not change the spell's timing or power rules.

---

# 9. Playtest questions

After testing on phone and Backbone, evaluate:

- Do the three releases read separately at combat speed?
- Is the ball large enough at `1x`?
- Does the hop read as a bounce rather than ordinary floating movement?
- Is the first ground contact easy to see without overwhelming enemy impacts?
- Does the second bounce clearly communicate cleanup?
- Is the projectile too slow or too fast for its long-range identity?
- Can two or three balls coexist without becoming visually muddy?
- Is base stop-on-contact immediately understandable?
- Does `5x` remain useful for inspection rather than covering the entire fight?
- Does the corrected ability now evoke the supplied Wizard of Legend showcase before any original adaptation is attempted?
