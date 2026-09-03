# Phase 0.0.53 — specs carved out

Status: LANDED, commit stamped below, 2026-09-03. Gate: prior gates unmoved, hashes identical.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: prior gates unmoved, hashes identical. -->

Batch rung of `batch-extractions-3.md`. `src/depot/specs.js` moves whole into `src/modules/specs/specs.js`; the depot file becomes a one-line front door, so every importer keeps working untouched.

## Lift kind

VERBATIM — the file moves byte-identical; acceptance is hash identity.

- source `src/depot/specs.js` sha256 `ec313ba529110489f65dd98003448f084b121b6127cfd21749fb178a3196babe`
- moved `src/modules/specs/specs.js` sha256 `ec313ba529110489f65dd98003448f084b121b6127cfd21749fb178a3196babe`
- shim `src/depot/specs.js` (after) sha256 `e3bfa317386aed957a7b84ab3e691ee14cd4dc6b51f4e0bb084ab73469f93816`

## Acceptance arithmetic for the phase

The trial carved all eleven batch files cumulatively and ran four gates after each carve with exit codes checked, all green: `api` prints `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`; `combat` ends `ALL PASS`; `frostline` ends `frostline-test PASS` (63 PASS / 0 FAIL, rolled seeds); `old-master` ends `old-master-test PASS`.

## Tasks

- 0.0.53-1 — the move and the shim. -> `task-0.0.53-1-specs.md`

Suggested model: Sonnet 5 — a file move, a three-line write, four gate runs.
