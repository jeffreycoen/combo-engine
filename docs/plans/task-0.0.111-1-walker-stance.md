# Task 0.0.111-1 — the walker's stance at the ruled scale

One job: the ninth phase of GRAVITY'S ARK, a physics phase on the engine's rig and balance controller. A scale option across rig, gait, and the leg lengths, with a scaling law for lengths, masses, actuators, gains, and limits; the laws proven at rolled scales; and the stance at the ruled scale 0.607 measured: ten seconds under gravity with the balance controller. If it stands, that is a check in the rig's gate; if it does not, the phase records the numbers and the walker ships at trooper scale, marked, by the owner's ruling. Write exactly the design below, run the gates, write the phase document, commit on your branch, report. You design nothing beyond this brief; anything it did not foresee stops the task and is reported as a labeled nonconformity.

Model: Sonnet 5.

Where you work: the worktree at `/home/batman/combo-wt/walker`, branch `phase/0.0.111-walker-stance`. This phase, alone in its order, edits engine modules: `src/modules/rig/rig.js`, `src/modules/gait/gait.js`, `scripts/rig-test.mjs`, `scripts/gait-test.mjs`, and nothing else under `src/modules/` or `scripts/`. Every landed check in those two gates stays verbatim; at scale 1 nothing moves. You never touch `/home/batman/combo-engine`. You never edit `scripts/gate.mjs`, `README.md`, `package.json`, `src/modules/registry/registry.js`, `src/modules/legik/legik.js`, `src/modules/presets/presets.js`, `src/modules/physics-pb/physics.js`, or any document of another phase. You never edit a demo file.

Working method, required: no single response or tool call may carry more than about 150 lines of new text. Right after the read-confirmation, make your first edit. Small edits, `node --check` after each. Keep your own reasoning short; this brief has made every decision.

Required reading, in order, whole (confirm each with its line count at the top of your report):
1. This file.
2. `/home/batman/combo-engine/docs/plans/batch-ark-1.md`, the sections "Rulings from the owner", "The rules of the run", and "Stream G, the ground frames".
3. `/home/batman/combo-wt/walker/src/modules/rig/rig.js`, whole.
4. `/home/batman/combo-wt/walker/src/modules/gait/gait.js`, whole.
5. `/home/batman/combo-wt/walker/src/modules/legik/legik.js`, whole; you do not edit it.
6. `/home/batman/combo-wt/walker/scripts/rig-test.mjs` and `/home/batman/combo-wt/walker/scripts/gait-test.mjs`, whole.
7. `/home/batman/combo-wt/walker/src/modules/telemetry/telemetry.js`, whole, for `jointLoads` and `worstMount`.
8. `/tmp/claude-1000/-home-batman-combo-engine/75fe6cef-1abb-4d43-9486-a5c67122e829/scratchpad/walker-survey/scale-stand.mjs`, whole: the survey's stand script, which measured the rig breaking at 15 ms at 0.607 under length-and-mass scaling with actuators and limits frozen. You adapt it, you do not run it as it is.
9. `/home/batman/combo-wt/walker/docs/plans/phase-0.0.99-gait.md`, as the shape of a phase document.

## The scaling law, PROPOSED

