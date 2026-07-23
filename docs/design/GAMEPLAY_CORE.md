# Core Gameplay Rules

> Living design reference for humans and AI collaborators. This file describes the rules that should be treated as the current truth unless code or a newer design decision clearly supersedes them.

## How to read this document

Status labels:

- **CURRENT** — implemented now or explicitly established as the rule to design around.
- **DIRECTION** — a strong design principle, even if every system does not satisfy it yet.
- **EXPERIMENTAL** — being tested and allowed to change substantially.
- **OPEN** — unresolved. Do not silently invent a permanent answer.

When proposing or implementing a feature:

1. Do not replace these rules with genre-standard assumptions.
2. Call out any conflict with a **CURRENT** rule.
3. Preserve unusual knock-on effects instead of normalizing them toward Dark Souls, Hades, Slay the Spire, or another reference game.
4. If code and this document disagree, report the mismatch and determine whether the code or document is stale.

## Game identity

- **CURRENT:** A phone- and controller-friendly, real-time, top-down action game with weapon combat, dodging, enemies, rooms, and cards.
- **CURRENT:** Combat is directly controlled. Cards modify or trigger action combat; they do not replace movement, aiming, spacing, or attack execution.
- **DIRECTION:** The game should feel like a physical duel or brawl rather than an action game with mostly passive statistical builds.
- **DIRECTION:** Build choices should create visible rule changes, new interactions, or new decisions. Small percentage upgrades are generally a poor fit.
- **CURRENT:** Placeholder visuals and borrowed source-move names may exist for prototyping. They are references, not final presentation.

## Core action controls

The current Combat Arena model is:

- Move with the left stick.
- Face or aim with the right stick when available, with aim-assist options in some experiments.
- Light attack with Square / X.
- Heavy or stance finisher with Triangle / Y.
- Dodge with Cross / A.
- Play the two visible cards with LB and RB.
- Manually shuffle the card tray with Circle / B.

Keyboard and touch equivalents exist, but controller play in phone landscape is a primary target.

**OPEN:** The exact final button-to-card arrangement may change as the larger card system develops. Preserve the small, readable action-game control set.

## Stamina: nonstandard core rule

- **CURRENT:** Stamina does **not** passively regenerate over time.
- **CURRENT:** Playing a stance card fully restores stamina.
- **CURRENT:** Ability and modifier cards do not restore stamina merely because they occupy a card slot.
- **CURRENT:** A landed attack keeps its stamina cost.
- **CURRENT:** A missed swing may create recoverable gray stamina. This is a conditional refund of failed expenditure, not ordinary passive regeneration. Taking a hit can remove that pending recovery.
- **DIRECTION:** Running low on stamina should push the player toward a stance decision or timing interaction, not toward circling an enemy while waiting for a bar to refill.

### Consequences of the stamina rule

Any system affecting stance access also affects stamina recovery. This includes:

- Draw order and hand composition.
- Stance-card timing requirements.
- Manual shuffling and shuffle delay.
- Enemy pressure during a stance opportunity.
- Card effects that preserve, replace, delay, or deny a stance.
- Weapon stamina costs and attack commitment.

Do not casually add passive stamina regeneration, stamina-on-kill, or automatic between-attack recovery. Those effects would change the central combat economy and require an explicit design decision.

## Stance cards and the current deck

- **CURRENT:** The prototype uses a shuffled deck feeding two visible hand slots.
- **CURRENT:** Playing a true stance card changes the active stance, refills stamina, discards the card, and draws a replacement.
- **CURRENT:** When the deck is exhausted, the discard pile reshuffles automatically.
- **CURRENT:** Manual shuffle throws away the current tray and imposes a countdown before a fresh hand appears.
- **CURRENT:** Ability and modifier cards can be drawn in the same system while preserving the active stance and preserving the current stamina state.
- **CURRENT:** The present run starts with Rat Step and Deep Launch as fixed stance cards, plus two non-stance starter cards associated with the selected weapon offer.

