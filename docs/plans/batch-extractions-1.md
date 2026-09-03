# Batch order — extractions, run continuous

The first continuous run. The owner has ruled: depot and deadweight extractions, back to back, with trial-proven plans dispatching without a per-plan review sitting. This order is the scope ruling the extraction procedure requires; the owner's approval of this document approves the batch. His word interrupts anywhere.

## The rules of the run

- Each extraction is its own phase, numbered sequentially from 0.0.36, full ceremony minus the two waits: the trial runs green first, the plan is written from the templates with the trial's numbers, the plan is rehearsed, and a green rehearsal dispatches without review. Gates bracket every task; commit and push per landing; every landing reported as it happens.
- No hardwired seeds anywhere, per the standing order.
- Demos are read-only source material, cited by line. The deadweight demo file never moves and never changes.
- A stop is a stop: any moved prior-gate number, any failed rehearsal hash, any unlisted difference, or any design question the source code cannot answer stops the batch at that rung and waits for the owner. Nothing is fixed in flight; the stop is reported plainly.
- The owner's playtest is deferred to the batch's end. Nothing in this batch touches a game page, so the live check is the gates plus the owner's read of the record.
- Each new module follows the module pattern, registers its gate in `scripts/gate.mjs`, and lands with its README checklist line.

## The extractions, in order

From the deadweight hangar demo (`deadweight-hangar.html`, read-only):

1. **pool-market** — the constant-product part pools: buy, sell, the posted price, the blueprint's net cost against a pool copy (lines 209–253). VERBATIM MATH: the k = q·c law copied exactly; a numbered substitution table maps the demo's globals to options.
2. **escrow-contracts** — contracts with money held in escrow: post, post-rescue, fulfil, expire; the fee and payout arithmetic (lines 267–308). VERBATIM MATH.
3. **wells** — gravity wells and the flight field: the well maker, the potential, the stop and shot predictors that integrate the real field (lines 403, 855–858, 2124–2151, 2541–2572). VERBATIM MATH.
4. **conservation-audit** — the demo's books: the genesis ledger and the audit that proves credits, fuel, and matter conserved across every trade and wreck (lines 254–346). VERBATIM MATH. The batch's own proof rides it: the audit is the gate.

From the depot (source stays; the module is carved out and the depot re-imports it, twin-run identity ratifying the carve):

5. **sight** — the sight map: no imports, self-contained (src/depot/sight.js, 206 lines). VERBATIM.
6. **wind** — the wind stream (src/depot/wind.js, 9 lines). VERBATIM. Small on purpose: it proves the depot re-import pattern before anything bigger uses it.

Six rungs. Anything beyond these six is a new batch order.

## Known risks, stated now

- The depot carve-outs (5, 6) change import paths inside the live game's engine; the frostline gate brackets both, and twin-run world identity at rolled seeds is the acceptance.
- The deadweight organs (1–4) are new modules with new gates; they touch nothing live. Their risk is fidelity to the demo, ratified by the demo's own numbers where its self-test prints them, and by conservation laws where it does not.
- Deadweight's `accuracy`-style tangles (functions leaning on page globals) are the reason the four chosen organs are the four with the cleanest seams. An organ that turns out dirtier than its seam looked is a stop, not an improvisation.

## The record

Each landing flips its own phase record; this document gets one status line per rung as it lands, and the batch closes with a summary report to the owner.

- [x] 0.0.36 pool-market
- [x] 0.0.37 escrow-contracts
- [x] 0.0.38 wells
- [x] 0.0.39 conservation-audit
- [x] 0.0.40 sight
- [ ] 0.0.41 wind
