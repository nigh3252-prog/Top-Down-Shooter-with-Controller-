# PR #120 preservation ledger

Gate 0.5 integrates the complete, non-squashed history of PR #120 and the
follow-up Test-to-Standard commit into current Main.

- Main integration base: `173809b9b9a23a09a14084f1f1d6eaf51a95ee52`
- Preserved donor head: `e98adba6ff68d5acfbca04178fe9986f5779251e`
- Donor merge base: `3f0528b280ca31dccca96154337b5633a9a65afc`
- Integration branch: `codex/pr120-main-integration`
- Durable donor backup: `origin/codex/pr120-preserved-e98adba`

Allowed dispositions:

- **PRESERVED AS-IS**
- **PRESERVED WITH MAIN UPDATE**
- **SUPERSEDED BY APPROVED INSPECTOR UX**
- **DEFERRED**
- **REMOVED — USER APPROVED**

Nothing in Gate 0.5 has the `REMOVED — USER APPROVED` disposition.

## Commit ledger

Every commit in `3f0528b..e98adba` is represented exactly once.

| Commit | Subject | Disposition | Integration evidence |
|---|---|---|---|
| `57bb47f` | Add project workflow guardrails | **PRESERVED AS-IS** | `AGENTS.md` is carried into the integration branch. |
| `f47a0aa` | Localize the player combat dependency chain | **PRESERVED WITH MAIN UPDATE** | Local `player-combat-core.js` and `player-combat-pilebunker.js` remain; current Main Stance behavior and tests are retained. |
| `b7d068c` | Add canonical enemy content registry | **PRESERVED WITH MAIN UPDATE** | Enemy definitions and adapters remain registry-backed while Main's newer enemy content/status behavior is retained. |
| `7da52c8` | Add authoritative card and effect registries | **PRESERVED WITH MAIN UPDATE** | `card-definition.js`, `card-registry.js`, and `effect-registry.js` remain authoritative over the current Main inventory. |
| `8a76949` | Route all card effects through injected handlers | **PRESERVED WITH MAIN UPDATE** | Injected dispatch remains; current Main Arcana, stance, and ability runtime behavior is included. |
| `a19bf75` | Complete Pass 1 content integration | **PRESERVED WITH MAIN UPDATE** | `game-content.js`, compatibility exports, roster/pool consumers, and current Main content tests are retained together. |
| `20065d2` | Extract shared same-document Arena runtime | **PRESERVED WITH MAIN UPDATE** | `arena-runtime.js`, config, and context remain; Main Gate 4 is explicitly installed through the shared runtime. |
| `e922c60` | Add Arena theme registry and static tokens | **PRESERVED AS-IS** | Theme registry and three static token stylesheets remain. |
| `3f0fde7` | Archive retired root demos and streamline launcher | **PRESERVED AS-IS** | Root surface cleanup, archive catalog, and active tooling layout remain. |
| `f875d86` | Complete Arena runtime and Lab presentation boundary | **PRESERVED WITH MAIN UPDATE** | Same-document Lab/Arena boundary remains with current Main combat behavior restored. |
| `f045cac` | Preserve Stance Gate 3 in shared runtime | **PRESERVED WITH MAIN UPDATE** | Injected Gate 2/3 runtime APIs remain and Gate 4 now composes after them. |
| `b279d9f` | Implement Arena theme selection policy | **PRESERVED AS-IS** | Query, storage, persistence, URL, and reload policy remain. |
| `0068778` | Correct supported surface UI boundaries | **PRESERVED AS-IS** | Combat Arena player controls and Enemy Lab developer controls remain separated. |
| `8f08c20` | Wire Stance Gate 3 into Arena runtime | **PRESERVED WITH MAIN UPDATE** | Gate 3 explicit runtime installation remains; its recovery API is injected into Gate 4. |
| `9404728` | Restore Neutral classic maze renderer | **PRESERVED AS-IS** | Classic barriers, direct collision, neutral world policy, and tests remain. |
| `74edc6c` | Finish Phase 2 presentation corrections | **PRESERVED WITH MAIN UPDATE** | Presentation boundary remains while current Main combat and Stance behavior is restored. |
| `3ef55c3` | Remove Akai area placard | **PRESERVED AS-IS** | Akai placard policy, markup, and installer removal remain. |
| `d321a30` | Implement Enemy Lab profile schema v3 | **PRESERVED AS-IS** | Schema, migration, validation, unknown-field preservation, and import/export remain. |
| `48f2490` | Implement Phase 2.5 Enemy Lab IA | **PRESERVED WITH MAIN UPDATE** | Encounter/runtime APIs and section infrastructure remain. Its eight-section UX is separately marked for approved Gate 1 supersession below. |
| `5a3e518` | Complete Enemy Lab portable profiles | **PRESERVED AS-IS** | Complete local library, transaction/rollback behavior, collision handling, and profile coverage tests remain. |
| `e98adba` | Add Enemy Lab Test-to-Standard workflow | **PRESERVED AS-IS** | Candidate review, lock, rollback, boot projection, and history concepts and tests remain. |

## Architectural feature ledger

