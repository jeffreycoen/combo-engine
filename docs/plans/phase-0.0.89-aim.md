# Phase 0.0.89 — aim: the names handed in

Status: LANDED, commit `a89297f`, 2026-09-08. Gate: 13 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 13 PASS / 0 FAIL; bracket unmoved. -->

The second pass over the aim module under the general parts order, phase A7. The candidate filter that was a hardwired line is now a named default, DEFAULT_SKIP, handed in as the option skip. The near-range literal 3 is now the option minRange. The arm and cancel tape action's kind name, "aim", is now the option armAction. A contract, KINDS_CONTRACT and checkKinds, checks the shape of a kinds table. The aiming law and the lead solve are untouched.

## Lift kind

SHAPED second pass — the aiming law and the lead solve are untouched; the candidate filter, the minimum range, and the arm action name are options with the demo's defaults; the kinds contract. The changes are the second numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 486296856, 937672535).

- `node scripts/aim-test.mjs` prints a seeds line, 13 PASS lines, then `aim-test: 13 PASS / 0 FAIL`, then `aim-test PASS`, exit 0.
- The eight landed checks are verbatim.
- Bracket, run at the landing: aim.

## Tasks

- 0.0.89-1 — the second pass. → `task-0.0.89-1-aim.md`
