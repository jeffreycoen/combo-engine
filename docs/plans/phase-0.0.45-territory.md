# Phase 0.0.45 — territory carved out

Status: LANDED, commit `3338654`, 2026-09-03. Gate: prior gates unmoved, hashes identical.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: prior gates unmoved, hashes identical. -->

Batch rung of `batch-extractions-2.md`. `src/depot/territory.js` moves whole into `src/modules/territory/territory.js`; the depot file becomes a one-line front door, so every importer keeps working untouched.

## Lift kind

VERBATIM — the file moves byte-identical; acceptance is hash identity.

- source `src/depot/territory.js` sha256 `108120167fb9e258158107c830fff8e354192820cbc6988d1b73f1c8d39fc95d`
- moved `src/modules/territory/territory.js` sha256 `108120167fb9e258158107c830fff8e354192820cbc6988d1b73f1c8d39fc95d`
- shim `src/depot/territory.js` (after) sha256 `4ddabc10bd8ce8792f68f0ac9be2dc600747d404f1ad51fa856a71dbd96309ff`

## Acceptance arithmetic for the phase

The trial carved all ten batch files cumulatively and ran four gates after each carve, all green: `api` prints `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`; `combat` ends `ALL PASS`; `frostline` ends `frostline-test PASS` (63 PASS / 0 FAIL, rolled seeds); `old-master` ends `old-master-test PASS`.

## Tasks

- 0.0.45-1 — the move and the shim. -> `task-0.0.45-1-territory.md`

Suggested model: Sonnet 5 — a file move, a three-line write, four gate runs.
