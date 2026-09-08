# Phase 0.0.95 — physics-pb: the ground as an option, a maker for the world

Status: LANDED, commit `7c6a4dc`, 2026-09-08. Gate: 16 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 16 PASS / 0 FAIL; bracket unmoved. -->

The second pass over the physics-pb module, general parts order, phase A12. The ground plane's height is now an option on the world and its contacts, default 0, the demo's own value. A maker, makeWorld, builds a world the same way the class does. A contract, checkBody, checks a body's shape and lists every problem in one pass. The solver's arithmetic is unchanged.

## Lift kind

SHAPED second pass — the solver is untouched; the ground plane's height is an option with the demo's 0 as the default; a maker joins the class; the body contract. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 1267550397, 887510421).

- `node scripts/physics-pb-test.mjs` prints a seeds line, 16 PASS lines, then `physics-pb-test: 16 PASS / 0 FAIL`, then `physics-pb-test PASS`, exit 0.
- The eleven landed checks are verbatim. `rig-test: 9 PASS / 0 FAIL` in the worktree.
- Bracket, run at the landing: physics-pb, rig, telemetry, envelope, actuator, presets.

## Tasks

- 0.0.95-1 — the second pass. → `task-0.0.95-1-physics-pb.md`
