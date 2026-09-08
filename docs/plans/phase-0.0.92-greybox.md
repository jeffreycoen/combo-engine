# Phase 0.0.92 — greybox: the part library

Status: LANDED, commit `b575cee`, 2026-09-08. Gate: 8 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 8 PASS / 0 FAIL; bracket unmoved. -->

Serves the checklist box "The greybox part library: stairs, facades, vehicles, figures, at true human scale". Source: the shooting-range demo, read-only, lines 445 to 455, 505 to 724, 1202 to 1217. The module builds stairs, railings, facades, doors, a car body, a walking figure, and buildings at human scale, and turns a part list into solids for collision.

## Lift kind

VERBATIM MATH — every builder's arithmetic and the human scale table are the demo's exactly. The numbered substitutions are in the module header (four of them: the factory over the scale table, the solids import, the style kept, the contracts). Anything else differing from the cited lines is a finding against the plan.

## Rulings inside this plan

- The scale table's seven numbers are the demo's defaults.
- Registry seam: sample. The registry and gate-table lines are the landing's.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 463853799, 838848187).

- `node scripts/greybox-test.mjs` prints a seeds line, 8 PASS lines, then `greybox-test: 8 PASS / 0 FAIL`, then `greybox-test PASS`, exit 0.
- Load-bearing knowns from the demo's own lines: the seven scale numbers; the figure's head top 1.84.
- Bracket, run at the landing: greybox, solids.

## Tasks

- 0.0.92-1 — the lift. → `task-0.0.92-1-greybox.md`
