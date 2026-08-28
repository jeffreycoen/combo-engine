# Phase 0.0.12 — steering behaviors

Status: LANDED, commit stamped below, 2026-08-28. Gate: 12 PASS / 0 FAIL; prior gates unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 12 PASS / 0 FAIL; prior gates unmoved. -->

The organ is the fleet demo's motion: acceleration toward a desired speed with a braking window, turning as a fractional approach, banking into turns, strafe and guard orbits, and the idle drift. Source: `homeworld_fleet_command.jsx` lines 1339–1465 (the four movement branches) and 969–993 (the per-unit motion state). It composes with the landed orders module: `resolveMode` picks the branch, these functions move the unit.

## Lift kind

SHAPED — the law carried, the code new, said plainly:

- LAW (the demo's, cited by line in the module header): braking distance `v²/(2·accel·0.3)`; inside `brakeDist + 2` the desired speed is `maxSpeed · max(0.05, dist/(brakeDist+2))`, else `maxSpeed`; speed approaches desired at `dt·accel`, clamps to `[0, maxSpeed]`, position advances `dir·speed·dt·60`; within distance 1 the unit coasts at ×0.95; the heading rotates toward the goal by fraction `dt·turnRate`, half rate while orbiting; the bank chases `clamp(cross(forward, dir).y · gain, ±limit)` at rate 1.5, with the demo's three gain/limit pairs (0.7/0.4 moving, 0.8/0.4 strafing, 0.6/0.35 guarding); the strafe orbit point is `target + [cos(a)·R, sin(0.7a)·3, sin(a)·R]` with desired speed `min(maxSpeed, dist·0.3)`; the guard orbit uses radius `strafeRadius` or 10, weave `sin(0.5a)·2`, speed factor 0.25; idle drift advances phase at `dt·0.12·idleRate`, offsets `[cos·0.3, sin(1.3p)·0.1, sin·0.3]·dt`, coasts ×0.98, levels the bank at `1 − dt·4` and snaps flat under 0.01.
- NEW (this module's): plain `[x, y, z]` code — the demo's quaternion slerp becomes `rotateToward`, an exact axis-angle rotation by the same fraction; the demo's type-keyed orbit rates (0.7/0.4 strafing, 0.5/0.3 guarding, 1/0.3 idling) become spec data `strafeRate`/`guardRate`/`idleRate` with the demo's values as the fixture; orbit phase and direction are caller-seeded state, so the module holds no randomness at all; a `checkMotionSpec` contract reports every problem at once.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time (trial in the session scratchpad, first run green). Acceptance is the gate's arithmetic alone; there is no byte-identity claim against the demo.

- `node scripts/gate.mjs steering` prints 12 PASS lines, then `steering-test: 12 PASS / 0 FAIL`, then `steering-test PASS`, exit 0.
- Load-bearing knowns inside the checks — closed forms of the demo's own laws, driven by its ship table rows:
  - a 90° turn at fraction 0.1 closes exactly 9°, heading stays unit length;
  - the frigate at rest wants `0.12 · dist/2` inside the window, floored at 5%; with speed the window widens by `v²/(2·0.3·0.3)`;
  - one move step lands speed `(desired−v)·dt·accel` and position `dir·v·dt·60` exactly;
  - a hard turn's first bank step is `−0.4 · dt · 1.5` (gain 0.7 clamped at the 0.4 limit);
  - within distance 1 the speed decays to `0.4 × 0.95` and the body holds;
  - the strafe phase advances `dt·0.7`, the guard phase `dt·0.3` at radius 10 for the non-strafing frigate;
  - idle: phase `dt·0.12`, coast `0.5 × 0.98`, bank `0.3 × (1 − dt·4)`, the drift offsets exact;
  - six hundred identical steps land bit-identical position, speed, bank, and heading.
- File identity, proven at trial: `src/modules/steering/steering.js` sha256 `d4842c20406daefc81ce043bb043443f5d1276db188dbea4848dc318eaa2e15a` (7117 bytes); `scripts/steering-test.mjs` sha256 `0bc138e8adb8342188e82a2b5675cc4f91dfaed367a6a909fced4c532412faf8` (5496 bytes).
- All prior gates unmoved, tails as re-run at plan-writing time:
  - api: `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`
  - combat: `ALL PASS`
  - accuracy: `11/11`
  - market: `market-test PASS` · builder: `builder-test PASS` · ledger: `ledger-test PASS` · weldstress: `weldstress-test PASS` · tape: `tape-test PASS` · physics-pb: `physics-pb-test PASS` · rig: `rig-test PASS` · solids: `solids-test PASS` · ballistics: `ballistics-test PASS` · orders: `orders-test PASS`

## Tasks

- 0.0.12-1 — write the steering module and its gate, register the gate, close the records. → `task-0.0.12-1-steering.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
