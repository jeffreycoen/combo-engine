# Phase 0.0.42 — lists carved out

Status: LANDED, commit `d66dcfa`, 2026-09-03. Gate: prior gates unmoved, hashes identical.

Batch rung of `batch-extractions-2.md`. `src/depot/lists.js` moves whole into `src/modules/lists/lists.js`; the depot file becomes a one-line front door, so every importer keeps working untouched.

## Lift kind

VERBATIM — the file moves byte-identical; acceptance is hash identity.

- source `src/depot/lists.js` sha256 `ee7cc67f232122ae6af5a104e645aae660ce8cd6cf7627c4a95ae1b6397423cc`
- moved `src/modules/lists/lists.js` sha256 `ee7cc67f232122ae6af5a104e645aae660ce8cd6cf7627c4a95ae1b6397423cc`
- shim `src/depot/lists.js` (after) sha256 `68d4bc55d116ed8c7e9ca24e17de0449dd6c58bc906c8e4ce564d4b717617554`

## Acceptance arithmetic for the phase

The trial carved all ten batch files cumulatively and ran four gates after each carve, all green: `api` prints `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`; `combat` ends `ALL PASS`; `frostline` ends `frostline-test PASS` (63 PASS / 0 FAIL, rolled seeds); `old-master` ends `old-master-test PASS`.

## Tasks

- 0.0.42-1 — the move and the shim. -> `task-0.0.42-1-lists.md`

Suggested model: Sonnet 5 — a file move, a three-line write, four gate runs.