| Donor feature | Disposition | Gate 0.5 result |
|---|---|---|
| Shared same-document Arena runtime | **PRESERVED WITH MAIN UPDATE** | Retained as the supported runtime; Main Gate 4 is integrated explicitly rather than restoring iframe/global boot. |
| Runtime configuration and context boundaries | **PRESERVED AS-IS** | `arena-runtime-config.js` and `arena-runtime-context.js` remain the integration boundary. |
| Canonical enemy content registry | **PRESERVED WITH MAIN UPDATE** | Registry remains authoritative and carries current Main content/status behavior. |
| Card definition and card registry | **PRESERVED WITH MAIN UPDATE** | Registry remains authoritative over the union inventory. |
| Effect registry and injected card-effect handlers | **PRESERVED WITH MAIN UPDATE** | Single-handler dispatch remains with current Main effects. |
| Player-combat dependency cleanup | **PRESERVED WITH MAIN UPDATE** | Localized core/pilebunker modules remain; current Main combat semantics are restored. |
| Typed control registry | **PRESERVED AS-IS** | Control metadata, profile audit, adapters, subscriptions, and rollback remain. |
| Registry-backed roster adapter | **PRESERVED WITH MAIN UPDATE** | Adapter and legacy storage compatibility remain with current Main roster behavior. |
| Registry-backed ability-pool adapter | **PRESERVED WITH MAIN UPDATE** | Adapter remains with current Main run-pool behavior. |
| Registry-backed deck adapter | **PRESERVED WITH MAIN UPDATE** | Adapter remains with current Main deck, stance protection, and shuffle behavior. |
| Profile schema v3 | **PRESERVED AS-IS** | Versioned schema and partial legacy migration remain. |
| Profile validation and transactional apply | **PRESERVED AS-IS** | Failed validation/storage writes cannot partially change the workspace. |
| Portable profile import/export | **PRESERVED AS-IS** | One-profile/library export, preview, and collision policies remain. |
| Theme registry and presentation boundary | **PRESERVED AS-IS** | Neutral, Original, and Akai registry/static CSS architecture remains. |
| Classic Neutral maze renderer | **PRESERVED AS-IS** | Short walls and direct collision remain. |
| Akai placard removal | **PRESERVED AS-IS** | No production placard path is restored. |
| Archive and launcher cleanup | **PRESERVED AS-IS** | Three supported root pages plus archive catalog remain. |
| Donor tests and package wiring | **PRESERVED WITH MAIN UPDATE** | Content/runtime suites are unioned with all current Main combat and Gate 4 tests. |
| Candidate review and transferable/excluded classification | **PRESERVED AS-IS** | e98 candidate construction and review concepts remain. |
| Standard lock, rollback, boot projection, and history | **PRESERVED AS-IS** | e98 local Standard workflow remains available for later state-ownership correction. |
| Current Main Stance Gate 4 exhaustion and spend policy | **PRESERVED WITH MAIN UPDATE** | Main implementation/tests are restored and composed with donor runtime architecture. |
| Current Main Catch Ring sizing | **PRESERVED WITH MAIN UPDATE** | Ring sizing is installed through an explicit Arena runtime handle. |

## Approved Gate 1 supersession targets

These donor UX/state choices remain in the Gate 0.5 integrated baseline so the
history is preserved. They are not endorsed as the final product design and are
the explicit targets of the approved vertical-inspector pass.

| Existing donor choice | Disposition | Approved replacement direction |
|---|---|---|
| Eight-section Enemy Lab IA | **SUPERSEDED BY APPROVED INSPECTOR UX** | TEST, GAME SETUP, and TOOLS navigation with the approved section map. |
| Pinned Profile row | **SUPERSEDED BY APPROVED INSPECTOR UX** | Optional Experiment Presets inside Tools. |
| Pinned Test/Setup/Standard/History workflow row | **SUPERSEDED BY APPROVED INSPECTOR UX** | Normal sections plus explicit Candidate/Published Standard actions. |
| Portrait horizontal category carousel | **SUPERSEDED BY APPROVED INSPECTOR UX** | Full-screen portrait inspector with a vertical rail. |
| Portrait horizontal content carousel | **SUPERSEDED BY APPROVED INSPECTOR UX** | One vertical detail scroller in both orientations. |
| Ordinary nested deck/Arcana/profile scroll panes | **SUPERSEDED BY APPROVED INSPECTOR UX** | One detail-scroll owner with per-section/context restoration. |
| Mandatory-profile-looking setup flow | **SUPERSEDED BY APPROVED INSPECTOR UX** | Tests and Candidate editing work without first selecting a preset. |
| Test/Game configuration ownership overlap | **SUPERSEDED BY APPROVED INSPECTOR UX** | Published Standard, Candidate Overlay, Lab Session, Run State, Content Definitions, and Local Preferences. |

## Deferred work

| Item | Disposition | Reason |
|---|---|---|
| Vertical-inspector implementation | **DEFERRED** | Gate 0.5 stops after history integration and baseline verification. |
| Durable checked-in or cloud Published Standard | **DEFERRED** | e98's browser-local concepts are preserved; final persistence authority requires a later product decision. |
| Layered combat coordinator | **DEFERRED** | This remains a later approved phase and is outside Gate 0.5. |

## Removal audit

No PR #120 commit, architectural module, test family, or major feature was
silently omitted. No item was removed with or without user approval during
Gate 0.5.
