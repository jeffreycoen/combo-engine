# Phase 0.0.3 — the ship builder core

Status: LANDED, commit `509d706`, 2026-08-28. Gate: 10 PASS / 0 FAIL; prior gates unmoved.

The second organ out of deadweight: the grid-ship builder — parts on integer cells, connection ports gating placement, welds joining neighbors, and `derive()` turning a part list into flight properties (mass, balance point, rotational inertia, thrust, burn torque, turn authority, fuel capacity). Source: `deadweight-hangar.html` lines 348–400, with the spec rows at lines 171–182 and the starter build at line 346.

It lands as the second module in `src/modules/`, in the mold the market minted: one folder, a maker taking one options object, a contract, a headless gate registered in `scripts/gate.mjs`.

## How the lift generalizes, and exactly how far

The demo's formulas are kept verbatim. Three named substitutions, and only these:

1. **Globals become the maker's options.** `SPEC`, `CELL` (4), `WELD_S` (1200), `WELD_WEAK` (500), and the bridge's built-in attitude ring (tau 26, 5 jets) arrive through `makeBuilder(opts)` with the demo's values as defaults.
2. **The global `build` list becomes each function's first argument.** Same math, no module state.
3. **`derive()` drops the demo's game-side role lookups** (`hasShield`, `mount`, `rack`, `grap`, `pods` — fields only the demo's shop screens read) **and keeps one of the demo's two thrust computations.** The demo computes `F`/`tq` twice in the same return, naive then facing-aware, and the second silently wins; the module carries only the winning one. The role vocabulary `bridge`/`engine`/`tank`/`rcs` stays recognized by name, as in the demo.

Anything else that differs from lines 348–400 is a finding against the plan.

## Acceptance arithmetic for the phase

- `node scripts/gate.mjs builder` prints ten PASS lines, then `builder-test: 10 PASS / 0 FAIL`, then `builder-test PASS`, exit 0.
- The load-bearing knowns inside those checks are the demo's own: the starter dart derives mass 13.0 and thrust 55 — the exact assertions of the demo's boot self-test (`deadweight-hangar.html` line 2649) — plus zero burn torque, tau 26, fuel cap 260 (560 with one tank), 2 welds at 1200, strut joints at 500.
- The four prior gates unmoved: api worldHash 3367709165 / runHash 2717846799, combat 7 PASS, accuracy 11/11, market 8 PASS / 0 FAIL.

Every number above was produced by running the exact planned code at plan-writing time.

## Tasks

- 0.0.3-1 — the builder module: code, gate, registration, commit, push. → `task-0.0.3-1-builder.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
