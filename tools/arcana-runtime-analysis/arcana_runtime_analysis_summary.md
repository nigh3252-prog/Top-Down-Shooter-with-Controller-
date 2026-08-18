# Arcana Runtime Analysis — Current `main`

**Repository:** `nigh3252-prog/Top-Down-Shooter-with-Controller-`  
**Commit:** `cf6cbcfa523058febfcf3285ff2a4c1e22111e00`  
**Analysis date:** 2026-08-18  
**Scope:** All 70 Arcana in the live effect registry, traced through the runtime handler actually selected by the dispatcher. No game code was changed.

## Measurement model

Area is split into three different concepts:

1. **Largest single footprint** — the largest collision shape active in one phase.
2. **Estimated unique cast coverage** — the union of floor space touched across a deterministic cast.
3. **Threat envelope** — the better measure for agents, homing ammunition, and moving formations.

A repeated volley does not automatically receive multiplied area when all projectiles reuse the same corridor. It receives higher **density** instead. All measurements are normalized to Arcana Size 1 unless an audit note says otherwise.

## Behavior-family distribution

| Behavior family   |   Count |   Median reach |   Median single footprint |   Median contact reliability |   Median full-value reliability |
|:------------------|--------:|---------------:|--------------------------:|-----------------------------:|--------------------------------:|
| Attached strike   |      10 |           4.1  |                     10.91 |                            4 |                               3 |
| Autonomous agent  |       4 |           9.5  |                     17.17 |                            5 |                               4 |
| Caster formation  |       3 |           4.23 |                     19.48 |                            5 |                               4 |
| Movement / route  |      21 |           8.4  |                     13.72 |                            4 |                               3 |
| Traveling carrier |      22 |          12.08 |                      1.95 |                            3 |                               3 |
| Zone / field      |      10 |           6.68 |                     45.36 |                            5 |                               4 |

## Largest code-grounded footprints

| Arcana              | Primary behavior   |   Largest single footprint (sq units, est.) |   Contact reliability (1-5) |   Full-value reliability (1-5) | Geometry confidence   |
|:--------------------|:-------------------|--------------------------------------------:|----------------------------:|-------------------------------:|:----------------------|
| Grasping Earth      | Zone / field       |                                      265.9  |                           5 |                              5 | Medium                |
| Heroic Leap         | Movement / route   |                                       78.54 |                           5 |                              3 | High                  |
| Blazing Lariat      | Movement / route   |                                       77.87 |                           5 |                              4 | High                  |
| Ward of Flames      | Zone / field       |                                       66.48 |                           4 |                              3 | High                  |
| Dragon Blast        | Zone / field       |                                       66.48 |                           5 |                              4 | High                  |
| Aqua Breaker        | Traveling carrier  |                                       66.48 |                           4 |                              3 | High                  |
| Searing Crown       | Zone / field       |                                       60.82 |                           5 |                              4 | High                  |
| Shock Nova          | Attached strike    |                                       55.42 |                           4 |                              4 | Medium                |
| Arcane Intervention | Zone / field       |                                       45.36 |                           4 |                              3 | High                  |
| Earth Stomp Agent   | Autonomous agent   |                                       34.21 |                           5 |                              4 | High                  |
| Aqua Beam           | Attached strike    |                                       31.05 |                           4 |                              4 | High                  |
| Aqua Vortex         | Zone / field       |                                       30.19 |                           5 |                              5 | High                  |

## Longest practical reach / envelopes

| Arcana           | Primary behavior   |   Max reach (units) | Coverage interpretation                                                                                                    |
|:-----------------|:-------------------|--------------------:|:---------------------------------------------------------------------------------------------------------------------------|
| Flare Rush       | Movement / route   |               21.4  | Projectile-only union after the dash; engagement reach combines 8.4 dash plus 13 projectile range. Lanes overlap slightly. |
| Star Bolt        | Traveling carrier  |               18    | Effective range/radius estimate includes the baked 2× source scale; repeated throws mainly add density.                    |
| Homing Flares    | Caster formation   |               17.65 | Use threat envelope rather than one area: 1.65 storage orbit + 16-unit acquisition range; seven independent lanes.         |
| Frost Wing       | Movement / route   |               17.4  | Projectile fan union; engagement reach includes 8.4 dash plus 9 projectile range.                                          |
| Dragon Arc       | Traveling carrier  |               17    | Approximate union of the two mirrored sinusoidal paths; repeated stock increases density rather than unique geometry.      |
| Snare Track      | Movement / route   |               16.9  | Projectile fan union; engagement reach includes 8.4 dash plus 8.5 projectile range.                                        |
| Stone Shot       | Traveling carrier  |               16.5  | Largest boulder corridor; first two stones are narrower but mostly reuse it.                                               |
| Knockout Boulder | Traveling carrier  |               16    | Wide 29.47-square-unit swept corridor.                                                                                     |
| Storm Draft      | Traveling carrier  |               14.18 | Travel corridor is about 33.70 sq units after the deliberate 1.7-unit spawn gap.                                           |
| Water Prison     | Traveling carrier  |               14    | Swept projectile corridor; attached prison is single-target rather than floor area.                                        |
| Flame Fusion     | Traveling carrier  |               13.5  | 17.22 sq units is the post-fusion five-arrow fan union only; parent corridors remain independently useful and may diverge. |
| Aqua Beam        | Attached strike    |               13.5  | 31.05-square-unit full-length rectangle before scenery clipping; live limited sweep can enlarge total union.               |

## Most conditional defining payoffs

