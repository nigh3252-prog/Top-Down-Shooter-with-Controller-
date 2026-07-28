# Game Flow

> A practical description of what the player currently does, where the major gameplay loops connect, and where proposed features belong.

This describes the current Combat Arena run prototype. It is a living reference, not a promise that every layer is final.

## 1. Start the game

The player opens the launcher and enters the Combat Arena or a focused lab.

The labs are development tools. They isolate weapons, enemies, animation, spawning, maze generation, audio, or other systems. They are not the intended final run structure.

## 2. Choose a starting loadout

The current run setup presents three offers.

Each offer contains:

- One weapon.
- The fixed starter stances Rat Step and Deep Launch.
- Two non-stance starter cards drawn for that offer.

The player chooses one complete offer. The selected weapon is equipped, the run deck is created, Rat Step becomes the opening stance, and the arena begins.

### Design purpose

The opening choice should immediately give the run a physical combat identity and a small set of understandable card interactions. It should not require a long pre-run build screen.

## 3. Enter the active room

Only the current combat room is constructed and active. The broader dungeon is retained as lightweight run data.

The player enters a room through a short doorway transition. The room supplies the immediate combat space, obstacles, enemies, and exits.

### Room loop

1. Enter the room.
2. Read the space and enemies.
3. Fight until the encounter is cleared.
4. Claim or skip a reward.
5. Open an exit.
6. Transition into the next room.

## 4. Fight in real time

The player directly controls movement, facing, attacks, dodge, and card use.

The current combat rhythm is:

1. Approach or reposition.
2. Commit to a light, heavy, or defensive action.
3. Read whether the attack connects, misses, is blocked, or creates an opening.
4. Spend stamina through attacks.
5. Use a stance card to change stance and restore stamina.
6. Use non-stance cards when their tactical condition is appropriate.
7. Continue adapting to enemy pressure.

This is not a turn-based card resolution loop. Cards and deck state sit inside a continuous action-combat loop.

## 5. Attack loop

### Light attack

- Starts the current light sequence.
- The second light is presently gated by the first hit connecting.
- A successful link flows directly from recovery into the next windup.

### Heavy / stance finisher

- Uses the active stance's finisher.
- Can be held to charge through stronger feel tiers.
- Higher tiers can alter windup, damage, knockback, stun, hitstop, and lunge.

### Attack families

Horizontal, vertical/chop, and thrust attacks should create different spacing and target decisions. They are not merely three animations with interchangeable statistics.

## 6. Stamina and stance loop

This is one of the game's defining loops.

1. Attacks spend stamina.
2. Landed attacks keep their cost.
3. Missed attacks may leave gray, conditionally recoverable stamina.
4. Stamina does not normally refill by waiting.
5. The player plays a stance card.
6. The stance changes and stamina refills.
7. Combat resumes under the new stance's attack sequence and guard pose.

The intended result is that low stamina creates a transition decision instead of a passive waiting period.

### Important distinction

A gray-stamina refund is not baseline stamina regeneration. It is a recoverable consequence of a miss and may be lost when the player is hit.

### Experimental extension: exhaustion timing

A recent design direction is an Exhaustion Catch-style timing opportunity:

- The player may spend the last available stamina on one final attack.
- A brief visual flash creates a small timing test.
- Correctly playing a stance card performs the transition cleanly and restores stamina.
- Poor timing may create a meaningful attack lockout.

This is not yet a settled universal rule. Exact timing windows, penalties, eligibility, and whether it belongs to all stances remain open.

## 7. Card loop

The current deck uses two visible hand slots.

### Playing a stance card

1. The card is played from LB or RB.
2. It becomes the active stance.
3. Stamina refills.
4. The card moves to discard.
5. A replacement is drawn.

### Playing a non-stance card

1. The ability or modifier resolves.
2. The current stance remains active.
3. The current stamina state is preserved.
4. The card is replaced.

### Deck exhaustion

When no cards remain in hand or draw pile, the discarded cards reshuffle automatically.

### Manual shuffle

The player can throw away the tray and begin a timed shuffle. This creates downtime and should be treated as a combat commitment rather than a free hand reroll.

## 8. Enemy interaction loop

A healthy melee enemy loop should generally contain:

1. Acquire or predict a useful position.
2. Approach to an intentional range.
3. Telegraph or prepare an action.
4. Commit to the action.
5. Resolve hit, block, dodge, or miss.
6. Recover or reposition.
7. Re-enter pressure instead of idling indefinitely.

Different enemies can alter this loop with guard behavior, dodges, ranged attacks, delayed pursuit, group coordination, or predictive positioning.

The combat director may coordinate attackers, but it should not make most enemies feel inert. No-director and high-aggression modes are valid experiments for finding the desired pressure.

## 9. Clear the room

When the encounter is defeated, the room is marked clear. Previously sealed progression becomes available.

The current dungeon behavior makes unopened exits weapon-hittable after the room is cleared. Opening and entering an exit begins the next room transition.

## 10. Choose a reward

After clearing a room, the player can trigger the reward choice.

The current reward flow is:

1. Present three cards.
2. Choose one card or skip.
3. Add the chosen card to the run pool.
4. Resume play and proceed to an exit.

Rewards may include stance cards, ability cards, or modifier cards.

### Reward design rule

A good reward should create a noticeable new behavior, decision, combo, timing rule, targeting rule, cost rule, or defensive interaction. Avoid filling the reward pool with small percentage improvements that do not change play.

## 11. Continue the run

The player repeats the room, combat, reward, and transition loops.

The following macro-flow elements remain open:

- Number and order of rooms.
- Branching-map presentation.
- Elite rooms and bosses.
- Healing and recovery between rooms.
- Run loss and restart flow.
- Final victory condition.
- Persistent progression between runs.
- Deck size limits, removal, replacement, and duplication rules.

Do not invent these as settled facts when implementing a local combat feature.

## 12. Where new features belong

Before adding a feature, identify its place in the flow:

- **Loadout feature:** changes the initial choice.
- **Room feature:** changes navigation, layout, hazards, or encounter setup.
- **Attack feature:** changes execution, hit behavior, recovery, or weapon identity.
- **Stamina feature:** changes expenditure, refund, stance access, or exhaustion.
- **Card feature:** changes draw, hand, play, discard, shuffle, or card effects.
- **Enemy feature:** changes approach, pressure, defense, commitment, or recovery.
- **Reward feature:** changes how a run develops after a room.
- **Meta feature:** changes the run structure or progression outside combat.

A feature that touches multiple loops should name all of them. For example, delaying stance-card readiness is simultaneously a card-system change, a stamina-recovery change, and an enemy-pressure change.

## 13. Flow validation questions

When reviewing a new idea, ask:

1. What does the player do differently moment to moment?
2. Where does this enter the current flow?
3. Does it accidentally add passive stamina recovery?
4. Does it require attention that competes with reading enemies?
5. Does it make a weapon or stance more distinct?
6. Does it create an active decision or merely a statistical benefit?
7. What happens when the player fails the interaction?
8. Can the effect be understood on a phone in landscape orientation?
9. Does the enemy system continue applying pressure while this happens?
10. Is this an implementation of a current rule or an experiment that should remain isolated?