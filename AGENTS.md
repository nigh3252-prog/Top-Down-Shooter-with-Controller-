# Project operating rules

## Start from live main

- Before changing tracked files, inspect the worktree and preserve existing user changes.
- Query the live remote default-branch SHA; do not assume the cached `origin/main` ref is current.
- Fetch the exact remote SHA, report `HEAD...main` divergence and the merge base, and base new work on that SHA when the request targets current main.
- If the remote is unavailable, say that cached refs may be stale before continuing.
- Recheck live main before final handoff and report if it moved during the work.
- Preserve older branches as references. Do not merge, reset, or delete them without explicit user direction.

## Coordinate visible Luna tasks

- Use the `$luna-project-orchestrator` workflow for repository changes.
- When delegating, create visible GPT-5.6 Luna tasks at Max reasoning and tell each task to create its own persistent goal.
- Give writing tasks non-overlapping ownership. Use other tasks for read-only inventory or independent review.
- The lead task owns architecture, integration, conflict resolution, tests, browser QA, and the final report.
- Treat task worktrees as isolated: review and integrate commits or patches explicitly.
- Honor pass checkpoints. Do not begin a later pass until the current pass is verified and accepted.

## Supported product surfaces

- The supported live game is `combat-arena.html`.
- The supported development surface is `enemy-lab.html`.
- `index.html` is the launcher and may link to `archive/index.html` as a secondary catalog.
- Do not add another supported root HTML page. Put active tooling under `tools/` and retired experiments under `archive/`.

## Architecture direction

- Give cards, effects, and enemies one authoritative registry/API per pillar. Family modules may contribute definitions, but live consumers must enter through the registry.
- Keep Combat Arena player-facing. Put tuning, diagnostics, capture controls, and experiments in Enemy Lab.
- Prefer explicit runtime context and injected services over window globals, DOM scraping, iframe bridges, or self-installing side effects.
- Preserve saved IDs, storage keys, URL parameters, profiles, and capture contracts unless a migration is explicitly included.
