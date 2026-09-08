# Phase 0.0.77 — legik: leg inverse kinematics

Status: LANDED, commit stamped below, 2026-09-08. Gate: 7 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 7 PASS / 0 FAIL; bracket unmoved. -->

Serves the checklist box "Leg inverse kinematics". Source: the mech demo, read-only, lines 807 to 857 (the leg table, legIK, legFK). legIK turns a wanted ankle position into the leg's five joint angles with the sole held level; legFK checks the solve by turning the angles back into a position.

## Lift kind

VERBATIM MATH — the formulas are the demo's exactly. The numbered substitutions are in the module header (four of them: the exported leg table, the plain vector literal, the exports, the contract). Anything else differing from the cited lines is a finding against the plan.

## Rulings inside this plan

- The option names and the 0.995 default are the demo's own.
- Registry seam: consume. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 331972384, 853509696).

- `node scripts/legik-test.mjs` prints a seeds line, 7 PASS lines, then `legik-test: 7 PASS / 0 FAIL`, then `legik-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: thigh 1.50, shin 1.45, maxExtend 0.995.
- Bracket, run at the landing: legik.

## Tasks

- 0.0.77-1 — the lift. → `task-0.0.77-1-legik.md`
