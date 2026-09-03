# Phase 0.0.47 — fog carved out

Status: LANDED, commit `220e227`, 2026-09-03. Gate: prior gates unmoved, hashes identical.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: prior gates unmoved, hashes identical. -->

Batch rung of `batch-extractions-2.md`. `src/depot/fog.js` moves whole into `src/modules/fog/fog.js`; the depot file becomes a one-line front door, so every importer keeps working untouched.

## Lift kind

VERBATIM with one named substitution: the import paths rewritten for the module depth (`./` -> `../../depot/`, `../engine/` -> `../../engine/`), and nothing else. Acceptance is the rewritten file's hash from the trial.

- source `src/depot/fog.js` sha256 `933837f4dd73db670e63d2293d22edacd6a0baab1d17db5c54593f6f1c08d18f`
- moved `src/modules/fog/fog.js` sha256 `7714db54b8bfc390b4539883b479a79aea886eeaf1f1f7d94955320918e9ddf4`
- shim `src/depot/fog.js` (after) sha256 `f32d463d445b7d19130ca033eec991fba1af0f2dcc35367747d75979bb02485f`

## Acceptance arithmetic for the phase

The trial carved all ten batch files cumulatively and ran four gates after each carve, all green: `api` prints `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`; `combat` ends `ALL PASS`; `frostline` ends `frostline-test PASS` (63 PASS / 0 FAIL, rolled seeds); `old-master` ends `old-master-test PASS`.

## Tasks

- 0.0.47-1 — the move and the shim. -> `task-0.0.47-1-fog.md`

Suggested model: Sonnet 5 — a file move, a three-line write, four gate runs.
