# Phase 0.0.98 — backdrop: the space backdrop and effects kit

Status: LANDED, commit `0f29393`, 2026-09-08. Gate: 10 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 10 PASS / 0 FAIL; bracket unmoved. -->

Serves the checklist box "The space backdrop and effects kit: starfield, nebulae, trails, beams, explosion rings". Source: the fleet demo, read-only, lines 524 to 599, 653 to 789, 1047 to 1069, 1559 to 1607, 1650 to 1659. The module yields plain lists and numbers for stars, nebulae, the core, dust, trails, rings, beams, and explosions; a renderer turns each into draw calls.

## Lift kind

SHAPED — the law carried: every count, range, colour, lifetime, and ramp the demo draws by, and the bloom's numbers as data. The code is new: generation on a handed seeded stream, the demo's draw order kept; effects laws as pure functions; no three.js, no canvas, no DOM. Named difference: the demo's sky was different on every load; the module's is the seed's.

## Rulings inside this plan

- The dials are the demo's numbers as defaults.
- Registry seam: sample. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 2129456974, 1438870005).

- `node scripts/backdrop-test.mjs` prints a seeds line, 10 PASS lines, then `backdrop-test: 10 PASS / 0 FAIL`, then `backdrop-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: the dials listed in the module.
- Bracket, run at the landing: backdrop, determinism.

## Tasks

- 0.0.98-1 — the lift. → `task-0.0.98-1-backdrop.md`
