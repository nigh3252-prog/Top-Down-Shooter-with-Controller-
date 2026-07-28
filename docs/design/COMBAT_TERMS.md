# Combat Terms

> Project-specific vocabulary for design discussions, implementation prompts, issue reports, and AI collaboration. Use these meanings instead of importing assumptions from other games.

## Core resources and cards

### Stamina

The resource spent by attacks. It does not ordinarily regenerate by waiting. True stance cards are the main recovery mechanism.

### Gray stamina

Stamina conditionally recoverable after a missed swing. It is a refund mechanic, not baseline passive regeneration. Taking a hit can remove the pending recovery.

### Exhaustion

The state created when the player has insufficient stamina to continue the normal attack loop. The exact final behavior is still being designed.

### Exhaustion Catch

An experimental timed transition after spending the last stamina. The player may receive one final attack and then a brief window to play a stance card cleanly. Poor timing may cause a significant attack cooldown.

### Stance card

A card that changes the active stance and restores stamina. In the current deck it is discarded after use and replaced by a newly drawn card.

Do not use “stance card” as a generic name for every card in the tray.

### Active stance

The stance currently governing the player's ready guard, attack chain, and stance finisher. Ability and modifier cards can resolve without replacing it.

### Non-stance card

A broad category for ability and modifier cards that use the card system without becoming the active stance or automatically restoring stamina.

### Ability card

A non-stance card that triggers a distinct combat action, such as Pilebunker. It preserves the active stance and current stamina state unless the ability explicitly says otherwise.

### Modifier card

A non-stance card that changes or empowers combat behavior, such as Blood Slash. It does not inherently replace the active stance or restore stamina.

### Hand / tray

The currently visible playable card slots. The present prototype has two slots controlled by LB and RB.

### Draw pile

Cards waiting to enter the hand.

### Discard pile

Cards that have been played or manually thrown away and are waiting to be reshuffled.

### Manual shuffle

A player-triggered action that clears the current hand and starts a timed delay before dealing a fresh hand. It is a combat commitment, not a free reroll.

### Run pool / run deck

The cards currently belonging to the active run. Room rewards add cards to this pool.

## Attacks

### Attack family

The physical category of an attack: horizontal, vertical, or thrust. Attack family should influence reach, space coverage, stagger, target behavior, stamina cost, and tactical purpose.

### Horizontal / slice

An attack traveling broadly across the player. Usually suited to lateral coverage or multiple targets, depending on the weapon. “Slice” is descriptive, not a guarantee of cleave.

### Vertical / chop

A predominantly vertical attack. In this project, **chop** is the normal shorthand for vertical attacks. Chops are the primary intended home for reliable stagger as weapon power increases.

### Thrust / stab

A forward-pointing attack focused along a line. Often associated with reach and precise targeting rather than wide cleave.

### Light attack

The fast primary attack input. The current version uses a two-hit sequence whose second hit requires the first hit to connect.

### Heavy / stance finisher

The stronger attack input associated with the active stance's finisher. It can be held to charge through stronger feel tiers.

### Charge tier

A named point on the heavy-attack feel continuum. Current prototype tiers range from WIMPY through stronger, more exaggerated levels up to CARTOON. Tiers can alter timing, damage, lunge, knockback, stun, hitstop, and presentation.

### Hit confirm

A rule that allows a follow-up only when the preceding attack actually connects. The current Light 1 to Light 2 sequence uses hit confirmation.

### Recovery

The committed period after an attack before the actor can freely return to guard, move into another action, or accept a buffered follow-up.

### Attack buffer

A queued input accepted before the current action is completely finished, then executed at the valid transition point.

### Cleave

The ability for one attack to affect multiple targets. Cleave is not universal. It should follow weapon shape, attack family, and move power.

### Lunge / magnetism

A short positional correction that helps an attack connect when the target is just outside comfortable range. It should support intention without becoming full nearest-target snapping.

## Impact and defense

### Stagger

A hit reaction that meaningfully interrupts or destabilizes an actor. Stagger should not happen on every hit. It is intended to be strongly associated with chops and heavier impacts.

### Stun

A more explicit period during which the target cannot act. Stun is generally stronger and more sustained than a brief stagger.

### Knockback

Forced movement away from the impact. It changes spacing and can interact with room geometry, enemy groups, and movement-linked effects.

