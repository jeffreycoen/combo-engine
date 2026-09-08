# Phase 0.0.80 — escrow: the prices as dials

Status: LANDED, commit `8845c48`, 2026-09-08. Gate: 12 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 12 PASS / 0 FAIL; bracket unmoved. -->

The second pass over the escrow module under the general parts order, phase A8. The nine numbers that priced and timed a contract — the bounty margin and base, the floor, the rescue base and cut, the part and rescue terms, the cooldown, the scan spacing — move off the code and onto a dials object carried on the book, with the demo's own values as the defaults. A stations contract and a check function are added, so a caller can test its station data for every problem in one pass.

## Lift kind

SHAPED second pass — the demo's arithmetic is untouched; its nine literals are dials on the book with the demo's values as defaults. The changes are the second numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 469172833, 185049731).

- `node scripts/escrow-test.mjs` prints a seeds line, 12 PASS lines, then `escrow-test: 12 PASS / 0 FAIL`, then `escrow-test PASS`, exit 0.
- The seven landed checks are verbatim.
- Bracket, run at the landing: escrow.

## Tasks

- 0.0.80-1 — the second pass. → `task-0.0.80-1-escrow.md`
