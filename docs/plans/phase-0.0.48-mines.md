# Phase 0.0.48 — mines carved out

Status: LANDED, commit stamped below, 2026-09-03. Gate: prior gates unmoved, hashes identical.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: prior gates unmoved, hashes identical. -->

Batch rung of `batch-extractions-2.md`. `src/depot/mines.js` moves whole into `src/modules/mines/mines.js`; the depot file becomes a one-line front door, so every importer keeps working untouched.

## Lift kind

VERBATIM with one named substitution: the import paths rewritten for the module depth (`./` -> `../../depot/`, `../engine/` -> `../../engine/`), and nothing else. Acceptance is the rewritten file's hash from the trial.

- source `src/depot/mines.js` sha256 `9fd0d048cd410996ba9de8f11cebaab44b991067263d532f602b4e6642c1851a`
- moved `src/modules/mines/mines.js` sha256 `1228d61fa558cb90d3d07e7dc41a86172f6e7b0e4bdd22063ac04e228e1b5c69`
- shim `src/depot/mines.js` (after) sha256 `26c7709f0cd6f9d93f40786fe203541b66c6afdfbcdc2e37558e7bbc006ede65`

## Acceptance arithmetic for the phase

The trial carved all ten batch files cumulatively and ran four gates after each carve, all green: `api` prints `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`; `combat` ends `ALL PASS`; `frostline` ends `frostline-test PASS` (63 PASS / 0 FAIL, rolled seeds); `old-master` ends `old-master-test PASS`.

## Tasks

- 0.0.48-1 — the move and the shim. -> `task-0.0.48-1-mines.md`

Suggested model: Sonnet 5 — a file move, a three-line write, four gate runs.
