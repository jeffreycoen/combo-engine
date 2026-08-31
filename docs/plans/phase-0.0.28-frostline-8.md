# Phase 0.0.28 — FROSTLINE FL-8: the space theater

Status: PLANNED.
<!-- At landing: Status: LANDED, commit `<hash>`, <date>. Gate: 58 PASS / 0 FAIL. -->

The eighth rung of `docs/plans/game-frostline.md`, built to the rulings: the flat two-dimensional canvas is the drawing layer; the first landing is a minimal skirmish; and space battles enter by TRAVEL — some contracts fly through an ambush, deterministic from the contract's own seed and shown on the board; the space fight comes first, then the ground job. One purse across both theaters.

## Lift kind

SHAPED — ships as operators on the landed modules, a new flat-canvas page:

- **`space.js`:** the landed orders module owns the slots, the landed steering module flies the hulls; this file adds only the wings, the guns, the sides' holds, and the end of the fight. One local draw stream per battle — bit-deterministic, twin-proven. The turn machine is the ground game's own `turns.js`: ships carry an anchor view, so the same points and confirmations rule both theaters.
- **The route on the board:** every job draws whether its route is hot and its ambush's own battle seed (underground routes hotter: 55% against 20%, provisional). A hot job's board button flies the ambush first; won, the ground job waits past it; lost, back to the board. The two new draws ride each job's tail, which moves the FL-5 fixture pins — re-taught under license, old → new listed in the task.
- **The page:** flat black canvas — seeded starfield, faint grid, ship triangles with heading and hull bars, the same chips, action bar, and confirmations as the ground, phone and desktop. Ship bounties pay into the one purse on the spot.
- Provisional dials: one fighter hull both sides (hp 40, range 28, bounty 12), wings of three, sight 55, hit chance 85% point-blank to 25% at full range, hot-route rates.

## Acceptance arithmetic

Produced by running the exact planned files at plan-writing time; space fixture seed 12345, fixture boards 7, 11, 42:

- `node scripts/gate.mjs frostline` → 58 PASS lines, `frostline-test: 58 PASS / 0 FAIL`, `frostline-test PASS`, exit 0. Fifty-three prior checks unmoved, one re-taught, four new:
  - the scripted skirmish resolves on the fixture: contact at tick 106, won at 809, three standing, 36 paid;
  - twin skirmishes land bit-identical wings; a held wing is frozen whole; the route law holds on every fixture board.
  - Re-taught (licensed, the two route draws per job): board 7's jobs 1–2 — clean 19 seed 466232632 → underground 41 seed 553325603 (job 1); clean 23 seed 257815561 → clean 20 seed 197137260 (job 2); job 0 unmoved; hot flags pinned true/true/false.
- No engine file changes; the full suite stays where 0.0.27 proved it.
- File identity in the task document.

## Tasks

- 0.0.28-1 — the space module, the route, the page, the gate. → `task-0.0.28-1-space.md`

Suggested model: Sonnet 5 — every changed byte printed, hashes ratify.
