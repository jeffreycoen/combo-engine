# Phase 0.0.73 — frozen-time aiming

Status: LANDED, commit `36a010c`. Gate: 8 PASS / 0 FAIL; prior gates unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 8 PASS / 0 FAIL; prior gates unmoved. -->

Serves the checklist box "Frozen-time aiming: stop the sim, show the reach, predict with the sim's own step, commit or cancel." Source: the deadweight hangar demo, read-only, lines 1937–2001 (the delayed-burn planner, the candidate filter, the lead solver, target cycling), 2043–2069 (arm, cancel, the three commit branches), 2541–2578 (the prediction wiring and the freeze guard at line 2574), 2605 (the tape's aim action). The wells module (0.0.38) already carries the predictors; this phase carries the aiming law around them.

## Lift kind

SHAPED — the law carried: time stops while an aim is armed; the prediction uses the sim's own step and the real field; commit and cancel are tape actions, so a replay reproduces the aiming exactly. The pure math (the candidate filter, the quadratic lead solve with its ±6×0.03 rad, 75-step, dt=1/30 refinement) is carried with these substitutions, numbered in the module header, and only these:

1. aimCandidates: the demo's globals ship, collectBodies(), grapAnchor() become arguments kind, ship, bodies, muzzleAt. Filter, reach and cone rule, and sort verbatim.
2. interceptAng: globals become arguments; the ship.ang-mutating anchor closure becomes muzzleAt(kind, {...ship, ang}) with no mutation; the V0/cone/reach numbers move into the KINDS table with the demo's exact values (grap 34/0.7/90, msl 18/0.7/150).
3. cycleAimTarget: the demo's run.aim and ship globals become the module's own armed state; the solved angle is returned, never written onto the caller's ship.
4. stepPlan: returns the due burn's prograde heading instead of performing the burn — fuel and thrust belong to propulsion, not aim.
5. The three commit branches build the demo's own tape-action shapes ({k:'grap',ang}, {k:'msl2',ang}, {k:'plan',at}); arm and cancel use the demo's {k:'aim', w} shape.

New code, said plainly: the makeAim surface owning the armed state, the KINDS table holding the demo's three aim kinds as data, and the frozen() predicate the game's step guard reads. The module never draws and never touches a page; predictBallistic and predStop pass through from wells unchanged.

## Rulings inside this plan

- Aim kinds are data: the demo's three (sling, grapple, missile) are the default KINDS table; a game may hand its own.
- The delayed-burn planner rides: commit without the firing law is a spend without an effect. The module returns the due burn; the caller applies it.
- The muzzle rule is a callback (default: ship position) — the demo's hull-geometry anchor belongs to the game, not to aiming.
- Registry seam: consume — calls on demand, like tape and orders.

## The walk

No page ships. The path touched is a game author's calls: arm freezes, cycleTarget solves, commit or cancel thaws and returns the tape action, stepPlan fires the committed burn at its time. Phone and desktop: no interface in this phase.

## Standing condition, named

The registry gate's line `registry-test: 4 PASS / 1 FAIL` (the ghost check, red before this phase) is pinned unchanged on both sides. This task registers its own module, so it adds no ghost.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time (scratch trial, rolled seeds 165243669, 451316782, 975055628).

- `node scripts/gate.mjs aim` prints a rolled seeds line, 8 PASS lines, then `aim-test: 8 PASS / 0 FAIL`, then `aim-test PASS`, exit 0.
- Load-bearing knowns carried from the demo's own lines: cone 0.7; reach 90 and 150; launch speeds 34 and 18; the 2.2 muzzle offset; the sling plan's at = t + k×1.5.
- Prior gates: `wells-test PASS` unmoved; `registry-test: 4 PASS / 1 FAIL` unmoved.

## Tasks

- 0.0.73-1 — land the aim module, its gate, its registry and gate-table lines, the record close. → `task-0.0.73-1-aim.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
