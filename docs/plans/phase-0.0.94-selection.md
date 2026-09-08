# Phase 0.0.94 — selection: the selection and feedback layer

Status: LANDED, commit stamped below, 2026-09-08. Gate: 10 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 10 PASS / 0 FAIL; bracket unmoved. -->

Serves the checklist box "The selection and feedback layer: brackets, health ramps, order lines, formation links". Source: the fleet demo, read-only, lines 815 to 825, 934 to 968, 1084 to 1090, 1130, 1138 to 1139, 1529 to 1543, 1668 to 1724. The module yields plain drawing data — brackets, health bars, the selection ring, order lines, formation links — for any renderer a game hands units to.

## Lift kind

SHAPED — the law carried: every size, ratio, colour, opacity, dash, threshold, and window the demo draws by. The code is new: plain units in, plain drawing data out; no three.js, no DOM, no clocks. The enemy test and the unit's scale are handed in as functions.

## Rulings inside this plan

- The dials are the demo's numbers as defaults.
- Registry seam: sample. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 2570175881, 2531790004).

- `node scripts/selection-test.mjs` prints a seeds line, 10 PASS lines, then `selection-test: 10 PASS / 0 FAIL`, then `selection-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: the dials listed in the module.
- Bracket, run at the landing: selection, orders.

## Tasks

- 0.0.94-1 — the lift. → `task-0.0.94-1-selection.md`
