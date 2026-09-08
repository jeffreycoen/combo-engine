# Phase 0.0.84 — support: tolerances handed in, the prim declared

Status: LANDED, commit `238b1c0`, 2026-09-08. Gate: 16 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 16 PASS / 0 FAIL; bracket unmoved. -->

The second pass over the support module under the general parts order, phase A5. The eight literals that decide what rests on what now live in one tolerances object, handed in last to every function that reads them, defaulting to the demo's own numbers. The prim's fields and the tolerances object's fields are each declared and checked in one pass.

## Lift kind

SHAPED second pass — the support law is untouched; its eight literals ride one tolerances object handed in last, defaults the demo's; the prim's fields are declared. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 1150744252, 1657598116; the landed check keeps its fixture seed 9).

- `node scripts/support-test.mjs` prints a seeds line, 16 PASS lines, then `support-test: 16 PASS / 0 FAIL`, then `support-test PASS`, exit 0.
- The twelve landed checks are verbatim.
- Bracket, run at the landing: support.

## Tasks

- 0.0.84-1 — the second pass. → `task-0.0.84-1-support.md`
