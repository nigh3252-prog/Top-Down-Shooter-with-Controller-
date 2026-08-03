# Enemy Lab Gate 1 scroll owners

Gate 1 makes the Enemy Lab shell single-axis without changing compound-editor
behavior. The shell has exactly two normal scrolling elements in landscape and
portrait:

| Selector | Direction | Responsibility |
|---|---|---|
| `#labCategories` | vertical | Persistent eight-section navigation rail. |
| `#labValues` | vertical | Selected-section detail content and per-section scroll memory. |

`#valueScrollGutter` is a controller and visual representation of
`#labValues`; it is not a third scroll owner. Its thumb size, thumb position,
and `aria-valuenow` are derived from the detail pane. Pointer dragging writes
only `#labValues.scrollTop`, and the gutter never maintains an independent
scroll offset. Detail scrolling, section restoration, drawer opening, and
resize observation keep the thumb synchronized. The gutter is visible in the
compact three-column landscape shell and hidden in portrait, where Gate 1's
vertical detail/rail layout remains unchanged.

The exact Main landscape baseline is `width: min(48vw, 560px)` with columns
`minmax(230px, 1fr) 30px 92px`. At phone widths up to 733px, only the detail
column minimum relaxes to zero so the 30px controller and 92px navigation rail
cannot create horizontal shell overflow.

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

The registry-backed deck and Arcana roots also retain Main's specialized
`deckEditorMode` presentation while their section is active. The later
refinement stylesheet allows `width: min(72vw, 940px)` and hides the 30px
gutter for those paired editor panes only. Leaving either editor removes the
mode classes and restores the ordinary `min(48vw, 560px)` drawer.

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
