# Star Bolt and Shock Nova — standalone three.js recreation

A single self-contained HTML page that rebuilds two Lightning Arcana from the
Wizard of Legend showcase as they behave on screen:

- **#102 Shock Nova** (Signature) — showcase 13:28–13:41
- **#108 Star Bolt** (Standard) — showcase 14:29–14:35

Open `wizard-of-legend-star-bolt-and-shock-nova.html` in any browser. three.js
is inlined, so it needs no network and no server — double-clicking the file works.

## Where the numbers come from

Every timing, radius and colour was measured off
`media/wizard-of-legend/wizard-of-legend-arcana-showcase-480p.mp4` (854×480, 30 fps),
frame by frame, and cross-checked against the catalog text recorded in
`archive/wizard-of-legend/source-notes/gate2-online-reference.md`. One world unit
equals one floor tile, about 48 px in that encode.

| Behaviour | Source frames | Value used |
| --- | --- | --- |
| Nova charge | 808.40 → 809.83 | 1.43 s (0.90 s enhanced) |
| Nova wheel burn | 809.83 → 810.53 | 0.70 s (1.05 s enhanced) |
| Nova damage cadence | repeating `12` popups | one tick / 0.12 s |
| Nova radius | rim Ø ≈ 200 px / ≈ 380 px | 2.1 → 4.0 tiles |
| Star throw cadence | 870.2 / 870.9 / 871.7 / 872.5 / 873.3 | 0.75 s |
| Star speed | ≈ 31 px per frame | ≈ 20 tiles/s, 9 tile range |
| Shock hold before discharge | 810.53 → 813.70 | 3.2 s (4.6 s enhanced) |
| Discharge damage | `22` star, `74` nova, `134` charged nova | 22 / 72 / 131 |
| Lightning gold | median `#ded29a`, white core | `PAL.gold` |
| Shock cyan | median `#4fb8bc`, peak `#ccffff` | `PAL.cyan` |

## What the two arcana do

**Shock Nova.** Hold to charge: translucent white spirals wind inward while gold
glyphs flicker around the caster, who drops into a crouch. Release at full charge
and a lightning *wheel* snaps out — a jagged rim broken into chords, spokes running
back to the caster, and a column of lightning dropping out of the sky onto the
centre. Damage repeats for the whole burn. Enhanced widens the wheel, adds spokes
and forked tendrils past the rim, extra sky columns, and charges faster.

**Star Bolt.** Tap to hurl one four-point shuriken. It spins far faster than the
30 fps source can resolve, flies flat and straight trailing a gold zig-zag and a
scatter of sparks, and is consumed by the first body it touches.

**Shock.** Neither arcana spends its damage on impact. Both stack a charge on the
target, which flickers cyan, and a few seconds later the whole stack discharges in
one cyan burst with a red damage starburst — exactly the delayed `22` / `74` / `134`
pops in the source.

## Controls

`WASD` move · mouse aim · left click Star Bolt · hold `space` or right mouse for
Shock Nova · `E` toggle Enhanced · `R` reset dummies · `H` hide the panel.
The page auto-plays a scripted showcase on load that walks both arcana base and
enhanced; any input takes over.

## Rebuilding

The committed HTML is generated. To regenerate after editing `src/`:

```sh
npm pack three@0.169.0 && tar xzf three-0.169.0.tgz package/build/three.module.min.js
python3 - <<'EOF'
src = open('package/build/three.module.min.js').read()
i = src.rindex('export{')
body = src[i+len('export{'):src.rindex('}')]
pairs = [f'{b.strip()}:{a.strip()}' for a, b in
         (p.split(' as ') for p in body.split(',') if ' as ' in p)]
open('three.iife.js','w').write('(function(){' + src[:i] + ';globalThis.THREE={' + ','.join(pairs) + '};})();')
EOF
python3 build.py
```

`build.py` substitutes `three.iife.js` and `src/app.js` into `src/shell.html`.

## Scripting it

The page exposes `window.WOL` for driving it from the console or a capture script:
`throwStar()`, `beginNova()`, `releaseNova()`, `setEnhanced(bool)`, `aimAt(x, z)`,
`playShowcase()`, `stopShowcase()`, `layoutDummies()`, plus `TUNE` for live tuning.