### Poise

A target's resistance to interruption or stagger. Exact poise rules are not yet finalized.

### Guard

An active defensive state that blocks or redirects eligible attacks. Guard should have readable timing, direction, weapon position, and counterplay rather than being random invulnerability.

### Guard break

An attack or condition that defeats guard. Current design direction gives chops and heavier attacks a strong role in breaking guarded enemies.

### Parry

A precisely timed defensive answer that negates or reverses an incoming commitment. It is narrower and more timing-dependent than a general guard.

### Dodge

A player-controlled movement action used to evade danger. The Warden's preferred identity is a slide rather than a conventional roll.

### I-frames

A short invulnerability window during a dodge or another action. I-frames are one component of dodge behavior, not the entire defensive identity.

### Active defense

Defense requiring timing, positioning, direction, resource use, stance choice, or another player action. This is preferred over passive durability as the main defensive build language.

### Passive durability

Bonus health, universal damage reduction, or armor that simply allows more hits. It may exist in limited forms, but it is not the preferred foundation for defense.

## Enemy behavior

### Combat director

The system coordinating enemy pressure, including which enemies are allowed or encouraged to commit attacks. It should create readable group combat without making most enemies idle.

### Attack token

Permission or budget granted by the director for an enemy to make an active attack commitment. Exact token rules may vary by mode.

### No-director mode

An experiment that bypasses normal attack coordination so many or all enemies can act. Used to study pressure and expose AI problems hidden by token limits.

### Aggression

How readily an enemy closes distance, seeks opportunities, re-enters pressure, and commits. Aggression is not the same thing as movement speed.

### Hold distance

The intentional range an enemy tries to maintain before preparing or committing an action.

### Lunge commit

The phase where an enemy stops merely positioning and commits forward into an attack.

### Telegraph

Readable preparation before an attack or important defensive action. Telegraphing should communicate intent without making enemies harmless.

### Recovery window

The punishable period after an enemy's committed action.

### Duel enemy

An enemy designed to create a readable one-on-one exchange through spacing, guard, dodge, attack commitment, recovery, and counters rather than relying only on higher statistics.

## Build-system concepts under exploration

### Timeline / Tetris timeline

An experimental between-fight build surface where cards or blocks are arranged on a shared sequence. Placement and loop length may determine readiness, cooldown, synergies, and the behavior of equipped systems.

This is not the same as an action timeline the player must constantly watch during combat.

### Tick

One unit of progress on the experimental timeline. An ability may require a number of ticks before becoming ready.

### Draw-to-ready cooldown

An experimental rule where a card begins cooling down when drawn rather than after use.

### Slot

A defined role in an experimental build layout, such as an ability button, basic attack, or body slot.

### Body slot

An experimental slot controlling the character's physical or defensive rules, potentially including movement, dodge, armor behavior, or resource interactions.

### Sigil

An experimental placed effect or combat condition that can work alone and may combine with a stance and ability for a larger interaction.

### Synergy

A specific interaction where two or more rules combine to create behavior beyond their isolated effects. Prefer explicit, testable synergies over hidden percentage bonuses.

## Run and room terms

### Room clear

The state reached when the room's encounter is defeated. It enables the reward and exit progression flow.

### Reward choice

The post-room choice of one of three cards or skip. The selected card is added to the run pool.

### Active-room-only construction

The performance approach where only the current oversized combat room is fully built and simulated, while the dungeon outside it remains lightweight data.

### Lab

A focused development page used to test a system in isolation. Labs are not automatically part of the final player-facing run flow.

## Terms that require care

### Mana

Do not use as a synonym for stamina. Some UI or inherited prototype code may still display mana-like language, but the combat resource discussed in these documents is stamina.

### Basic attack

May mean the current light attack, the weapon's whole default attack package, or a future build slot. Specify which meaning is intended.

### Cooldown

May mean post-use downtime, draw-to-ready time, attack lockout after failed exhaustion timing, or timeline ticks. Name the exact cooldown type.

### Stance

May mean the active combat stance, a stance card, a ready pose, or a broader defensive identity. Specify the layer when ambiguity matters.

### Aggressive

Do not translate automatically into “moves faster.” Describe whether the enemy approaches sooner, holds closer, attacks more often, predicts movement, defends less, or recovers differently.