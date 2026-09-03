# Phase 0.0.65 — the module registry and the sockets

Status: LANDED, commit stamped below, 2026-09-03. Gate: 5 PASS / 0 FAIL; prior gates unmoved.

Api batch rung of `batch-api-1.md`. Checklist item served and flipped in this landing: "Module registry and the standard sockets".

## Lift kind

SHAPED: one table naming every module in the tree, its seam, and its gate; the three standard sockets (tick input, renderer flags, sound events) stated once — each an existing, working mechanism. The gate proves the table against the tree itself: every entry's file exists, every module directory is registered, every named gate is in the gate table.

## Acceptance arithmetic for the phase

Every number was produced by running the exact planned code at plan-writing time. No missing file, no ghost directory, no orphan gate, every seam one of the four, the lookups answer.

- `node scripts/gate.mjs registry` — seeds line, 5 PASS lines, `registry-test: 5 PASS / 0 FAIL`, `registry-test PASS`, exit 0.
- frostline's tail unmoved.

## Tasks

- 0.0.65-1 — the files, verbatim from the trial. -> `task-0.0.65-1-registry.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
