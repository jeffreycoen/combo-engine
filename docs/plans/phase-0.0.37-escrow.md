# Phase 0.0.37 — the escrow contracts

Status: LANDED, commit `4aff0cd`, 2026-09-03. Gate: 7 PASS / 0 FAIL; prior gates unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 7 PASS / 0 FAIL; prior gates unmoved. -->

Batch rung 2 of `batch-extractions-1.md`. The organ is the deadweight hangar's contract escrow: a starving station locks part of its treasury behind a posted bounty priced off the other station's spot plus the daring margin; fulfilment pays the escrow once and restocks; expiry returns every cent; a rescue fee is 600 plus thirty percent of the stranded value, treasury-capped. Source: `deadweight-hangar.html` lines 267-302, read-only, committed unchanged at 206d7eb.

## Lift kind

VERBATIM MATH — the formulas are the demo's exactly; numbered substitutions follow, and only those. Anything else differing from the cited lines is a finding against the plan.
  1. The module-scope CONTRACTS array and ctSeq/ctScan counters -> a book object from makeBook(): { list, seq, scan }.
  2. The module-scope MKT table -> the `stations` argument: { [sid]: { parts: { [part]: {q, c} }, credits, cool } } — the pools live under `parts`, the one shape change.
  3. postContract's hard-coded other station -> the `otherSid` argument.
  4. postRescue's trampValue(tr) and nearest-station scan -> the caller passes `sid` and `value`; the fee law is the demo's line 281 exactly.
  5. stepContracts' fixed part scan list -> the `partOrder` argument.
  6. Function name postRescue -> postRescueAt (the scan moved out).

The ratifier is conservation, per the batch order: every credit is proven conserved through post, fulfil, expiry, and a six-hundred-step rolled storm — treasuries plus escrow plus payouts, exact to the cent.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time.

- `node scripts/gate.mjs escrow` prints a seeds line, 7 PASS lines, then `escrow-test: 7 PASS / 0 FAIL`, then `escrow-test PASS`, exit 0 — at rolled seeds. Ten consecutive trial runs green.
- Load-bearing knowns inside the checks: the demo's own dials — margin 1.55 + 120, refuse under 200, expiry 120 s, rescue 600 + 30% at 150 s, cooldown 30, scan every 60th call.
- Prior gates bracketing: `poolmarket` tail `poolmarket-test: 10 PASS / 0 FAIL` / `poolmarket-test PASS`; `market` tail `market-test: 8 PASS / 0 FAIL` / `market-test PASS`.

## Tasks

- 0.0.37-1 — the escrow module and its gate, verbatim from the trial. -> `task-0.0.37-1-escrow.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
