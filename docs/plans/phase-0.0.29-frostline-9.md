# Phase 0.0.29 — FROSTLINE FL-9: the hunter

Status: LANDED, commit `d98964e`, 2026-08-31. Gate: 63 PASS / 0 FAIL; prior gates unmoved.

The ninth rung of `docs/plans/game-frostline.md`, built to the rulings made at phase open: the hunter is BOUGHT LIKE A TEAM — once, one of a kind, permanent on the roster, and if he falls, hiring him back is the whole of his price; the jetpack is a real move — 35 meters where a squad marches 22; and he carries TWIN SIDEARMS — a two-round pull, short reach, quick cadence, real hurt up close.

## Lift kind

SHAPED — two additive engine table rows, the cap on the turn machine, the shop and the page:

- **The rows:** `INFANTRY_ARMS.hunter` (the sidearms) and `SQUAD_SPECS.hunter` (one man, 120, faster on his feet). Additive — no depot code names them; the full suite run at plan-writing time proves every prior gate unmoved, api hashes byte-identical.
- **The jetpack as arithmetic:** the turn machine gains a per-type cap — the hunter's move clamps at 35, everyone else at 22; the confirmation prices his own cap. His flight line draws straight (no route bend) because a straight order path is the default for an unrouted move.
- **One of a kind:** the shop refuses a second hunter; the casualty books treat him like any slot — dead, his squad fields nothing, and the replacements bill carries his whole price.
- His trigger is the engine's own: squadFire reads his row by squad type, and the FL-2 hooks, the tape, the cone, and focus fire all rule him for free — one man is just a small squad.
- **Named honestly:** the armored, helmeted SILHOUETTE is not in this phase — he draws as a lone trooper; the distinct look rides the ladder-end look phase with the bolts. Terrain never blocked a walking move mechanically in this engine (men shoulder past obstacles; the grid's refusals bind routes and placement), so "ground ignored" costs nothing today and is recorded as the jetpack's standing law for when routed movement arrives.
- Provisional dials: cap 35, price 120, the sidearms row's numbers.

## Acceptance arithmetic

Produced by running the exact planned files at plan-writing time, fixture seed 3:

- `node scripts/gate.mjs frostline` → 63 PASS lines, `frostline-test: 63 PASS / 0 FAIL`, `frostline-test PASS`, exit 0. Fifty-eight prior checks unmoved; five new: the hunter fields as one man on his own row; the 35-against-22 cap arithmetic; the sidearms pull on his own trigger law; one-of-a-kind purchase at 120; his fall and his re-hire price.
- The full suite: every prior gate unmoved, api line byte-identical — the rows proven additive.
- File identity in the task document.

## Tasks

- 0.0.29-1 — the rows, the cap, the shop, the page, the gate. → `task-0.0.29-1-hunter.md`

Suggested model: Sonnet 5 — every changed byte printed, hashes ratify.
