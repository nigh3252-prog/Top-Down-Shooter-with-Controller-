# Encounter design reference

Purpose: design-reference synthesis on *encounter design* (enemy composition, wave/room pacing,
arena structure, attacker coordination) to sit alongside `hades_source_library.md` and
`diablo3_source_library.md`, which cover *moveset/kit* source material instead. This file is not
implementation code. Where useful, each section calls out the matching hook already in
`src/combat-director.js` and `src/enemies.js` so the ideas below are cheap to prototype against
what already exists (`DIRECTOR_MODES`, `ENEMY_STATS`, `tokenCost`/`pressureBudget`,
`nextSpawnDelay`/`spawnCap`).

Scope: Absolum, Streets of Rage 4 (same combat-design studio, Guard Crush Games), Hades, Doom
(2016), God of War (2018), Dead Cells, Enter the Gungeon, Batman: Arkham Asylum, plus the two
strongest non-video-essay design frameworks found: *The Level Design Book*'s Encounter chapter and
Andrew Yoder's "Door Problem of Combat Design."

## The throughline across all of these games

Every one of these titles solves the same underlying problem your `combat-director.js` is already
experimenting with: **how many enemies get to threaten the player at once, and who decides.**
That's not a coincidence — it's the single highest-leverage lever in encounter design, above enemy
count, above arena shape, above damage numbers. Games differ mainly in *how* they gate it:

| Game | Attacker-gating mechanism | Maps to your code |
|---|---|---|
| Batman: Arkham Asylum | Only a fixed number of thugs (2-3) are ever "live" attackers at once; the rest circle and wait their turn, visibly telegraphed | `director.canGrant()` token system, `oneAttacker`/`battleCircle` modes |
| Doom (2016) | No hard cap, but "combat chess": enemy *archetypes* are balanced so the player must triage threats, arena geometry forces movement between them | `pressureBudget` mode, `ENEMY_ATTACK_BY_KIND` role variety |
| God of War (2018) | Enemy groups gate around the player's active target; other enemies hang back until a "slot" opens | `battleCircle` mode + `assignBattleCircleSlots` |
| Absolum / Streets of Rage 4 | Classic beat-em-up spacing: enemies queue off-screen/off-arena edge and feed in, rarely all-in at once, elites/armored variants get spotlighted | `wavePacing`, `eliteSpotlight` modes, `spawnCap`/`nextSpawnDelay` |
| Hades | Room "waves" clear in discrete beats (typically 1-3 enemy groups) with intentional lulls; boss/miniboss rooms are their own beat | wave/`finishWave` structure in `enemies.js` |

Your prototype has effectively already built a laboratory for testing every one of the above as a
toggleable mode (`DIRECTOR_MODES`). The actionable finding isn't "add a new mechanic" — it's
**stop treating these as mutually-exclusive lab modes and start composing them into one director**,
because in the games above they aren't alternatives, they're layers used at different moments of
the same encounter (see Recommendations).

## Absolum (Guard Crush Games / Dotemu, 2025)

- Beat-em-up roguelite; explicitly the direct successor to Streets of Rage 4's combat design team,
  not a new studio — same combat design duo. Relevant because your project is already using SoR4-
  adjacent brawler feel as source material.
- **Branching world map, not linear rooms.** Each path node carries a different enemy layout/hazard
  mix and its own side-reward; picking a path is a real decision, not padding between "the next
  fight." This is a structural idea above the level of any single encounter — it's about giving the
  *player* control over which encounter shape they get next, which increases perceived agency
  without touching combat tuning at all.
- **Positioning matters on both axes.** Combat happens in a 3D-feeling arena (beat-em-up depth
  plane), so "surround the player" isn't just a ring around one point — enemies can flank in depth
  as well as radius. Your `battleCircle` slot system already reasons about angle+radius; worth
  checking it also reasons about approach timing so it doesn't feel like a pure carousel.
