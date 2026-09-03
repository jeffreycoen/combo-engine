# Phase 0.0.51 — transports carved out

Status: LANDED, commit stamped below, 2026-09-03. Gate: prior gates unmoved, hashes identical.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: prior gates unmoved, hashes identical. -->

Batch rung of `batch-extractions-2.md`. `src/depot/transports.js` moves whole into `src/modules/transports/transports.js`; the depot file becomes a one-line front door, so every importer keeps working untouched.

## Lift kind

VERBATIM with one named substitution: the import paths rewritten for the module depth (`./` -> `../../depot/`, `../engine/` -> `../../engine/`), and nothing else. Acceptance is the rewritten file's hash from the trial.

- source `src/depot/transports.js` sha256 `7c63c1f697c685dd7e1d9753ff7739cd0ea2b20e090d47b82594600d9f6cfcc0`
- moved `src/modules/transports/transports.js` sha256 `2e86069ea4b75c2e1bf5de85f5765ec30ec00a954eb54611c581095b53b9c0bf`
- shim `src/depot/transports.js` (after) sha256 `9442904b86de5fb75aca4f64275be632a98c5f4e99ea847ee184a803e793fd94`

## Acceptance arithmetic for the phase

The trial carved all ten batch files cumulatively and ran four gates after each carve, all green: `api` prints `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`; `combat` ends `ALL PASS`; `frostline` ends `frostline-test PASS` (63 PASS / 0 FAIL, rolled seeds); `old-master` ends `old-master-test PASS`.

## Tasks

- 0.0.51-1 — the move and the shim. -> `task-0.0.51-1-transports.md`

Suggested model: Sonnet 5 — a file move, a three-line write, four gate runs.
