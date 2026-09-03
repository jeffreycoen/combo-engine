# Phase 0.0.39 — the books

Status: LANDED, commit stamped below, 2026-09-03. Gate: 7 PASS / 0 FAIL; prior gates unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 7 PASS / 0 FAIL; prior gates unmoved. -->

Batch rung 4 of `batch-extractions-1.md`. The organ is the deadweight hangar's conservation books: a genesis declaration of every credit, gram, and part in the world, and the audit that folds a full census against it — zero drift or a named needle (cD, fD, oD, pD). Source: `deadweight-hangar.html` lines 254-262 and 316-344, read-only, committed unchanged at 206d7eb.

## Lift kind

VERBATIM MATH — the formulas are the demo's exactly; numbered substitutions follow, and only those. Anything else differing from the cited lines is a finding against the plan.
  1. The module-scope GEN -> a genesis object from makeGenesis().
  2. genesis()'s MKT walk -> genesisStations(gen, stations), the same fold over a passed-in table.
  3. audit()'s page-global walk -> one census object from makeCensus(seed) plus one count* helper per entity class, each the demo's own fold with its global as an argument; audit(gen, cz) carries lines 341-344 verbatim.
  4. The accumulator seeding from the L ledger (line 317) -> makeCensus({C, F, O}).

The ratifier is the law itself: 200 rolled worlds audit to zero at declaration; 60 worlds each survive 300 rolled moves (trades, burns, thefts, escrows, wrecks) with the books exact; then a minted credit, a leaked half-unit of fuel, a vanished part, and loose ordnance are each caught by their own needle, and the fuel rail forgives exactly under a millionth.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time.

- `node scripts/gate.mjs conserve` prints a seeds line, 7 PASS lines, then `conserve-test: 7 PASS / 0 FAIL`, then `conserve-test PASS`, exit 0 — at rolled seeds. Ten consecutive trial runs green.
- Load-bearing knowns inside the checks: the demo's own rails — cD exact zero, fD under 1e-6 after toFixed(6), oD under 1e-9, pD exact zero.
- Prior gates bracketing: `wells` tail `wells-test: 9 PASS / 0 FAIL` / `wells-test PASS`; `escrow` tail `escrow-test: 7 PASS / 0 FAIL` / `escrow-test PASS`.

## Tasks

- 0.0.39-1 — the conserve module and its gate, verbatim from the trial. -> `task-0.0.39-1-conserve.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
