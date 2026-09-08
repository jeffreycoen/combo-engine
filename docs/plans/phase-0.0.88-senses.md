# Phase 0.0.88 — senses: the view as dials

Status: LANDED, commit `0d46eb3`, 2026-09-08. Gate: 9 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 9 PASS / 0 FAIL; bracket unmoved. -->

The second pass over the senses module under the general parts order, phase A15. canSee and coverSolid now take a dials object last, default the opponent module's own numbers: view range, view angle, eye height, eye clearance, chest offset. Two new contracts check the agent's shape and the dials' shape, every problem counted in one pass.

## Lift kind

SHAPED second pass — the sight and cover arithmetic is untouched; its five literals ride one dials object handed in last, defaults the demo's; the agent body and dials contracts. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 572055352, 679991715).

- `node scripts/senses-test.mjs` prints a seeds line, 9 PASS lines, then `senses-test: 9 PASS / 0 FAIL`, then `senses-test PASS`, exit 0.
- The five landed checks are verbatim.
- Bracket, run at the landing: senses.

## Tasks

- 0.0.88-1 — the second pass. → `task-0.0.88-1-senses.md`
