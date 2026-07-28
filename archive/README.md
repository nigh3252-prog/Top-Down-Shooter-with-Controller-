# Archive

Retired pages kept for reference only. Nothing in the live repo links to them.

- `stone-wanderer-stance-chain-lab-wrapper.html` — the old official lab entry
  point. It worked by fetching the core page below, string-patching its HTML at
  load time (weapon injection, Red Toll tuning UI, lab modes, audio hooks), and
  running the result in an iframe. Retired in favor of `weapon-lab.html`, which
  imports `src/` modules directly. **This wrapper no longer runs** — it expects
  the old `src/` module APIs (patch-string exports) that were rewritten.
- `stone-wanderer-stance-chain-lab-core.html` — the raw core the wrapper
  patched, including the bent-horizon integration pass. Superseded by
  `weapon-lab.html`; still runs standalone (with a stub longsword) if opened
  directly.
- `stone-wanderer-individual-move-test.html` — donor/reference for the move
  rating UI, since merged into `src/lab-modes.js`.
- `sound-foundry-retro-beasts.html` — donor/reference for procedural audio
  recipes behind `src/combat-audio.js`.
- `stone-lab-audio-test.html` — old audio hook test page.
- `wizard-of-legend/` — the initial and improved Arcana research Markdown preserved behind the canonical root-level checklist.
