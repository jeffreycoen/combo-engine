# Phase 0.0.38 — the gravity wells

Status: LANDED, commit `6d1687a`, 2026-09-03. Gate: 9 PASS / 0 FAIL; prior gates unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 9 PASS / 0 FAIL; prior gates unmoved. -->

Batch rung 3 of `batch-extractions-1.md`. The organ is the deadweight hangar's gravity field: the well maker, the field law mu / (r^2 + soft^2)^1.65, the binary pair's mutual pull, the warp potential's clamped sum, and the two predictors that integrate the real field — where a killing burn ends, and where a shot flies. Source: `deadweight-hangar.html` lines 403, 438-441, 596-602, 855-858, 2124-2149, 2541-2572, read-only, committed unchanged at 206d7eb.

## Lift kind

VERBATIM MATH — the formulas are the demo's exactly; numbered substitutions follow, and only those. Anything else differing from the cited lines is a finding against the plan.
  1. stepPair: stepWorld's wl.varn / wl.moth -> the a / b arguments.
  2. potField: pot's wellProf(w) render profile -> the profOf argument; the camera scaling and flight-mode guard stay on the page; the clamped sum is the law carried.
  3. predStop: the page's ship/derive globals -> arguments `s` {x, y, vx, vy, ang, w, fuel}, `M`, `drv` {F, tau, I, nF, nR, thrust}; TAU -> 2*Math.PI.
  4. predictBallistic: predictShot's page wiring -> arguments start {x, y, vx, vy}, dials {life, thrust, thrustFuel, maxRange}, ghosts, rocks; the integration loop is verbatim.

The ratifier: accel is lifted out of the demo's own text at run time and twin-driven on 3000 rolled field reads — outputs must be identical; the rest is law-checked at rolled worlds (momentum conservation at equal softening, the potential's rails, the predictors' refusals and bounds).

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time.

- `node scripts/gate.mjs wells` prints a seeds line, 9 PASS lines, then `wells-test: 9 PASS / 0 FAIL`, then `wells-test PASS`, exit 0 — at rolled seeds. Ten consecutive trial runs green.
- Load-bearing knowns inside the checks: the demo's own dials — the 1.65 exponent, the 0.01 pair factor, the [-60, 230] warp rails, the 5400-step stop horizon, the post-push range break.
- Prior gates bracketing: `escrow` tail `escrow-test: 7 PASS / 0 FAIL` / `escrow-test PASS`; `poolmarket` tail `poolmarket-test: 10 PASS / 0 FAIL` / `poolmarket-test PASS`.

## Tasks

- 0.0.38-1 — the wells module and its gate, verbatim from the trial. -> `task-0.0.38-1-wells.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
