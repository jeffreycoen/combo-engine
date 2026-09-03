# Phase 0.0.62 — the receipt log

Status: LANDED, commit stamped below, 2026-09-03. Gate: 4 PASS / 0 FAIL; prior gates unmoved.

Harness batch rung of `batch-harness-1.md`. Checklist item served: "The receipt log: events stated as plain-language numbers" — the box flips in this landing.

## Lift kind

SHAPED: the law is the checklist's words; the shapes are the engine's own event objects (kill, shipkill, strike, splat, weldbreak, collapse, structureLost). One plain line per event, always — an unknown event gets an honest line with its numbers, and nothing ever throws.

## Acceptance arithmetic for the phase

Every number was produced by running the exact planned code at plan-writing time. Three hundred rolled ticks — every known event's line carries its own numbers; unknown events honest; broken events calm; an empty tick is an empty ledger.

- `node scripts/gate.mjs receipts` prints a seeds line, 4 PASS lines, then `receipts-test: 4 PASS / 0 FAIL`, then `receipts-test PASS`, exit 0 — at rolled seeds.
- Prior gates bracketing: named in the task's steps with their tails.

## Tasks

- 0.0.62-1 — the files, verbatim from the trial. -> `task-0.0.62-1-receipts.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
