# Phase 0.0.99 — gait: the balance controller and the walking planner

Status: LANDED, commit stamped below, 2026-09-08. Gate: 10 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 10 PASS / 0 FAIL; bracket unmoved. -->

Serves the checklist box "The balance controller and the walking planner". Source: the mech demo, read-only, lines 1065 to 1658. It plans a walk's footsteps and balance point, then drives the legs to match, standing on legik, physics-pb, and rig.

## Lift kind

SHAPED — the law carried whole: every control formula, dial, and threshold, and the four classes. The numbered substitutions are in the module header (eight of them: gravity as a dial, the dropped world argument, the dropped dead call, the imports, the ankle pivot constant, the back-channel kept, the exports and the maker, the contracts). Anything else differing from the cited lines is a finding against the plan.

## Rulings inside this plan

- No walk is run in the gate. The demo's measured step counts are the demo's words, carried in the header as known numbers.
- Registry seam: tick. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 338988902, 970933580).

- `node scripts/gait-test.mjs` prints a seeds line, 10 PASS lines, then `gait-test: 10 PASS / 0 FAIL`, then `gait-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: the dial defaults of both tables; the contact threshold 2 percent of weight; the 0.5 m com floor; the 4 degrees per second ceiling.
- Bracket, run at the landing: gait, legik, physics-pb, rig, telemetry.

## Tasks

- 0.0.99-1 — the lift. → `task-0.0.99-1-gait.md`
