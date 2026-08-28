# Phase 0.4 — the conservation ledger

Status: PLANNED. No task dispatched.

The third organ out of deadweight, and its crown: the conservation law. Every conserved unit declared at world start; every holder of value counted; the audit returns to zero drift forever, and deliberate destruction is a reason-carrying write-down, never a leak. Source: `deadweight-hangar.html` lines 254–344 (`GEN`, `genesis()`, `audit()`, and the write-down at line 2496 — "a star can eat money — genesis records it").

## A shaped lift, not verbatim — said plainly

The demo's `audit()` walks its own game's lists by name (tramps, pirates, crates, wreckage, the market tables). That cannot generalize by substitution. What carries verbatim is the LAW — genesis declaration, sum-every-holder, zero drift, recorded write-downs. The code around it is new: holders register a counting function (`source(name, fn)`), the module only sums. The life cycle is declare → seal → audit, with `declare` after `seal` a thrown error and `writeOff(dimension, amount, reason)` the one lawful way the books move after sealing.

Acceptance is therefore the gate's arithmetic alone; there is no byte-identity claim. Every number below was produced by running the exact planned code at plan-writing time.

## The composition milestone

The gate's conservation sweep runs the MARKET module's own pools under the ledger's audit: two pools and a wallet, 10,000 seeded trades (seed 11), drift exactly zero at every step. This is the engine's first cross-module proof — modules composing through their public surfaces, visible to the manifest.

## Acceptance arithmetic for the phase

- `node scripts/gate.mjs ledger` prints nine PASS lines, then `ledger-test: 9 PASS / 0 FAIL`, then `ledger-test PASS`, exit 0.
- Load-bearing knowns inside the checks: a minted credit is caught as drift exactly {credits: 1}; a write-off with reason rebalances to zero and is on the books; a dropped source shows as exactly its negative holdings; a non-finite count is a named finding, never a silent pass.
- The five prior gates unmoved: api worldHash 3367709165 / runHash 2717846799, combat 7 PASS, accuracy 11/11, market `market-test PASS`, builder `builder-test PASS`.

## Tasks

- 0.41 — the ledger module: code, gate, registration, commit, push. → `task-0.41-ledger.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
