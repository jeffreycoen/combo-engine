# Task 0.0.99-1 — gait: the balance controller and the walking planner

One job: lift the balance controller and the walking planner from the mech demo into a module under the general parts order, phase B3. Write exactly the design below, run the gate, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/gait`, branch `phase/0.0.99-gait`, branched from main after phases 0.0.77 (legik), 0.0.95 (physics-pb), and 0.0.96 (rig) landed. You never touch `/home/batman/combo-engine` (the main tree). You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, any other module, or any document of another phase. You never edit a demo file.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-general-1.md`, the sections "The generalization law", "The rules of the run", and "B3, gait".
3. `/home/batman/combo-engine/mech-mk1-live-opus-5.html`, lines 1065 to 1658 only. Read-only source material: four blocks, posture 1065 to 1112, balance 1114 to 1272, the divergent-motion plan 1274 to 1393, the gait controller 1395 to 1658.
4. `/home/batman/combo-wt/gait/src/modules/legik/legik.js`, whole.
5. `/home/batman/combo-wt/gait/src/modules/physics-pb/physics.js`, the export block at the end of the file and the Body and Hinge classes, for the fields the controller reads and writes.
6. `/home/batman/combo-wt/gait/src/modules/rig/rig.js`, whole, and `/home/batman/combo-wt/gait/scripts/rig-test.mjs`, whole, to see how a gate assembles a rig.
7. `/home/batman/combo-wt/gait/docs/modules/module-pattern.md`.
8. `/home/batman/combo-wt/gait/docs/plans/phase-0.0.73-aim.md`, as the shape of a phase document.

## The design, fixed

New module `src/modules/gait/gait.js`, a SHAPED lift. The law carried whole: every control formula, every dial and its default, every threshold, and the four cooperating classes, Posture, BalanceController with groundTruthState, DCMPlan with COMTracker and buildPhases, and GaitController with smooth, in the demo's order and text. Substitutions, numbered in the module header, and only these:

1. The module-level gravity `let G = 9.81; function setGravity(g)` goes. BalanceController reads `this.k.gravity` (default 9.81, a new entry in its k table) where the demo's update read G. `groundTruthState(rig, g = 9.81)` takes gravity as its second argument for the contact threshold `0.02 * M * g`. GaitController hands its own `k.gravity` to the BalanceController it builds, as `gravity` in that controller's cfg.
2. `groundTruthState` drops the demo's unused `world` argument, per substitution 1's shape.
3. Posture's dead call `buildLinkTable()` is dropped; Posture reads the hip pivots from `rig.table` as the demo does.
4. `legIK` is imported from the legik module; the vector helpers V, Q, vadd, vsub, vmul, qrot, qrotInv, and qAxisAngle are imported from the physics-pb module. No other import.
5. The three literal `V(-0.10, 0.15, 0)` ankle-pivot offsets become one module constant `ANKLE_PIVOT` with that value, exported.
6. The `copOverride` field stays as the module's own back-channel between GaitController and its BalanceController, unchanged.
7. `export` is added to Posture, groundTruthState, BalanceController, DCMPlan, COMTracker, buildPhases, smooth, GaitController, and a maker `makeGait(rig, cfg)` returning `new GaitController(rig, cfg)` is added.
8. Added: `GAIT_DIALS_CONTRACT`, `checkGaitDials(k)`, and `checkBalanceDials(k)`, each returning a list of plain problem strings, empty when clean, every problem in one pass: not an object gives the single problem `dials: not an object`; for the gait table, every field present among pelvisDrop, settleTime, crouchTime, stride, nSteps, horizon, tStart, tEnd, stepHeight, kDCM, copClamp, gravity, lateralCorrect, plantPin, minFootSep, strideRate, turnRate, tSS, tDS must be a finite number (`dials.<name>: finite number required`) and each of enabled, replan, trackMeasured present must be a boolean (`dials.<name>: boolean required`); for the balance table, every field present must be a finite number except `comHeightTarget`, which may be null.

The module header states the lift: MODULE: gait, the box it serves, the demo lines, the substitutions, and the known numbers the demo states (the 4 degrees per second steering ceiling; the lateral-shift claim; the foot landing about 0.1 m inboard per step; the collapse after about seven steps without the plant pin; the replanning cost note).

