# Phase 0.0.54 — ai carved out

Status: LANDED, commit `abc1c33`, 2026-09-03. Gate: prior gates unmoved, hashes identical.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: prior gates unmoved, hashes identical. -->

Batch rung of `batch-extractions-3.md`. `src/depot/ai.js` moves whole into `src/modules/ai/ai.js`; the depot file becomes a one-line front door, so every importer keeps working untouched.

## Lift kind

VERBATIM with one named substitution: the import paths rewritten one level deeper (`./` -> `../../depot/`, `../` -> `../../`), and nothing else. Acceptance is the rewritten file's hash from the trial.

- source `src/depot/ai.js` sha256 `1a76037bc6305cec8e81bc9c3deaf77f7282ea2d9bd31c97b141d2f00813dd6f`
- moved `src/modules/ai/ai.js` sha256 `80d057c456238cb294dd0c4900e3f9cd407d73faaf3abf78496f5a38950a052c`
- shim `src/depot/ai.js` (after) sha256 `9ca3475565cca8571826fe31a363df542fbaf061c1b3c23189cc40aad5f84f08`

## Acceptance arithmetic for the phase

The trial carved all eleven batch files cumulatively and ran four gates after each carve with exit codes checked, all green: `api` prints `seed 1  seconds 90 (10800 steps)  worldHash 3367709165  runHash 2717846799`; `combat` ends `ALL PASS`; `frostline` ends `frostline-test PASS` (63 PASS / 0 FAIL, rolled seeds); `old-master` ends `old-master-test PASS`.

## Tasks

- 0.0.54-1 — the move and the shim. -> `task-0.0.54-1-ai.md`

Suggested model: Sonnet 5 — a file move, a three-line write, four gate runs.
