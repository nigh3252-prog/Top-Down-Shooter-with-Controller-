# Design Frontier

> A place for strong directions, active experiments, competing models, and unresolved questions. Content here should inform prototypes without being mistaken for final rules.

## Status system

- **CURRENT:** Implemented or explicitly established. Also belongs in `GAMEPLAY_CORE.md` when broadly important.
- **LIKELY:** Strong preferred direction, but details are still movable.
- **EXPERIMENTAL:** Worth prototyping. May be discarded without treating the experiment as a failure.
- **OPEN:** No answer is locked.
- **DEPRECATED:** Previously considered or implemented, but no longer the intended direction.

Every major design discussion should end by deciding whether anything changed status.

## Strong established directions

### Stamina recovery through stances

- **CURRENT:** No ordinary passive stamina regeneration.
- **CURRENT:** True stance cards restore stamina; ability and modifier cards do not automatically do so.
- **LIKELY:** Stamina depletion should produce a skillful stance transition rather than passive waiting.

### Active defense

- **LIKELY:** Health represents mistakes, and defense should help the player avoid or correctly answer mistakes.
- **LIKELY:** Blocking, parrying, dodging, guard timing, directional defense, spacing, and poise are better foundations than generic bonus health or armor percentages.

### Discrete upgrades

- **LIKELY:** Upgrades should change rules or behavior in a legible way.
- Positive examples include changing an attack family, adding a conditional follow-up, altering targeting, changing cost timing, creating a new defensive answer, or connecting two existing systems.
- Small numerical increases should be used sparingly and should not carry the build system by themselves.

### Physical weapon identities

- **LIKELY:** Weapon differences should be readable through animation, reach, timing, stamina commitment, attack family, cleave, stagger, knockback, and targeting.
- A different weapon should ask for different play, not merely produce a different damage number.

## Current prototype versus possible future architecture

### Current prototype: two-card active tray

- **CURRENT:** Two visible cards are drawn from a shuffled deck.
- **CURRENT:** Stance cards change stance and refill stamina.
- **CURRENT:** Ability and modifier cards resolve while preserving stance and stamina.
- **CURRENT:** Cards are selected during live combat.

This is the implemented baseline and should remain functional unless a branch explicitly replaces it.

### Between-fight Tetris timeline

- **EXPERIMENTAL:** Arrange cards or blocks on a shared timeline between encounters.
- The arrangement defines how abilities, basic attacks, body properties, cooldowns, and synergies behave during combat.
- Adding more blocks may lengthen the loop, making build size itself a cost.
- Individual abilities may require a number of timeline ticks before becoming ready.
- **LIKELY if adopted:** The player should not need to stare at the timeline during action combat. It should primarily be a build-composition layer.

Open questions:

- Does the timeline replace the active hand or coexist with it?
- Does it automate abilities, only govern readiness, or modify manual buttons?
- Is there one shared loop or separate loops by slot?
- How visible does timeline state need to be during combat?
- What prevents optimal but unreadable arrangements?

### Five-slot build model

- **EXPERIMENTAL:** Three ability-button slots, one basic-attack slot, and one body slot.
- A card may behave differently depending on where it is installed.
- This could support discrete transformation without requiring a large active hand.

Open questions:

- Are slots universal or character-specific?
- Can one card occupy multiple cells or slots?
- How do stance cards fit the model?
- Does the body slot change defense, movement, or resource rules?

### Sigil + stance + ability combinations

- **EXPERIMENTAL:** One card places a sigil, one establishes a stance, and one performs an ability.
- Each component should function independently, while a specific combination creates a larger special interaction.

Open questions:

- Is the combination assembled in the deck, in the timeline, or during live play?
- Does the player intentionally sequence the three parts or discover the combination through build composition?
- How many combinations can remain readable?

### One-card-at-a-time model

- **EXPERIMENTAL:** Present one primary card at a time, inspired by Meteorfall-style clarity.
- Defense could be strongly tied to the active stance: large dodge, sidestep, block, parry, or another readable answer.

This competes with the current two-slot tray and should be tested on an isolated branch before replacing it.

## Exhaustion Catch

- **LIKELY concept; EXPERIMENTAL implementation:** When the player spends the last stamina, allow one final committed attack and then create a brief stance-card timing opportunity.
- A successful timed stance play restores stamina and continues combat cleanly.
- A poor input may impose a meaningful three- or four-second attack lockout.
- The interaction should resemble a small active-reload timing test, not a large rhythm-game overlay.
- High-cost weapons may benefit because they reach the final committed attack more dramatically.

