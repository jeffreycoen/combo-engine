# Phase 0.0.78 — receipts: the line table handed in

Status: LANDED, commit stamped below, 2026-09-08. Gate: 8 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 8 PASS / 0 FAIL; bracket unmoved. -->

The second pass over the receipts module under the general parts order, phase A16. The line table that turns each event into a line is exported, and receipt and receiptLog now take that table as a last argument, default the same table as before. A new check function lists every entry in a handed table that is not a function. Every existing line and every existing behavior at the defaults is unchanged.

## Lift kind

SHAPED second pass — the landed lines are untouched; the changes are the numbered substitutions in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 428271131, 949037283).

- `node scripts/receipts-test.mjs` prints a seeds line, 8 PASS lines, then `receipts-test: 8 PASS / 0 FAIL`, then `receipts-test PASS`, exit 0.
- The four landed checks are verbatim.
- Bracket, run at the landing: receipts.

## Tasks

- 0.0.78-1 — the second pass. → `task-0.0.78-1-receipts.md`