| Arcana          |   Contact reliability (1-5) |   Full-value reliability (1-5) | Coded full-value condition                                                                   |
|:----------------|----------------------------:|-------------------------------:|:---------------------------------------------------------------------------------------------|
| Frost Feint     |                           2 |                              1 | An enemy must attack the decoy before it expires                                             |
| Flame Fusion    |                           3 |                              1 | The two moving parent projectiles must actually collide; otherwise no fan exists             |
| Circuit Line    |                           2 |                              2 | Nodes must form at least one link within 7 units; more edges add two extra ticks each        |
| Flame Cross     |                           3 |                              2 | Target must occupy the final crossing region to take both finisher waves                     |
| Perforating Jet |                           3 |                              2 | Full damage requires a target to remain aligned through nine independently owned jets        |
| Bolt Rail       |                           3 |                              2 | Beat 5 must contact an enemy or no finisher burst appears                                    |
| Flare Rush      |                           3 |                              2 | Full value requires targets to remain in the three-lane catch-up volley                      |
| Snare Track     |                           3 |                              2 | Full three-lane value requires multiple aligned targets or a large target                    |
| Frost Wing      |                           3 |                              2 | Full multi-shard value requires a large/close target or multiple enemies across the fan      |
| Storm Draft     |                           4 |                              2 | 30 bonus damage and 1.35 s stun require a carried target to hit a wall                       |
| Bubble Barrage  |                           4 |                              2 | Full ten-bubble value requires maximum stock and target interception across stochastic paths |
| Bouncing Blaze  |                           3 |                              3 | No special condition; shots end on first enemy                                               |

## Major findings

- **Zones are the reliability and area leaders.** The median Zone/Field card has a 45.36-square-unit largest footprint and contact reliability 5.
- **Traveling carriers are generally long but narrow.** Their median reach is 12.08 while their median single collision footprint is only 1.95 square units.
- **Movement Arcana are not inherently low-area.** Heroic Leap, Blazing Lariat, Wave Front, Shearing Chain, and Tectonic Drill all generate broad or long route coverage.
- **Multiplicity must be separated from area.** Perforating Jet's nine shots mostly reuse one narrow 5.41-square-unit corridor; Bubble Barrage and fan attacks increase density and probabilistic coverage in different ways.
- **Full-value reliability exposes the intended setup/payoff candidates.** Flame Fusion, Frost Feint, Circuit Line, Storm Draft, Flame Cross, and Bolt Rail have the largest gap between making contact and realizing their defining payoff.
- **The current live handler sometimes differs materially from nearby generic specs.** Selected curated runtimes are authoritative for Bladed Vine, Spark Contact, Gust Burst, Razor Burst, Thunder Line, and Circuit Line.
- **Four standalone-source cards are baseline scale outliers.** Terra Ring, Grasping Earth, Shock Nova, and Star Bolt receive an additional 2× source scale even when Arcana Size is 1.

## Current audit queue

| Arcana              | Audit flags / implementation notes                                                                                                                             |
|:--------------------|:---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Bladed Vine         | Live curated geometry is 3.0 / 5.6 reach, not the unused generic 5.25 / 7.0 specification.                                                                     |
| Spark Contact       | The selected curated port animates source-local lunge but does not move the live player, despite movement language in the card.                                |
| Gust Burst          | Selected curated runtime uses a 4.4-unit dash, 2.7 gather radius, and 2.4 endpoint radius; not the unused generic spec.                                        |
| Razor Burst         | Selected curated runtime is 5 × 4 damage, not the unused four × 5 generic schedule.                                                                            |
| Thunder Line        | Live curated runtime is a disk/core strike, not the unused broad-radius plus rectangular-core generic representation.                                          |
| Circuit Line        | Selected curated runtime uses 7.0 link range, .62 stream radius, and 6 base hits (+2 per extra edge).                                                          |
| Searing Crown       | Card language can read like a caster-following crown, but gameplay stays at the original cast frame.                                                           |
| Dragon Blast        | Gameplay collision is a very large disk, broader than the directional mouth silhouette may imply.                                                              |
| Shearing Chain      | Hit circles only advance about 3.4 units from the original cast frame while the player dashes 6.6; collision is not truly synchronized to the full live route. |
| Toxic Bolas         | Needs exact live collision-radius extraction before area ranking.                                                                                              |
| Terra Ring          | One of four standalone-source cards with an additional baked 2× world scale at Arcana Size 1.                                                                  |
| Grasping Earth      | Baked 2× standalone scale makes current world radius 9.2. Live adapter auto-releases at full charge rather than exposing early release.                        |
| Rock-Solid Tomahawk | Unlike Cyclone Boomerang, outbound and return do not own separate target hits.                                                                                 |
| Shock Nova          | One of four standalone-source cards with baked 2× world scale. Charge vulnerability/movement lock is not as explicitly integrated as Ball Lightning's.         |
| Star Bolt           | One of four standalone-source cards with baked 2× world scale.                                                                                                 |
| Bubble Barrage      | Needs runtime telemetry rather than analytic geometry for trustworthy unique-area and full-hit estimates.                                                      |

## Recommended next pass

Join this geometry table to damage, cooldown/resource, hit schedule, control duration, and defensive value. Then calculate family-relative efficiency rather than one global power number:

- damage per cast and per second of commitment;
- control-seconds weighted by contact reliability;
- footprint × persistence;
- density versus unique area;
- defensive coverage;
- full-condition payoff premium;
- telemetry from Warden Trial for any-hit rate and defining-condition rate.