- **Elites/armored variants reuse base enemy silhouettes with modified rules** (more HP, an added
  effect) rather than being fully new enemies — cheap variety, directly maps to your
  `eliteSpotlight` mode and the `maceGoblin`/`spearGoblin` role split.
- **Anti-mash design**: mana/Arcana builds from landing hits and can "tech" (reset) a combo
  mid-juggle — a comeback/counterplay mechanic that specifically punishes players who just spam the
  same combo into a crowd. Consider whether your enemy roster needs an equivalent "reward for
  reacting, not spamming" hook (e.g., the `spearGoblin`'s poke range already forces players to not
  stand still — that's the same idea from the enemy side).
- Rooms hand out passive bonuses ("Rituals") on clear — a light run-shaping reward layer, comparable
  to what your `docs/hades_source_library.md` already catalogs as boon/upgrade candidates.

Sources: [Absolum Review – GameRant](https://gamerant.com/absolum-review/), [How Absolum Blends Classic Beat 'em Up Combat With RPG and Roguelike Mechanics](https://gamerant.com/absolum-beat-em-up-combat-rpg-roguelike-mechanics/), [Interview: Absolum Devs Discuss Making a Brand New Beat 'em Up IP](https://gamerant.com/absolum-interview-dotemu-guard-crush-rpg-roguelite-beat-em-up/), [Absolum: An Interview With The Founders of Guard Crush Games](https://www.nettosgameroom.com/2025/12/absolum-interview-with-founders-of.html), [Absolum Review – Punished Backlog](https://punishedbacklog.com/absolum-review/)

## Streets of Rage 4 (same studio, prior game)

- Explicit design fix from older beat-em-ups: enemies used to be able to walk off the visible
  arena edge and hit the player from off-screen; SoR4 pins enemies inside the playable bounds so
  every threat is visible before it can act. Directly relevant to your off-screen-edge spawn logic
  in `spawn()` — spawning from just outside the visible arena is fine, but make sure no enemy can
  *attack* from outside camera bounds once it's "in."
- Two clear archetype poles reused throughout the enemy roster: fast/aerial "trickster" vs.
  slow/heavy "bruiser" — the same two-pole split your `chaser`/`brute` and `maceGoblin`/`spearGoblin`
  pairs are already doing. Confirms that's the right minimum viable palette, not a placeholder to be
  replaced.
- Survival mode = escalating endless waves with power-ups between them — basically your
  `wavePacing` mode already, but confirms pickups-between-waves is worth adding as a beat, not just
  raw difficulty scaling.

Sources: [Streets of Rage 4 Interview – Siliconera](https://www.siliconera.com/streets-of-rage-4-interview-throwing-hands-with-guard-crush-lizardcube-and-dotemu/), [ROG Interviews: Talking Streets of Rage 4](https://realotakugamer.com/rog-interviews-talking-streets-of-rage-4-with-lizardcube-dotemu-guard-crush-games/)

## Hades (Supergiant, 2020)

- Room clears follow a strict rhythm: **wave(s) → lull → reward encounter (character/boon) → next
  room.** The lull and reward beat is not optional padding — it's where the player's tension resets
  so the next room's opening reads as a fresh spike rather than more of the same. Your `finishWave()`
  immediately calls `startWave()` again; consider whether a deliberate pause/reward beat between
  waves would make wave transitions read better than a hard cut.
- Music literally tracks encounter intensity (chill → folk → hard rock as a boss/miniboss room
  approaches), functioning as a diegetic difficulty curve indicator. Useful pattern even without
  full dynamic music: telegraphing "this room is bigger" before spawn-in helps players calibrate
  aggression, related to the "door problem" below.
- Already fully cataloged for kit/boon purposes in `docs/hades_source_library.md` — no need to
  duplicate that here.

Sources: [GDC Podcast ep.16 — Roguelikes and narrative design with Greg Kasavin](https://gdconf.com/article/roguelikes-and-narrative-design-with-hades-creative-director-greg-kasavin-gdc-podcast-ep-16/)

## Doom (2016) — "Push Forward Combat" (Kurt Loudy & Jake Campbell, GDC)

- Core mantra: **"make me think, make me move."** Arenas are asymmetrical, verticality-heavy, and
  deliberately don't let the player camp one spot — the point of the arena shape is to force
  repositioning, not just to look good.
- **"Combat chess"**: with a no-hard-cap swarm of varied enemy archetypes, the actual skill test is
  *triage* — deciding which demon to deal with first — not raw execution. This only works if enemy
  archetypes are legible at a glance (silhouette + attack tell), which is a strong argument for
  keeping your enemy roster's visual/behavioral differentiation (mace vs. spear goblin windup/range)
  sharp rather than adding lookalike variants.
- Directly opposed philosophy to the token/one-attacker approach — worth being deliberate about
  which of these your game actually wants, since they produce very different feelings (tense 1v1
  duels vs. chaotic juggling of many threats). Given your project already has both `oneAttacker` and
  `chaos` as modes, this is a design intent question, not a technical one.

Sources: [GDC Vault – Embracing Push Forward Combat in DOOM](https://www.gdcvault.com/play/1024940/Embracing-Push-Forward-Combat-in), [Speaker Q&A: Kurt Loudy and Jake Campbell — GDC](https://gdconf.com/news/speaker-qa-kurt-loudy-jake-campbell-break-combat-philosophy-doom)

## God of War (2018) — Mihir Sheth / Jason McDonald, GDC ("Evolving Combat...")

- **The Valkyrie pattern**: 9 optional bosses share moveset DNA but vary *order, timing, and added
  conditions* per fight, functioning as escalating tutorials on the same base vocabulary rather than
  fully bespoke movesets each time. Concretely: Gunnr (long telegraphs, teaches parry timing) →
  Kara (forces blocks, adds minion pressure) → Geirdriful (recombines/reorders the prior two to
  force re-learning under combined pressure). This is a cheap, high-value pattern for your goblin
  roster: instead of designing N unrelated enemies, design 2-3 "verbs" (mace = fast/short,
  spear = slow-tell/long-reach) and get more mileage by recombining timing/range/added conditions
  than by adding brand-new kits.
- Enemy groups gate around whichever enemy currently "owns" player attention; others hold until a
  slot frees — same idea as your `battleCircle`/token system, independent confirmation it's a sound
  approach for a game with a locked/close camera (which your top-down camera is not exactly, but the
  "don't let everyone pile in the instant one enemy engages" principle still holds).

Sources: [GDC Vault – Evolving Combat in 'God of War' for a New Perspective](https://www.gdcvault.com/play/1026423/Evolving-Combat-in-God-of), [The Secrets of Brutality: God of War's Combat Design](https://www.gamedeveloper.com/design/the-secrets-of-brutality-i-god-of-war-i-s-combat-design)

## Dead Cells & Enter the Gungeon — room-as-unit design

- Both build **hand-authored room templates** tagged by purpose (combat / treasure / shop /
  labyrinth) and let a graph-driven generator assemble runs from them, rather than proceduralizing
  encounters at the enemy-placement level. Enemy density per room is a tunable ratio (Dead Cells:
  roughly "1 monster per N tiles of combat-tagged room"), not ad hoc per-room hand tuning.
  Directly relevant if this project ever moves from a single continuous arena to discrete rooms:
  the reusable unit should be "a combat room archetype with a monster-density budget," not
  "a spawn table."
- Enter the Gungeon deliberately hand-designs and playtests every individual room *before* letting
  procedural generation stitch them together — procedural generation choosing among vetted rooms,
  never generating room content itself. Strong argument against anything that spawns enemies purely
  algorithmically without a human-tuned "this composition is fun" pass — matches the
  hand-tunable `firstWaveMix` array already in your `startWave()`.
- Environmental interactivity (flippable tables, explosive barrels, dynamic hazards) makes the room
  itself a combat tool, not just a backdrop — an angle your current arena (open field, edge-spawn)
  doesn't use yet and could be a meaningful next lever for encounter variety without new enemy work.

Sources: [Deepnight — The Level Design of Dead Cells](https://deepnight.net/tutorial/the-level-design-of-dead-cells-a-hybrid-approach/), [Q&A: The guns and dungeons of Enter the Gungeon](https://www.gamedeveloper.com/design/q-a-the-guns-and-dungeons-of-i-enter-the-gungeon-i-)

## Batman: Arkham Asylum — Freeflow crowd control

- Classic reference for the "only a few enemies are ever live attackers" pattern; the rest visibly
  circle/wait, which is what makes an 8-10 enemy mob still feel fair — the crowd is a *staging
  queue*, not a simultaneous threat. Rocksteady also deliberately caps how many "special" enemy
  variants (shield, stun-immune, etc.) appear in one encounter at a time — never more than one or
  two special rules active in the room simultaneously, so the player is never solving more than one
  or two new problems at once.

Sources: [Freeflow Combat — Arkham Wiki](https://arkhamcity.fandom.com/wiki/Freeflow_Combat), [Batman: Arkham Design Analysis (Part 1) — Game Developer](https://www.gamedeveloper.com/design/batman-arkham-design-analysis-part-1-)

## The two strongest written frameworks (non-video)

### The Level Design Book — "Encounter" chapter

The clearest concrete framework found. Key structure:

- **Definition worth adopting verbatim**: an encounter is "a sequence of systemic challenges that
  support a variety of player tactics" — i.e. it should have more than one viable solution, and it's
  a *sequence* (beginning/middle/end), not a single spawn-and-clear event.
- **Beginning / Middle / End structure**:
  - *Beginning*: establish whether enemies are aware, unaware, or en route; let the player choose
    when to engage if possible; make layout and enemy composition readable before commitment.
  - *Middle*: sustain momentum via scripted events that change fight dynamics mid-encounter (a
    reinforcement wave, an environmental shift) rather than a flat unchanging brawl.
  - *End*: victory conditions should be legible — the player should always know when they've won.
- **The "door problem"**: players need a foothold before committing. Three canonical solutions —
  (1) player ambushes an unaware, exposed enemy group; (2) enemies ambush the player once they're
  drawn to midfield; (3) a vista shows unreachable enemies first, then a one-way entrance forces
  commitment (most common for bosses). Your current spawn model (continuous edge-spawns into an
  always-open field) doesn't really use any of these — there's no "beginning" beat distinct from
  "middle," which is the single biggest structural gap versus every game surveyed above.
- **Enemy palette sizing table** (directly actionable against your `ENEMY_STATS`):

  | Concurrent types on screen | Reads as | Note |
  |---|---|---|
  | 1 | Tutorial/rest beat | Good for wave openers |
  | 2 | "Regular" encounter | Your current 2-goblin split lands exactly here |
  | 3 | Complex | Manageable if 2 are similar and 1 is the odd one out |
  | 4 | Brawl | Needs a 2v2-style factional read to stay legible |
  | 5+ | Slaughter/chaos | Fine occasionally, player will instinctively isolate subsets anyway |

  "Too many enemy types in one encounter is like a movie with too many characters" — direct
  argument for growing your roster by adding *behavioral* variants of the 2 existing archetypes
  (as God of War's Valkyries do) before adding a 3rd or 4th silhouette.
- **Player-persona shifting via arena design**: you can nudge which tactic a player leans on by
  starving/rewarding certain approaches spatially (props, ammo/resource placement, terrain
  friction) rather than only through numeric tuning.

Source: [Encounter — The Level Design Book](https://book.leveldesignbook.com/process/combat/encounter)

### Andrew Yoder — "The Door Problem of Combat Design"

Frames combat-arena design as **map control**: helping the player develop options while limiting the
enemy's. Five concrete techniques, each with a game example:

1. **Foothold of cover** — a strong defensible position pulls players inward and narrows enemy
   attack angles (Half-Life, Horizon Zero Dawn).
2. **Reward for risk** — powerups placed in exposed spots pull players out of turtling, though not
   sufficient alone (players leave once they grab it).
3. **Hidden information** — partitioned/obscured zones force players to spend movement to gain
   information rather than defend one static point (Quake, Doom).
4. **AI leashing** — level geometry (height gaps, islands) restricts *enemy* movement, preventing
   pile-ins through a single doorway — the geometry equivalent of your token system, done spatially
   instead of via a permission gate.
5. **One-way paths** — forced-forward geometry (drops, closing doors) prevents retreat/turtling;
   needs alternate looping routes so it doesn't feel unfair.

These compose: footholds pull players in, hidden info adds a discovery layer, AI leashing spaces
enemies out, rewards add incentive, one-way commitment locks in engagement. This is the clearest
available blueprint for turning your currently-flat open arena into something with actual
map-control texture, independent of anything in `combat-director.js` — it's a level-geometry lever,
not a spawn-logic lever.

Source: [The Door Problem of Combat Design — Andrew Yoder](https://andrewyoderdesign.blog/2019/08/04/the-door-problem-of-combat-design/)

## Recommendations for this project specifically

1. **Stop treating `DIRECTOR_MODES` as mutually exclusive toggles; compose them as layers of one
   encounter.** Every game surveyed uses several of these ideas *simultaneously within a single
   fight*, not as alternate global settings: an opening beat (like `oneAttacker`, low pressure), a
   sustained middle that ramps concurrent pressure (`pressureBudget`/`nearFar`), and an occasional
   spotlighted threat (`eliteSpotlight` for the `brute`). Consider making the "mode" a per-wave or
   per-time-window parameter the director walks through automatically, rather than a manual
   dropdown a player/tester picks once.

2. **Give waves a Beginning/Middle/End, not just a spawn count.** Right now `startWave()` spawns a
   flat mix and `finishWave()` immediately calls `startWave()` again with no beat in between. Add:
   an opening readability moment (fewer, telegraphed spawns, matching the Level Design Book's
   "Beginning"), a mid-wave escalation (an extra spawn burst or the `brute` entering partway
   through, matching Hades'/Doom's scripted-middle idea), and a legible clear/reward beat before the
   next wave starts (even a 1-2s pause reads as "you won this one" — currently it can't, since
   `finishWave` → `startWave` is instant).

3. **Grow the enemy roster by *recombining* mace/spear timing and range rather than adding new
   silhouettes first**, per the Level Design Book's palette table and the God of War Valkyrie
   pattern. E.g., a spear goblin variant with a feint (long windup that can cancel into a shorter,
   faster poke) reuses your existing `ENEMY_ATTACKS`/`stance.chain` machinery and teaches a new read
   without adding a 3rd concurrent silhouette to track.

4. **Add an explicit "door" beat to encounters.** Your spawn model has no distinct arrival state —
   enemies stream in continuously from off-screen. Even a light version of Yoder's vista-then-commit
   pattern (or Hades' pre-room preview) — e.g. a brief "enemies visible but not yet active" window
   when a wave starts — would give players the readability beat every surveyed game treats as
   load-bearing, not decorative.

5. **Cap concurrent "special rules," not just concurrent enemies**, following Arkham's practice.
   Your `eliteSpotlight` mode already gestures at this (biasing non-brute attacks down while a brute
   is live) — worth generalizing so *any* enemy carrying a special mechanic (once you have more than
   mace/spear/brute) gets the same "only one novel rule active at a time" treatment, independent of
   which specific enemy it is.

6. **If you ever move off a single continuous arena, treat "room" as the authored unit**, per Dead
   Cells/Gungeon: a room template tagged with a monster-density budget and a purpose (fight / rest /
   reward), hand-tuned and then assembled by a graph — not a live procedural spawn table. Your
   `firstWaveMix` array is already the hand-tuned seed of that idea.
