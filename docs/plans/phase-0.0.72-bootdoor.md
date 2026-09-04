# Phase 0.0.72 — the boot door grows spec tables and module choices

Status: LANDED, commit `commit `ca82842``, 2026-09-04. Gate: 11 PASS / 0 FAIL; prior gates unmoved.

The described-world boot door (landed 0.0.64) accepts seed and four dials and refuses everything else. This phase grows the door's two named-but-missing fields. `specs`: a description may override any of the seven row-shaped spec tables; each override is contract-checked at the door, every problem reported at once, and the merged tables ride the boot result. `modules`: a description names registered modules to attach; an unknown name is a door refusal; named modules come back attached, grouped by seam. The registry gains the missing mechanism — an attach call — wired for the two pure-call modules (wells, solids). No demo source; this is the engine's own missing half, the law from the checklist's words.

## Lift kind

SHAPED — the law carried: everything defaulted, everything overridable, every problem reported at once, a bad description never boots, words never outrun code. The code is new: a contract per spec table inferred from the table's own rows (each field typed by its own default value), a row-merge that spreads overrides over base rows, and the registry's attach maker map.

## Rulings inside this plan

- Module choices reach pure-call surfaces only (wells, solids). Seam wiring into the loop is a later rung. The README checklist box for the boot door therefore stays OPEN; its describe line is reworded to say exactly what now works.
- The seven row-shaped tables in specs.js come through the door: TOWER_SPECS, MAN, ENEMY_SPECS, INFANTRY_ARMS, ENEMY_FIRE, BISON_FIRE, BARRELS. The flat single-value tables (TANK, BISON, MASON, ...) are not row-shaped and stay outside the door for now.
- Spec contracts are type-only, inferred from the table's own rows. Hand-written floors and ceilings per field are a later ruling if wanted.

## The walk

No page, no screen, no button changes. The path touched is a game author's boot call: describeProblems and bootWorld. Phone and desktop: no interface ships in this phase.

## Standing condition, named

The registry gate is red in the live tree before this phase: its ghost check fails because the senses, opponent, and telemetry directories were landed without registry entries. This phase does not touch that. The gate's line `registry-test: 4 PASS / 1 FAIL` is pinned unchanged on both sides of the task; repairing it is its own ruling.

## Acceptance arithmetic for the phase

Every number below was produced by running the exact planned code at plan-writing time (scratch trial, rolled seeds 163138495 and 555621389).

- `node scripts/gate.mjs describe` prints a rolled seeds line, 11 PASS lines, then `describe-test: 11 PASS / 0 FAIL`, then `describe-test PASS`, exit 0.
- The describe gate's count moves 5 to 11 by design: this task replaces the gate file, keeping the five landed checks verbatim and adding six. The re-teach is licensed here and only here.
- Prior gates: `wells-test PASS` unmoved; `registry-test: 4 PASS / 1 FAIL` unmoved (the standing red above).

## Tasks

- 0.0.72-1 — grow the door: specs and modules fields, the registry attach call, the six new gate checks. → `task-0.0.72-1-bootdoor.md`

Suggested model: Sonnet 5 — every file's full content is in the plan.
