# Phase 0.0.55 — save carved out

Status: LANDED, commit `4c8c3cb`, 2026-09-03. Gate: prior gates unmoved, hashes identical.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: prior gates unmoved, hashes identical. -->

Batch rung of `batch-extractions-3.md`. `src/depot/save.js` moves whole into `src/modules/save/save.js`; the depot file becomes a one-line front door, so every importer keeps working untouched.

## Lift kind

VERBATIM with one named substitution: the import paths rewritten one level deeper (`./` -> `../../depot/`, `../` -> `../../`), and nothing else. Acceptance is the rewritten file's hash from the trial.

- source `src/depot/save.js` sha256 `af42dce82233281ea4ac4cf8180b9f55ad37f4233893bca6a2633d6b2a1a8281`
- moved `src/modules/save/save.js` sha256 `711cfd29038ef5401fe5a086ead43cc4635af071d552339c2f2d955a3fc50aa4`
- shim `src/depot/save.js` (after) sha256 `c09286bde205cd5af0b7e6403eb5372572326871cc35d3ceb44e1cf52113c8a1`

## Acceptance arithmetic for the phase

The trial carved all eleven batch files cumulatively and ran four gates after each carve with exit codes checked, all green: `api` prints `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`; `combat` ends `ALL PASS`; `frostline` ends `frostline-test PASS` (63 PASS / 0 FAIL, rolled seeds); `old-master` ends `old-master-test PASS`.

## Tasks

- 0.0.55-1 — the move and the shim. -> `task-0.0.55-1-save.md`

Suggested model: Sonnet 5 — a file move, a three-line write, four gate runs.
