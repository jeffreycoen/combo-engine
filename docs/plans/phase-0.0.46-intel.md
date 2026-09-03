# Phase 0.0.46 — intel carved out

Status: LANDED, commit `f1bd820`, 2026-09-03. Gate: prior gates unmoved, hashes identical.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: prior gates unmoved, hashes identical. -->

Batch rung of `batch-extractions-2.md`. `src/depot/intel.js` moves whole into `src/modules/intel/intel.js`; the depot file becomes a one-line front door, so every importer keeps working untouched.

## Lift kind

VERBATIM — the file moves byte-identical; acceptance is hash identity.

- source `src/depot/intel.js` sha256 `8936f02ecc57d8a7b028686b1ea8774581166713589d1803834ceb97fee8cc76`
- moved `src/modules/intel/intel.js` sha256 `8936f02ecc57d8a7b028686b1ea8774581166713589d1803834ceb97fee8cc76`
- shim `src/depot/intel.js` (after) sha256 `e491adee1d8be6742133c43bc7e115ad1dd6d02ccef2f8fb339568dfdfb87c3f`

## Acceptance arithmetic for the phase

The trial carved all ten batch files cumulatively and ran four gates after each carve, all green: `api` prints `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`; `combat` ends `ALL PASS`; `frostline` ends `frostline-test PASS` (63 PASS / 0 FAIL, rolled seeds); `old-master` ends `old-master-test PASS`.

## Tasks

- 0.0.46-1 — the move and the shim. -> `task-0.0.46-1-intel.md`

Suggested model: Sonnet 5 — a file move, a three-line write, four gate runs.
