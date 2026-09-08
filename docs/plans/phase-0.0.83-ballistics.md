# Phase 0.0.83 — ballistics: the tables handed in

Status: LANDED, commit `df2308c`, 2026-09-08. Gate: 20 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 20 PASS / 0 FAIL; bracket unmoved. -->

The second pass over the ballistics module under the general parts order, phase A3. The material table, the round table, the pool size, the event cap, the tick rate, and the hit record move from fixed numbers to options, each defaulting to the demo's own table or constant. A round can be fired by its name or its number. Two new checks count every broken field in a material table or a round table in one pass. The flight, ricochet, perforation, and embed arithmetic does not move.

## Lift kind

SHAPED second pass — the flight and impact arithmetic is untouched; the material and round tables, the pool, the event cap, the tick rate, and the hit record are handed in, defaults the demo's. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 448226642, 102145908; the landed checks keep their fixture seeds 7, 42, 99).

- `node scripts/ballistics-test.mjs` prints a seeds line, 20 PASS lines, then `ballistics-test: 20 PASS / 0 FAIL`, then `ballistics-test PASS`, exit 0.
- The fourteen landed checks are verbatim.
- Bracket, run at the landing: ballistics, voxel, support.

## Tasks

- 0.0.83-1 — the second pass. → `task-0.0.83-1-ballistics.md`
