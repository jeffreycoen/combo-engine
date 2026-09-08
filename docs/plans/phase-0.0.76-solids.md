# Phase 0.0.76 — solids: the hit record handed in

Status: LANDED, commit stamped below, 2026-09-08. Gate: 16 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 16 PASS / 0 FAIL; bracket unmoved. -->

The second pass over the solids module under the general parts order, phase A2. The module now hands out its hit record instead of writing through one shared record alone: makeHit builds a fresh record, and raySolid and raycastWorld take a record to fill, defaulting to the module's own scratch record for callers that pass none. A contract function, checkSolid, checks a solid's shape and lists every problem in one pass. rayBlocked, and every other function's name, arithmetic, and export, are untouched.

## Lift kind

SHAPED second pass — the landed arithmetic is untouched; the changes are the numbered substitutions in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 557096677, 1277914957).

- `node scripts/solids-test.mjs` prints a seeds line, 16 PASS lines, then `solids-test: 16 PASS / 0 FAIL`, then `solids-test PASS`, exit 0.
- The twelve landed checks are verbatim.
- Bracket, run at the landing: solids, ballistics, voxel, support, senses.

## Tasks

- 0.0.76-1 — the second pass. → `task-0.0.76-1-solids.md`
