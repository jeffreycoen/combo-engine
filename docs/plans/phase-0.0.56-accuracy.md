# Phase 0.0.56 — accuracy carved out

Status: LANDED, commit `18df1d5`, 2026-09-03. Gate: prior gates unmoved, hashes identical.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: prior gates unmoved, hashes identical. -->

Batch rung of `batch-extractions-3.md`. `src/depot/accuracy.js` moves whole into `src/modules/accuracy/accuracy.js`; the depot file becomes a one-line front door, so every importer keeps working untouched.

## Lift kind

VERBATIM with one named substitution: the import paths rewritten one level deeper (`./` -> `../../depot/`, `../` -> `../../`), and nothing else. Acceptance is the rewritten file's hash from the trial.

- source `src/depot/accuracy.js` sha256 `05e90d4eea8e712ef3571005c0cc64eb25ea9de866ad2e7161f506d04504d532`
- moved `src/modules/accuracy/accuracy.js` sha256 `df5a3f64a2ce16397c4da09684ed7e00d127d7a8170dcebbf100d378f1afd08b`
- shim `src/depot/accuracy.js` (after) sha256 `0a3815507cb330b286f95bdb3898ca537e7a3d34d9d0fc1152e952653b21f1aa`

## Acceptance arithmetic for the phase

The trial carved all eleven batch files cumulatively and ran four gates after each carve with exit codes checked, all green: `api` prints `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`; `combat` ends `ALL PASS`; `frostline` ends `frostline-test PASS` (63 PASS / 0 FAIL, rolled seeds); `old-master` ends `old-master-test PASS`.

## Tasks

- 0.0.56-1 — the move and the shim. -> `task-0.0.56-1-accuracy.md`

Suggested model: Sonnet 5 — a file move, a three-line write, four gate runs.
