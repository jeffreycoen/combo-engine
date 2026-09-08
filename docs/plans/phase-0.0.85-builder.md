# Phase 0.0.85 — builder: roles as data

Status: LANDED, commit `6ba9d6b`, 2026-09-08. Gate: 14 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 14 PASS / 0 FAIL; bracket unmoved. -->

The second pass over the builder module under the general parts order, phase A10. A spec row may now carry a role; a row without one takes its key when the key is bridge, engine, tank, or rcs. derive reads every part by its role and its own row, never by a fixed key. The contract counts a bad role.

## Lift kind

SHAPED second pass — every formula is untouched; parts are read by a role the row declares, with the demo's four keys as the default roles, and every part reads its own row. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 3969711698, 1255477467).

- `node scripts/builder-test.mjs` prints a seeds line, 14 PASS lines, then `builder-test: 14 PASS / 0 FAIL`, then `builder-test PASS`, exit 0.
- The ten landed checks are verbatim. `weldstress-test: 9 PASS / 0 FAIL` in the worktree.
- Bracket, run at the landing: builder, weldstress.

## Tasks

- 0.0.85-1 — the second pass. → `task-0.0.85-1-builder.md`
