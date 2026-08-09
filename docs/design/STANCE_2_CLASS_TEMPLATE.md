# Stance 2.0 Class Template Rollout

The approved Rat Step / Long Blade Form / Hammerfall Guard × Dagger / Longsword / Greatsword pilot is the canonical class behavior matrix for all stance attacks.

| Stance class | Light weapon | Medium weapon | Heavy weapon |
| --- | --- | --- | --- |
| Light | Rat Step + Dagger | Rat Step + Longsword | Rat Step + Greatsword |
| Medium | Long Blade + Dagger | Long Blade + Longsword | Long Blade + Greatsword |
| Heavy | Hammerfall + Dagger | Hammerfall + Longsword | Hammerfall + Greatsword |

Every one of the 30 stance cards resolves through this matrix using its existing Light / Medium / Heavy classification. Every weapon definition with a weight class resolves through the same matrix, including the Light Whip even though it is outside the main ten-weapon order.

The nine pilot cells remain the source data, but they define expression rather than replacing stance identity. Same-class and adjacent-weight cells keep each stance's authored three-move chain. Adjacent cells procedurally retarget those same attacks using the source pilot cell's grip concept, pacing, reach, damage, stagger, cleave, movement/recovery behavior, and a cached pose adapter that compresses or braces hold position, tip trajectory, lunge, and body commitment by attack family. Light + Heavy and Heavy + Light alone replace the stance chain with the approved failed-use attacks. Matched Light, Medium, and Heavy pairs also inherit the corresponding Gate 3 payoff.

Defense assignment is a separate stance-ID layer and does not change this attack/weight behavior.


## Player-facing type names

The stable internal class IDs remain Light / Medium / Heavy, while player-facing UI calls them **Speed / Balanced / Power**. Stance-card art uses **» SPEED**, **◈ BALANCED**, and **⬟ POWER**; the three-card room reward selector uses **S / B / P** badges. `normalizeStanceClass()` accepts either vocabulary.

Weapon-class tuning now treats **Katana as Light / Speed** and **Claymore as Medium / Balanced**. The existing 3×3 template automatically recomputes compatibility from those classes; no pair-specific exceptions are added.
