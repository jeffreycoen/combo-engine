# Phase 0.0.81 — grapple: the constants as dials

Status: LANDED, commit `0a11142`, 2026-09-08. Gate: 20 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 20 PASS / 0 FAIL; bracket unmoved. -->

The second pass over the grapple module under the general parts order, phase A9. The fifteen named constants move into one dials object, GRAP, and every function that reads a constant takes the dials as its last argument, default GRAP. The rope law itself does not move. A ship contract and a target contract are added, each a function that lists every problem with an input in one pass.

## Lift kind

SHAPED second pass — the rope law is untouched; the fifteen constants ride one dials object handed in last, defaults the demo's. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 434462352, 2211613565).

- `node scripts/grapple-test.mjs` prints a seeds line, 20 PASS lines, then `grapple-test: 20 PASS / 0 FAIL`, then `grapple-test PASS`, exit 0.
- The sixteen landed checks are verbatim.
- Bracket, run at the landing: grapple, old-master.

## Tasks

- 0.0.81-1 — the second pass. → `task-0.0.81-1-grapple.md`
