# Phase 0.0.86 — weldstress: the load factor as an argument

Status: LANDED, commit stamped below, 2026-09-08. Gate: 12 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 12 PASS / 0 FAIL; bracket unmoved. -->

The second pass over the weldstress module under the general parts order, phase A11. The weld load's factor of 9 becomes an argument, LOAD_FACTOR its default; weldLoads and ratedLimits take it last, every other law unchanged. A welds contract is added: checkWelds counts every problem in a weld list in one pass.

## Lift kind

SHAPED second pass — the load law is untouched; its factor is an argument with the demo's 9 as the default; the welds contract. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 1248727867, 323097083).

- `node scripts/weldstress-test.mjs` prints a seeds line, 12 PASS lines, then `weldstress-test: 12 PASS / 0 FAIL`, then `weldstress-test PASS`, exit 0.
- The nine landed checks are verbatim.
- Bracket, run at the landing: weldstress.

## Tasks

- 0.0.86-1 — the second pass. → `task-0.0.86-1-weldstress.md`
