# Arcana demo — Rock N' Roll & Earth Stomp Agent

A phone-first three.js reconstruction of two Wizard of Legend arcana, built by
reading the archived showcase video frame by frame.

Build the shippable single file:

```text
node scripts/build-arcana-demo.mjs
```

That writes `tools/wizard-of-legend-arcana-demo.html` with three.js and the app
inlined. The result is fully offline: open it from a download, no server, no
network. It does not import or modify the game runtime.

## Sources here

| File | Role |
| --- | --- |
| `shell.html` | Page chrome, CSS, touch UI, source-notes panel. Two script slots the build fills. |
| `app.js` | The demo. Every timing/count/damage constant is annotated with the frames it came from. |
| `vendor/three.min.js` | three.js r160.1 UMD, pinned and vendored so the build never needs the network. |

## What the source frames show

Read off `media/wizard-of-legend/wizard-of-legend-arcana-showcase-480p.mp4` at
the windows the Gate 1 video inventory assigns to each arcana.

### Rock N' Roll — entry 92, 12:05–12:17, Earth / Signature (`UseEarthWheel`)

- Base cast (12:05–12:11): short crouch, rock erupts at the caster's feet, and
  **two** buzzsaws tear forward in parallel lanes that splay slightly apart.
- Each saw is a half-buried churning rock wheel carving a dark furrow that
  lingers a beat and fades, spraying dirt backwards the whole way.
- Saws pass **through** targets rather than stopping — repeated **4**-damage
  ticks, a white star spark per hit, light knockback.
- Charged cast (12:11–12:17): holding plants the caster and rings them with
  long flickering white spikes lying flat on the floor, growing with the charge.
  Release erupts a **tall stacked fan of five** saws that roll forward together
  ticking **5** each.

### Earth Stomp Agent — entry 97, 12:41–12:53, Earth / Standard, melee + summon

- Rock bursts beside the caster and leaves a hovering agent: a glowing olive
  core inside a ring of tan rock shards, with its own small health bar.
- Idles with a bob and loosely follows the caster, teleporting back if leashed.
- Stomp cadence ≈ **1.1s**: leaps at the nearest enemy, flaring its shards into
  a spinning star mid-air while its ground shadow stays and shrinks.
- Impact splits the stone with radial cracks, throws dust and rock, deals **15**
  in a wide radius and shoves everything away. The crack decal lingers, then
  fades.
- Lives **10 seconds**. Wiki cooldown 15s, used as-is.

Documented behaviour strings are quoted from the community catalog and the
Wizard of Legend Wiki as recorded in `archive/wizard-of-legend/source-notes/`.
Names and presentation are source references for prototyping and should be
replaced before any public-facing release.

## Notes

- Portrait layout is the primary target: the arena runs *up-screen* so a phone
  gets a tall runway for the buzzsaws. Landscape works too — the camera solves
  its FOV against a target world width and depth on every resize.
- Input: drag anywhere on the left to move; tap an arcana to cast; hold Rock N'
  Roll to charge. Gamepad (left stick, square/X, triangle/Y) and keyboard
  (WASD, J, K) are fallbacks. Any real input cancels the auto showcase.
- The simulation step is clamped so a slow device slows the world down instead
  of letting saws tunnel through targets; cooldown, charge and FPS stay on
  wall-clock.