With a scale `s` (1 is the demo's rig): every length times `s` (dims, jp, jc, the collision margins); every mass times `s³` (inertia follows through the builders, `s⁵`); every hinge's `tauMax` times `s⁴` (a torque is a weight times a lever); `kp` and `kd` follow from `tauMax` as the rig already derives them; every mount limit's force terms (tension, shear) times `s²` and moment terms (bend, torsion) times `s³` (the same material, a cross-section `s²`, a section modulus `s³`); the balance controller's centre-of-pressure limits times `s`, its ankle pivot times `s`, its centre-of-mass height floor times `s`; the leg lengths the posture hands to the leg solver times `s`. Angles, angle limits, rates, and dimensionless gains do not scale.

## The design, fixed

`src/modules/rig/rig.js`:
- `export function scaledSpec(spec, s)`: a deep copy of the spec with the law above applied to `core` and `limbChain` rows: `dim`, `jp`, `jc` times `s`; `mass` times `s³`; `tauMax` times `s⁴`; `lim.tension` and `lim.shear` times `s²`; `lim.bend` and `lim.torsion` times `s³`; `range`, `angle0`, and every other field untouched; `targetHeight` times `s`. At `s` 1 the copy equals the spec exactly.
- `assembleMech(world, opts)`: a new option `scale` (default 1): the spec it builds from is `scaledSpec(opts.spec ?? MECH_SPEC, scale)`; the collision-pair margins default to their landed values times `scale`; the rig it returns carries `rig.scale`. At `scale` 1 the assembled rig is the landed rig, bit for bit.

`src/modules/gait/gait.js`:
- `BalanceController`: a new config `scale` (default 1) read once at construction: `copLimitX` and `copLimitZ` default to their landed values times `scale`; the capture point's height floor (the landed 0.5 m) becomes `0.5 * scale`; the ankle pivot used for the feet becomes `ANKLE_PIVOT` times `scale` per component, held on the controller as `this.ankle`. When a rig is handed in with `rig.scale`, the controller reads `scale` from it unless the config gives one.
- `Posture`: a new option `scale` (default 1, or the rig's `rig.scale`): `apply` calls `legIK(d, { thigh: LEG.thigh * scale, shin: LEG.shin * scale })` where it called `legIK(d)`; at scale 1 identical.
- `GaitController` passes its rig's scale to both.
- `groundTruthState(rig, g, scale)`: a third argument `scale` (default `rig.scale ?? 1`); every ankle point it builds uses `ANKLE_PIVOT` times `scale` per component. `GaitController.init` and its touchdown correction use the same scaled pivot where they call `body.toWorld(ANKLE_PIVOT)`. At scale 1 identical.

`scripts/rig-test.mjs`: the fourteen landed checks stay verbatim, in order; the seeds line stays. Append, in this order:

15. `rig: scale 1 assembles the landed rig exactly` — `assembleMech(world, { scale: 1 })` and `assembleMech(world, {})` on twin worlds: `rigStats` equal and every body's mass, dims, and every hinge's tauMax, kp, kd, lim equal (===).
16. `rig: at a rolled scale every quantity scales by its power` — 20 rolls of s in 0.3 to 1.5: comparing the rig at s with the rig at 1, link by link: dims by s, masses by s³, tauMax by s⁴, kp and kd by s⁴, tension and shear limits by s², bend and torsion by s³, all within 1e-9 relative; the total mass by s³; the standing height from `rigStats` by s within 1e-6 relative.
17. Only if it stands (step 5 below): `rig: at the ruled scale 0.607 the rig stands ten seconds under gravity with the balance controller` — the stand trial's law as a check: zero break events, no foot airborne after the first 0.5 s, and the pelvis height at 10 s within 5 percent of its height at 0.5 s.

`scripts/gait-test.mjs`: the ten landed checks stay verbatim. Append:

11. `gait: the controller's limits, pivot, and floor scale with the rig` — a rolled s in 0.3 to 1.5: a controller built with `{ scale: s }` has `copLimitX`, `copLimitZ`, `ankle`, and the centre-of-mass height floor at their landed values times s within 1e-12, and `groundTruthState` on a rig at scale s reports ankle points at the scaled pivot (each foot's ankle point equals its body's `toWorld` of `ANKLE_PIVOT` times s within 1e-9), and one built from a rig at scale s without a config scale reads the same; a Posture at scale s hands the leg solver thigh and shin times s (assert through the hinge targets it writes for a rolled foot, against `legIK` called with the scaled lengths directly).

The two module headers gain a numbered note: this pass's scale option and the law above, phase 0.0.111 of the order batch-ark-1.

## Steps

1. Read the list above. Confirm.
2. Edit rig.js, then gait.js, small edits, parsing after each.
3. Extend rig-test with 15 and 16 and gait-test with 11; run both twice: rig-test must print 16 PASS lines and `rig-test: 16 PASS / 0 FAIL`, gait-test 11 and `gait-test: 11 PASS / 0 FAIL`, exit 0. Any FAIL stops the task.
4. Run `node scripts/legik-test.mjs`, `node scripts/presets-test.mjs`, `node scripts/telemetry-test.mjs` once each: their tails must be unmoved (7, 7, and 4 PASS); paste the tails.
5. The stand trial: adapt the survey's script into `/home/batman/combo-wt/walker/scripts/walker-stand-trial.mjs` (a trial script, committed with the phase, not a gate and not registered): it assembles the rig at `scale` 0.607 through the new option, stands it under gravity with the balance controller at the landed dt 1/60 and substeps 12, and prints at 0.5 s steps to 10 s the pelvis height, the count of break events, and whether any foot is airborne, then a last line `stand 0.607: breaks <n> airborne <yes|no> pelvis <start> -> <end>`. Run it twice; the outputs must agree byte for byte; paste both whole. If breaks are 0, no foot is airborne after the first 0.5 s, and the end pelvis is within 5 percent of the start: the walker stands; add check 17 to rig-test as the same law, run rig-test twice more, and the count line is 17. If not: add no check; the count line stays 16.
6. Write `docs/plans/phase-0.0.111-walker-stance.md` in the worktree, this shape:

```
# Phase 0.0.111 — the walker's stance at the ruled scale

Status: PLANNED. Built in worktree, awaiting the landing.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gates: rig <16 or 17> PASS / 0 FAIL, gait 11 PASS / 0 FAIL; bracket unmoved. -->

The ninth phase of GRAVITY'S ARK under the order batch-ark-1, the physics phase the owner ruled: a scale option across the rig, the balance controller, and the leg lengths, with one scaling law for lengths, masses, actuators, gains, and limits; the law proven at rolled scales; the stance at the ruled scale 0.607, twice a trooper's height, measured under gravity for ten seconds. <One sentence: stands, or does not, with the numbers.>

## Lift kind

Second pass on rig and gait: the landed laws untouched at scale 1; the scaling law new, PROPOSED.

## The measurement

<The trial's last line, and the 0.5 s table, from the run.>
<If it stands: the law is check 17. If not: the walker ships at trooper scale, marked, by the ruling; the first break's joint and time, and the quantity that went out of bound first.>

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds <rig's two, gait's two>).

- `node scripts/rig-test.mjs`: <16 or 17> PASS lines, then `rig-test: <n> PASS / 0 FAIL`, exit 0.
- `node scripts/gait-test.mjs`: 11 PASS lines, then `gait-test: 11 PASS / 0 FAIL`, exit 0.
- Bracket, run at the landing: rig, gait, legik, presets, telemetry, physics-pb.

## Tasks

- 0.0.111-1 — the stance. → `task-0.0.111-1-walker-stance.md`
```

7. Commit on your branch, every file you changed or added, with this message exactly:

```
phase 0.0.111 — the walker's stance at the ruled scale

GRAVITY'S ARK, the first road. A scale option across the rig, the balance controller, and the leg lengths, with one scaling law; the law proven at rolled scales; the stance at 0.607 measured for ten seconds under gravity. rig-test and gait-test green; the landed checks verbatim.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QSq3kZC3Bk9SC5RwnqYUfs
```

Do not push. Do not touch main.

## Rules

- No timed simulations in the gates beyond the ten-second stand law and the landed checks' own. The trial script runs a fixed ten seconds; it is not a gate.
- The landed checks stay verbatim; only the count lines move.
- Never edit a demo file, the gate table, the README, the package version, the registry table, legik, presets, physics-pb, or another phase's documents.

## Report

Read-confirmation first (each file, its line count). One line of outcome: stands or does not, with the numbers. Then bullets: both rig-test outputs whole; both gait-test outputs whole; the three tails; both trial outputs whole; the diff summary (`git diff --stat $(git merge-base HEAD main)`); the commit hash on your branch; every nonconformity as its own labeled bullet. Fixture seeds: the rolled seeds; no seed is special.

## Amendment

The first measurement at 0.607: zero breaks, the pelvis 2.1248 to 2.0921 m, inside the band, and the right foot leaving the ground at 7.55 s, after the first 0.5 s: not a stand by the law. The agent named the gap: the design scaled the balance controller's pivot but the state estimate and the gait controller still read the full-scale pivot. The design now scales the pivot in `groundTruthState` and in `GaitController`'s own uses, and check 11 covers the floor and the estimate's ankle points. The stance is measured again on this wording. "core" in the scaling law means the spec's `links`.

## The report's gate lines

- `node scripts/rig-test.mjs`: seeds 722540624 and 358019720; 16 PASS lines, `rig-test: 16 PASS / 0 FAIL`, exit 0, twice; the fourteen landed checks verbatim. `node scripts/gait-test.mjs`: seeds 347137849 and 661044027; 11 PASS lines, `gait-test: 11 PASS / 0 FAIL`, exit 0, twice; the ten landed checks verbatim. Tails unmoved: legik 7, presets 7, telemetry 4.
- The stand trial at 0.607, twice, byte-identical: breaks 0, a foot airborne at 7.42 s, the pelvis 2.1248 to 2.1000 m. Not a stand by the law; no check 17. The first attempt, before the pivot amendment: airborne at 7.55 s, the pelvis 2.1248 to 2.0921 m.
- Bracket at the landing: rig, gait, legik, presets, telemetry, physics-pb, every tail PASS.
- Branch commit e530aca on phase/0.0.111-walker-stance, landed by squash into main.
- Nonconformities the agent named: the pivot gap, a brief error resolved by the amendment; check 11's name promised the floor, added by the amendment; "core" read as the spec's links; the phase document's failure slot assumed a break where the failure is a foot losing contact. By the owner's ruling the walker ships at trooper scale, marked; the scale option and its laws are landed.