**EXPERIMENTAL:** The current two-slot deck is a working prototype, not proof that the final card architecture must remain identical.

## Attack language and weapon combat

- **CURRENT:** Attacks are grouped into horizontal, vertical, and thrust families.
- **CURRENT:** A vertical attack is commonly called a **chop** in this project.
- **CURRENT:** Light attack currently forms a two-hit sequence, with the second hit gated by the first hit connecting.
- **CURRENT:** Heavy uses the active stance's finisher and can be held to charge through increasingly exaggerated feel tiers.
- **CURRENT:** Attack families can have different stamina costs, reach, target behavior, and tactical purpose.
- **DIRECTION:** Weapons should have distinct physical identities. A spear or rapier should not solve space in the same way as a battle axe, hammer, katana, or greatsword.
- **DIRECTION:** Cleave, stagger, knockback, and charge should follow the physical logic of the move rather than being distributed evenly as generic bonuses.

## Stagger and interruption

- **DIRECTION:** Not every landed hit should automatically interrupt an enemy attack.
- **DIRECTION:** Stagger should be concentrated in vertical/chop attacks and heavier impacts.
- **DIRECTION:** Stagger reliability should scale sharply with weapon and move power. A dagger slice should generally not behave like a hammer chop.
- **OPEN:** Exact thresholds, enemy poise rules, and exceptions remain tunable.

## Defense and health

- **DIRECTION:** Health represents mistakes.
- **DIRECTION:** Defensive builds should primarily help the player avoid, negate, redirect, or correctly answer mistakes rather than simply permit more mistakes through bonus health or passive armor.
- Preferred defensive mechanics include blocking, parrying, dodging, guard windows, directional protection, poise, spacing tools, and stance-specific defensive behavior.
- Armor is more interesting when it changes which hits count as mistakes than when it only reduces all incoming damage by a percentage.

## Enemies and combat pressure

- **CURRENT:** The Combat Arena includes a director/token system that limits or coordinates attackers, alongside experiments that bypass it.
- **DIRECTION:** Enemies should approach decisively, create understandable pressure, and continue their combat loop instead of walking near the player and idling.
- **DIRECTION:** Strong melee enemies should feel like readable duel partners with intent, spacing, commitments, defensive responses, and punishable recoveries.
- **DIRECTION:** Speed and aggression are separate concepts. Raising aggression should not merely make every enemy move faster.
- **OPEN:** The final balance between coordinated pressure, simultaneous attackers, and one-on-one duel behavior is not settled.

## Runs, rooms, and rewards

- **CURRENT:** Only the current oversized combat room is live at once.
- **CURRENT:** Clearing a room enables progression through its exits.
- **CURRENT:** The player receives a choice of three cards after a cleared room and may skip.
- **CURRENT:** Reward choices can include stance and non-stance cards.
- **DIRECTION:** Rewards should create discrete, legible gameplay changes rather than mostly percentage-based stat growth.
- **OPEN:** Final run length, bosses, map structure, meta-progression, deck limits, and victory/end states are not locked.

## Mobile and presentation constraints

- **CURRENT:** Phone landscape with a Backbone-style controller is a primary play and review environment.
- **DIRECTION:** Menus must remain readable at short screen heights and should be collapsible or minimizable when they obstruct play.
- **DIRECTION:** Combat information should be legible without requiring the player to watch a dense timeline, hand, or HUD while actively fighting.

## Assumptions AI collaborators must not make

Do not assume that:

- Stamina returns by waiting.
- Every card restores stamina.
- More armor or health is automatically a desirable defensive upgrade.
- A card game reference means combat becomes turn-based.
- Every weapon should share the same cleave, stagger, or targeting rules.
- The current prototype deck is permanently final.
- An experimental discussion has replaced the implemented system unless explicitly stated.

## Updating this file

When a rule changes, update the relevant status and include a short note in `DESIGN_FRONTIER.md` if the change resolves or reopens a major question. Prefer a small accurate document over an exhaustive document that mixes several historical versions of the game.