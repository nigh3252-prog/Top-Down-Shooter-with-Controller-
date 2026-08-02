# Stance 2.0 Gate 5 Checklist

Implementation tracking companion to `STANCE_2_GATE_5_PLAN.md`.

## Gate 5A — Defense spine

- [ ] Add `defenseDown`, `defenseUp`, `updateDefense`, and `cancelDefense` interfaces.
- [ ] Route controller, keyboard, and touch through the shared interface.
- [ ] Preserve the current universal dodge as fallback behavior.
- [ ] Add composable player-damage resolution without breaking Arcana interception.
- [ ] Add Enemy Lab defense diagnostics.

## Gate 5B — Three-stance pilot

- [ ] Rat Step directional Sidestep.
- [ ] Long Blade Form timed Deflect.
- [ ] Hammerfall Guard held Brace.
- [ ] Character-level defensive state feedback.
- [ ] Focused runtime and state-machine tests.

## Gate 5C — Compatibility and stamina

- [ ] Full / Adapted / fallback defense profiles for the dagger / longsword / greatsword 3×3 pilot.
- [ ] Route defensive costs through `stance-defense` spend source.
- [ ] Validate defensive Overdraw and Stance Catch.
- [ ] Tune costs only after defensive feel is approved.

## Gate 5D — Enemy validation

- [ ] Fast melee strings.
- [ ] Heavy committed strikes.
- [ ] Pounces and lunges.
- [ ] Projectiles.
- [ ] Rear attacks.
- [ ] Simultaneous pressure.

## Gate 5E — Full rollout

- [ ] Classify all 30 stances by defensive family and authored variation.
- [ ] Expand remaining weapon compatibility.
- [ ] Preserve unusual stance identities rather than relying on numerical variants.
- [ ] Complete Enemy Lab and documentation coverage.
