# Phase 0.1 — the coldsnap engine arrives

Status: LANDED, commit `090f043`, 2026-08-28. All three tasks executed clean, no nonconformities. Gates here match the pin: api worldHash 3367709165 / runHash 2717846799 (twice, identical), combat 7 PASS / 0 FAIL, accuracy 11/11.

Rulings (owner, 2026-08-27): plain copy at a pinned commit; coldsnap keeps its engine untouched, no re-point; the depot game keeps shipping from its own tree.

The pin: coldsnap commit `82b5524fb6c9acc258b9edb685c832f7465537f7` (mk2.86, "the storage door closes"). At this commit every coldsnap gate is green: depot-test 2,089/0, golden 7/0, lint clean, smoke 30/0 (gates.log, 2026-08-28 01:39–01:45).

## What moves

42 files, verbatim, paths unchanged under `src/` and `scripts/`:

- `src/engine/` — 2 files (core.js, mech.js)
- `src/depot/` — 30 .js files (the war sim: api.js, boot.js, tick.js, specs.js, save.js, mapgen.js, and kin). The four .jsx screens in depot/ stay behind — api.js's own header bars them.
- `src/graphics/` — 3 files (renderer.js, portrait.js, troopkit.js)
- `src/platform/` — 4 files (audio.js, storage.js, autosave.js, keymap.js)
- `src/version.js`
- `scripts/combat-test.mjs`, `scripts/accuracy-test.mjs` — the two gates whose imports stay entirely inside the moved set (verified by grep at plan time).

## What stays in coldsnap, and why

- `src/game/`, `src/ui/`, `src/render/`, `src/demo/`, the .jsx screens — the game, not the engine.
- The depot-test suite (35 files, 13,018 lines): 24 of its 35 files import game/ui/render/jsx. It tests the whole game and guards it where it lives.
- golden.mjs (reads src/demo), predicate-test and scenario-test (import src/game), smoke.mjs (drives the built page in a browser). These gates need the game around them.

## Acceptance arithmetic for the whole phase

- 42 of 42 destination files byte-identical to the pin (sha256 match against the inventory).
- `node src/depot/api.js gate 1 90` prints `worldHash 3367709165  runHash 2717846799` — the same two numbers coldsnap prints at the pin (captured at plan time).
- combat gate: 7 PASS / 0 FAIL. accuracy gate: 11/11.

## Tasks

- 0.11 — the copy. Inventory-checked verbatim move of the 42 files. → `task-0.11-the-copy.md`
- 0.12 — the scaffolding. package.json (module type, the three.js dependency), install, import proof. → `task-0.12-scaffolding.md`
- 0.13 — the gates. Register api/combat/accuracy in scripts/gate.mjs, run all three, match the numbers above, commit and push. → `task-0.13-gates.md`

One agent, one task at a time, stop after each landing. Suggested model for all three: Sonnet 5 — every step is mechanical execution of listed commands; nothing is designed.
