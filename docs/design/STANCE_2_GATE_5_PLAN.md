# Stance 2.0 Gate 5 Plan

> Planning document for stance-specific active defense and the eventual full Stance 2.0 rollout. Gate 4 is the approved baseline: Overdraw, Stance Catch, Exhaustion, class payoffs, and movement commitment are already established.

## Goal

Make the active stance determine the player's defensive answer. Health should continue to represent mistakes, so Gate 5 should emphasize correctly avoiding, deflecting, or blocking threats rather than adding passive armor or bonus health.

The existing defense input remains one button, but its behavior changes with stance. Gate 5 should support both press and release events so stances may use taps, timed windows, or held defense without adding more combat buttons.

## Pilot defensive identities

### Rat Step — Sidestep

- Directional, short-distance evasive step.
- Fast startup and recovery.
- Low stamina cost.
- Brief invulnerability rather than a long universal roll.
- Preserves facing more than the current dodge so the player can immediately resume pressure.
- Full Light expression receives the cleanest movement and earliest control return.

The intended decision is spacing and angle: evade narrowly, remain close, and keep attacking.

### Long Blade Form — Deflect

- Tap defense to open a short timed deflection window.
- Correct timing negates the incoming hit and creates a readable counter opportunity.
- A successful deflect should change the next decision, such as opening a counter-ready state or confirmed follow-up—not merely grant a damage percentage.
- Missing the timing creates a brief defensive recovery.
- It should not become an indefinite held guard.

The intended decision is enemy-reading and timing.

### Hammerfall Guard — Brace

- Hold defense to plant and brace toward the facing direction.
- Correctly facing the attack blocks it; attacks from behind remain dangerous.
- Strong impacts consume meaningful stamina and may break the brace if the player cannot pay.
- Full Heavy expression can answer the largest ordinary melee impacts but remains planted and committed.
- Releasing brace has a short recovery so it cannot be flickered without consequence.

The intended decision is commitment, facing, and stamina budgeting.

## Compatibility model

Defense compatibility should be authored separately from attack compatibility, even though both use Light / Medium / Heavy classes.

- **FULL:** the stance performs its defensive identity cleanly.
- **ADAPTED:** the same identity remains recognizable but receives a discrete compromise.
- **UNUSABLE attack pair:** does not automatically mean the player loses all defense. Body-based defense may remain available, while weapon-dependent defense may fail or transform.

Initial pilot examples:

- Rat Step + longsword: slower/shorter sidestep recovery rather than simply reduced invulnerability by a percentage.
- Long Blade + dagger: close deflect with a smaller timing window and stronger positioning demand.
- Long Blade + greatsword: slower deflect startup but a more forceful successful redirect.
- Hammerfall + longsword: braced guard with a lower impact ceiling.
- Hammerfall + dagger: the dagger cannot provide Hammerfall's intended leverage; this needs an authored fallback or explicit failure treatment.

## Overdraw and Stance Catch integration

Stance-provided defense uses the existing `stance-defense` source in the shared spend policy.

- A defense may Overdraw only from a positive stamina reserve.
- Overdraw opens Stance Catch exactly like an attack Overdraw.
- Ability-card defenses and Arcana costs do not count as stance defense.
- A successful defense does not automatically refund its cost.
- A defense that never becomes active because it is interrupted before startup should not create a false Catch.

This makes a last-second brace, deflect, or sidestep capable of becoming the final committed action before a stance transition.

## Input architecture

Replace the current one-shot universal dodge call with a stable defense interface:

- `defenseDown(input)`
- `defenseUp(input)`
- `updateDefense(dt)`
- `cancelDefense(reason)`

Controller, keyboard, and touch should all route through this interface. The current defense button remains mapped to Cross / LT / K.

## Damage-resolution architecture

The existing player-damage path already supports Arcana interception. Gate 5 should not overwrite that with another single callback.

Create a composable player-defense resolution layer with ordered results:

1. Existing invulnerability / untargetable checks.
2. Stance defense evaluation.
3. Existing Arcana damage interception.
4. Remaining damage reaches health.

A stance-defense result should report a discrete outcome such as:

- `evaded`
- `deflected`
- `blocked`
- `guard-broken`
- `failed-facing`
- `not-active`

Enemy systems should not need to understand individual stances.

## Proposed build gates

### Gate 5A — Defense spine

- Add `defenseDown`, `defenseUp`, update, and cancellation interfaces.
- Add composable damage-resolution infrastructure.
- Preserve current universal dodge as the fallback profile.
- Add Enemy Lab diagnostics showing the active defense profile and state.
- No stance-specific behavior changes yet.

### Gate 5B — Three-stance pilot

Implement Rat Step Sidestep, Long Blade Deflect, and Hammerfall Brace for the approved dagger / longsword / greatsword pilot.

Focus on readability and distinct decisions before fine balance.

### Gate 5C — Compatibility and stamina

- Author Full / Adapted / fallback defense expressions for the 3×3 pilot.
- Route costs through the shared Overdraw policy.
- Validate Catch behavior after defensive Overdraw.
- Tune defensive stamina costs only after the three actions feel correct.

### Gate 5D — Enemy validation

Test the pilot against:

- fast light melee strings
- large committed strikes
- pounces and lunges
- projectiles
- attacks from behind
- simultaneous pressure

Each stance should have deliberate strengths and vulnerabilities; no defense should answer every threat equally well.

### Gate 5E — Full rollout

- Classify all 30 stances by defensive family and authored variation.
- Expand remaining weapon compatibility.
- Keep unusual stance identities rather than reducing everything to Sidestep / Deflect / Brace with new numbers.
- Update deck, Enemy Lab, and documentation coverage.

## Acceptance criteria for the pilot

- The three stances create visibly different defensive decisions on one button.
- Correct defense prevents mistakes rather than merely reducing damage.
- Defense costs interact correctly with Overdraw and Stance Catch.
- No stance becomes a universally superior defensive answer.
- Existing Arcana invulnerability and damage interception continue to work.
- Controller, touch, and keyboard behavior match.
- Defensive state is readable from the top-down camera.
