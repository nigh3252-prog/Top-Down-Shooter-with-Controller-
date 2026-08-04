# Enemy Lab Gate 1 scroll owners

Gate 1B keeps the Enemy Lab shell vertical without changing compound-editor
behavior. The shell has three normal scrolling elements in landscape and
portrait:

| Selector | Direction | Responsibility |
|---|---|---|
| `#labCategories` | vertical | Persistent eight-section navigation rail. |
| `#labSubcategories` | vertical | Registry-derived selected-section view rail and per-section rail scroll memory. |
| `#labValues` | vertical | One selected-view detail content and per-view scroll memory. |

`#valueScrollGutter` is a controller and visual representation of
`#labValues`; it is not an additional scroll owner. Its thumb size, thumb position,
and `aria-valuenow` are derived from the detail pane. Pointer dragging writes
only `#labValues.scrollTop`, and the gutter never maintains an independent
scroll offset. Detail scrolling, section restoration, drawer opening, and
resize observation keep the thumb synchronized. The gutter is visible in the
compact three-column landscape shell and hidden in portrait, where Gate 1's
vertical detail/rail layout remains unchanged.

Gate 1B preserves Main's original detail width while adding the 82px subsection
rail: `width: min(calc(48vw + 82px), 642px)`. The columns are
`minmax(0, 1fr) 30px 82px 92px` for detail, gutter controller, subsection rail,
and main rail. This keeps substantially the same amount of game visible as the
accepted compact shell and prevents fixed rails from forcing horizontal shell
overflow. Portrait remains a vertical detail/subsection/main rail layout.

## Retained compound-editor scrollers

The registry-backed deck and Arcana workspaces now flow through `#labValues`.
Their controls and content are ordered vertically, so Browse Cards, Current
Deck, and Arcana Scale use the same visible gutter and per-view scroll memory as
ordinary views. Their legacy paired-pane layouts remain only as a compatibility
path when no section registry is present.

One existing specialized scroller remains temporarily. Gate 1B does not add a
wrapper scroller around it.

| Selector | Owner | Why it remains in Gate 1 | Assigned migration |
|---|---|---|---|
| `#hitFeelPanel` | `src/hit-feel.js` | Preserves the existing independently scrolling Hit Feel development overlay. | Gate 3 — Hit Feel tool integration. |

The hidden Arena pause panel (`#panel`) remains scrollable in the shared Arena
shell CSS but is not an Enemy Lab scroll owner: Enemy Lab hides it with the
existing mode boundary. Clipping containers such as `html`, `body`,
`#labDock`, deck/Arcana roots, and progress tracks use `overflow: hidden`; they
are not scroll owners.

## Gate 1 exclusions

- No ordinary section card or shell row owns vertical scrolling.
- The main rail remembers its own scroll position, the subsection rail remembers
  a position per section, and the detail pane remembers a position per selected
  registry view.
- Portrait does not introduce horizontal navigation, horizontal detail paging,
  or per-card vertical scrolling.
- Profile and Standard workflow controls flow inside section detail; they are
  not pinned shell rows and do not create new scroll owners.
- Compound-editor flattening and the TEST / GAME SETUP / TOOLS reorganization
  remain Gate 3 work.