Open questions:

- Is the last attack allowed at zero stamina, or is a small overdraft reserved for it?
- Is the timing window universal, stance-specific, weapon-specific, or upgradeable?
- Does failure block only attacks, or also dodge and cards?
- Can enemies interrupt the window?
- What feedback communicates early, correct, late, and missed timing?
- Does this become a core rule or a special card/stance effect?

## Card readiness and cooldown timing

- **EXPERIMENTAL:** A card's cooldown may begin when it is drawn rather than after it is used.
- Basic stance cards might require a shorter draw-to-ready period, while stronger abilities require longer.
- Effects could alter readiness duration or interact with discard and shuffle.

Open questions:

- Can an unready stance card still be used for emergency stamina recovery?
- Does readiness apply to the card, the slot, or the effect?
- What happens when a card is discarded before becoming ready?
- How does this interact with Exhaustion Catch?
- Is visible cooldown tracking too distracting during combat?

## Defensive stance identities

- **LIKELY:** Stances should eventually define more than attack chains and ready poses.
- Possible defensive identities include a large dodge, short sidestep, held guard, timed parry, directional shield, counter stance, or poise-focused stance.

Open questions:

- Is dodge behavior determined by active stance, body slot, character, or separate card?
- Can every stance answer every threat, or should stance selection create deliberate vulnerabilities?
- How often can the player switch without trivializing enemy commitments?

## Enemy pressure and duel behavior

- **LIKELY:** Melee enemies should approach to a useful range and keep participating.
- **LIKELY:** Guarding, dodging, attack commitments, recovery, and spacing should be intentional enough to create a duel.
- **EXPERIMENTAL:** Director bypass, avalanche, chaos, frenzy, and aggression-level presets.
- **EXPERIMENTAL:** Predictive movement inspired by Pac-Man, adapted to open rooms through interception points, player momentum, room geometry, role-based positioning, or coordinated herding.

Open questions:

- How many enemies may commit simultaneously by default?
- Should ranged enemies consume the same attack budget as melee enemies?
- How should defensive enemies decide when to guard?
- What is the desired difference between aggression and reaction skill?
- When should an enemy disengage or yield space?

## Character and card-pool structure

- **OPEN:** Whether all characters use the full card pool or have strongly bounded pools.
- **OPEN:** Whether the Warden is a generalist using the full pool or the template for all characters.
- **OPEN:** How many starting stances, non-stance cards, and weapon choices a character receives.
- **OPEN:** Whether cards are collected, upgraded, transformed, replaced, fused, or removed during a run.

## Run structure

The prototype has rooms and post-room rewards, but the full run is not locked.

Open questions:

- Run length and act structure.
- Branching path selection.
- Bosses, elites, shops, rest spaces, and events.
- Healing rules.
- Failure and restart flow.
- Persistent unlocks versus run-only progression.
- Whether the player may reconfigure timeline/slots after every room or only at specific stops.

## Camera and aiming

- **CURRENT:** Top-down is the main game identity.
- **EXPERIMENTAL:** A third-person Combat Arena camera with the player low in frame.
- **EXPERIMENTAL:** Soft aim assist, auto aim, manual aim, attack nudging, and melee magnetism.

Open questions:

- Which aiming model is default on a Backbone controller?
- How much aim correction preserves weapon skill rather than replacing it?
- Can third-person experiments teach useful lessons without changing the main game format?

## Height and environment

- **OPEN:** How to introduce meaningful elevation while remaining readable from a top-down camera.
- **LIKELY:** Only the current room needs full visual and collision complexity.
- **LIKELY:** Props and room decoration should improve identity without causing dash hitches or obscuring combat reads.

## Deprecated or rejected defaults

- **DEPRECATED as a default:** Passive stamina regeneration.
- **DEPRECATED as the main defense model:** Large amounts of passive durability, bonus health, or universal damage reduction.
- **DEPRECATED as the main upgrade language:** Repeated small percentage increases.
- **DEPRECATED:** Treating every hit as a guaranteed stagger or attack interruption.
- **DEPRECATED:** Giving all weapons the same cleave behavior.

## Conflict log template

Use this when implementation, documentation, and a new decision disagree:

```md
### YYYY-MM-DD — Short topic

- Previous rule:
- New observation or decision:
- Affected systems:
- Temporary prototype behavior:
- Intended status: CURRENT / LIKELY / EXPERIMENTAL / OPEN / DEPRECATED
- Documents or code that need updating:
```

A conflict is useful evidence. Record it rather than quietly blending two incompatible versions of the game.