# Phase 0.0.91 — voxel: media and gravity handed in

Status: LANDED, commit stamped below, 2026-09-08. Gate: 20 PASS / 0 FAIL; bracket unmoved.
<!-- At landing this line becomes: Status: LANDED, commit `<hash>`, <date>. Gate: 20 PASS / 0 FAIL; bracket unmoved. -->

Second pass over the voxel module, the general parts order, phase A4. The media table, gravity, the debris and cluster limits, and the hit record move onto the world as options, each defaulting to the demo's own value. The world query takes a hit record option too and hands it through every raycast it makes, so two queries never disturb each other's record. A prim contract, checkPrim, counts every problem of a broken prim in one pass. Every formula and every export stays; only where each value comes from changes.

## Lift kind

SHAPED second pass — the carve, contact, debris, collapse, and cluster laws are untouched; the media table, gravity, the limits, and the hit record are handed to the maker, defaults the demo's; the prim contract. The changes are the numbered list in the module header.

## Acceptance arithmetic for the phase

Every number below is the run's output (rolled seeds 2795867235 and 2223136899; the landed checks keep their fixture seeds).

- `node scripts/voxel-test.mjs` prints a seeds line, 20 PASS lines, then `voxel-test: 20 PASS / 0 FAIL`, then `voxel-test PASS`, exit 0.
- The fourteen landed checks are verbatim. The support gate's count line unchanged in the worktree.
- Bracket, run at the landing: voxel, support.

## Tasks

- 0.0.91-1 — the second pass. → `task-0.0.91-1-voxel.md`
