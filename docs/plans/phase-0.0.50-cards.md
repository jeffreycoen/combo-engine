# Phase 0.0.50 — cards carved out

Status: LANDED, commit stamped below, 2026-09-03. Gate: prior gates unmoved, hashes identical.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: prior gates unmoved, hashes identical. -->

Batch rung of `batch-extractions-2.md`. `src/depot/cards.js` moves whole into `src/modules/cards/cards.js`; the depot file becomes a one-line front door, so every importer keeps working untouched.

## Lift kind

VERBATIM with one named substitution: the import paths rewritten for the module depth (`./` -> `../../depot/`, `../engine/` -> `../../engine/`), and nothing else. Acceptance is the rewritten file's hash from the trial.

- source `src/depot/cards.js` sha256 `8daa4fcf24ea12d71a1dbc6346254f8c1b7ea0fb5fb7ae13790142eaf72b0d00`
- moved `src/modules/cards/cards.js` sha256 `1e7cbfd86fe29d78c6ce1ef6bf209b60d058a1ccc0b5d6a8809c162682d09c76`
- shim `src/depot/cards.js` (after) sha256 `2621bde15a8e22787aa89357367b468fd8739718b684f960f108a5cfc3e2de81`

## Acceptance arithmetic for the phase

The trial carved all ten batch files cumulatively and ran four gates after each carve, all green: `api` prints `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`; `combat` ends `ALL PASS`; `frostline` ends `frostline-test PASS` (63 PASS / 0 FAIL, rolled seeds); `old-master` ends `old-master-test PASS`.

## Tasks

- 0.0.50-1 — the move and the shim. -> `task-0.0.50-1-cards.md`

Suggested model: Sonnet 5 — a file move, a three-line write, four gate runs.
