# Enemy Lab Gate 1 scroll owners

Gate 1 makes the Enemy Lab shell single-axis without changing compound-editor
behavior. The shell has exactly two normal scrolling elements in landscape and
portrait:

| Selector | Direction | Responsibility |
|---|---|---|
| `#labCategories` | vertical | Persistent eight-section navigation rail. |
| `#labValues` | vertical | Selected-section detail content and per-section scroll memory. |

The old `#valueScrollGutter` drag controller is removed in Gate 1. Native touch,
wheel, pointer, keyboard, and existing gamepad-accessible paths operate on the
two declared owners without a third shell controller.

## Retained compound-editor scrollers

These existing specialized scrollers remain temporarily because flattening
them would change editor behavior, selection context, or independently restored
positions. Gate 1 does not add another scrolling wrapper around them.

| Selector | Owner | Why it remains in Gate 1 | Assigned migration |
|---|---|---|---|
| `.deckEditorCardsPane` | `src/enemy-lab-deck-editor.js` | Preserves the Browse Cards/Current Deck catalog position, expanded details, filters, and batch actions. | Gate 3 — Test Deck compound-editor migration. |
| `.deckEditorControlsPane` | `src/enemy-lab-deck-editor.js` | Preserves the independent deck controls/counts position and final-stance-protected editing flow. | Gate 3 — Test Deck compound-editor migration. |
| `.arcanaTweaksMain` | `src/enemy-lab-deck-editor-refinements.js` | Preserves the main Arcana scale/collision tuning workspace and its touch behavior. | Gate 3 — Arcana Tuning compound-editor migration. |
| `.arcanaTweaksSide` | `src/enemy-lab-deck-editor-refinements.js` | Preserves the independently scrollable Arcana detail/control column. | Gate 3 — Arcana Tuning compound-editor migration. |
| `#hitFeelPanel` | `src/hit-feel.js` | Preserves the existing independently scrolling Hit Feel development overlay. | Gate 3 — Hit Feel tool integration. |

The hidden Arena pause panel (`#panel`) remains scrollable in the shared Arena
shell CSS but is not an Enemy Lab scroll owner: Enemy Lab hides it with the
existing mode boundary. Clipping containers such as `html`, `body`,
`#labDock`, deck/Arcana roots, and progress tracks use `overflow: hidden`; they
are not scroll owners.

## Gate 1 exclusions

- No ordinary section card or shell row owns vertical scrolling.
- Portrait does not introduce horizontal navigation, horizontal detail paging,
  or per-card vertical scrolling.
- Profile and Standard workflow controls flow inside section detail; they are
  not pinned shell rows and do not create new scroll owners.
- Compound-editor flattening and the TEST / GAME SETUP / TOOLS reorganization
  remain Gate 3 work.
