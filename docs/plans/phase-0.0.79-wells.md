# Phase 0.0.79 — wells: any number of wells, each with its own softening

Status: LANDED, commit stamped below, 2026-09-08. Gate: 14 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 14 PASS / 0 FAIL; bracket unmoved. -->

The second pass over the wells module under the general parts order, phase A6. The stop predictor's pair pull moved from a fixed loop over exactly two wells to a loop over every well and every ordered pair, each well's own softening standing in for the old literal 9. A contract, checkWell, checks a well's shape and counts every problem in one pass. Two wells with softening 3 give the demo's own numbers exactly, since 3 times 3 is 9.

## Lift kind

SHAPED second pass — the field law and every predictor formula are untouched; the pair pull in the stop predictor reads every well and each well's own softening, and two wells with soft 3 give the demo's numbers exactly. The changes are the second numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 243858690, 181739558).

- `node scripts/wells-test.mjs` prints a seeds line, 14 PASS lines, then `wells-test: 14 PASS / 0 FAIL`, then `wells-test PASS`, exit 0.
- The nine landed checks are verbatim.
- Bracket, run at the landing: wells, aim, describe.

## Tasks

- 0.0.79-1 — the second pass. → `task-0.0.79-1-wells.md`
