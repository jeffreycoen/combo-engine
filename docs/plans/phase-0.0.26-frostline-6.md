# Phase 0.0.26 — FROSTLINE FL-6: the tape

Status: PLANNED.
<!-- At landing: Status: LANDED, commit `<hash>`, <date>. Gate: 45 PASS / 0 FAIL. -->

The sixth rung of `docs/plans/game-frostline.md`: every order is recorded at its tick, and a contract replays bit-exact from seed plus tape. A bug report is a saved battle; the replay is the campaign gate.

## Lift kind

SHAPED — one new module carrying the battle's one true step, the page rewired onto it:

- **The load-bearing idea:** `tape.js` owns `stepBattle` — one per-tick battle step (fire control, the held enemy, contact freezing free time, the halves flipping, the mission judged) — and the page and the headless replay both drive it. A replay cannot diverge from play because they are the same code; the page's old inline loop is retired.
- **Orders as data:** squads named by INDEX and targets by POSITION (body ids shift across boots; ground does not). `applyOp` makes the exact writes the page's confirm makes — and resolves targets BEFORE the point spends, closing a real defect the trial caught: a refused order used to be able to eat a point.
- **The page records every confirm** and saves the finished battle's whole address (seed, board, job, roster, tape) to the browser at the end; the debrief names the tape's length. A spent tape never strands a replay frozen — an orderless orders-phase auto-ends its turn.
- No engine file moves; the board, the purse, and the free skirmish behave as landed.

## Acceptance arithmetic

Produced by running the exact planned files at plan-writing time, fixture seed 3:

- `node scripts/gate.mjs frostline` → 45 PASS lines, `frostline-test: 45 PASS / 0 FAIL`, `frostline-test PASS`, exit 0. Forty-one prior checks unmoved; four new:
  - a scripted battle recorded through the shared step (moves, discipline, overwatch, end-turns, 4600-tick cap) replays bit-exact — same id-free world hash, same tick, same contact tick, same count of the living;
  - the tape survives a JSON round-trip to the identical world;
  - an orderless replay still runs its ticks; a refused order costs nothing.
- File identity in the task document.

## Tasks

- 0.0.26-1 — the tape module, the page on the shared step, the gate. → `task-0.0.26-1-tape.md`

Suggested model: Sonnet 5 — every changed byte printed, hashes ratify.
