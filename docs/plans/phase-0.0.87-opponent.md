# Phase 0.0.87 — opponent: the part table as data

Status: LANDED, commit stamped below, 2026-09-08. Gate: 10 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 10 PASS / 0 FAIL; bracket unmoved. -->

The second pass over the opponent module under the general parts order, phase A14. The hit law is untouched. Its part table, its dials, and its sedative round names move to a maker, makeOpponent, default the demo's own three. A contract, checkParts, checks a handed part table and reports every problem in one pass.

## Lift kind

SHAPED second pass — the hit law is untouched; the part table, the dials, and the sedative round names are handed to a maker, defaults the demo's; the parts contract. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 121582236, 557389717).

- `node scripts/opponent-test.mjs` prints a seeds line, 10 PASS lines, then `opponent-test: 10 PASS / 0 FAIL`, then `opponent-test PASS`, exit 0.
- The six landed checks are verbatim. `senses-test: 5 PASS / 0 FAIL` in the worktree.
- Bracket, run at the landing: opponent, senses.

## Tasks

- 0.0.87-1 — the second pass. → `task-0.0.87-1-opponent.md`
