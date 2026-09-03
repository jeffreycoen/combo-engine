# Phase 0.0.36 — the part pools

Status: LANDED, commit stamped below, 2026-09-03. Gate: 10 PASS / 0 FAIL; prior gates unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 10 PASS / 0 FAIL; prior gates unmoved. -->

Batch rung 1 of `batch-extractions-1.md`. The organ is the deadweight hangar's constant-product part pools: a pool is {q: stock, c: credit reserve}, the invariant k = q*c prices every trade, ceil-on-buy and floor-on-sell always favor the pool, and a refit prices sell-all-then-buy-all on a copy. Source: `deadweight-hangar.html` lines 209-253 (bpCost, poolBuy, poolSell, price1), read-only, committed unchanged at 206d7eb.

## Lift kind

VERBATIM MATH — the formulas are the demo's exactly; numbered substitutions follow, and only those. Anything else differing from the cited lines is a finding against the plan.
  1. bpCost's station table `m` (module-scope MKT + dockedAt) -> the `pools` argument.
  2. bpCost's `build` (module-scope ship) -> the `current` argument, a list of part type names.
  3. bpCost's `BLUEPRINTS[nm]` lookup -> the `target` argument, a list of part type names.
  4. bpCost's `PKEY` (module-scope table) -> the `partKeyOf` argument.
  5. The function name bpCost -> netRefit (the module carries no blueprints).

The ratifier is the demo's own text: the gate lifts poolBuy, poolSell, and price1 out of `deadweight-hangar.html` at run time and drives them twin with the module on thousands of rolled pools — outputs and pool states must match exactly, every run, at fresh seeds.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time.

- `node scripts/gate.mjs poolmarket` prints 10 PASS lines, then `poolmarket-test: 10 PASS / 0 FAIL`, then `poolmarket-test PASS`, exit 0 — at rolled seeds, printed on the run's first line.
- Load-bearing knowns inside the checks: none pinned — every check is a law at rolled pools, per the no-hardwired-seeds standing order; the demo twin-drive is the fidelity ratifier.
- Prior gates bracketing: `market` tail `market-test: 8 PASS / 0 FAIL` / `market-test PASS`; `ledger` tail `ledger-test: 9 PASS / 0 FAIL` / `ledger-test PASS`.

## Tasks

- 0.0.36-1 — the poolmarket module and its gate, verbatim from the trial. -> `task-0.0.36-1-poolmarket.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
