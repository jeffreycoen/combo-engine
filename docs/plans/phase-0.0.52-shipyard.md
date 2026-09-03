# Phase 0.0.52 — the shipyard

Status: LANDED, commit `811c551`, 2026-09-03. Gate: 10 PASS / 0 FAIL; prior gates unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 10 PASS / 0 FAIL; prior gates unmoved. -->

Batch rung 11 of `batch-extractions-2.md`, the one deadweight organ. The grid builder's laws: the part table as data, occupancy and ports, the nozzle rule, placement adjacency, the weld list with the strut's weak joints, the derived body (mass, center, inertia, thrust, torque, turn authority, fuel), and hull connectivity. Source: `deadweight-hangar.html` lines 171-182, 195, 227-229, 347-400, read-only, committed unchanged at 206d7eb. `fracture` stays behind by the batch order's own ruling.

## Lift kind

VERBATIM MATH — the formulas are the demo's exactly; numbered substitutions follow, and only those. Anything else differing from the cited lines is a finding against the plan.
  1. The page-global `build` -> the `list` argument on occupied, rotLegal, nextFacing, and adjacencyOK.
  2. The render color rows (col) are dropped from the part table — laws, not paint; every other field is the demo's.
  3. doRot/doRm/slog (wallet, pools, log lines) stay on the page; their connectivity guard is connectedFrom, carried here.
  4. derive's two dead stores (lines 390-392, shadowed by its own return) are dropped; the returned arithmetic is untouched.

The ratifier is the demo's own text: rotLegal, adjacencyOK, weldsOf, derive, and connectedFrom are lifted from the demo at run time with their globals shimmed and twin-driven on 800 rolled builds — welds, derived numbers, connectivity sets, adjacency verdicts, and nozzle verdicts all exactly equal, every run, fresh seeds.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time.

- `node scripts/gate.mjs shipyard` prints a seeds line, 10 PASS lines, then `shipyard-test: 10 PASS / 0 FAIL`, then `shipyard-test PASS`, exit 0 — at rolled seeds. Ten consecutive trial runs green.
- Load-bearing knowns inside the checks: the demo's own dials — weld 1200, weak weld 500, cell 4, bridge ring 26 torque / 5 thrusters, quad 16 N, base fuel 260 + 300 a tank, the starter dart's 13 kg.
- Prior gates bracketing: `wells` tail `wells-test: 9 PASS / 0 FAIL` / `wells-test PASS`; `conserve` tail `conserve-test: 7 PASS / 0 FAIL` / `conserve-test PASS`.

## Tasks

- 0.0.52-1 — the shipyard module and its gate, verbatim from the trial. -> `task-0.0.52-1-shipyard.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
