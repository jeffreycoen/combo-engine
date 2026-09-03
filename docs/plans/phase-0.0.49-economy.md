# Phase 0.0.49 — economy carved out

Status: LANDED, commit `5bb8115`, 2026-09-03. Gate: prior gates unmoved, hashes identical.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: prior gates unmoved, hashes identical. -->

Batch rung of `batch-extractions-2.md`. `src/depot/economy.js` moves whole into `src/modules/economy/economy.js`; the depot file becomes a one-line front door, so every importer keeps working untouched.

## Lift kind

VERBATIM with one named substitution: the import paths rewritten for the module depth (`./` -> `../../depot/`, `../engine/` -> `../../engine/`), and nothing else. Acceptance is the rewritten file's hash from the trial.

- source `src/depot/economy.js` sha256 `a02bc9fc3399fb1a69fe0e1b5374d978e832717ac905b83b53a38d919e06bb8d`
- moved `src/modules/economy/economy.js` sha256 `f80c60fb677ed25b67d1e23d0d13d479d6fe6d3ae702e6af98dc8898a303d406`
- shim `src/depot/economy.js` (after) sha256 `0e776cd42f8b06490f5448166b878f3427d5afa2e4e60ca0d88d45cbac587923`

## Acceptance arithmetic for the phase

The trial carved all ten batch files cumulatively and ran four gates after each carve, all green: `api` prints `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`; `combat` ends `ALL PASS`; `frostline` ends `frostline-test PASS` (63 PASS / 0 FAIL, rolled seeds); `old-master` ends `old-master-test PASS`.

## Tasks

- 0.0.49-1 — the move and the shim. -> `task-0.0.49-1-economy.md`

Suggested model: Sonnet 5 — a file move, a three-line write, four gate runs.
