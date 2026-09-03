# Phase 0.0.43 — orient carved out

Status: LANDED, commit `e441388`, 2026-09-03. Gate: prior gates unmoved, hashes identical.

Batch rung of `batch-extractions-2.md`. `src/depot/orient.js` moves whole into `src/modules/orient/orient.js`; the depot file becomes a one-line front door, so every importer keeps working untouched.

## Lift kind

VERBATIM — the file moves byte-identical; acceptance is hash identity.

- source `src/depot/orient.js` sha256 `e87bc2de23c922a327767ffb6d2c0c23a9773b4e02d2da3935a2f26812574822`
- moved `src/modules/orient/orient.js` sha256 `e87bc2de23c922a327767ffb6d2c0c23a9773b4e02d2da3935a2f26812574822`
- shim `src/depot/orient.js` (after) sha256 `3d154069300ac1410e9362b49e8ba26371a878ec5798fe1a728eed78bd88ad15`

## Acceptance arithmetic for the phase

The trial carved all ten batch files cumulatively and ran four gates after each carve, all green: `api` prints `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`; `combat` ends `ALL PASS`; `frostline` ends `frostline-test PASS` (63 PASS / 0 FAIL, rolled seeds); `old-master` ends `old-master-test PASS`.

## Tasks

- 0.0.43-1 — the move and the shim. -> `task-0.0.43-1-orient.md`

Suggested model: Sonnet 5 — a file move, a three-line write, four gate runs.
