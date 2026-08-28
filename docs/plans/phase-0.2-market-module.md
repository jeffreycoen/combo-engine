# Phase 0.2 — the market module, and the module pattern it mints

Status: PLANNED. No task dispatched.

Scope ruling (owner, 2026-08-28): deconstruction of the deadweight demo begins, very small scope first.

The first organ out of deadweight is the market: three pure functions of constant-product pricing (`deadweight-hangar.html` lines 247–253). It is the smallest complete system in any demo — no world, no drawing, no randomness — and it lands as the FIRST module in `src/modules/`, minting the module pattern every later blade fills: one folder, one surface, a contract, a headless gate registered in `scripts/gate.mjs`.

This is not a verbatim move in the inventory-and-hash sense: the math is copied exactly, but it leaves an html file and gains a module wrapper and a contract. The acceptance is the gate's arithmetic, verified live at plan-writing time — every number below was produced by running the exact planned code.

## Acceptance arithmetic for the phase

- `node scripts/gate.mjs market` prints eight PASS lines, then `market-test: 8 PASS / 0 FAIL`, then `market-test PASS`, exit 0.
- The known-pool numbers inside those checks: price1 of {q:14, c:44800} is 3447; buying 1 costs 3447 leaving {13, 48247}; selling back returns 3446 leaving {14, 44801}; 10,000 seeded trades (seed 7) conserve credits and units exactly.
- The three prior gates still green: api worldHash 3367709165 / runHash 2717846799, combat 7 PASS, accuracy 11/11.

## Tasks

- 0.21 — the market module: code, gate, pattern document, registration, commit, push. → `task-0.21-market.md`

Suggested model: Sonnet 5 — every file's full content is in the plan; the agent writes, runs, and reports.