Gate `scripts/gait-test.mjs`, new. A rolled seed printed as `seeds {"gait":<n>}`, read from `process.env.SEED` when set, else rolled, with the small seeded stream the other gates use. A rig is assembled the way rig-test does it (a physics-pb World, assembleMech, groundRig), fresh per check that needs one. Every check is a single call or a closed-form comparison; no walking, no stepping of the world beyond what a check names. Checks, in this order and with these names:

1. `gait: Posture.apply writes each leg's five hinge targets equal to legIK's angles at a rolled pelvis and feet` — a rig and a Posture; a rolled pelvis point (x and z in minus 0.2 to 0.2, y the pelvis's own height) and, per side, the foot's ankle pivot world point (through ANKLE_PIVOT) plus a rolled offset in minus 0.15 to 0.15 on x and z; apply with no measured pelvis and no yaw; for each side compute d as the module does (the foot point minus the pelvis point minus the hip pivot) and legIK(d); the five hinge targets equal q's five angles exactly.
2. `gait: BalanceController.update on a synthetic support state writes every feed-forward torque inside the law's bound and the stance targets, and airborne writes nothing` — a rig and a BalanceController with default dials; a synthetic state: mass the rig's, com at the rig's centre with a rolled small velocity, both feet in contact with force a rolled multiple 1 to 3 of 0.02 times mass times 9.81, cop a rolled point within 0.1 of the ankle, ankle the foot's pivot world point, support the ankles' mean, lean pitch and roll rolled in minus 0.05 to 0.05, torsoRate zero, totalContactForce the sum; update at dt 1/60: every ankle hinge's feed-forward torque magnitude is at most kCop times that foot's force times 2 times the matching cop limit and at most the hinge's tauMax; both thigh targets equal the stance hip angle plus the hip pitch trim computed in the check from the law (hipKp times pitch plus hipKd times minus the z rate, clamped to the trim limit), the hip yokes the roll trim likewise, the shins the stance knee; a second controller on a fresh rig given the same state with support null leaves every hinge's target and feed-forward torque unchanged from before the call.
3. `gait: buildPhases at rolled dials yields the stated count, durations, and kinds` — 100 rolls of nSteps in 1 to 8 and tDS, tSS, tStart, tEnd in 0.1 to 3, a rolled stride vector: the phase count is 2 times nSteps plus 3; the durations sum to tStart plus nSteps times (tDS plus tSS) plus tDS plus tEnd within 1e-9; the first phase and the last two are DS; the middle alternates a `DS->` phase and an `SS-` phase, sides alternating from the first.
4. `gait: the plan's divergent motion is continuous at every phase boundary and ends at the final zmp` — 50 rolls: phases from buildPhases at rolled feet, stride, and dials; a DCMPlan at a rolled com height 1 to 4 and gravity 5 to 15; for every boundary after the first, xiAt just before the boundary and xiAt at the boundary agree within 1e-6; xiAt(T) equals the last phase's zmpB within 1e-9.
5. `gait: one tracker step moves the com by omega times the gap times dt exactly` — a plan as above, a tracker at a rolled start, one step at a rolled t and dt: the new x equals old x plus omega times (xi minus old x) times dt exactly on both axes, and the returned xi is the plan's xiAt(t).
6. `gait: buildPlan at a rolled stride spaces the planned prints by the stride and keeps the rig's own lateral separation` — a rig; `makeGait(rig, { stride: s })` with s rolled 0.1 to 0.5; the state from groundTruthState(rig); init then buildPlan; among the plan's single-support phases, successive same-side zmp points differ by the stride along the heading within 1e-9, and the lateral separation between a left and a right zmp equals the rig's initial plant separation within 1e-9 and is at least minFootSep.
7. `gait: twin controllers on twin rigs agree after one update` — two rigs, two controllers with the same rolled cfg (stride, tSS, tDS rolled), the state from each rig, one update at a rolled dt 0.001 to 0.02: every hinge's target and feed-forward torque equal bit for bit, and the two debug states equal.
8. `gait: the slew limiter moves the command by at most the rate times dt toward the want` — a controller; want stride and heading rolled; slew at rolled dt: each command moved by the lesser of the gap and the rate times dt, exactly, toward the want.
9. `gait: the contracts count every problem` — `checkGaitDials({ stride: "x", enabled: 3 })` returns exactly 2 problems; `checkGaitDials(new GaitController(rig).k)` returns 0; `checkBalanceDials({ kCop: "k", comHeightTarget: null })` returns 1; `checkBalanceDials(null)` returns 1.
10. `gait: the module imports only from its own folder or a sibling module` — read the module file with fs and assert every `import ... from "<x>"` specifier matches `^\.\.\/[a-z0-9-]+\/` or `^\.\/`.

The count line is `gait-test: 10 PASS / 0 FAIL`, then `gait-test PASS`, exit 0. Any FAIL stops the task.

## Steps

1. Read the list above. Confirm.
2. Write the module.
3. Write the gate.
4. Run, from the worktree root, twice: `node scripts/gait-test.mjs`. Both runs must print the seeds line, 10 PASS lines, the count line, and the verdict, exit 0. Paste both outputs whole in the report.
5. Write `docs/plans/phase-0.0.99-gait.md` in the worktree, this shape:

```
# Phase 0.0.99 — gait: the balance controller and the walking planner

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 10 PASS / 0 FAIL; bracket unmoved. -->

Serves the checklist box "The balance controller and the walking planner". Source: the mech demo, read-only, lines 1065 to 1658. <One more sentence in plain words: what the module does, standing on legik, physics-pb, and rig.>

## Lift kind

SHAPED — the law carried whole: every control formula, dial, and threshold, and the four classes. The numbered substitutions are in the module header (eight of them: gravity as a dial, the dropped world argument, the dropped dead call, the imports, the ankle pivot constant, the back-channel kept, the exports and the maker, the contracts). Anything else differing from the cited lines is a finding against the plan.

## Rulings inside this plan

- No walk is run in the gate. The demo's measured step counts are the demo's words, carried in the header as known numbers.
- Registry seam: tick. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <the two seeds>).

- `node scripts/gait-test.mjs` prints a seeds line, 10 PASS lines, then `gait-test: 10 PASS / 0 FAIL`, then `gait-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: the dial defaults of both tables; the contact threshold 2 percent of weight; the 0.5 m com floor; the 4 degrees per second ceiling.
- Bracket, run at the landing: gait, legik, physics-pb, rig, telemetry.

## Tasks

- 0.0.99-1 — the lift. → `task-0.0.99-1-gait.md`
```

6. Commit on your branch, all three files, with this message exactly:

```
phase 0.0.99 — gait: the balance controller and the walking planner

Checklist: the balance controller and the walking planner. Posture, balance, the divergent-motion plan, and the gait controller carried from the mech demo with gravity as a dial; standing on legik, physics-pb, and rig. Gate 10 PASS / 0 FAIL at rolled seeds.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No walking. No timed simulations. Rolled seeds, printed. No literal that is one seed's own output.
- Never edit a demo file, the gate table, the README, the package version, the registry table, another module, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome. Then bullets: both gate outputs whole; the diff summary as files and line counts (`git diff --stat` against main); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the two rolled seeds; no seed is special.

## The report's gate lines

- `node scripts/gait-test.mjs`: seeds 338988902 and 970933580; 10 PASS lines, `gait-test: 10 PASS / 0 FAIL`, `gait-test PASS`, exit 0, twice. Bracket tails in the worktree: `legik-test: 7 PASS / 0 FAIL`, `physics-pb-test: 16 PASS / 0 FAIL`, `rig-test: 14 PASS / 0 FAIL`, `telemetry-test: 4 PASS / 0 FAIL`.
- Bracket at the landing: gait, legik, physics-pb, rig, telemetry, registry, every tail PASS. The gate-table and registry lines are the landing's.
- Branch commit f929529 on phase/0.0.99-gait, landed by squash into main.
- Nonconformities the agent named: the ankle-pivot literal occurs four times in the cited range, not three, and all four ride the one constant; the controller's dial object is built before the posture and balance parts so the gravity dial can be handed down, the rest of the statement order untouched; the roll ranges the brief left unnamed were chosen inside the pinned ones and are stated in the gate. None moved a law.
