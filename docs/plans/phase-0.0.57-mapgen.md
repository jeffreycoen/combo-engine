# Phase 0.0.57 — mapgen carved out

Status: LANDED, commit `6c2af57`, 2026-09-03. Gate: prior gates unmoved, hashes identical.

Batch rung of `batch-extractions-3.md`. `src/depot/mapgen.js` moves whole into `src/modules/mapgen/mapgen.js`; the depot file becomes a one-line front door, so every importer keeps working untouched.

## Lift kind

VERBATIM with one named substitution: the import paths rewritten one level deeper (`./` -> `../../depot/`, `../` -> `../../`), and nothing else. Acceptance is the rewritten file's hash from the trial.

- source `src/depot/mapgen.js` sha256 `7a4214747c0bece1e92998b12ec936d8990b373c7aff44b564b0c1c3f153c60f`
- moved `src/modules/mapgen/mapgen.js` sha256 `e0f3ff8cb5754896f6310c0cdece0ec17b84b8a3edd0d57b97f344343cf4911c`
- shim `src/depot/mapgen.js` (after) sha256 `9b095e49a3a4f80dbce35e31d01dca66422c014c7e6c93ac01fdc3d1a1fc65eb`

## Acceptance arithmetic for the phase

The trial carved all eleven batch files cumulatively and ran four gates after each carve with exit codes checked, all green: `api` prints `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`; `combat` ends `ALL PASS`; `frostline` ends `frostline-test PASS` (63 PASS / 0 FAIL, rolled seeds); `old-master` ends `old-master-test PASS`.

## Tasks

- 0.0.57-1 — the move and the shim. -> `task-0.0.57-1-mapgen.md`

Suggested model: Sonnet 5 — a file move, a three-line write, four gate runs.
