# Phase 0.0.90 — disc: the 3-D movement disc

Status: LANDED, commit stamped below, 2026-09-08. Gate: 7 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 7 PASS / 0 FAIL; bracket unmoved. -->

Serves the checklist box "The 3-D movement disc: order movement in three dimensions with a flat pointer". Source: the fleet demo, read-only, lines 880, 1091 to 1093, 1122, 1131, 1135, 1170 to 1172. The module opens a disc at the ground point under the pointer, moves its height with a drag, and hands back the point and height to order a move.

## Lift kind

SHAPED — the law carried: the ground hit, the two drag gains and the clamp, the long press, the auto-hide, the move at the disc's point and height. The code is new: no three.js, no DOM, no timers; the page hands in events and the clock. The meshes and the pulse stay with the page.

## Rulings inside this plan

- The dials are the demo's numbers as defaults.
- Registry seam: consume. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 2977658158, 1356020820).

- `node scripts/disc-test.mjs` prints a seeds line, 7 PASS lines, then `disc-test: 7 PASS / 0 FAIL`, then `disc-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: gains 0.25 and 0.3, clamp 40, auto-hide 600 ms, long press 500 ms.
- Bracket, run at the landing: disc.

## Tasks

- 0.0.90-1 — the lift. → `task-0.0.90-1-disc.md`
