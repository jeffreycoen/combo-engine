# Phase 0.0.66 — the manifest tool

Status: LANDED, commit `59e1066`, 2026-09-03. Gate: 3 PASS / 0 FAIL; prior gates unmoved.

Api batch rung of `batch-api-1.md`. Checklist item served and flipped in this landing: "The manifest tool".

## Lift kind

SHAPED: one script walks src/ and the page code, reads every import line, and prints one sorted edge per line — two runs on one tree are byte-identical, so any drift is a diff. The trial's map: 188 edges.

## Acceptance arithmetic for the phase

Every number was produced by running the exact planned code at plan-writing time. Two walks byte-identical; a planted file's edges appear exactly and vanish with it; the depot front doors are on the map.

- `node scripts/gate.mjs manifest` — seeds line, 3 PASS lines, `manifest-test: 3 PASS / 0 FAIL`, `manifest-test PASS`, exit 0.
- frostline's tail unmoved.

## Tasks

- 0.0.66-1 — the files, verbatim from the trial. -> `task-0.0.66-1-manifest.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
