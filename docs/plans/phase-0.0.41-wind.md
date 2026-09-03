# Phase 0.0.41 — wind carved out

Status: PLANNED. No task dispatched.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: prior gates unmoved, hashes identical. -->

Batch rung 6 of `batch-extractions-1.md`, the last rung — the small proof of the depot re-import pattern behind rung 5. The wind stream (`src/depot/wind.js`, 9 lines, no imports) moves whole into `src/modules/wind/wind.js`; the depot file becomes a one-line front door, so its importers (accuracy gate, combat gate, depot sim) keep working untouched.

## Lift kind

VERBATIM — inventory of files with sha256 hashes; acceptance is hash identity.

- `src/modules/wind/wind.js` = the current `src/depot/wind.js`, byte-identical: sha256 `f60764cd6483df5b730d156879fd0cf1a9594a9990193c077ade0bede72b3a33`.
- `src/depot/wind.js` becomes the three-line shim in the task, sha256 `8e7098ff931ac6ef480028facbd32e3aa1863b77cdc8b299e69c8218edf1ee87`.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned tree at plan-writing time.

- `node scripts/gate.mjs ballistics` — ends `ballistics-test PASS`.
- `node scripts/gate.mjs accuracy` — ends `11/11`.
- `node scripts/gate.mjs combat` — ends `ALL PASS`.
- `node scripts/gate.mjs frostline` — ends `frostline-test PASS` (count line `63 PASS / 0 FAIL`), rolled seeds.
- No new gate: hash identity plus four unmoved gates are the whole acceptance.

## Tasks

- 0.0.41-1 — the move and the shim. -> `task-0.0.41-1-wind.md`

Suggested model: Sonnet 5 — a copy, a three-line write, four gate runs.
