# Phase 0.0.44 — route carved out

Status: LANDED, commit stamped below, 2026-09-03. Gate: prior gates unmoved, hashes identical.

Batch rung of `batch-extractions-2.md`. `src/depot/route.js` moves whole into `src/modules/route/route.js`; the depot file becomes a one-line front door, so every importer keeps working untouched.

## Lift kind

VERBATIM — the file moves byte-identical; acceptance is hash identity.

- source `src/depot/route.js` sha256 `f574fb0fac928ac7a6871bcb9feb1f279a8cf5f4b89a67d5a9892e65ae65d3ab`
- moved `src/modules/route/route.js` sha256 `f574fb0fac928ac7a6871bcb9feb1f279a8cf5f4b89a67d5a9892e65ae65d3ab`
- shim `src/depot/route.js` (after) sha256 `3a6442f442d90ae7a16a310c3222c511978dbba255b91bd97ad6e60a3d3f79ed`

## Acceptance arithmetic for the phase

The trial carved all ten batch files cumulatively and ran four gates after each carve, all green: `api` prints `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`; `combat` ends `ALL PASS`; `frostline` ends `frostline-test PASS` (63 PASS / 0 FAIL, rolled seeds); `old-master` ends `old-master-test PASS`.

## Tasks

- 0.0.44-1 — the move and the shim. -> `task-0.0.44-1-route.md`

Suggested model: Sonnet 5 — a file move, a three-line write, four gate runs.
