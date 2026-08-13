# Wizard of Legend source-note archive

These files preserve the two research passes that fed the standalone
[`wizard-of-legend-arcana-checklist.html`](../../tools/wizard-of-legend-arcana-checklist.html).

The checklist is the canonical working reference. The Markdown in
`source-notes/` is retained as historical evidence:

- `wizard_of_legend_spell_language.md` is the initial construction-language pass.
- The three individual spell specs document the transition from the initial pass
  to the improved source-first method.
- `wizard_of_legend_arcana_source_reference.md` and the numbered append fragments
  contain the growing source-first analysis set in showcase order.
- `gate1-video-inventory.md` is the Gate 1 ledger: all 149 distinct on-screen
  Arcana with their whole-second showcase windows and separate charged
  demonstrations. It owns showcase order for every entry in the checklist, and
  the Arcana it lists without a source-first analysis appear as inventory-only
  records.
- `gate2-online-reference.md` attaches a detailed `[DOCUMENTED]` behavior,
  enhanced behavior, wiki metadata, stats, strategy notes, and source URL to
  every Gate 1 entry. It is a separate reference layer and does not convert
  inventory-only records into source-first analysis. Individual Wizard of Legend
  Wiki pages are primary; five entries retain explicitly labeled community
  catalog fallbacks because their Wiki routes returned title shells without
  article content.
- [`../../scripts/fetch-wol-online-reference.mjs`](../../scripts/fetch-wol-online-reference.mjs) refreshes that layer from the public
  Arcana pages on the Wizard of Legend Wiki and records any fallback source
  explicitly.

Do not implement an arcana directly from an initial-pass summary when the
checklist marks it **legacy first-pass prototype — replacement required**.

## Playable source trace

[`tools/Arcana Lab - Raging Inferno - Fire Wall.html`](../../tools/Arcana%20Lab%20-%20Raging%20Inferno%20-%20Fire%20Wall.html)
is a standalone, phone-first three.js lab that implements two of these
Arcana straight from the showcase capture and the notes above:

- **48 Raging Inferno** — showcase window 342.0–353.0 s (`09-fire-standards-3.md`)
- **50 Fire Wall** — showcase window 357.0–363.0 s (`10-fire-standards-4.md`)

Everything is inlined, so the file runs from `file://` with no network. Its
source panel carries the recipes and the acceptance tests from those notes,
and ticks each test off as the running lab satisfies it.
