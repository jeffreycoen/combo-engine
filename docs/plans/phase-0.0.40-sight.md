# Phase 0.0.40 — sight carved out

Status: LANDED, commit `32dd8a6`, 2026-09-03. Gate: prior gates unmoved, hashes identical.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: prior gates unmoved, hashes identical. -->

Batch rung 5 of `batch-extractions-1.md`, the first depot carve-out. The sight map (`src/depot/sight.js`, 206 lines, no imports) moves whole into `src/modules/sight/sight.js`; the depot file becomes a one-line front door re-exporting the module, so all five importers (frostline pause and cover, depot boot, tick, state) keep working untouched.

## Lift kind

VERBATIM — inventory of files with sha256 hashes; acceptance is hash identity.

- `src/modules/sight/sight.js` = the current `src/depot/sight.js`, byte-identical: sha256 `528f7cc8c71d7bbbc7d107abc7b1f6372b6eb11f0e7a24be4f2350fbb76578aa`.
- `src/depot/sight.js` becomes the three-line shim in the task, sha256 `c2505b8181757081ee674e90de220d2b50e1881635739dd74ed0405697e4b08c`.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned tree at plan-writing time.

- `node scripts/gate.mjs frostline` — `frostline-test [mission turns cover fire purse board tape space hunter]: 63 PASS / 0 FAIL`, four consecutive trial runs at rolled seeds.
- `node scripts/gate.mjs combat` — ends `ALL PASS`.
- `node scripts/gate.mjs old-master` — `old-master-test: 21 PASS / 0 FAIL`.
- `node scripts/gate.mjs api` — prints `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799` (that gate's own fixed print, unchanged from before the carve).
- No new gate: the carve adds no behavior; hash identity plus four unmoved gates are the whole acceptance.

## Tasks

- 0.0.40-1 — the move and the shim. -> `task-0.0.40-1-sight.md`

Suggested model: Sonnet 5 — a copy, a three-line write, four gate runs.
